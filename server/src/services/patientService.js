import { createCipheriv, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { query, withTransaction } from '../config/database.js'
import { buildPagination } from '../validators/index.js'

function getIdentifierKeys() {
  const encryptionKey = Buffer.from(process.env.PATIENT_IDENTIFIER_ENCRYPTION_KEY || '', 'hex')
  const hmacKey = Buffer.from(process.env.PATIENT_IDENTIFIER_HMAC_KEY || '', 'hex')
  if (encryptionKey.length !== 32 || hmacKey.length < 32) {
    throw new Error('Patient identifier encryption keys are missing; configure 64-character hex keys before storing national IDs')
  }
  return { encryptionKey, hmacKey }
}

function protectIdentifier(identifier) {
  const value = String(identifier || '').trim().replace(/\s+/g, '').toUpperCase()
  if (!value) return null
  const { encryptionKey, hmacKey } = getIdentifierKeys()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const encryptedValue = Buffer.concat([Buffer.from([1]), iv, tag, encrypted])
  const lookupHmac = createHmac('sha256', hmacKey).update(value).digest()
  return { encryptedValue, lookupHmac }
}

function patientNameParts(data) {
  const fullName = String(data.name || '').trim()
  const parts = fullName ? fullName.split(/\s+/) : []
  const firstName = String(data.firstName || parts.shift() || '').trim()
  const lastName = String(data.lastName || parts.join(' ') || firstName).trim()
  return { firstName, lastName }
}

function normalizeSex(value) {
  const normalized = String(value || '').toLowerCase()
  return ['female', 'male', 'intersex'].includes(normalized) ? normalized : 'not_recorded'
}

export async function findPotentialDuplicatePatients({ firstName, lastName, dateOfBirth, phone, hospitalId }) {
  if (!hospitalId) throw new Error('Hospital context is required')
  const rows = await query(
    `
      SELECT p.id, p.patient_number, p.first_name, p.last_name, p.date_of_birth,
             pc.value_text AS phone
      FROM patients p
      JOIN patient_hospital_registrations phr
        ON phr.patient_id = p.id AND phr.hospital_id = ? AND phr.status = 'active'
      LEFT JOIN patient_contacts pc
        ON pc.patient_id = p.id AND pc.contact_type = 'phone' AND pc.is_primary = 1
      WHERE p.status = 'active'
        AND ((? <> '' AND LOWER(p.first_name) = LOWER(?))
          OR (? <> '' AND LOWER(p.last_name) = LOWER(?))
          OR (? <> '' AND p.date_of_birth = ?)
          OR (? <> '' AND pc.value_text = ?))
      ORDER BY p.created_at DESC
      LIMIT 10
    `,
    [hospitalId, firstName || '', firstName || '', lastName || '', lastName || '', dateOfBirth || '', dateOfBirth || '', phone || '', phone || ''],
  )
  return rows
}

export async function findPatientsByNationalId(nationalId, hospitalId, issuingCountry = 'RW') {
  if (!hospitalId) throw new Error('Hospital context is required')
  const protectedIdentifier = protectIdentifier(nationalId)
  if (!protectedIdentifier) return []
  return query(
    `
      SELECT p.id, p.patient_number, p.first_name, p.last_name, p.date_of_birth,
             phr.medical_record_number
      FROM patient_identifiers pi
      JOIN patients p ON p.id = pi.patient_id AND p.status = 'active'
      JOIN patient_hospital_registrations phr
        ON phr.patient_id = p.id AND phr.hospital_id = ? AND phr.status = 'active'
      WHERE pi.identifier_type = 'national_id'
        AND pi.issuing_country = ?
        AND pi.lookup_hmac = ?
        AND pi.revoked_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT 10
    `,
    [hospitalId, issuingCountry, protectedIdentifier.lookupHmac],
  )
}

export async function listPatients({ search = '', page = 1, limit = 20, hospitalId } = {}) {
  if (!hospitalId) throw new Error('Hospital context is required')
  const { offset, limit: safeLimit } = buildPagination(page, limit, 100)
  const searchTerm = `%${String(search).trim()}%`
  const rows = await query(
    `
      SELECT p.id, p.patient_number, p.first_name, p.last_name,
             CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS name,
             p.sex_at_birth AS gender, p.date_of_birth, p.status,
             phr.medical_record_number, phr.registered_at AS registration_date,
             phone.value_text AS phone, email.value_text AS email,
             address.province, address.district, address.sector, address.cell, address.village
      FROM patient_hospital_registrations phr
      JOIN patients p ON p.id = phr.patient_id
      LEFT JOIN patient_contacts phone ON phone.patient_id = p.id AND phone.contact_type = 'phone' AND phone.is_primary = 1
      LEFT JOIN patient_contacts email ON email.patient_id = p.id AND email.contact_type = 'email' AND email.is_primary = 1
      LEFT JOIN patient_addresses address ON address.patient_id = p.id AND address.is_primary = 1
      WHERE phr.hospital_id = ? AND phr.status = 'active' AND p.status = 'active'
        AND (? = '' OR p.patient_number LIKE ? OR phr.medical_record_number LIKE ?
          OR p.first_name LIKE ? OR p.last_name LIKE ? OR phone.value_text LIKE ?)
      ORDER BY phr.registered_at DESC
      LIMIT ? OFFSET ?
    `,
    [hospitalId, search, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, safeLimit, offset],
  )
  const totalResult = await query(
    `
      SELECT COUNT(*) AS total
      FROM patient_hospital_registrations phr
      JOIN patients p ON p.id = phr.patient_id
      LEFT JOIN patient_contacts phone ON phone.patient_id = p.id AND phone.contact_type = 'phone' AND phone.is_primary = 1
      WHERE phr.hospital_id = ? AND phr.status = 'active' AND p.status = 'active'
        AND (? = '' OR p.patient_number LIKE ? OR phr.medical_record_number LIKE ?
          OR p.first_name LIKE ? OR p.last_name LIKE ? OR phone.value_text LIKE ?)
    `,
    [hospitalId, search, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
  )
  return { rows, total: Number(totalResult[0]?.total || 0) }
}

export async function createPatient(data, { hospitalId, userId }) {
  if (!hospitalId || !userId) throw new Error('Authenticated hospital context and user are required')
  const { firstName, lastName } = patientNameParts(data)
  if (!firstName || !lastName) throw new Error('Patient full name is required')

  const address = data.address || {}
  const nationalId = data.nationalId || data.national_id
  const protectedIdentifier = protectIdentifier(nationalId)
  const patientNumber = randomUUID().replaceAll('-', '').slice(0, 26).toUpperCase()
  const medicalRecordNumber = `MRN-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
  const patientId = await withTransaction(async (runQuery) => {
    const patientRows = await runQuery(
      `INSERT INTO patients (patient_number, first_name, last_name, date_of_birth, sex_at_birth, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [patientNumber, firstName, lastName, data.dateOfBirth || data.date_of_birth || null, normalizeSex(data.gender || data.sexAtBirth)],
    )
    const newPatientId = patientRows.insertId

    await runQuery(
      `INSERT INTO patient_hospital_registrations
        (patient_id, hospital_id, medical_record_number, registered_by_user_id, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [newPatientId, hospitalId, medicalRecordNumber, userId],
    )

    if (protectedIdentifier) {
      await runQuery(
        `INSERT INTO patient_identifiers
          (patient_id, identifier_type, issuing_country, encrypted_value, lookup_hmac, verified_by_user_id)
         VALUES (?, 'national_id', ?, ?, ?, ?)`,
        [newPatientId, data.issuingCountry || 'RW', protectedIdentifier.encryptedValue, protectedIdentifier.lookupHmac, userId],
      )
    }

    if (data.phone) {
      await runQuery(
        `INSERT INTO patient_contacts (patient_id, contact_type, value_text, is_primary, is_verified)
         VALUES (?, 'phone', ?, 1, 0)`,
        [newPatientId, String(data.phone).trim()],
      )
    }
    if (data.email) {
      await runQuery(
        `INSERT INTO patient_contacts (patient_id, contact_type, value_text, is_primary, is_verified)
         VALUES (?, 'email', ?, 1, 0)`,
        [newPatientId, String(data.email).trim().toLowerCase()],
      )
    }
    if (data.emergencyContactName || data.emergencyContactPhone) {
      await runQuery(
        `INSERT INTO patient_contacts (patient_id, contact_type, contact_name, value_text, relationship_to_patient)
         VALUES (?, 'emergency_contact', ?, ?, ?)`,
        [newPatientId, data.emergencyContactName || null, data.emergencyContactPhone || '', data.emergencyContactRelationship || null],
      )
    }
    if (Object.values(address).some(Boolean) || data.province) {
      await runQuery(
        `INSERT INTO patient_addresses
          (patient_id, address_line1, province, district, sector, cell, village, country_code, is_primary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [newPatientId, data.addressLine1 || data.addressText || null, address.province || data.province || null, address.district || data.district || null, address.sector || data.sector || null, address.cell || data.cell || null, address.village || data.village || null, data.countryCode || 'RW'],
      )
    }
    return newPatientId
  })

  return { id: patientId, patientNumber, medicalRecordNumber, name: `${firstName} ${lastName}`, firstName, lastName, status: 'Registered', hospitalId }
}

