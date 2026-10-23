# Proposed REST API Design

## Status

This is the Phase 1/2 contract proposal. It describes target behavior; the current Express routes are not yet guaranteed to satisfy every endpoint or authorization rule listed here. Do not treat a documented endpoint as implemented until it has a route and tests.

Base path: `/api`. Use HTTPS outside local development, JSON request/response bodies, server-side sessions, and a session-bound CSRF token for unsafe methods. The authenticated hospital context is selected from an active `user_roles` assignment or an explicit, validated context switch. Never accept `role`, `actor_user_id`, `hospital_id`, or patient ownership from the request body as proof of access.

## Response format

Success:

```json
{
  "success": true,
  "message": "Resource loaded",
  "data": {},
  "meta": { "requestId": "uuid", "page": 1, "pageSize": 25, "total": 0 }
}
```

Error:

```json
{
  "success": false,
  "message": "Permission denied",
  "errors": [{ "field": "authorization", "code": "FORBIDDEN", "message": "The action is not permitted" }],
  "requestId": "uuid"
}
```

Use 400 for invalid input, 401 for missing/invalid session, 403 for an authenticated but unauthorized action, 404 when a resource is absent or its existence must not be disclosed, 409 for a conflict such as a duplicate or appointment overlap, 429 for rate limiting, and 500 for a safe generic server error. Do not return SQL errors or stack traces to clients.

## Authentication and account security

| Method and path | Purpose / permission | Scope and ownership checks | Validation / responses |
|---|---|---|---|
| `GET /auth/csrf` | Issue a session-bound CSRF token; public session bootstrap | Token belongs to current session | 200 token; 5xx safe error |
| `POST /auth/login` | Authenticate by approved username/email/phone; public, rate-limited | Account must be active; avoid account-existence disclosure | Required identifier/password, size limits; 200 session + minimal user; 400, 401, 429 |
| `POST /auth/logout` | End current session; authenticated + CSRF | Destroy server session and clear cookie | 200; 401, 403 CSRF, 500 |
| `GET /auth/me` | Restore current session; authenticated | Return only the current user's identity, active role context, and permissions | 200; 401 |
| `POST /auth/password/forgot` | Request reset; public, rate-limited | Respond identically whether account exists or not | Valid contact; 202 generic response; 400, 429 |
| `POST /auth/password/reset` | Consume one-use reset token; public, rate-limited | Token hash must be valid, unused, and unexpired | Strong password policy, token; 200; 400, 409, 429 |
| `POST /auth/password/change` | Change own password; authenticated + CSRF | Verify current credential; revoke other sessions | Current/new password; 200; 400, 401, 403, 500 |
| `GET /auth/sessions` | List own active sessions; `account.sessions.read` | Only current user | 200; 401, 403 |
| `DELETE /auth/sessions/:sessionId` | Revoke own session; `account.sessions.revoke` | Session must belong to current user; audit result | 204; 401, 403, 404 |

## Platform and hospital administration

| Method and path | Purpose / permission | Scope and ownership checks | Validation / responses |
|---|---|---|---|
| `GET /hospitals` | List facilities; `hospital.read` or platform report permission | Hospital Manager sees assigned facility only; Super Admin receives safe facility metadata only | Pagination/filter/status; 200; 401, 403 |
| `POST /hospitals` | Create hospital; `hospital.create` | Platform scope; actor derived from session | Name/code required, unique code, valid contact/location; 201; 400, 401, 403, 409 |
| `GET /hospitals/:hospitalId` | Facility details; `hospital.read` | Verify platform permission or active hospital assignment | Positive ID; 200; 401, 403, 404 |
| `PATCH /hospitals/:hospitalId` | Update permitted facility fields; `hospital.update` | Same facility/platform scope; audited status changes | Allowlisted fields only; 200; 400, 401, 403, 404, 409 |
| `PATCH /hospitals/:hospitalId/status` | Activate/deactivate/suspend; `hospital.status.manage` | Platform scope; reason and audit entry required | Valid transition/status, reason; 200; 400, 403, 404, 409 |
| `GET /hospitals/:hospitalId/settings` | Read settings; `hospital.settings.read` | Platform or assigned facility | Redact secrets; 200; 401, 403, 404 |
| `PATCH /hospitals/:hospitalId/settings` | Change settings; `hospital.settings.manage` | Platform or assigned facility; audited | Schema per setting; 200; 400, 403, 404 |
| `GET /platform/settings` | Read platform configuration; `platform.settings.read` | Platform permission; redact secret values and references | 200; 401, 403 |
| `PATCH /platform/settings` | Update platform configuration; `platform.settings.manage` | Platform scope; allowlisted settings, audited | Schema per key; 200; 400, 403, 409 |
| `GET /hospitals/:hospitalId/users` | List local assignments; `staff.read` | Must belong to requested hospital or have explicit platform permission | Pagination and safe fields; 200; 401, 403, 404 |
| `POST /hospitals/:hospitalId/users` | Invite/create staff account and assignment; `staff.create` | Target hospital authorized; role must be assignable by actor | Required identity, allowed role, department; 201; 400, 403, 404, 409 |
| `PATCH /hospitals/:hospitalId/users/:userId` | Change local assignment/status; `staff.manage` | Assignment must be within same hospital; prevent self-escalation | Allowlisted role/status/department; 200; 400, 403, 404 |
| `GET /roles` | List role/permission catalog; `access_control.read` | No patient data; return safe descriptions | 200; 401, 403 |
| `PUT /users/:userId/roles` | Assign/revoke roles; `access_control.manage` | Platform scope for global roles; hospital scope for local roles; second approval for privileged changes | Allowlist, active hospital, reason; 200; 400, 403, 404, 409 |

