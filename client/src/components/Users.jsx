export default function Users({ user, users, userForm, setUserForm, onSubmit, onDelete }) {
  return (
    <div className="section-stack">
      {user.roleName === 'super_admin' && (
        <form className="patient-form" onSubmit={onSubmit}>
          <div className="form-header"><strong>Create user</strong></div>
          <div className="form-grid">
            <label>
              <span>Full name</span>
              <input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} />
            </label>
            <label>
              <span>Username</span>
              <input value={userForm.username} onChange={(event) => setUserForm({ ...userForm, username: event.target.value })} />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} />
            </label>
            <label>
              <span>Phone</span>
              <input value={userForm.phone} onChange={(event) => setUserForm({ ...userForm, phone: event.target.value })} />
            </label>
            <label>
              <span>Password</span>
              <input value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} />
            </label>
            <label>
              <span>Role</span>
              <select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
                <option value="doctor">Doctor</option>
                <option value="receptionist">Receptionist</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="lab_technician">Lab technician</option>
                <option value="accountant">Accountant</option>
              </select>
            </label>
          </div>
          <button type="submit" className="primary-btn compact-btn">Add user</button>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.name || entry.full_name || entry.username}</td>
                <td>{entry.username}</td>
                <td>{entry.email}</td>
                <td><span className="role-badge">{entry.role || entry.role_name}</span></td>
                <td><button type="button" className="mini-btn" onClick={() => onDelete(entry.id)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
