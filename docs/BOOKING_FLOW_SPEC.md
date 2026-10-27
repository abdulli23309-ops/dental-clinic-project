# Booking flow spec (decisions are final unless the owner changes them)

SCOPE. Marlow builds screens, data, rules and an integration API. A separate automation (WhatsApp, SMS, call capture, follow-up sequencing) is NOT part of this work. Marlow sends no new messages. It records attempts, holds, outcomes and messages that the automation reports through the API later.

1 WEBSITE FLOW (order): (1) contact: name, mobile number, email optional; (2) service; (3) clinic; (4) doctor with free times; (5) notes ("tell us in your own words"); (6) review and confirm.
 - Lead is saved when step 1 is completed ("Continue"), and updated at each later step. Never on keystrokes. The response never reveals whether the number already belongs to a patient or lead. Show a short notice: "We save your details so we can help you finish booking."
 - Only services bookable somewhere are shown. A clinic is shown only if it offers the service. A doctor is shown only if they perform the service at that clinic.
 - Every doctor card shows: name, title, photo, short bio, "patients treated" number (real count of distinct patients with completed visits; hidden if the admin switches it off), their working days and hours at that clinic, and free times for today and the next 7 days (admin-editable).
 - Skip rule: one service, one clinic, or one doctor is selected automatically and the step is skipped; if the doctor is auto-selected, still show a small card introducing them above the time chooser.
 - Online bookings are confirmed immediately (setting auto_confirm_online, default true; if off they arrive as "requested"). The server re-validates the slot at submit (409 if taken) using the existing schedule lock.
 - "Booking for": myself, or someone else (name). The mobile number identifies the contact; one number can hold several patients.
 - Copy is conversational and lives in ONE module (frontend/src/content/booking-copy.ts), keyed so Urdu can be added. Example: "We value your time, so please choose the clinic that suits you best."

2 LEAD STATUSES: unconverted, converted, patient, cold, failed_conversion, archived (manual only).
 Migration of old values: new, contacted, qualified -> unconverted; converted stays; archived stays.
 Rules: capture = unconverted. Booking created = converted. First booking marked completed = patient. cold = 3 logged attempts and cold_wait_hours (default 24) with no reply or booking; creates ONE call task. failed_conversion = automation reports all channels failed; creates ONE task. No automatic reverts; reception may set status by hand (audited).
 Re-contact rule: When a lead is cold, failed_conversion, converted, or patient and the same phone contacts again, a NEW open lead (unconverted) is created with its own fresh capture token. The database partial unique index uq_leads_open_phone on (phone_normalized) WHERE status = 'unconverted' guarantees that at most ONE open (unconverted) lead exists per normalized phone; contacting again while a lead is already unconverted resumes/updates that existing open lead. Lookups by phone across all historical statuses utilize the non-unique B-tree index ix_leads_phone_normalized on leads(phone_normalized).
 Lead sources: website_abandon, website_booking, whatsapp_message, whatsapp_missed_call, phone_missed_call, call_desk, manual.

3 SETTINGS (booking_flow_settings, per organisation): followup_gaps_minutes [10, 1440, 2880], max_attempts 3, cold_wait_hours 24, hold_minutes 30, fallback_owner_user_id (nullable; tasks are unassigned and appear in the reception queue when unset; never hardcode a person's name), auto_confirm_online true, days_shown 7, show_patients_treated true, lead_capture_notice text.

4 CALL DESK (reception): enter the caller's number; show patients with that number, leads with history, upcoming bookings, recent messages. "Start call" places a contact hold (hold_minutes, extendable) that blocks lead-recovery messages to that number only (confirmations and reminders are not blocked). The booking uses the same screens as the website, with the caller's number prefilled and locked (changing it needs a confirmation). Outcomes: booked, callback_requested, dropped, wrong_number, not_interested, info_only. Ending the call releases the hold. If the call drops after contact details were collected, save a lead (unconverted) so the follow-up sequence resumes. If nothing was collected, create no lead. Booking made on a call is still followed by the normal confirmation message (Step 9); only the recovery sequence is suppressed.

5 DATA RULES: one phone normalisation function (Pakistan format 92...) applied on every write; phone_normalized columns indexed. Services are linked to clinics (clinic_services). Doctors are linked to services (service_providers); if a service has no provider rows, every active doctor at that clinic can perform it (document this and show it in admin). The admin must see which services are not bookable and why.

6 INTEGRATION (later phase): service-account API key, scoped, audited; endpoints for capturing leads, logging attempts, reading due follow-ups (excluding held numbers), recording messages (inbound and outbound), changing status, looking up a phone, listing options, creating, cancelling and rescheduling bookings, and reading confirmation data.

7 OUT OF SCOPE: sending WhatsApp or SMS, call capture, the automation sequencer, a patient login, payments changes, anything in the first PR.
