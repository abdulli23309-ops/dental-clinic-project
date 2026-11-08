# Marlow Dental — Automation Integration API Reference

This document describes the external automation seam for Marlow Dental. It allows authorized bots, communication platforms (e.g., WhatsApp Business API, SMS gateways), and CRM automations to interact safely with Marlow Dental without exposing direct database access or administrative credentials.

---

## 1. Authentication & Security Architecture

### Key Management
- **Key Format:** Random 32 cryptographically secure bytes, formatted with prefix: `mk_<64 hex characters>`.
- **Storage:** Keys are stored hashed with SHA-256 (`key_hash`). Only the key prefix (`key_prefix`, first 11 characters) is stored in plaintext for client identification.
- **Verification:** Keys are verified in constant time (`hmac.compare_digest`) against the stored SHA-256 digest.
- **Single Reveal:** Raw keys are generated and returned **only once** upon client creation or key rotation. They cannot be retrieved again from the system.
- **Revocation:** Keys can be revoked or deactivated immediately from the admin panel at `/admin/integrations`.

### Transport & Headers
All integration requests must include the API key in the `X-Marlow-Key` header:
```http
X-Marlow-Key: <your_marlow_integration_key>
```

### Rate Limiting & Auditing
- **Rate Limit:** 120 requests/minute per client IP / key (configurable via slowapi).
- **Audit Logging:** Every single integration call is automatically recorded in the activity log table (`activity_logs`) with the client ID, endpoint path, method, and client IP.
- **Optional IP Allowlist:** Clients may configure an optional list of allowed IPv4/IPv6 addresses (`ip_allowlist`). If configured, requests originating from outside the allowlist are rejected with `401 Unauthorized`.

---

## 2. Scopes

Every API client is granted one or more granular scopes:

| Scope | Description |
|---|---|
| `leads:read` | Read lead details, check due follow-ups |
| `leads:write` | Capture leads, log contact attempts, update lead status, mark failed conversions |
| `messages:read` | Inspect message records |
| `messages:write` | Record inbound/outbound communication messages with deduplication |
| `bookings:read` | Read booking options, confirmation data, and unconfirmed bookings |
| `bookings:write` | Create, reschedule, and cancel patient bookings |
| `lookup:read` | Perform phone lookups to retrieve caller context, holds, and history |

---

## 3. Error Responses

Standard HTTP status codes used across all integration endpoints:

| Status Code | Meaning | Example Detail |
|---|---|---|
| `400 Bad Request` | Invalid parameter or business rule violation | `Booking is already cancelled` |
| `401 Unauthorized` | Missing, malformed, revoked key, or IP denied | `Missing API key in X-Marlow-Key header` |
| `403 Forbidden` | Key is valid but lacks required scope | `Forbidden: integration client lacks required scope 'bookings:write'` |
| `404 Not Found` | Requested entity (lead, booking, doctor) not found | `Lead not found` |
| `409 Conflict` | Slot double-booking or scheduling conflict | `Double-booking conflict: The selected time slot is no longer available.` |
| `422 Unprocessable Entity` | Request payload validation failure | Invalid phone format or unknown status value |
| `429 Too Many Requests` | Exceeded rate limit (120 req/min) | Rate limit exceeded |

---

## 4. Integration Endpoints (`/api/v1/integration`)

### 4.1 Capture Lead
Capture a new prospect lead or update an existing open lead.

- **Endpoint:** `POST /api/v1/integration/leads`
- **Scope:** `leads:write`
- **Request Body:**
```json
{
  "name": "Kamran Khan",
  "phone": "0300 7654321",
  "email": "kamran@example.com",
  "source": "whatsapp_message",
  "notes": "Inquired about dental checkup"
}
```
- **Response (`201 Created`):**
```json
{
  "id": "e3b0c442-98fc-1c14-9afb-4c7601826640",
  "name": "Kamran Khan",
  "phoneNormalized": "923007654321",
  "status": "unconverted",
  "source": "whatsapp_message",
  "attempts": 0,
  "lastContactedAt": null,
  "nextAttemptAt": null,
  "createdAt": "2026-10-18T20:30:00Z"
}
```

---

### 4.2 Log Contact Attempt
Log an outreach attempt (call, WhatsApp, SMS). Increments the attempt counter and computes the next attempt time based on the clinic's configured cadence gaps.

