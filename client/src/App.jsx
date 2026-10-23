import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import Patients from './components/Patients.jsx'
import Hospitals from './components/Hospitals.jsx'
import Users from './components/Users.jsx'
import Activity from './components/Activity.jsx'
import {
  API_BASE,
  DEFAULT_PASSWORD,
  normalizeUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  fetchUsers,
  createUser,
  deleteUser,
  fetchHospitals,
  createHospital,
  deleteHospital,
  fetchPatients,
  createPatient,
  deletePatient,
  fetchActivityLogs,
  createActivityLog,
  rolePermissions,
} from './api.js'

const rwandaLocationOptions = {
  'Kigali City': {
    Gasabo: {
      Kacyiru: {
        Kiyovu: ['Kigali', 'Nyabugogo', 'Kigali Heights'],
        Gisozi: ['Rukundo', 'Mugina', 'Kagugu'],
      },
      Remera: {
        Kimihurura: ['Kabeza', 'Gikondo', 'Nyarutarama'],
        Rugando: ['Muganza', 'Remera Center', 'Kabuye'],
      },
    },
    Nyarugenge: {
      Nyamirambo: {
        Gisozi: ['Rukundo', 'Mugina', 'Kicukiro Village'],
        Kimisagara: ['Munyana', 'Rwampara', 'Kimisagara'],
      },
      Rwezamenyo: {
        Muhima: ['Mugina', 'Gatenga', 'Kibagabaga'],
        Kanyinya: ['Mureba', 'Rukiri', 'Kabeza'],
      },
    },
  },
  'Eastern Province': {
    Bugesera: {
      Nyamata: {
        Ruhuha: ['Ruhinga', 'Mwendo', 'Ntebe'],
        Gashora: ['Mugogwe', 'Kabarondo', 'Gashora'],
      },
      Rweru: {
        Kabarondo: ['Kigoma', 'Mubuga', 'Rweru'],
        Ntarama: ['Nyamibanda', 'Rukoma', 'Ntarama'],
      },
    },
    Gatsibo: {
      Kageyo: {
        Karangazi: ['Rukomo', 'Nyagahinga', 'Kageyo'],
        Nyarubuye: ['Kibungo', 'Nyarubuye', 'Mugera'],
      },
    },
  },
  'Southern Province': {
    Huye: {
      Ngoma: {
        Nyanza: ['Ruhashya', 'Nyamure', 'Muganza'],
        Gahini: ['Muganza', 'Rukoma', 'Nyagatare'],
      },
      Tumba: {
        Karengera: ['Rukondo', 'Mubuga', 'Kigoma'],
        Rusatira: ['Nyanza', 'Kigoma', 'Rusoro'],
      },
    },
    Muhanga: {
      Shyogwe: {
        Nyamabuye: ['Muvumba', 'Rukiri', 'Nyaruteja'],
        Nyabubare: ['Ruhango', 'Muganza', 'Kigali'],
      },
    },
  },
  'Western Province': {
    Rubavu: {
      Gisenyi: {
        Nyamyumba: ['Gisenyi', 'Kagano', 'Kibumba'],
        Cyanzarwe: ['Kibisabo', 'Rukomo', 'Muganza'],
      },
    },
    Rusizi: {
      Kamembe: {
        Muganza: ['Rwimbogo', 'Mubuga', 'Bugarama'],
        Bugarama: ['Nyabitimbo', 'Mubuga', 'Gikundamvura'],
      },
    },
  },
  'Northern Province': {
    Musanze: {
      Kinigi: {
        Ruhengeri: ['Busogo', 'Nyarutovu', 'Musanze'],
        Burera: ['Buhiga', 'Nyarusiza', 'Ruhango'],
      },
    },
    Burera: {
      Cyeru: {
        Gahunga: ['Mubuga', 'Nyamabuye', 'Mikoni'],
        Rwerere: ['Kigali', 'Nyarutovu', 'Mubuga'],
      },
    },
  },
};

