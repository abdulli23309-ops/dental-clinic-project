from datetime import datetime, timezone
import json
import logging
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.services.messaging_provider import (
    MessageDeliveryResult,
    MessagingProvider,
    SimulatedMessagingProvider,
    TwilioSmsProvider,
    WhatsAppCloudProvider,
)
from app.domain.models.phone_utils import normalize_pakistan_phone
from app.infrastructure.database.orm_models import (
    BookingORM,
    ClinicBookingSettingsORM,
    MessageORM,
    PatientORM,
    TaskORM,
)

logger = logging.getLogger(__name__)


class NotificationPipelineService:
    """
    Automated notification pipeline with WhatsApp-to-SMS fallback.
    - WhatsApp is the primary channel.
    - If WhatsApp fails, SMS is the fallback.
    - Max 2 total attempts across channels.
    - Notification failure NEVER undoes or rolls back a confirmed appointment.
    - If both attempts fail, keeps appointment confirmed and creates a receptionist follow-up task.
    - Deduplicates repeated events to prevent duplicate notifications.
    """

    def __init__(
        self,
        session: AsyncSession,
        whatsapp_provider: Optional[MessagingProvider] = None,
        sms_provider: Optional[MessagingProvider] = None,
    ):
        self.session = session
        self.whatsapp_provider = whatsapp_provider or WhatsAppCloudProvider()
        self.sms_provider = sms_provider or TwilioSmsProvider()
        self.simulated_provider = SimulatedMessagingProvider()

    def _get_provider_for_channel(self, channel: str, mode: str = "simulated") -> MessagingProvider:
        if mode == "disabled":
            from app.application.services.messaging_provider import DisabledMessagingProvider
            return DisabledMessagingProvider()

        if channel == "whatsapp":
            if self.whatsapp_provider and type(self.whatsapp_provider) is not WhatsAppCloudProvider:
                return self.whatsapp_provider
            if mode == "simulated":
                return self.simulated_provider
            if getattr(self.whatsapp_provider, "is_configured", False):
                return self.whatsapp_provider
            return self.simulated_provider
        else:
            if self.sms_provider and type(self.sms_provider) is not TwilioSmsProvider:
                return self.sms_provider
            if mode == "simulated":
                return self.simulated_provider
            if getattr(self.sms_provider, "is_configured", False):
                return self.sms_provider
            return self.simulated_provider

    async def notify_booking_event(
        self,
        booking_id: UUID,
        event_type: str,  # "booking_created" | "booking_confirmed" | "booking_rescheduled" | "booking_cancelled"
        patient_name: str,
        patient_phone: str,
        details: Dict[str, Any],
        clinic_id: Optional[UUID] = None,
        patient_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Coordinates notification delivery with channel fallback, retry limit, and task escalation.
        """
        phone_norm = normalize_pakistan_phone(patient_phone)
        now_utc = datetime.now(timezone.utc)

        # 1. Deduplication check: check if already sent for this booking and event_type
        existing_msg_stmt = (
            select(MessageORM)
            .where(
                MessageORM.booking_id == booking_id,
                MessageORM.purpose == event_type,
                MessageORM.delivery_status.in_(["sent", "delivered", "simulated"]),
            )
            .limit(1)
        )
        res = await self.session.execute(existing_msg_stmt)
        if res.scalar_one_or_none() is not None:
            logger.info("Notification for booking %s event %s already sent. Skipping duplicate.", booking_id, event_type)
            return {"status": "already_sent", "booking_confirmed": True, "attempts": 0}

        # Retrieve clinic messaging mode
        mode = "simulated"
        if clinic_id:
            cfg_stmt = select(ClinicBookingSettingsORM).where(ClinicBookingSettingsORM.clinic_id == clinic_id).limit(1)
            cfg_res = await self.session.execute(cfg_stmt)
            cfg = cfg_res.scalar_one_or_none()
            if cfg and getattr(cfg, "messaging_provider_mode", None):
                mode = cfg.messaging_provider_mode

        # Format message content based on event_type
        conf_id = details.get("confirmation_id", "N/A")
        date_str = details.get("date", "your appointment date")
        time_str = details.get("time", "your scheduled time")
        clinic_name = details.get("clinic_name", "Marlow Dental")
        service_title = details.get("service_title", "Dental Consultation")

        if event_type == "booking_confirmed":
            body = (
                f"Marlow Dental Confirmation:\n"
                f"Dear {patient_name}, your appointment ({conf_id}) for {service_title} "
                f"is confirmed for {date_str} at {time_str} at {clinic_name}. "
                f"For questions or directions, please call us."
            )
        elif event_type == "booking_rescheduled":
            body = (
                f"Marlow Dental Reschedule Update:\n"
                f"Dear {patient_name}, your appointment ({conf_id}) has been successfully rescheduled "
                f"to {date_str} at {time_str} at {clinic_name}."
            )
        elif event_type == "booking_cancelled":
            reason = details.get("reason", "Cancelled per request")
            body = (
                f"Marlow Dental Cancellation Notice:\n"
                f"Dear {patient_name}, your appointment ({conf_id}) for {date_str} at {time_str} "
                f"has been cancelled ({reason}). Call us if you need to rebook."
            )
        else:
            body = (
                f"Marlow Dental:\n"
                f"Dear {patient_name}, we received your booking request ({conf_id}) for {service_title} "
                f"on {date_str} at {time_str}. Our reception team will review and confirm shortly."
            )

        delivery_attempts = 0
        final_delivery_result = None

        # --- Attempt 1: WhatsApp ---
        delivery_attempts += 1
        wa_provider = self._get_provider_for_channel("whatsapp", mode=mode)
        try:
            wa_result = await wa_provider.send_message(
                recipient=phone_norm,
                message=body,
                channel="whatsapp",
                metadata={"booking_id": str(booking_id), "event_type": event_type, "attempt": 1},
            )
        except Exception as ex:
            wa_result = MessageDeliveryResult(
                success=False,
                status="failed",
                channel="whatsapp",
                provider="whatsapp",
                recipient=phone_norm,
                error=str(ex),
            )

        # Log attempt 1
        msg_1 = MessageORM(
            id=uuid4(),
            patient_id=patient_id,
            booking_id=booking_id,
            phone=patient_phone,
            phone_normalized=phone_norm,
            channel="whatsapp",
            status="logged",
            direction="outbound",
            purpose=event_type,
            content=body,
            delivery_status=wa_result.status,
            provider=wa_result.provider,
            provider_message_id=wa_result.provider_message_id,
            error_detail=wa_result.error,
            attempts=1,
            sent_at=now_utc if wa_result.success else None,
            created_at=now_utc,
        )
        self.session.add(msg_1)
        await self.session.flush()

        if wa_result.success:
            return {
                "success": True,
                "channel": "whatsapp",
                "status": wa_result.status,
                "attempts": 1,
                "booking_confirmed": True,
            }

        # --- Attempt 2: SMS Fallback ---
        delivery_attempts += 1
        sms_provider = self._get_provider_for_channel("sms", mode=mode)
        try:
            sms_result = await sms_provider.send_message(
                recipient=phone_norm,
                message=body,
                channel="sms",
                metadata={"booking_id": str(booking_id), "event_type": event_type, "attempt": 2},
            )
        except Exception as ex:
            sms_result = MessageDeliveryResult(
                success=False,
                status="failed",
                channel="sms",
                provider="twilio",
                recipient=phone_norm,
                error=str(ex),
            )

        # Log attempt 2
        msg_2 = MessageORM(
            id=uuid4(),
            patient_id=patient_id,
            booking_id=booking_id,
            phone=patient_phone,
            phone_normalized=phone_norm,
            channel="sms",
            status="logged",
            direction="outbound",
            purpose=event_type,
            content=body,
            delivery_status=sms_result.status,
            provider=sms_result.provider,
            provider_message_id=sms_result.provider_message_id,
            error_detail=sms_result.error,
            attempts=2,
            sent_at=now_utc if sms_result.success else None,
            created_at=now_utc,
        )
        self.session.add(msg_2)
        await self.session.flush()

        if sms_result.success:
            return {
                "success": True,
                "channel": "sms",
                "status": sms_result.status,
                "attempts": 2,
                "booking_confirmed": True,
            }

        # --- Both attempts failed: Escalate to Receptionist Task ---
        # Notification failure must NEVER undo a valid appointment. Keep confirmed.
        task_title = f"Failed notification follow-up: {patient_name} ({conf_id})"
        task_desc = (
            f"WhatsApp and SMS notifications failed to deliver to {patient_name} ({patient_phone}) "
            f"for {event_type} on {date_str} at {time_str}.\n"
            f"WhatsApp error: {wa_result.error or 'Failed'}\n"
            f"SMS error: {sms_result.error or 'Failed'}\n"
            f"Please call the patient directly to deliver this update."
        )
        escalation_task = TaskORM(
            id=uuid4(),
            clinic_id=clinic_id,
            patient_id=patient_id,
            booking_id=booking_id,
            title=task_title,
            description=task_desc,
            due_date=now_utc,
            status="pending",
            priority="high",
            created_at=now_utc,
            updated_at=now_utc,
        )
        self.session.add(escalation_task)
        await self.session.flush()

        logger.warning(
            "Both WhatsApp and SMS notifications failed for booking %s. Created receptionist task %s.",
            booking_id,
            escalation_task.id,
        )

        return {
            "success": False,
            "channel": "sms",
            "status": "failed",
            "attempts": 2,
            "booking_confirmed": True,
            "escalated_task_id": str(escalation_task.id),
        }
