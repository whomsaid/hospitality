export default function Hospitals({ user, hospitals, hospitalForm, setHospitalForm, onSubmit, onDelete, locationOptions = {} }) {
  const provinces = Object.keys(locationOptions || {})
  const districts = hospitalForm.province ? Object.keys(locationOptions[hospitalForm.province] || {}) : []
  const sectors = hospitalForm.province && hospitalForm.district ? Object.keys(locationOptions[hospitalForm.province]?.[hospitalForm.district] || {}) : []
  const cells = hospitalForm.province && hospitalForm.district && hospitalForm.sector ? Object.keys(locationOptions[hospitalForm.province]?.[hospitalForm.district]?.[hospitalForm.sector] || {}) : []
  const villages = hospitalForm.province && hospitalForm.district && hospitalForm.sector && hospitalForm.cell ? locationOptions[hospitalForm.province]?.[hospitalForm.district]?.[hospitalForm.sector]?.[hospitalForm.cell] || [] : []

  return (
    <div className="section-stack">
      {user.roleName === 'super_admin' && (
        <form className="patient-form" onSubmit={onSubmit}>
          <div className="form-header"><strong>Register hospital</strong></div>
          <div className="form-grid">
            <label>
              <span>Hospital name</span>
              <input value={hospitalForm.name} onChange={(event) => setHospitalForm({ ...hospitalForm, name: event.target.value })} />
            </label>
            <label>
              <span>Province</span>
              <select value={hospitalForm.province} onChange={(event) => setHospitalForm({ ...hospitalForm, province: event.target.value, district: '', sector: '', cell: '', village: '' })}>
                <option value="">Select province</option>
                {provinces.map((province) => <option key={province} value={province}>{province}</option>)}
              </select>
            </label>
            <label>
              <span>District</span>
              <select value={hospitalForm.district} onChange={(event) => setHospitalForm({ ...hospitalForm, district: event.target.value, sector: '', cell: '', village: '' })} disabled={!hospitalForm.province}>
                <option value="">Select district</option>
                {districts.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            </label>
            <label>
              <span>Sector</span>
              <select value={hospitalForm.sector} onChange={(event) => setHospitalForm({ ...hospitalForm, sector: event.target.value, cell: '', village: '' })} disabled={!hospitalForm.district}>
                <option value="">Select sector</option>
                {sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
              </select>
            </label>
            <label>
              <span>Cell</span>
              <select value={hospitalForm.cell} onChange={(event) => setHospitalForm({ ...hospitalForm, cell: event.target.value, village: '' })} disabled={!hospitalForm.sector}>
                <option value="">Select cell</option>
                {cells.map((cell) => <option key={cell} value={cell}>{cell}</option>)}
              </select>
            </label>
            <label>
              <span>Village</span>
              <select value={hospitalForm.village} onChange={(event) => setHospitalForm({ ...hospitalForm, village: event.target.value })} disabled={!hospitalForm.cell}>
                <option value="">Select village</option>
                {villages.map((village) => <option key={village} value={village}>{village}</option>)}
              </select>
            </label>
            <label>
              <span>Address</span>
              <input value={hospitalForm.address} onChange={(event) => setHospitalForm({ ...hospitalForm, address: event.target.value })} />
            </label>
            <label>
              <span>Manager</span>
              <input value={hospitalForm.manager} onChange={(event) => setHospitalForm({ ...hospitalForm, manager: event.target.value })} />
            </label>
            <label>
              <span>Status</span>
              <select value={hospitalForm.status} onChange={(event) => setHospitalForm({ ...hospitalForm, status: event.target.value })}>
                <option>Operational</option>
                <option>Review</option>
                <option>Pending</option>
              </select>
            </label>
          </div>
          <button type="submit" className="primary-btn compact-btn">Add hospital</button>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Manager</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {hospitals.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.id}</td>
                <td>{entry.name}</td>
                <td>{entry.location || entry.address || 'N/A'}</td>
                <td>{entry.manager}</td>
                <td><span className={`pill ${entry.status === 'Operational' ? 'confirmed' : 'pending'}`}>{entry.status}</span></td>
                <td>
                  <button type="button" className="mini-btn" onClick={() => onDelete(entry.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
