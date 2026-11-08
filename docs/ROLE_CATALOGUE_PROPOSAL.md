# Marlow Medical Complex — Healthcare Role Catalogue Proposal

> **NOTICE**: *This document represents an architectural proposal and capability specification inferred from the audit gap analysis, Pakistani healthcare regulatory requirements (Islamabad Capital Territory / Punjab Healthcare Commission standards), and international hospital information system (HIS) standards. Research agents and clinical steering committees will validate and refine these role models before implementation.*

---

## Executive Summary

The existing system provides robust primitives for an ambulatory dental practice (`Admin`, `Doctor`, `Receptionist`, and `Public Visitor`). However, expanding to a **medium medical complex (50–200 beds or large outpatient polyclinic with Lab, Pharmacy, Radiology, ER, and Day Ward)** in Islamabad, the Gulf, and Africa requires **12 dedicated operational roles**.

---

## 1. Nurse (Inpatient / Outpatient Clinical Support)

- **Purpose**: Frontline patient triage, vital signs acquisition, medical alert verification, in-chair doctor assisting, inpatient ward care, and Medication Administration Record (MAR) execution.
- **Priority**: **P0** (Critical for clinical expansion)
- **Effort**: **M** (Medium)
- **Dependencies**: Clinical encounter service, patient document service, room/bed scheduling.
- **Data Owned**:
  - Triage records & vital signs (temperature, pulse, BP, SpO2, respiratory rate, pain scale, weight, height).
  - Pre-op surgical checklists & post-procedure recovery monitoring notes.
  - Medication administration events (administered dose, time, route, nurse signature).
- **Five Key Screens**:
  1. `/nurse/triage`: Queue of arrived patients awaiting vitals capture and acuity assignment (Emergency Severity Index 1–5).
  2. `/nurse/vitals-entry`: Fast numeric keypad entry of vitals with automatic BMI and pediatric percentile computation.
  3. `/nurse/ward-mar`: Inpatient Medication Administration Record timeline showing due medications, barcode verification, and administration checkboxes.
  4. `/nurse/pre-op-checklist`: Surgical/procedure consent verification, allergy check, fasting status, and instrument tray readiness.
  5. `/nurse/doctor-assist`: Chairside assistant view to acknowledge dental chart findings and record chairside material consumption.
- **Permissions**:
  - `vitals:create`, `vitals:read`, `vitals:update`
  - `medication_administration:create`, `medication_administration:read`
  - `patient_alerts:create_pending`
  - `encounters:read_summary`

---

## 2. Pharmacist / Pharmacy Dispenser

- **Purpose**: Order verification of electronic prescriptions, drug-drug interaction screening, inpatient unit-dose and outpatient dispensing, patient medication counselling, and pharmacy stock deduction.
- **Priority**: **P0**
- **Effort**: **M**
- **Dependencies**: Doctor prescription document engine, central store inventory, billing ledger.
- **Data Owned**:
  - Pharmacy dispensing records & prescription fulfillment states (`pending`, `verified`, `dispensed`, `cancelled`).
  - Drug formulary metadata (generic names, brand equivalents, dosage forms, therapeutic categories).
  - Pharmacy retail price lists & dispensing audit records.
- **Five Key Screens**:
  1. `/pharmacy/queue`: Inbound e-prescription orders stream from outpatient clinics and inpatient ward discharge.
  2. `/pharmacy/dispense/[id]`: Prescription verification screen displaying doctor notes, allergy warnings, drug interactions, and inventory lot selection.
  3. `/pharmacy/pos`: Walk-in over-the-counter (OTC) pharmacy point-of-sale with cash/card collection and thermal receipt printing.
  4. `/pharmacy/stock-balance`: Real-time pharmacy shelf stock, near-expiry alerts, and stock replenishment request trigger.
  5. `/pharmacy/controlled-substances`: Regulatory register for narcotics, sedatives, and controlled substance double-signature tracking.
- **Permissions**:
  - `prescriptions:read`, `prescriptions:verify`, `prescriptions:dispense`
  - `pharmacy_pos:create_sale`, `pharmacy_pos:void_sale`
  - `drug_inventory:read`, `drug_inventory:adjust`

---

## 3. Lab Technician (Pathology, Hematology & Dental Lab)