const seedUsers = [
  {
    id: 1,
    name: 'Super administrator',
    username: 'admin',
    email: 'admin@smart-hospital.org',
    phone: '+250788000001',
    password: DEFAULT_PASSWORD,
    role: 'super_admin',
    hospital: 'Global Control',
  },
  {
    id: 2,
    name: 'Dr. Amina Niyonsenga',
    username: 'doctor',
    email: 'doctor@smart-hospital.org',
    phone: '+250788000002',
    password: DEFAULT_PASSWORD,
    role: 'doctor',
    hospital: 'City General Hospital',
  },
  {
    id: 3,
    name: 'Reception Desk',
    username: 'receptionist',
    email: 'receptionist@smart-hospital.org',
    phone: '+250788000003',
    password: DEFAULT_PASSWORD,
    role: 'receptionist',
    hospital: 'City General Hospital',
  },
  {
    id: 4,
    name: 'Pharmacy Lead',
    username: 'pharmacist',
    email: 'pharmacist@smart-hospital.org',
    phone: '+250788000004',
    password: DEFAULT_PASSWORD,
    role: 'pharmacist',
    hospital: 'City General Hospital',
  },
  {
    id: 5,
    name: 'Lab Supervisor',
    username: 'lab',
    email: 'lab@smart-hospital.org',
    phone: '+250788000005',
    password: DEFAULT_PASSWORD,
    role: 'lab_technician',
    hospital: 'City General Hospital',
  },
  {
    id: 6,
    name: 'Billing Manager',
    username: 'accountant',
    email: 'accountant@smart-hospital.org',
    phone: '+250788000006',
    password: DEFAULT_PASSWORD,
    role: 'accountant',
    hospital: 'City General Hospital',
  },
]

const seedHospitals = [
  { id: 'HSP-1001', name: 'City General Hospital', address: 'Kigali, KG 12 St', manager: 'Dr. Amina Niyonsenga', status: 'Operational' },
  { id: 'HSP-1002', name: 'Lakeview Community Care', address: 'Huye, Main Road', manager: 'Dr. Joseph Mutesa', status: 'Operational' },
  { id: 'HSP-1003', name: 'Riverside Medical Center', address: 'Musanze, Avenue 7', manager: 'Dr. Patrick Kamanzi', status: 'Review' },
]

const seedPatients = [
  {
    id: 'PAT-000001',
    name: 'Alicia Nguyen',
    nationalId: '119876543218766',
    phone: '+250788111111',
    email: 'alicia.nguyen@example.com',
    address: { province: 'Kigali City', district: 'Gasabo', sector: 'Kacyiru', cell: 'Kiyovu', village: 'Nyabugogo' },
    mutuelPaid: true,
    hospital: 'City General Hospital',
    doctor: 'Dr. Amina Niyonsenga',
    status: 'Registered',
  },
  {
    id: 'PAT-000002',
    name: 'Emmanuel Mugenzi',
    nationalId: '119876543218111',
    phone: '+250788222222',
    email: 'emmanuel.mugenzi@example.com',
    address: { province: 'Kigali City', district: 'Nyarugenge', sector: 'Nyamirambo', cell: 'Gisozi', village: 'Rukundo' },
    mutuelPaid: false,
    hospital: 'Lakeview Community Care',
    doctor: 'Dr. Mugisha',
    status: 'Awaiting Consultation',
  },
]

const seedActivityLogs = [
  { id: 1, time: '08:42', user: 'admin', action: 'Registered new hospital', location: 'Global Admin', details: 'City General Hospital added to network.' },
  { id: 2, time: '09:14', user: 'receptionist', action: 'Registered patient', location: 'Front Desk', details: 'Alicia Nguyen registered with NID 119876543218766.' },
  { id: 3, time: '10:05', user: 'doctor', action: 'Consultation completed', location: 'Consultation Wing', details: 'Patient sent to lab for further examination.' },
  { id: 4, time: '11:27', user: 'lab', action: 'Lab examination completed', location: 'Pathology Lab', details: 'Blood test and diagnostic review submitted.' },
  { id: 5, time: '13:00', user: 'pharmacist', action: 'Medication dispensed', location: 'Pharmacy', details: 'Patient confirmed billing and medicine issued.' },
]

