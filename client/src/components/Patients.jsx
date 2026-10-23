export default function Patients({ user, patients, hospitals, patientForm, setPatientForm, onSubmit, onDelete, locationOptions = {} }) {
  const isReceptionAllowed = user.roleName === 'receptionist' || user.roleName === 'super_admin'

  const provinces = Object.keys(locationOptions || {})
  const districts = patientForm.province ? Object.keys(locationOptions[patientForm.province] || {}) : []
  const sectors = patientForm.province && patientForm.district ? Object.keys(locationOptions[patientForm.province]?.[patientForm.district] || {}) : []
  const cells = patientForm.province && patientForm.district && patientForm.sector ? Object.keys(locationOptions[patientForm.province]?.[patientForm.district]?.[patientForm.sector] || {}) : []
  const villages = patientForm.province && patientForm.district && patientForm.sector && patientForm.cell ? locationOptions[patientForm.province]?.[patientForm.district]?.[patientForm.sector]?.[patientForm.cell] || [] : []

  return (
    <div className="section-stack">
      {isReceptionAllowed && (
        <form className="patient-form" onSubmit={onSubmit}>
          <div className="form-header"><strong>Register patient</strong></div>
          <div className="form-grid">
            <label>
              <span>Full name</span>
              <input value={patientForm.name} onChange={(event) => setPatientForm({ ...patientForm, name: event.target.value })} />
            </label>
            <label>
              <span>National ID</span>
              <input value={patientForm.nationalId} onChange={(event) => setPatientForm({ ...patientForm, nationalId: event.target.value })} />
            </label>
            <label>
              <span>Phone</span>
              <input value={patientForm.phone} onChange={(event) => setPatientForm({ ...patientForm, phone: event.target.value })} />
            </label>
            <label>
              <span>Email</span>
              <input value={patientForm.email} onChange={(event) => setPatientForm({ ...patientForm, email: event.target.value })} />
            </label>
            <label>
              <span>Province</span>
              <select value={patientForm.province} onChange={(event) => setPatientForm({ ...patientForm, province: event.target.value, district: '', sector: '', cell: '', village: '' })}>
                <option value="">Select province</option>
                {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
              </select>
            </label>
            <label>
              <span>District</span>
              <select value={patientForm.district} onChange={(event) => setPatientForm({ ...patientForm, district: event.target.value, sector: '', cell: '', village: '' })} disabled={!patientForm.province}>
                <option value="">Select district</option>
                {districts.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            </label>
            <label>
              <span>Sector</span>
              <select value={patientForm.sector} onChange={(event) => setPatientForm({ ...patientForm, sector: event.target.value, cell: '', village: '' })} disabled={!patientForm.district}>
                <option value="">Select sector</option>
                {sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
              </select>
            </label>
            <label>
              <span>Cell</span>
              <select value={patientForm.cell} onChange={(event) => setPatientForm({ ...patientForm, cell: event.target.value, village: '' })} disabled={!patientForm.sector}>
                <option value="">Select cell</option>
                {cells.map((cell) => <option key={cell} value={cell}>{cell}</option>)}
              </select>
            </label>
            <label>
              <span>Village</span>
              <select value={patientForm.village} onChange={(event) => setPatientForm({ ...patientForm, village: event.target.value })} disabled={!patientForm.cell}>
                <option value="">Select village</option>
                {villages.map((village) => <option key={village} value={village}>{village}</option>)}
              </select>
            </label>
            <label>
              <span>Hospital</span>
              <select value={patientForm.hospital} onChange={(event) => setPatientForm({ ...patientForm, hospital: event.target.value })}>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.name}>{hospital.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Doctor</span>
              <select value={patientForm.doctor} onChange={(event) => setPatientForm({ ...patientForm, doctor: event.target.value })}>
                <option>Dr. Amina Niyonsenga</option>
                <option>Dr. Mugisha</option>
                <option>Dr. Patrick Kamanzi</option>
              </select>
            </label>
            <label>
              <span>Mutuel paid</span>
              <select value={patientForm.mutuelPaid ? 'Yes' : 'No'} onChange={(event) => setPatientForm({ ...patientForm, mutuelPaid: event.target.value === 'Yes' })}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={patientForm.status} onChange={(event) => setPatientForm({ ...patientForm, status: event.target.value })}>
                <option>Registered</option>
                <option>Awaiting Consultation</option>
                <option>In Treatment</option>
              </select>
            </label>
          </div>

          <button type="submit" className="primary-btn compact-btn">Add patient</button>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>NID</th>
              <th>Hospital</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.id}</td>
                <td>{patient.name}</td>
                <td>{patient.nationalId || patient.national_id}</td>
                <td>{patient.hospital}</td>
                <td><span className={`pill ${patient.status === 'Registered' ? 'confirmed' : 'pending'}`}>{patient.status}</span></td>
                <td>
                  <button type="button" className="mini-btn" onClick={() => onDelete(patient.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