- **Purpose**: Ingestion of physician lab requisitions, patient sample collection/accessioning, barcode tube labeling, analyzer instrument results entry, and external dental lab prosthetic tracking (crowns, bridges, dentures).
- **Priority**: **P1**
- **Effort**: **M**
- **Dependencies**: Clinical encounter orders, patient registration (barcode/MRN), cashier billing clearance.
- **Data Owned**:
  - Lab test orders & specimen accession numbers.
  - Test result values, reference ranges, and critical panic flags.
  - Dental prosthetic laboratory fabrication orders (shade, impression date, delivery due date, lab name, try-in status).
- **Five Key Screens**:
  1. `/lab/requisitions`: Worklist of ordered tests filtered by collection status (phlebotomy collection, pending processing, completed).
  2. `/lab/accessioning`: Specimen check-in with barcode scanner input, rejection of clotted/hemolyzed samples.
  3. `/lab/results-entry/[id]`: Grid entry of biochemical/hematological values with out-of-range visual alerts.
  4. `/lab/verification`: Pathologist / Chief Tech sign-off before results publish to the doctor and patient portal.
  5. `/lab/dental-prosthetics`: External dental lab tracker monitoring sent impressions, try-in stage, return tracking, and vendor fees.
- **Permissions**:
  - `lab_orders:read`, `lab_orders:update_status`
  - `lab_results:create`, `lab_results:verify`
  - `dental_lab_cases:create`, `dental_lab_cases:read`, `dental_lab_cases:update`

---

## 4. Radiologist / X-Ray & Imaging Technician

- **Purpose**: Execution of diagnostic imaging exams (Intraoral X-Rays, OPG / Orthopantomogram, Cone Beam CT / CBCT, Ultrasound, General X-Ray), PACS image storage, and formal radiology diagnostic reporting.
- **Priority**: **P1**
- **Effort**: **M**
- **Dependencies**: Clinical attachment repository, billing clearance, room/equipment scheduling.
- **Data Owned**:
  - Radiology study orders and DICOM / high-resolution image uploads.
  - Radiology study findings and structured reports.
- **Five Key Screens**:
  1. `/radiology/worklist`: Imaging orders queue filtered by modality (OPG, CBCT, Intraoral, Chest X-Ray).
  2. `/radiology/upload`: Secure drag-and-drop / PACS DICOM bridge with patient metadata verification.
  3. `/radiology/viewer/[study_id]`: High-resolution web image viewer with zoom, pan, contrast/brightness windowing, and measurement tools.
  4. `/radiology/report-editor`: Structured diagnostic reporting template (Technique, Findings, Impression) with digital radiologist signature.
  5. `/radiology/radiation-log`: Machine maintenance and patient radiation dosage tracking register.
- **Permissions**:
  - `radiology_orders:read`, `radiology_orders:update_status`
  - `radiology_studies:create_upload`, `radiology_studies:read`
  - `radiology_reports:create`, `radiology_reports:sign`

---

## 5. Cashier / Billing Officer (Central Billing Desk)

- **Purpose**: Centralized hospital cashiering, comprehensive patient invoice generation, multi-department consolidated billing (consultation + pharmacy + lab + radiology + ward), advance deposits holding, and shift cash drawer reconciliation.
- **Priority**: **P0** (Immediate requirement for complex revenue control)
- **Effort**: **L** (Large)
- **Dependencies**: Visit payment repo, organization pricing rules, branch manager shift controls.
- **Data Owned**:
  - Formal sequential fiscal receipts and tax invoices (`INV-2026-XXXXX`).
  - Advance deposit accounts (patient wallet / credit balance).
  - Cash drawer shift sessions (opening float, cash-in/cash-out, closing physical count, variance).
- **Five Key Screens**:
  1. `/billing/checkout`: Master billing counter searching patient by MRN/CNIC; consolidates all pending charges across clinics, lab, and pharmacy into a single invoice.
  2. `/billing/advance-deposits`: Intake of upfront surgical or inpatient admission cash deposits with wallet allocation.
  3. `/billing/drawer-shift`: Daily drawer opening float input, mid-day cash drops, and shift closing cash drawer count with handover sign-off.
  4. `/billing/refunds-adjustments`: Processing approved refunds and credit notes with supervisor authentication token.
  5. `/billing/daily-z-report`: End-of-shift financial settlement report breaking down collections by Cash, POS Card, Bank Transfer, and Corporate Panel.