- **Endpoint:** `POST /api/v1/integration/leads/{lead_id}/attempt`
- **Scope:** `leads:write`
- **Request Body:**
```json
{
  "channel": "whatsapp",
  "result": "no_answer",
  "notes": "Message sent, awaiting delivery"
}
```
- **Response (`200 OK`):**
```json
{
  "leadId": "e3b0c442-98fc-1c14-9afb-4c7601826640",
  "status": "unconverted",
  "attempts": 1,
  "lastContactedAt": "2026-10-18T20:35:00Z",
  "nextAttemptAt": "2026-10-18T20:50:00Z",
  "message": "Contact attempt #1 recorded successfully."
}
```

---

### 4.3 List Leads Due for Follow-up
Returns open leads whose next attempt time has arrived. Respects followup cadence gaps and automatically excludes phone numbers with active contact holds and leads marked converted or cold.

- **Endpoint:** `GET /api/v1/integration/leads/due`
- **Scope:** `leads:read`
- **Response (`200 OK`):**
```json
{
  "count": 1,
  "leads": [
    {
      "id": "e3b0c442-98fc-1c14-9afb-4c7601826640",
      "name": "Kamran Khan",
      "phoneNormalized": "923007654321",
      "source": "whatsapp_message",
      "status": "unconverted",
      "attempts": 1,
      "lastContactedAt": "2026-10-18T20:35:00Z",
      "nextAttemptAt": "2026-10-18T20:50:00Z",
      "notes": "Inquired about dental checkup",
      "createdAt": "2026-10-18T20:30:00Z"
    }
  ]
}
```

---

### 4.4 Record Message
Record inbound or outbound communications (SMS, WhatsApp). Automatically deduplicated by `(provider, providerMessageId)` so webhooks delivered multiple times do not generate duplicate records.

- **Endpoint:** `POST /api/v1/integration/messages`
- **Scope:** `messages:write`
- **Request Body:**
```json
{
  "direction": "inbound",
  "channel": "whatsapp",
  "purpose": "lead_recovery",
  "recipientPhone": "03001234567",
  "body": "Hi, I would like to book a dental checkup tomorrow at 10 AM",
  "provider": "meta",
  "providerMessageId": "wamid.HBgLMOTIzMDAxMjM0NTY3FQIAERgSMzNBMjAw",
  "leadId": "e3b0c442-98fc-1c14-9afb-4c7601826640"
}
```
- **Response (`201 Created` for first delivery, `200 OK` if deduplicated):**
```json
{
  "id": "f4c1d553-09ad-2d25-0bfa-5d8712937751",
  "direction": "inbound",
  "channel": "whatsapp",
  "purpose": "lead_recovery",
  "recipientPhone": "923001234567",
  "status": "logged",
  "deduplicated": false,
  "providerMessageId": "wamid.HBgLMOTIzMDAxMjM0NTY3FQIAERgSMzNBMjAw",
  "createdAt": "2026-10-18T20:36:00Z"
}
```

---

### 4.5 Change Lead Status
Transition lead through allowed lifecycle stages (`unconverted`, `converted`, `patient`, `cold`, `failed_conversion`, `archived`).

- **Endpoint:** `PATCH /api/v1/integration/leads/{lead_id}/status`
- **Scope:** `leads:write`
- **Request Body:**
```json
{
  "status": "cold",
  "notes": "Patient unreachable across all communication channels"
}
```
- **Response (`200 OK`):**
```json
{
  "id": "e3b0c442-98fc-1c14-9afb-4c7601826640",
  "name": "Kamran Khan",
  "phoneNormalized": "923007654321",
  "status": "cold",
  "source": "whatsapp_message",
  "attempts": 3,
  "lastContactedAt": "2026-10-18T20:35:00Z",
  "nextAttemptAt": null,
  "createdAt": "2026-10-18T20:30:00Z"
}
```

---

### 4.6 Mark Failed Conversion
Transitions lead status to `failed_conversion` and creates exactly one high-priority task assigned to the reception fallback owner.

- **Endpoint:** `POST /api/v1/integration/leads/{lead_id}/failed-conversion`
- **Scope:** `leads:write`
- **Request Body:**
```json
{
  "reason": "All 3 follow-up attempts completed without response"
}
```
- **Response (`200 OK`):**
```json
{
  "id": "e3b0c442-98fc-1c14-9afb-4c7601826640",
  "name": "Kamran Khan",
  "phoneNormalized": "923007654321",
  "status": "failed_conversion",
  "source": "whatsapp_message",
  "attempts": 3,
  "lastContactedAt": "2026-10-18T20:35:00Z",
  "nextAttemptAt": null,
  "createdAt": "2026-10-18T20:30:00Z"
}
```