## Patient identity and registration

| Method and path | Purpose / permission | Scope and ownership checks | Validation / responses |
|---|---|---|---|
| `GET /patients/search` | Exact search by patient number or approved identifier; `patient.search` | Require active hospital assignment and search purpose; return minimal candidate fields. For another hospital's history, a separate valid sharing grant is required | One approved identifier, normalized; 200 candidate list; 400, 401, 403, 404, 429 |
| `POST /patients` | Create canonical identity and local registration; `patient.register` | Actor must have registration permission at the active hospital; do not create Super Admin or staff accounts here | Required demographics, minimize collection, dedup review; 201; 400, 403, 409 |
| `GET /patients/:patientId` | Read permitted patient profile; `patient.read` | Local registration or valid cross-hospital identity permission; do not infer clinical access | Validate ID; minimal role-based fields; 200; 401, 403/404 |
| `PATCH /patients/:patientId` | Update permitted demographics/contact; `patient.demographics.update` | Local registration; field allowlist; sensitive identifier corrections use separate audited workflow | Validate fields and version; 200; 400, 403, 404, 409 |
| `GET /patients/:patientId/registrations` | List hospital registrations; `patient.registration.read` | Return only registrations authorized for the caller; platform summaries may be de-identified | 200; 401, 403/404 |
| `POST /patients/:patientId/registrations` | Register existing identity locally; `patient.register` | Current hospital only; no cross-hospital clinical access is implied | Verify identity and unique local MRN; 201; 400, 403, 404, 409 |
| `GET /patients/:patientId/history` | Read history timeline; `patient.history.read` plus specific data permissions | Filter each record by hospital assignment, sharing grant, purpose, and sensitive record policy. Super Admin has no automatic clinical access | Date/type pagination; 200; 401, 403/404 |
| `POST /patient-identity-reviews` | Open manual possible-duplicate review; `patient.identity.review` | Current authorized hospital; candidates are not automatically merged | Reason and candidate IDs; 201; 400, 403, 404 |
| `PATCH /patient-identity-reviews/:reviewId` | Resolve possible duplicate; `patient.identity.resolve` | Assigned reviewer, second-person approval for merges; preserve both histories | Explicit match/no-match decision and reason; 200; 400, 403, 404, 409 |
| `GET /patients/:patientId/consents` | Read consent state; `patient.sharing.read` | Patient or authorized source/receiver facility only | 200; 401, 403/404 |
| `POST /patients/:patientId/sharing-authorizations` | Grant cross-hospital access; `patient.share.approve` | Verify patient, source/receiver, policy, consent/legal basis, purpose, record categories, date range, expiry; approver cannot be inferred from body | Required scope and evidence; consent grants must reference active consent; 201; 400, 403, 404, 409 |
| `DELETE /patients/:patientId/sharing-authorizations/:grantId` | Revoke future access; `patient.share.revoke` | Authorized patient/approver per policy; retain audit event | Reason; 204; 401, 403, 404 |
| `POST /patients/:patientId/profile-correction-requests` | Request a demographic correction; `patient.portal.profile.update.request` | Current patient account maps to this patient; staff may submit only through an explicitly authorized workflow | Allowlisted field, encrypted proposed value, optional reason; 201; 400, 401, 403, 404 |
| `PATCH /profile-correction-requests/:requestId` | Approve/reject/apply a requested correction; `patient.demographics.review` | Reviewer is authorized for the patient's hospital registration; audit changes without exposing identifiers | Valid state transition and reason; 200; 400, 403, 404, 409 |