export async function getPatientById(id, hospitalId) {
  if (!hospitalId) throw new Error('Hospital context is required')
  const rows = await query(
    `
      SELECT p.id, p.patient_number, p.first_name, p.middle_name, p.last_name,
             CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name) AS name,
             p.date_of_birth, p.sex_at_birth, p.status,
             phr.medical_record_number, phr.registered_at,
             phone.value_text AS phone, email.value_text AS email,
             address.province, address.district, address.sector, address.cell, address.village
      FROM patient_hospital_registrations phr
      JOIN patients p ON p.id = phr.patient_id
      LEFT JOIN patient_contacts phone ON phone.patient_id = p.id AND phone.contact_type = 'phone' AND phone.is_primary = 1
      LEFT JOIN patient_contacts email ON email.patient_id = p.id AND email.contact_type = 'email' AND email.is_primary = 1
      LEFT JOIN patient_addresses address ON address.patient_id = p.id AND address.is_primary = 1
      WHERE p.id = ? AND phr.hospital_id = ? AND phr.status = 'active'
      LIMIT 1
    `,
    [id, hospitalId],
  )
  return rows[0] || null
}

export async function archivePatient(id, hospitalId) {
  const result = await query(
    `UPDATE patient_hospital_registrations SET status = 'inactive', closed_at = UTC_TIMESTAMP(3)
     WHERE patient_id = ? AND hospital_id = ? AND status = 'active'`,
    [id, hospitalId],
  )
  return result.affectedRows > 0
}