- **Permissions**:
  - `invoices:create`, `invoices:read`, `invoices:cancel`
  - `payments:create`, `payments:void`
  - `deposits:create`, `deposits:allocate`
  - `cash_drawer:open`, `cash_drawer:close`, `cash_drawer:transfer`

---

## 6. Store / Inventory Keeper

- **Purpose**: Procurement, inventory receiving (Goods Received Note - GRN), central warehouse stock management, departmental requisition fulfillment (to dental chairs, pharmacy, lab, OT), and batch/expiry auditing.
- **Priority**: **P1**
- **Effort**: **L**
- **Dependencies**: Organization clinics/departments, vendor management.
- **Data Owned**:
  - Central item catalog (consumables, dental implants, surgical gloves, pharmaceuticals, equipment spare parts).
  - Supplier/vendor profiles, purchase orders (PO), and GRNs.
  - Stock levels across store locations, lot numbers, unit costs, and expiry dates.
- **Five Key Screens**:
  1. `/store/inventory-levels`: Master stock table displaying reorder thresholds, safety stock warnings, and stock on hand.
  2. `/store/goods-receipt`: Intake screen for supplier shipments matching PO against physical count, invoice, and expiry dates.
  3. `/store/department-issues`: Internal requisition inbox approving and dispatching supplies to Reception, Chair 1, Chair 2, Lab, and Ward.
  4. `/store/expiry-waste`: Near-expiry (30/60/90 days) alerts and damaged/quarantine stock write-off approval.
  5. `/store/purchase-orders`: Generation of supplier procurement requests based on automated min-max calculations.
- **Permissions**:
  - `inventory:read`, `inventory:create_item`, `inventory:adjust`
  - `purchase_orders:create`, `purchase_orders:read`, `purchase_orders:receive`
  - `stock_issues:approve`, `stock_issues:dispatch`

---

## 7. Insurance & Panel Coordinator

- **Purpose**: Management of corporate and third-party payer panels (e.g. State Life, Sehat Sahulat, EOBI, private insurance companies, corporate employee agreements), eligibility pre-authorization, claim filing, and reimbursement reconciliation.
- **Priority**: **P0** (Crucial for Pakistani and Gulf private hospital viability)
- **Effort**: **L**
- **Dependencies**: Central billing invoice generator, patient registration schema, appointment booking.
- **Data Owned**:
  - Insurance panel contracts, discounted tariff schedules, and co-payment percentages.
  - Pre-authorization requests, claim submissions, and insurance claim tracking states (`submitted`, `approved`, `partially_approved`, `rejected`, `settled`).
- **Five Key Screens**:
  1. `/panel/claims-dashboard`: Overview of claims pipeline by payer, outstanding receivable aging (30/60/90 days), and rejection rate.
  2. `/panel/pre-authorization`: Submission of medical justifications, treatment plans, and diagnostic X-rays to panel portals for pre-approval.
  3. `/panel/claim-builder`: Assembling hospital invoice, doctor notes, lab reports, and signed voucher into a digital claim bundle.
  4. `/panel/remittance-advice`: Logging bulk insurance payments received and reconciling short-payments or deductions against invoices.
  5. `/panel/payer-contracts`: Defining negotiated procedure rates, exclusions, and patient co-pay rules per insurance provider.
- **Permissions**:
  - `insurance_contracts:create`, `insurance_contracts:read`, `insurance_contracts:update`
  - `insurance_claims:create`, `insurance_claims:submit`, `insurance_claims:reconcile`
  - `billing:apply_panel_credit`

---

## 8. Ward In-Charge / Inpatient Bed Manager

- **Purpose**: Management of inpatient bed allocations, Admission-Discharge-Transfer (ADT) flow, ward nursing staffing, patient bed transfers (e.g. Day Surgery $\rightarrow$ Inpatient Ward $\rightarrow$ Discharge Lounge), and discharge clearance.
- **Priority**: **P1**
- **Effort**: **M**
- **Dependencies**: Bed/room model, clinical doctor discharge orders, cashier payment clearance.
- **Data Owned**:
  - Ward beds, occupancy status (`vacant_clean`, `vacant_dirty`, `occupied`, `maintenance`), and daily room tariffs.
  - Admission records, admission source (ER, OPD, elective referral), bed history, and discharge planning.