## Appointments, visits, and clinical records

| Method and path | Purpose / permission | Scope and ownership checks | Validation / responses |
|---|---|---|---|
| `GET /appointments` | List day/department/provider queue; `appointment.read` | Current hospital only; patient self-service returns own records only | Date range/page/status; 200; 400, 401, 403 |
| `POST /appointments` | Schedule or request an appointment; `appointment.create` | Hospital assignment or patient ownership; registration must be in that hospital | Times, patient registration, provider/department; overlap transaction; 201; 400, 403, 404, 409 |
| `GET /appointments/:id` | Read one appointment; `appointment.read` | Same hospital or patient owns it | 200; 401, 403/404 |
| `PATCH /appointments/:id` | Reschedule/cancel/check-in/complete; `appointment.update` | Same hospital; validate allowed state transition | Version and allowed fields; 200; 400, 403, 404, 409 |
| `POST /visits` | Create walk-in or appointment visit; `visit.create` | Patient has local registration, or authorized emergency registration path; hospital derived from session | Visit type, registration, optional appointment; transaction; 201; 400, 403, 404, 409 |
| `GET /visits/:visitId` | Read permitted encounter; `visit.read` and any field-level clinical permissions | Same hospital or active specific sharing authorization; verify patient/visit scope | 200; 401, 403/404 |
| `GET /patients/:patientId/visits` | List visit history; `visit.history.read` | Per-record hospital and sharing filtering; patient sees own permitted summaries | Pagination/date filters; 200; 401, 403/404 |
| `PATCH /visits/:visitId/status` | Advance/cancel encounter; `visit.status.update` | Same hospital; actor role and current state must allow transition | Valid transition, reason for cancellation; 200; 400, 403, 404, 409 |
| `GET /workflow-status-events` | Read status history; `workflow.status.read` | Require assigned hospital and validate resource belongs to that hospital; never permit unscoped global resource lookup | Resource type/id for appointment, visit, lab request/item, specimen/result, prescription, invoice, payment, admission, or discharge; bounded date/page filters; 200; 400, 401, 403/404 |
| `POST /visits/:visitId/triage` | Record triage/vitals; `triage.create` | Same hospital; authorized triage staff | Measurement bounds and units; 201; 400, 403, 404 |
| `POST /visits/:visitId/clinical-notes` | Add immutable note; `clinical.note.create` | Same hospital; authorized clinician; note sensitivity checked | Type and non-empty content; 201; 400, 403, 404 |
| `POST /clinical-notes/:noteId/amendments` | Correct a note without erasing its previous text; `clinical.note.amend` | Same hospital; authorized clinician; reason and audit event required | Corrected content and reason; 201; 400, 403, 404, 409 |
| `POST /visits/:visitId/diagnoses` | Add diagnosis; `clinical.diagnosis.create` | Same hospital; authorized clinician | Code/name/status; 201; 400, 403, 404 |
| `POST /diagnoses/:diagnosisId/events` | Correct, resolve, supersede, or mark a diagnosis entered in error; `clinical.diagnosis.correct` | Same hospital; authorized clinician; append-only reasoned event | Valid transition and reason; 201; 400, 403, 404, 409 |
| `POST /visits/:visitId/treatment-plans` | Add treatment/follow-up; `clinical.plan.create` | Same hospital; authorized clinician | Plan, dates, status; 201; 400, 403, 404 |
| `POST /visits/:visitId/referrals` | Create referral; `clinical.referral.create` | Same hospital; authorized clinician; destination does not grant record access | Destination, reason, urgency; 201; 400, 403, 404 |
| `GET /visits/:visitId/clinical-records` | Read notes, diagnoses, plans; respective `clinical.*.read` permissions | Filter every returned type by scope/sensitivity and share authorization | Type/date pagination; 200; 401, 403/404 |

## Laboratory

