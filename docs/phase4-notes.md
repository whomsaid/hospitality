# Phase 4: Appointments and consultations

This phase adds the core hospital scheduling and clinical workflow layer.

## Included areas

- Appointment creation and status updates
- Preventing overlapping appointments for a doctor
- Visit creation from appointments or walk-ins
- Vital-sign capture and BMI calculation
- Diagnosis records
- Clinical notes
- Treatment plans

## Key validation approach

- Authenticated users are required before accessing clinical routes.
- Permission checks require `manage_clinical_records` for sensitive clinical operations.
- Appointment scheduling uses a conflict check to reduce duplicate bookings.
- Clinical data is stored with visit and staff traceability.

## Important note

This project currently uses a local test-safe session store for automated checks. In production, the session configuration should use MySQL-backed session storage with secure cookies enabled.