const initialUserForm = { name: '', username: '', email: '', phone: '', password: DEFAULT_PASSWORD, role: 'doctor', hospital: 'City General Hospital' }
const initialHospitalForm = {
  name: '',
  province: '',
  district: '',
  sector: '',
  cell: '',
  village: '',
  address: '',
  manager: '',
  status: 'Operational',
}
const initialPatientForm = { name: '', nationalId: '', phone: '', email: '', province: '', district: '', sector: '', cell: '', village: '', mutuelPaid: true, hospital: 'City General Hospital', doctor: 'Dr. Amina Niyonsenga', status: 'Registered' }

const sectionAccess = {
  dashboard: ['view_dashboard'],
  patients: ['manage_patients', 'register_patients'],
  appointments: ['manage_appointments'],
  clinical: ['manage_clinical_records'],
  pharmacy: ['manage_pharmacy'],
  laboratory: ['manage_lab_orders'],
  billing: ['manage_billing', 'view_reports'],
  hospitals: ['manage_hospitals', 'register_hospitals'],
  users: ['manage_users'],
  activity: ['view_activity_logs'],
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '◫' },
  { id: 'patients', label: 'Patients', icon: '👥' },
  { id: 'appointments', label: 'Appointments', icon: '🗓' },
  { id: 'clinical', label: 'Clinical', icon: '🩺' },
  { id: 'pharmacy', label: 'Pharmacy', icon: '💊' },
  { id: 'laboratory', label: 'Laboratory', icon: '🧪' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'hospitals', label: 'Hospitals', icon: '🏨' },
  { id: 'users', label: 'Users', icon: '🛡' },
  { id: 'activity', label: 'Activity', icon: '📊' },
]