| Method and path | Purpose / permission | Scope and ownership checks | Validation / responses |
|---|---|---|---|
| `GET /lab-tests` | List active test catalogue; `lab.catalog.read` | Catalogue only; facility-specific restrictions if configured | Search/page; 200; 401, 403 |
| `POST /visits/:visitId/lab-requests` | Request tests; `lab.request.create` | Same hospital and visit; clinician permission | Test IDs, priority, clinical question; 201; 400, 403, 404 |
| `GET /lab-requests` | Lab queue; `lab.request.read` | Assigned hospital; only permitted patient fields | Status/priority/date filters; 200; 401, 403 |
| `GET /lab-requests/:requestId` | Request/specimen details; `lab.request.read` | Same hospital; explicit share for external record access | 200; 401, 403/404 |
| `POST /lab-requests/:requestId/specimens` | Register collection/receipt/rejection; `lab.specimen.manage` | Same hospital; lab/collection assignment | Specimen type, timestamp, rejection reason; 201; 400, 403, 404, 409 |
| `POST /lab-request-items/:itemId/results` | Enter result; `lab.result.enter` | Same hospital; active item/specimen; actor may not self-validate where policy forbids | Structured result/unit; 201; 400, 403, 404, 409 |
| `POST /lab-results/:resultId/validate` | Validate result; `lab.result.validate` | Same hospital; result is preliminary; validated actor recorded | Validation outcome; 200; 400, 403, 404, 409 |
| `POST /lab-results/:resultId/release` | Release validated result; `lab.result.release` | Same hospital; require validation; optionally dual control for critical tests | 200; 400, 403, 404, 409 |
| `POST /lab-results/:resultId/amendments` | Correct released result without replacing history; `lab.result.amend` | Same hospital; reason and independent review policy | Previous/current version and reason; 201; 400, 403, 404, 409 |

## Pharmacy and manual billing

| Method and path | Purpose / permission | Scope and ownership checks | Validation / responses |
|---|---|---|---|
| `GET /pharmacy/inventory` | Search stock/batches; `pharmacy.inventory.read` | Assigned hospital only | Medicine, low-stock, expiry filters; 200; 401, 403 |
| `GET /pharmacy/suppliers` | List approved suppliers; `pharmacy.supplier.read` | Authenticated pharmacy/manager scope; supplier contact fields minimized | Search/page/status; 200; 401, 403 |
| `POST /pharmacy/purchase-orders` | Request medicine stock; `pharmacy.purchase_order.create` | Assigned hospital; actor and hospital derived from session | Supplier/items/quantities/cost; 201 draft; 400, 403, 404, 409 |
| `POST /pharmacy/purchase-orders/:id/approve` | Approve a purchase order; `pharmacy.purchase_order.approve` | Same hospital; maker/checker separation where policy requires | Reason, allowed status; 200; 400, 403, 404, 409 |
| `POST /pharmacy/purchase-orders/:id/receipts` | Receive stock into identified batches; `pharmacy.stock.receive` | Same hospital and supplier/order; received quantities cannot exceed remaining order without override | Batch, expiry, quantities; transaction; 201; 400, 403, 404, 409 |
| `POST /pharmacy/stock-receipts` | Receive batch stock; `pharmacy.stock.receive` | Assigned hospital; actor permission; audit reason | Batch, expiry, quantity, cost; transaction; 201; 400, 403, 409 |
| `GET /prescriptions` | Pharmacy work queue; `prescription.read` | Assigned hospital; only minimum patient information | Status/date/page; 200; 401, 403 |
| `POST /prescriptions` | Create prescription; `prescription.create` | Same visit/hospital; authorized prescriber staff | Items, dose, route, frequency, quantity; 201; 400, 403, 404 |
| `POST /prescriptions/:id/dispenses` | Record full/partial dispense; `pharmacy.dispense` | Same hospital; valid non-cancelled prescription; no expired batch | Items and quantities; lock stock and commit movement atomically; 201; 400, 403, 404, 409 |
| `POST /invoices` | Create/issue invoice; `finance.invoice.create` | Assigned hospital and patient/visit; no clinical details exposed | Item lines, currency, amounts; calculate totals server-side; 201; 400, 403, 404 |
| `GET /invoices/:id` | Read invoice; `finance.invoice.read` | Hospital finance role or patient owns invoice; no clinical note expansion | 200; 401, 403/404 |
| `POST /invoices/:id/payments` | Record verified manual payment; `finance.payment.record` | Assigned hospital; invoice open; actor from session | Positive amount, supported manual method, reference; lock invoice, transaction; 201; 400, 403, 404, 409 |
| `POST /payments/:id/receipt` | Issue receipt; `finance.receipt.issue` | Same hospital; payment exists and is not reversed | 201; 401, 403, 404, 409 |
| `POST /invoices/:id/adjustments` | Request refund/credit/correction; `finance.adjustment.request` | Same hospital; maker/checker approval and reason | Positive amount, reason; 201 pending; 400, 403, 404 |
| `POST /financial-adjustments/:id/approve` | Approve/post adjustment; `finance.adjustment.approve` | Different authorized approver where policy requires; same hospital | No self-approval, balance check, transaction; 200; 400, 403, 404, 409 |
| `POST /finance/reconciliation-runs` | Start manual payment reconciliation; `finance.reconciliation.create` | Assigned hospital; actor derived from session | Date period and optional statement reference; 201; 400, 403, 409 |
| `POST /finance/reconciliation-runs/:runId/items` | Match a recorded payment to a manual statement entry; `finance.reconciliation.review` | Payment and run must be in the same hospital; never rewrite/delete the payment | Payment ID, matched amount, and outcome; 201; 400, 403, 404, 409 |
| `POST /finance/reconciliation-runs/:runId/complete` | Complete reconciliation; `finance.reconciliation.complete` | Same hospital; unresolved mismatches require explicit disposition and audit | Completion reason; 200; 400, 403, 404, 409 |

