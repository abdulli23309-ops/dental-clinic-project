from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class MessageDeliveryResult:
    success: bool
    status: str  # "simulated" | "queued" | "sent" | "delivered" | "failed" | "opted_out" | "quiet_hours_held"
    channel: str  # "sms" | "whatsapp"
    provider: str
    recipient: str
    details: Optional[str] = None
    error: Optional[str] = None

    def __getitem__(self, key: str) -> Any:
        return getattr(self, key)

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)


class MessagingProvider(ABC):
    @abstractmethod
    async def send_message(
        self,
        recipient: str,
        message: str,
        channel: str = "sms",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MessageDeliveryResult:
        """Sends a patient communication through this provider."""
        pass


class SimulatedMessagingProvider(MessagingProvider):
    """
    Simulated local provider.
    Fulfills delivery simulation requirements without making outside network calls
    or asserting fabricated external carrier delivery.
    """

    async def send_message(
        self,
        recipient: str,
        message: str,
        channel: str = "sms",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MessageDeliveryResult:
        return MessageDeliveryResult(
            success=True,
            status="simulated",
            channel=channel,
            provider="simulated",
            recipient=recipient,
            details="Simulated dispatch: message delivery simulated locally with honest 'simulated' status.",
        )


class DisabledMessagingProvider(MessagingProvider):
    """Fallback provider when messaging is switched off."""

    async def send_message(
        self,
        recipient: str,
        message: str,
        channel: str = "sms",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> MessageDeliveryResult:
        return MessageDeliveryResult(
            success=False,
            status="disabled",
            channel=channel,
            provider="disabled",
            recipient=recipient,
            details="Messaging is disabled in clinic configuration.",
        )


def get_messaging_provider(mode: str = "simulated") -> MessagingProvider:
    normalized = (mode or "simulated").strip().lower()
    if normalized == "disabled":
        return DisabledMessagingProvider()
    return SimulatedMessagingProvider()