function App() {
  const [user, setUser] = useState(null)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [loginIdentifier, setLoginIdentifier] = useState('admin')
  const [loginPassword, setLoginPassword] = useState(DEFAULT_PASSWORD)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState(seedUsers)
  const [hospitals, setHospitals] = useState(seedHospitals)
  const [patients, setPatients] = useState(seedPatients)
  const [activityLogs, setActivityLogs] = useState(seedActivityLogs)
  const [appointments, setAppointments] = useState([
    { id: 1, patient: 'Alicia Nguyen', doctor: 'Dr. Amina Niyonsenga', time: '09:00', status: 'Confirmed' },
    { id: 2, patient: 'Emmanuel Mugenzi', doctor: 'Dr. Mugisha', time: '10:30', status: 'Waiting' },
  ])
  const [clinicalNotes, setClinicalNotes] = useState([
    { patient: 'Alicia Nguyen', note: 'Stable condition; continue monitoring.' },
    { patient: 'Emmanuel Mugenzi', note: 'Requires further lab screening.' },
  ])
  const [labOrders, setLabOrders] = useState([
    { patient: 'Emmanuel Mugenzi', test: 'Blood panel', status: 'Pending' },
    { patient: 'Alicia Nguyen', test: 'Urine analysis', status: 'Completed' },
  ])
  const [billing, setBilling] = useState([
    { patient: 'Alicia Nguyen', amount: 320000, status: 'Paid' },
    { patient: 'Emmanuel Mugenzi', amount: 180000, status: 'Pending' },
  ])
  const [userForm, setUserForm] = useState(initialUserForm)
  const [hospitalForm, setHospitalForm] = useState(initialHospitalForm)
  const [patientForm, setPatientForm] = useState(initialPatientForm)
  const [consultationForm, setConsultationForm] = useState({ patient: 'Alicia Nguyen', result: 'Stable', destination: 'pharmacy', note: '' })
  const [pharmacyForm, setPharmacyForm] = useState({ patientId: 'PAT-000001', medicine: 'Paracetamol', billStatus: 'Paid' })
  const [activityQuery, setActivityQuery] = useState('')

  const activeUserPermissions = useMemo(() => user?.permissions || [], [user])

  const visibleSections = useMemo(() => {
    if (!user) return []
    return navItems.filter((item) => hasAccess(user, item.id))
  }, [user])

  async function loadSystemData() {
    try {
      const [usersResponse, hospitalsResponse, patientsResponse, activityResponse] = await Promise.all([
        fetchUsers().catch(() => ({ data: seedUsers })),
        fetchHospitals().catch(() => ({ data: seedHospitals })),
        fetchPatients().catch(() => ({ data: seedPatients })),
        fetchActivityLogs().catch(() => ({ data: seedActivityLogs })),
      ])

      setUsers(Array.isArray(usersResponse?.data) ? usersResponse.data : seedUsers)
      setHospitals(Array.isArray(hospitalsResponse?.data) ? hospitalsResponse.data : seedHospitals)
      setPatients(Array.isArray(patientsResponse?.data) ? patientsResponse.data : seedPatients)
      setActivityLogs(Array.isArray(activityResponse?.data) ? activityResponse.data : seedActivityLogs)
    } catch {
      setUsers(seedUsers)
      setHospitals(seedHospitals)
      setPatients(seedPatients)
      setActivityLogs(seedActivityLogs)
    }
  }

  useEffect(() => {
    let isMounted = true

    getCurrentUser()
      .then((response) => {
        if (!isMounted) return
        setUser(normalizeUser(response.data.user))
        loadSystemData()
      })
      .catch(() => undefined)

    return () => {
      isMounted = false
    }
  }, [])

  function hasAccess(currentUser, section) {
    if (!currentUser || !currentUser.permissions) return false
    const required = sectionAccess[section] || []
    if (!required.length) return true
    return required.some((permission) => currentUser.permissions.includes(permission))
  }

  function addActivity(action, location, details, actor = user?.username || 'system') {
    const entry = {
      id: Date.now(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: actor,
      action,
      location,
      details,
    }
    setActivityLogs((existing) => [entry, ...existing])
    createActivityLog({ action, location, details, actor }).catch(() => undefined)
  }

  async function handleLogin(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await loginUser({ identifier: loginIdentifier, password: loginPassword })
      const normalizedUser = normalizeUser(response.data.user)
      setUser(normalizedUser)
      setLoginIdentifier(normalizedUser.username)
      setLoginPassword(DEFAULT_PASSWORD)
      await loadSystemData()
      addActivity('User login', 'Authentication', `${normalizedUser.displayName} signed in.`, normalizedUser.username)
    } catch (err) {
      setError(err.message || 'Invalid username/email/phone or password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setError('')

    try {
      await logoutUser()
      setUser(null)
      setActiveSection('dashboard')
    } catch (err) {
      setError(err.message || 'Logout failed. Please try again.')
    }
  }

  async function handleAddUser(event) {
    event.preventDefault()
    if (!userForm.name || !userForm.username || !userForm.email || !userForm.phone) return

    try {
      const payload = { ...userForm, password: userForm.password || DEFAULT_PASSWORD }
      const response = await createUser(payload)
      const nextUser = response.data || payload
      setUsers((current) => [nextUser, ...current])
      addActivity('Created system user', 'User Management', `${nextUser.name} was created with role ${nextUser.role}.`, user?.username || 'admin')
      setUserForm(initialUserForm)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteUser(userId) {
    try {
      await deleteUser(userId)
      setUsers((current) => current.filter((entry) => entry.id !== userId))
      addActivity('Deleted system user', 'User Management', `User ID ${userId} removed.`, user?.username || 'admin')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddHospital(event) {
    event.preventDefault()
    if (!hospitalForm.name || !hospitalForm.address || !hospitalForm.manager) return

    try {
      const response = await createHospital(hospitalForm)
      const nextHospital = response.data || { ...hospitalForm, id: `HSP-${Date.now()}` }
      setHospitals((current) => [nextHospital, ...current])
      addActivity('Registered new hospital', 'Global Admin', `${nextHospital.name} added by ${user?.name || 'admin'}.`, user?.username || 'admin')
      setHospitalForm(initialHospitalForm)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteHospital(hospitalId) {
    try {
      await deleteHospital(hospitalId)
      setHospitals((current) => current.filter((entry) => entry.id !== hospitalId))
      addActivity('Removed hospital', 'Global Admin', `Hospital ID ${hospitalId} removed from the network.`, user?.username || 'admin')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddPatient(event) {
    event.preventDefault()
    if (!patientForm.name || !patientForm.nationalId || !patientForm.phone) return

    const duplicate = patients.some((entry) => (entry.nationalId || entry.national_id) === patientForm.nationalId)
    if (duplicate) {
      setError('This national ID is already registered in the system.')
      return
    }

    try {
      const payload = {
        ...patientForm,
        address: {
          district: patientForm.district,
          sector: patientForm.sector,
          cell: patientForm.cell,
          village: patientForm.village,
        },
      }
      const response = await createPatient(payload)
      const nextPatient = response.data || { ...payload, id: `PAT-${Date.now()}` }
      setPatients((current) => [nextPatient, ...current])
      addActivity('Registered patient', 'Front Desk', `${nextPatient.name} registered with NID ${nextPatient.nationalId}.`, user?.username || 'receptionist')
      setPatientForm(initialPatientForm)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeletePatient(patientId) {
    try {
      await deletePatient(patientId)
      setPatients((current) => current.filter((entry) => entry.id !== patientId))
      addActivity('Removed patient record', 'Patient Management', `Patient record ${patientId} removed.`, user?.username || 'admin')
    } catch (err) {
      setError(err.message)
    }
  }

  function handleConsultationSubmit(event) {
    event.preventDefault()
    if (!consultationForm.patient || !consultationForm.note) return

    setClinicalNotes((current) => [{ patient: consultationForm.patient, note: consultationForm.note }, ...current])
    addActivity('Consultation recorded', 'Clinical', `${consultationForm.patient} was reviewed and sent to ${consultationForm.destination}.`, user?.username || 'doctor')
    setConsultationForm((current) => ({ ...current, note: '' }))
  }

  function handleLabSubmit(event) {
    event.preventDefault()
    if (!consultationForm.patient) return
    setLabOrders((current) => [{ patient: consultationForm.patient, test: 'Diagnostic screening', status: 'Pending' }, ...current])
    addActivity('Lab request created', 'Laboratory', `New examination requested for ${consultationForm.patient}.`, user?.username || 'lab')
  }

  function handlePharmacySubmit(event) {
    event.preventDefault()
    const patient = patients.find((entry) => entry.id === pharmacyForm.patientId || entry.nationalId === pharmacyForm.patientId || entry.national_id === pharmacyForm.patientId)
    if (!patient) {
      setError('Patient not found. Use patient ID or national ID.')
      return
    }

    const paid = billing.some((entry) => entry.patient === patient.name && entry.status === 'Paid') || patient.mutuelPaid
    if (!paid && pharmacyForm.billStatus !== 'Paid') {
      setError('This patient has not paid the bill yet. Medicine cannot be dispensed.')
      return
    }

    addActivity('Medication dispensed', 'Pharmacy', `${patient.name} received medication after payment verification.`, user?.username || 'pharmacist')
    setError('')
  }

  function handleAddAppointment(event) {
    event.preventDefault()
    const newItem = { id: Date.now(), patient: 'New Patient', doctor: 'Dr. Amina Niyonsenga', time: '12:00', status: 'Scheduled' }
    setAppointments((current) => [newItem, ...current])
    addActivity('Appointment created', 'Reception', 'A new appointment was scheduled.', user?.username || 'receptionist')
  }

  function patientHistoryByNationalId() {
    const lookupId = patientForm.nationalId || ''
    if (!lookupId) return []
    return activityLogs.filter((entry) => {
      const text = `${entry.details || ''} ${entry.action || ''}`
      return text.includes(lookupId)
    })
  }

  if (!user) {
    return (
      <Login
        loginIdentifier={loginIdentifier}
        setLoginIdentifier={setLoginIdentifier}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        onSubmit={handleLogin}
        loading={loading}
        error={error}
      />
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">SH</div>
          <div>
            <h2>Smart Hospital</h2>
            <small>Operations</small>
          </div>
        </div>

        <div className="nav-label">Overview</div>
        <nav className="nav">
          {visibleSections.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeSection === item.id ? 'nav-link active' : 'nav-link'}
              onClick={() => setActiveSection(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="main-panel">
        {activeSection !== 'dashboard' && (
          <header className="topbar">
            <div>
              <p className="eyebrow">Healthcare administration</p>
              <h1>{user.displayName}'s dashboard</h1>
            </div>

            <div className="topbar-user">
              <span className="status-dot online" />
              <div className="user-meta">
                <strong>{user.displayName}</strong>
                <small>{user.roleName}</small>
              </div>
            </div>
          </header>
        )}

        {activeSection === 'dashboard' && (
          <Dashboard
            user={user}
            hospitals={hospitals}
            users={users}
            patients={patients}
            appointments={appointments}
            labOrders={labOrders}
            activityLogs={activityLogs}
            visibleSections={visibleSections}
            onNavigate={setActiveSection}
          />
        )}

        {activeSection === 'patients' && (
          <div className="panel large-panel">
            <div className="panel-header">
              <h3>Patients</h3>
            </div>
            <Patients
              user={user}
              patients={patients}
              hospitals={hospitals}
              patientForm={patientForm}
              setPatientForm={setPatientForm}
              onSubmit={handleAddPatient}
              onDelete={handleDeletePatient}
              locationOptions={rwandaLocationOptions}
            />
          </div>
        )}

        {activeSection === 'appointments' && (
          <div className="panel large-panel">
            <div className="panel-header">
              <h3>Appointments</h3>
            </div>
            <div className="section-stack">
              <form className="patient-form" onSubmit={handleAddAppointment}>
                <div className="form-header"><strong>Schedule appointment</strong></div>
                <button type="submit" className="primary-btn compact-btn">Create appointment</button>
              </form>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>{appointment.patient}</td>
                        <td>{appointment.doctor}</td>
                        <td>{appointment.time}</td>
                        <td><span className={`pill ${appointment.status === 'Confirmed' ? 'confirmed' : 'pending'}`}>{appointment.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'clinical' && (
          <div className="panel large-panel">
            <div className="panel-header">
              <h3>Clinical</h3>
            </div>
            <div className="section-stack">
              <form className="patient-form" onSubmit={handleConsultationSubmit}>
                <div className="form-header"><strong>Consultation</strong></div>
                <div className="form-grid">
                  <label>
                    <span>Patient</span>
                    <select value={consultationForm.patient} onChange={(event) => setConsultationForm({ ...consultationForm, patient: event.target.value })}>
                      {patients.map((patient) => (
                        <option key={patient.id}>{patient.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Result</span>
                    <select value={consultationForm.result} onChange={(event) => setConsultationForm({ ...consultationForm, result: event.target.value })}>
                      <option>Stable</option>
                      <option>Needs follow-up</option>
                      <option>Critical</option>
                    </select>
                  </label>
                  <label>
                    <span>Send to</span>
                    <select value={consultationForm.destination} onChange={(event) => setConsultationForm({ ...consultationForm, destination: event.target.value })}>
                      <option value="pharmacy">Pharmacy</option>
                      <option value="lab">Lab</option>
                    </select>
                  </label>
                  <label className="full-span">
                    <span>Clinical notes</span>
                    <textarea value={consultationForm.note} onChange={(event) => setConsultationForm({ ...consultationForm, note: event.target.value })} placeholder="Describe diagnosis and treatment plan." />
                  </label>
                </div>
                <div className="button-row">
                  <button type="submit" className="primary-btn compact-btn">Save consultation</button>
                  <button type="button" className="secondary-btn" onClick={handleLabSubmit}>Send to lab</button>
                </div>
              </form>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Patient</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {clinicalNotes.map((entry, index) => (
                      <tr key={`${entry.patient}-${index}`}>
                        <td>{entry.patient}</td>
                        <td>{entry.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'pharmacy' && (
          <div className="panel large-panel">
            <div className="panel-header">
              <h3>Pharmacy</h3>
            </div>
            <div className="section-stack">
              <form className="patient-form" onSubmit={handlePharmacySubmit}>
                <div className="form-header"><strong>Medication dispensing</strong></div>
                <div className="form-grid">
                  <label>
                    <span>Patient ID / NID</span>
                    <input value={pharmacyForm.patientId} onChange={(event) => setPharmacyForm({ ...pharmacyForm, patientId: event.target.value })} />
                  </label>
                  <label>
                    <span>Medicine</span>
                    <input value={pharmacyForm.medicine} onChange={(event) => setPharmacyForm({ ...pharmacyForm, medicine: event.target.value })} />
                  </label>
                  <label>
                    <span>Billing status</span>
                    <select value={pharmacyForm.billStatus} onChange={(event) => setPharmacyForm({ ...pharmacyForm, billStatus: event.target.value })}>
                      <option>Paid</option>
                      <option>Pending</option>
                    </select>
                  </label>
                </div>
                <button type="submit" className="primary-btn compact-btn">Issue medicine</button>
              </form>

              <div className="info-stack">
                {billing.map((item) => (
                  <div key={item.patient} className="info-box">
                    <strong>{item.patient}</strong>
                    <span>Amount: {Number(item.amount).toLocaleString()} RWF</span>
                    <span>Status: {item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'laboratory' && (
          <div className="panel large-panel">
            <div className="panel-header">
              <h3>Laboratory</h3>
            </div>
            <div className="section-stack">
              <div className="info-stack">
                {labOrders.map((entry, index) => (
                  <div className="info-box" key={`${entry.patient}-${index}`}>
                    <strong>{entry.patient}</strong>
                    <span>{entry.test}</span>
                    <span>Status: {entry.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'billing' && (
          <div className="panel large-panel">
            <div className="panel-header">
              <h3>Billing</h3>
            </div>
            <div className="info-stack">
              {billing.map((entry) => (
                <div className="info-box" key={entry.patient}>
                  <strong>{entry.patient}</strong>
                  <span>Due: {Number(entry.amount).toLocaleString()} RWF</span>
                  <span>Status: {entry.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'hospitals' && (
          <div className="panel large-panel">
            <div className="panel-header">
              <h3>Hospitals</h3>
            </div>
            <Hospitals
              user={user}
              hospitals={hospitals}
              hospitalForm={hospitalForm}
              setHospitalForm={setHospitalForm}
              onSubmit={handleAddHospital}
              onDelete={handleDeleteHospital}
              locationOptions={rwandaLocationOptions}
            />
          </div>
        )}

        {activeSection === 'users' && (
          <div className="panel large-panel">
            <div className="panel-header">
              <h3>Users</h3>
            </div>
            <Users
              user={user}
              users={users}
              userForm={userForm}
              setUserForm={setUserForm}
              onSubmit={handleAddUser}
              onDelete={handleDeleteUser}
            />
          </div>
        )}

        {activeSection === 'activity' && (
          <div className="panel large-panel">
            <div className="panel-header">
              <h3>Activity</h3>
            </div>
            <Activity
              logs={patientHistoryByNationalId().length ? patientHistoryByNationalId() : activityLogs}
              query={activityQuery}
              setQuery={setActivityQuery}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