---

### 4.7 Lookup by Phone
Provides caller intelligence for bots and IVR:
- Normalized phone number
- Active contact hold status
- Registered patient details (if registered)
- Active open lead (if present)
- Prior choices (clinic, service, doctor) derived from the last booking
- Upcoming scheduled bookings

- **Endpoint:** `GET /api/v1/integration/lookup?phone={phone}`
- **Scope:** `lookup:read`
- **Response (`200 OK`):**
```json
{
  "phoneNormalized": "923008889999",
  "isHeld": false,
  "patient": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "fullName": "Fatima Zahra",
    "phone": "03008889999"
  },
  "lead": null,
  "priorChoices": {
    "clinicId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    "clinicName": "Main Clinic Lahore",
    "serviceId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    "serviceName": "General Consultation",
    "doctorId": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90",
    "doctorName": "Dr. Sarah Tariq"
  },
  "upcomingBookings": []
}
```

---

### 4.8 Booking Options
Returns available clinics, services, doctors, and bookable time slots using the exact same availability and eligibility rules as the public website.

- **Endpoint:** `GET /api/v1/integration/booking-options?clinic_id={clinic_id}&service_id={service_id}&doctor_id={doctor_id}&days_ahead=7`
- **Scope:** `bookings:read`
- **Response (`200 OK`):**
```json
{
  "clinics": [
    {
      "id": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
      "name": "Main Clinic Lahore",
      "address": "Plaza 45, Phase 5 DHA, Lahore",
      "phone": "04235891234"
    }
  ],
  "services": [
    {
      "id": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
      "slug": "general-consultation",
      "title": "General Consultation",
      "duration": "30 min",
      "price": "Rs 2,500"
    }
  ],
  "doctors": [
    {
      "id": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90",
      "name": "Dr. Sarah Tariq",
      "title": "BDS, RDS Lead Dentist"
    }
  ],
  "availableSlots": [
    {
      "date": "2026-10-25",
      "slots": ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
    }
  ]
}
```

---

### 4.9 Create Booking
Books an appointment. Validates slot conflict (returns `409 Conflict` if slot was taken concurrently), matches/creates the patient, and marks open leads for caller phone as `converted`.

- **Endpoint:** `POST /api/v1/integration/bookings`
- **Scope:** `bookings:write`
- **Request Body:**
```json
{
  "patientName": "Hamza Ali",
  "patientPhone": "0300 5551234",
  "patientEmail": "hamza@example.com",
  "serviceId": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
  "clinicId": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
  "doctorId": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f90",
  "bookingDate": "2026-10-28",
  "bookingTime": "14:00",
  "notes": "Booked via WhatsApp bot",
  "source": "whatsapp_message"
}
```
- **Response (`201 Created`):**
```json
{
  "id": "a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
  "confirmationId": "MD-4B7E9A",
  "patientName": "Hamza Ali",
  "patientPhone": "923005551234",
  "serviceName": "General Consultation",
  "clinicName": "Main Clinic Lahore",
  "doctorName": "Dr. Sarah Tariq",
  "bookingDate": "2026-10-28",
  "bookingTime": "14:00",
  "status": "confirmed",
  "source": "whatsapp_message",
  "leadConverted": true,
  "createdAt": "2026-10-18T20:40:00Z"
}
```

---

### 4.10 Reschedule Booking
Reschedules a confirmed booking to a new date and time, running conflict checks against active appointments.

- **Endpoint:** `POST /api/v1/integration/bookings/{booking_id}/reschedule`
- **Scope:** `bookings:write`
- **Request Body:**
```json
{
  "newBookingDate": "2026-10-29",
  "newBookingTime": "15:00"
}
```
- **Response (`200 OK`):**
```json
{
  "id": "a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
  "confirmationId": "MD-4B7E9A",
  "patientName": "Hamza Ali",
  "patientPhone": "923005551234",
  "serviceName": "General Consultation",
  "clinicName": "Main Clinic Lahore",
  "doctorName": "Dr. Sarah Tariq",
  "bookingDate": "2026-10-29",
  "bookingTime": "15:00",
  "status": "confirmed",
  "source": "whatsapp_message",
  "leadConverted": false,
  "createdAt": "2026-10-18T20:40:00Z"
}
```

---

