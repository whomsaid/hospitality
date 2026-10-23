# Proposed Entity Relationship Design

The complete Phase 2 ER diagram, entity descriptions, keys, constraints, and indexes are maintained in [database-design.md](database-design.md). The corresponding standalone draft DDL is `database/proposed_schema.sql`.

The core history relationship is:

```mermaid

	PATIENTS ||--o{ PATIENT_HOSPITAL_REGISTRATIONS : registered_at
	HOSPITALS ||--o{ PATIENT_HOSPITAL_REGISTRATIONS : registers
	PATIENT_HOSPITAL_REGISTRATIONS ||--o{ VISITS : has_attendances
	PATIENTS ||--o{ VISITS : owns_history
	VISITS ||--o{ CLINICAL_NOTES : documents
	VISITS ||--o{ LAB_REQUESTS : requests
	VISITS ||--o{ PRESCRIPTIONS : prescribes
	VISITS ||--o{ INVOICES : bills
	PATIENTS ||--o{ PATIENT_SHARING_AUTHORIZATIONS : has_grants
```

One canonical patient can have a local registration at multiple hospitals. Every attendance is a distinct visit. Clinical, laboratory, prescription, and financial records remain linked to that visit and its hospital. Identity matching does not itself grant cross-hospital access.

## Existing schema warning

`database/migrations/001_init_schema.sql` is the existing prototype schema and is not equivalent to the proposed tenant-safe model. The new DDL is installed in the separate `smart_hospital_proposed` database; it is not connected to the running app until route compatibility and regression tests are complete.

