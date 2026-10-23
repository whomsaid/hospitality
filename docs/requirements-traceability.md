# Requirements Traceability: Master Brief

## Status

This matrix maps the master brief to the Phase 1/2 design. **Designed** means documented in architecture, schema, API, or acceptance criteria; it does not mean implemented. The proposed schema is installed in an isolated database; runtime routes and workflow behavior still need migration and testing.

## Main objectives

| # | Required objective | Design coverage | Status |
|---:|---|---|---|
| 1 | One platform manages multiple hospitals | Hospital tenant root, tenant assignments, scoped APIs | Designed |
| 2 | Separate role dashboards | Seven dashboard specifications and role-permission matrix in `architecture.md` | Designed; UI testing later |
| 3 | Register new and returning patients | Canonical profile, exact identifier lookup, local registration, visit API, patient correction review | Designed |
| 4 | Retrieve returning-patient information | Existing profile and permission-filtered history endpoints | Designed |
| 5 | Prevent duplicate patient records | Unique patient number, keyed identifier matching, manual duplicate-review cases; no automatic merge | Designed; identifier policy approval needed |
| 6 | Preserve patient and visit history | One patient to many independent visits; append-only correction history | Designed |
| 7 | Appointments and queues | Appointment states, conflict checks, arrival and queue APIs | Designed |
| 8 | Reception and triage | Reception scopes, walk-ins, visit registration, triage assessments | Designed |
| 9 | Consultations and clinical records | Notes, diagnoses, plans, referrals, amendment/event history | Designed |
| 10 | Laboratory workflow | Catalogue, requests, specimens, results, validation/release and amendments | Designed |
| 11 | Prescriptions and pharmacy inventory | Suppliers, purchase orders, hospital reorder levels, batches, expiry, stock movements, partial dispense | Designed |
| 12 | Billing, manual payments, receipts | Invoice, partial payments, receipts, adjustments, reconciliation; no gateway | Designed |
| 13 | Discharge and visit completion | Independent visit/admission/discharge states and event history | Designed |
| 14 | Cross-hospital patient access | Explicit time-limited, purpose/category/date-scoped grant and revocation | Designed; legal approval needed |
| 15 | Operational and domain reports | Role-specific report permissions and tenant-scoped API | Designed |
| 16 | Patient-data protection | Sessions, CSRF, RBAC, ownership, tenant isolation, encryption, safe errors | Designed; security testing later |
| 17 | Audit important actions | Append-only audit model, database privilege guidance, security/action list | Designed |
| 18 | Notifications and follow-ups | User-scoped notification model, follow-up dates, read state | Designed |
| 19 | Professional responsive UI | Responsive requirement and role-specific dashboard content | Designed; viewport acceptance later |
| 20 | Future expansion | Normalized domains, stable APIs, proposed migration boundary | Designed |

## Final acceptance scenario: all 30 steps

| # | Scenario step | Verification criterion |
|---:|---|---|
| 1 | Super Admin creates Hospitals A and B | Create endpoint, unique facility codes, platform permission. |
| 2 | Assign manager to each hospital | Hospital-scoped assignment; verify no cross-hospital assignment leakage. |
| 3 | Managers create authorized employees | Manager can create only allowed local roles and departments. |
| 4 | Reception registers a new patient at A | Registration requires authorized A assignment and creates local registration. |
| 5 | System generates unique patient number | Collision-resistant opaque ID; uniqueness constraint rejects duplicates. |
| 6 | Create first visit | Visit references same patient, A registration, and Hospital A. |
| 7 | Triage and consultation occur | Triage/clinical writes require the appropriate permission and actor attribution. |
| 8 | Doctor requests lab tests | Lab request/items are linked to visit; visit can proceed with no tests. |
| 9 | Lab processes, validates, and releases results | State transitions enforced; release-before-validation is rejected; history retained. |
| 10 | Doctor reviews results and creates prescription | Released results and authorized prescriber are required; not every visit needs a prescription. |
| 11 | Pharmacist dispenses and records stock movement | One transaction; reject expired/insufficient stock; support partial dispensing. |
| 12 | Accountant invoices, records manual payment, and issues receipt | Exact Decimal totals; partial balances; manual method only; no gateway request. |
| 13 | Authorized staff complete/discharge visit | Allowed transitions and optional workflow steps are enforced and audited. |
| 14 | Record patient exit | Completion/discharge time, responsible user, instructions, and follow-up are retained. |
| 15 | Patient later returns to A | Reuse the same canonical patient and local registration. |
| 16 | Reception searches approved identifier | Exact search is authorized, rate-limited, normalized, and returns minimal data. |
| 17 | Retrieve existing profile and permitted history | History endpoint applies category and role permissions. |
| 18 | Create second visit | New visit row points to the original patient identity. |
| 19 | Preserve first visit unchanged | Assert first visit and its child records remain linked and unchanged. |
| 20 | Clinician reviews authorized history | Verify assignment, record permission, share grant, purpose, date/category scope. |
| 21 | Second visit gets its own records | Any new care rows link to visit 2, not visit 1. |
| 22 | Hospital B identifies same patient | Verify identity and create local B registration without granting clinical access. |
| 23 | B reads authorized shared history | Active scoped authorization returns only allowed source records. |
| 24 | B is denied unauthorized history | Missing/expired/revoked grant returns policy-safe 403/404 and audit event. |
| 25 | Changing IDs cannot bypass scope | IDOR tests change patient, visit, hospital, invoice, and user IDs. |
| 26 | Important activities are audited | Actor, facility, action, resource, outcome, timestamp, purpose as required; no secrets/clinical text. |
| 27 | All seven roles use their dashboards | Validate role metrics, visible actions, and corresponding backend permissions. |
| 28 | Desktop/tablet/mobile work | Test layout, wrapping, tables, forms, keyboard/accessibility at target viewports. |
| 29 | No online payment gateway | Dependency/config review and test that payment recording makes no external request. |
| 30 | Important workflows pass tests | CI runs auth, authorization, tenancy, history, clinical, lab, pharmacy, finance, and UI suites. |

## Phase boundary

This deliverable covers Phase 1 requirements/architecture and Phase 2 database design. Acceptance steps are test criteria, not claims of implementation. Phase 3 setup and runtime workflow implementation remain out of scope until the approval items in `architecture.md` are resolved and this proposed schema is converted into reviewed forward migrations.