### 4.11 Cancel Booking
Cancels a booking with a required cancellation reason.

- **Endpoint:** `POST /api/v1/integration/bookings/{booking_id}/cancel`
- **Scope:** `bookings:write`
- **Request Body:**
```json
{
  "cancellationReason": "Patient requested cancellation via WhatsApp"
}
```
- **Response (`200 OK`):**
```json
{
  "id": "a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
  "confirmationId": "MD-4B7E9A",
  "patientName": "Hamza Ali",
  "patientPhone": "923005551234",
  "serviceName": "General Consultation",
  "clinicName": "Main Clinic Lahore",
  "doctorName": "Dr. Sarah Tariq",
  "bookingDate": "2026-10-29",
  "bookingTime": "15:00",
  "status": "cancelled",
  "source": "whatsapp_message",
  "leadConverted": false,
  "createdAt": "2026-10-18T20:40:00Z"
}
```

---

### 4.12 Get Booking Confirmation Data
Retrieves structured appointment information needed by bots to draft a complete, accurate confirmation message to the patient.

- **Endpoint:** `GET /api/v1/integration/bookings/{booking_id}/confirmation-data`
- **Scope:** `bookings:read`
- **Response (`200 OK`):**
```json
{
  "bookingId": "a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
  "confirmationId": "MD-4B7E9A",
  "serviceName": "General Consultation",
  "clinicName": "Main Clinic Lahore",
  "clinicAddress": "Plaza 45, Phase 5 DHA, Lahore",
  "clinicPhone": "04235891234",
  "doctorName": "Dr. Sarah Tariq",
  "bookingDate": "2026-10-28",
  "bookingTime": "14:00",
  "patientName": "Hamza Ali",
  "patientPhone": "923005551234",
  "patientEmail": "hamza@example.com",
  "status": "confirmed"
}
```

---

### 4.13 List Confirmed Bookings Without Confirmation Message
Lists confirmed bookings for which no confirmation message has been recorded yet. Automations poll or listen on this endpoint to guarantee every confirmed booking receives a confirmation notice.

- **Endpoint:** `GET /api/v1/integration/bookings/unconfirmed-messages`
- **Scope:** `bookings:read`
- **Response (`200 OK`):**
```json
{
  "count": 1,
  "bookings": [
    {
      "bookingId": "a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
      "confirmationId": "MD-4B7E9A",
      "serviceName": "General Consultation",
      "clinicName": "Main Clinic Lahore",
      "clinicAddress": "Plaza 45, Phase 5 DHA, Lahore",
      "clinicPhone": "04235891234",
      "doctorName": "Dr. Sarah Tariq",
      "bookingDate": "2026-10-28",
      "bookingTime": "14:00",
      "patientName": "Hamza Ali",
      "patientPhone": "923005551234",
      "patientEmail": "hamza@example.com",
      "status": "confirmed"
    }
  ]
}
```

---

### 4.14 List Communication Messages
Lists logged communication messages and delivery receipts. Can be filtered by recipient phone, booking ID, or lead ID.

- **Endpoint:** `GET /api/v1/integration/messages?phone={phone}&booking_id={booking_id}&lead_id={lead_id}&limit=50`
- **Scope:** `messages:read`
- **Response (`200 OK`):**
```json
[
  {
    "id": "f4c1d553-09ad-2d25-0bfa-5d8712937751",
    "direction": "inbound",
    "channel": "whatsapp",
    "purpose": "lead_recovery",
    "recipientPhone": "923001234567",
    "status": "logged",
    "deduplicated": false,
    "providerMessageId": "wamid.HBgLMOTIzMDAxMjM0NTY3FQIAERgSMzNBMjAw",
    "createdAt": "2026-10-18T20:36:00Z"
  }
]
```

---

## 5. Admin Integration Management (`/api/v1/admin/integrations`)

The administrative endpoints are authenticated via JWT Bearer token with `admin` role and are used by `/admin/integrations`:

- `GET /api/v1/admin/integrations`: List registered clients with scopes, active status, and last used timestamps.
- `POST /api/v1/admin/integrations`: Create client; returns `rawKey` once.
- `POST /api/v1/admin/integrations/{client_id}/rotate`: Rotates client key; returns new `rawKey` once.
- `POST /api/v1/admin/integrations/{client_id}/revoke`: Immediately revokes client access.
- `POST /api/v1/admin/integrations/{client_id}/toggle-active`: Toggle active/inactive state.