- **Five Key Screens**:
  1. `/ward/bed-matrix`: Visual floorplan/grid showing real-time occupancy across private rooms, shared bays, and recovery beds.
  2. `/ward/admissions`: Incoming patient admission queue from OPD clinics and ER awaiting bed assignment.
  3. `/ward/bed-transfer`: Inter-ward transfer modal updating bed location and notifying nursing stations.
  4. `/ward/discharge-tracker`: Multi-gate discharge checklist (Doctor clinical summary signed $\rightarrow$ Pharmacy discharge medications ready $\rightarrow$ Cashier bill settled $\rightarrow$ Nurse discharge band removed).
  5. `/ward/housekeeping`: Room turnover management for environmental cleaning and disinfection between patients.
- **Permissions**:
  - `beds:read`, `beds:assign`, `beds:change_status`
  - `admissions:create`, `admissions:read`, `admissions:transfer`, `admissions:discharge`

---

## 9. Medical Records Officer (HIM / MRD)

- **Purpose**: Overseeing patient master identity integrity (Master Patient Index - MPI), CNIC/National ID verification, medical records archiving, release-of-information legal compliance, and ICD-10 diagnostic coding audit.
- **Priority**: **P1**
- **Effort**: **M**
- **Dependencies**: Patient repository, document attachment service, activity audit log.
- **Data Owned**:
  - Master Patient Index (MPI), duplicate patient merges, and identity corrections.
  - Medico-legal document requests, patient release-of-information consents, and clinical archival flags.
  - Morbidity / ICD-10 diagnostic coding tags for reporting to public health authorities.
- **Five Key Screens**:
  1. `/mrd/mpi-deduplication`: Advanced duplicate resolution dashboard detecting phonetic name matches, shared CNIC, or shared phone numbers with record merge tool.
  2. `/mrd/patient-file-archive`: Physical paper chart rack location tracker and digital archive status.
  3. `/mrd/record-release`: Tracking official medical records requests by patients, legal courts, or insurance auditors.
  4. `/mrd/coding-review`: Auditing clinical encounter notes and assigning standardized ICD-10 and CPT/CDT procedure codes.
  5. `/mrd/mortality-morbidity`: Statutory reporting for infectious disease reporting and healthcare authority compliance.
- **Permissions**:
  - `patients:merge`, `patients:correct_identity`
  - `clinical_records:audit_view`, `clinical_records:archive`
  - `activity_logs:export_mrd`

---

## 10. Branch / Medical Director Manager

- **Purpose**: Daily clinic operational supervision, revenue oversight, dispute resolution, manager-level fee discount / refund authorization, clinical staff roster scheduling, and facility policy enforcement.
- **Priority**: **P0** (Already partially modeled in backend as `Clinic Branch Manager`)
- **Effort**: **S** (Small - requires completing frontend views for existing backend roles)
- **Dependencies**: Activity audit repository, billing engine, user management.
- **Data Owned**:
  - Managerial approval tokens for discounts, refunds, and voided transactions.
  - Provider work rosters, room assignments, and facility service hours overrides.
  - Incident reports and patient satisfaction escalations.
- **Five Key Screens**:
  1. `/manager/operations-dashboard`: Unified cockpit displaying live clinic patient throughput, doctor on-duty status, current wait times, and real-time revenue collection.
  2. `/manager/approvals-inbox`: Immediate pending approval cards for fee discounts exceeding staff thresholds, transaction refunds, and bad-debt write-offs.
  3. `/manager/shift-cash-verification`: Verification and electronic countersignature of daily cashier drawer closures and bank deposit slips.
  4. `/manager/staff-roster`: Weekly and monthly scheduling of receptionists, nurses, and doctors across clinics and shifts.
  5. `/manager/incident-desk`: Logging and investigating customer complaints, medical errors, and service delays with resolution tracking.
- **Permissions**:
  - `approvals:authorize_discount`, `approvals:authorize_refund`
  - `reception:all_clinic_scoped`
  - `cashier:verify_shift_closure`
  - `reports:read_clinic_financials`