## Inpatient care, reports, notifications, audit

| Method and path | Purpose / permission | Scope and ownership checks | Validation / responses |
|---|---|---|---|
| `GET /hospitals/:hospitalId/wards` | List wards/beds; `ward.read` | Assigned hospital/platform-safe view | 200; 401, 403, 404 |
| `POST /visits/:visitId/admissions` | Admit patient; `admission.create` | Same hospital and visit; bed belongs to same ward/hospital | Status, ward/bed, authorized clinician; transaction; 201; 400, 403, 404, 409 |
| `PATCH /admissions/:id/bed` | Transfer bed; `admission.transfer` | Same hospital; destination bed available | Reason and destination; transaction; 200; 400, 403, 404, 409 |
| `POST /visits/:visitId/discharge` | Complete discharge; `visit.discharge` | Same hospital; allowed visit/admission state; clinical permission if required | Disposition/instructions/follow-up; 201; 400, 403, 404, 409 |
| `GET /reports/:reportType` | Operational/clinical/lab/pharmacy/finance reports; corresponding `report.<type>.read` | Query is always hospital-filtered; global report only with platform permission and aggregation rules | Bounded dates, paging, no arbitrary SQL; 200; 400, 401, 403 |
| `GET /notifications` | List own notifications; `notification.read` | Recipient must be current user; sensitive body filtered | Pagination/unread; 200; 401, 403 |
| `PATCH /notifications/:id/read` | Mark own notification read; `notification.update` | Recipient must be current user | 204; 401, 403, 404 |
| `GET /audit-logs` | Search audit events; `audit.read` | Hospital assignment or explicit platform audit permission; clinical content redacted | Bounded filters/pagination; 200; 400, 401, 403 |
| `GET /health` | Liveness/readiness; public liveness, restricted dependency detail | Do not reveal secrets, SQL, or internal host configuration | 200 running; 503 not ready; safe payload |

## Validation and implementation notes

- Parse path IDs as positive integers/ULIDs before querying. Use a request schema per endpoint and allowlist update properties.
- Use `mysql2` placeholders for values. Dynamic order/sort names must come from a fixed allowlist.
- Tenant constraints must be enforced in both SQL joins and service authorization. Composite foreign keys protect integrity but do not authorize reads.
- Use transactions and row locks for appointment overlap checks, stock decrement, invoice balance/payment, and grant/revocation operations.
- Medical history endpoints should return a paginated, field-filtered timeline. They must not return identifiers, restricted notes, or financial data unless that specific permission is present.
- Log access decisions without logging passwords, CSRF/session tokens, full national identifiers, or clinical note contents.
- Do not add payment gateway endpoints. A manual payment endpoint records a user-verified hospital transaction only.

## API acceptance tests

- Every protected endpoint returns 401 without a session; every insufficient permission returns 403 or policy-safe 404.
- Changing `hospitalId`, `patientId`, `visitId`, or `userId` cannot cross scope or ownership.
- A patient can access only their own permitted portal data.
- Role assignment cannot grant a role the acting user cannot assign; no public endpoint creates privileged roles.
- Validation errors do not write partial data; overlap, stock, payment, and sharing operations are atomic.
- Revoked sharing grants block the next history read; audit logs show the grant and revocation.
- Responses exclude password hashes, raw identifiers, internal stack traces, unauthorized clinical content, and other patients' data.
- Manual payments create payment/receipt history without contacting a payment gateway.