---

## 11. IT Administrator / Security Officer

- **Purpose**: Enterprise identity management, Role-Based Access Control (RBAC), multi-clinic branch provisioning, API integration credentials & webhook management, system security auditing, and backup/restore monitoring.
- **Priority**: **P1**
- **Effort**: **M**
- **Dependencies**: Auth service, activity log repository, integration client service.
- **Data Owned**:
  - Staff user authentication accounts, role assignments, and session revocation controls.
  - Integration API keys, OAuth clients, and third-party webhook subscriptions.
  - System security parameters, password policies, and rate-limit configuration.
- **Five Key Screens**:
  1. `/it-admin/users-rbac`: User provisioning screen with granular role assignment, clinic multi-scoping, and one-click account suspension.
  2. `/it-admin/active-sessions`: Live monitoring of active staff sessions, IP addresses, inactivity triggers, and remote force-logout button.
  3. `/it-admin/audit-inspector`: Comprehensive security log search with filters for entity type, actor, IP address, and date range with CSV/JSON export.
  4. `/it-admin/integrations`: Management of external integration clients (CTI PBX, NADRA CNIC verifier, SMS gateways, insurance portals) and API key rotation.
  5. `/it-admin/system-health`: Real-time status of database connection pools, background message queues, disk storage, and automated backup logs.
- **Permissions**:
  - `users:manage_all`
  - `security:revoke_sessions`
  - `integrations:manage_keys`
  - `audit:export_full`

---

## 12. Patient Portal User (Mobile & Web Self-Service)

- **Purpose**: Empowering patients and family guardians with 24/7 self-service scheduling, appointment management, digital intake/consent completion, invoice settlement, and viewing diagnostic lab/radiology reports.
- **Priority**: **P1**
- **Effort**: **L**
- **Dependencies**: Authentication service (OTP SMS/WhatsApp login), patient repository, appointment booking, payment gateway.
- **Data Owned**:
  - Patient personal account credentials, demographic preferences, and communication opt-ins.
  - Patient-submitted medical history forms, self-service consent signatures.
- **Five Key Screens**:
  1. `/portal/dashboard`: Personal welcome view displaying upcoming appointments, actionable alerts (e.g. "Fill out pre-visit consent"), and recent visit history.
  2. `/portal/book`: Interactive self-scheduling wizard with real-time doctor availability slots, service selection, and instant SMS confirmation.
  3. `/portal/documents`: Secure viewer for signed digital prescriptions, lab test reports, and imaging summaries.
  4. `/portal/billing`: Outstanding balance display, itemized visit invoices, and online credit/debit card payment integration.
  5. `/portal/family-members`: Management of linked dependents (children, elderly parents) to book visits and view health records under a single login.
- **Permissions**:
  - `portal:read_own_records`
  - `portal:book_own_appointment`
  - `portal:cancel_own_appointment`
  - `portal:sign_own_consent`
  - `portal:pay_own_invoice`

---

## Role Rollout Roadmap & Implementation Priority

| Phase | Target Timeline | Roles to Implement | Primary Business Outcome |
| :--- | :--- | :--- | :--- |
| **Phase 1: Front-Desk & Revenue Hardening** | Weeks 1–4 | **Cashier / Billing Officer**, **Branch Manager**, **Nurse (Triage)** | Eliminates front-desk cash leakage, enables CNIC identification, introduces manager discount approvals, and streamlines vital sign triage. |
| **Phase 2: Ancillary Departments Expansion** | Weeks 5–8 | **Pharmacist**, **Lab Technician**, **Radiologist**, **Insurance Coordinator** | Unlocks internal lab order processing, e-prescription pharmacy dispensing, OPG/CBCT diagnostic imaging, and corporate panel invoicing. |
| **Phase 3: Complex Hospital Operations** | Weeks 9–12 | **Ward In-Charge**, **Store Keeper**, **Medical Records Officer**, **IT Admin** | Enables inpatient bed management, central procurement/inventory decrement, Master Patient Index deduplication, and enterprise security. |
| **Phase 4: Patient Engagement** | Weeks 13–16 | **Patient Portal User** | Launches self-service online scheduling, digital consent, family account management, and lab report downloads. |
