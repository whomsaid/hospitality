export default function Dashboard({ user, hospitals, users, patients, appointments, labOrders, activityLogs, visibleSections = [], onNavigate }) {
  const isSuperAdmin = user?.roleName === 'super_admin'
  const recentActivity = activityLogs.slice(0, 4)
  const doctorProfiles = users.filter((entry) => (entry.role || entry.role_name) === 'doctor')
  const featuredDoctor = doctorProfiles[0]
  const openLabCases = labOrders.filter((entry) => entry.status?.toLowerCase() !== 'completed').length
  const completedLabCases = labOrders.length - openLabCases
  const labCompletionPercent = labOrders.length ? Math.round((completedLabCases / labOrders.length) * 100) : 0
  const hospitalStatuses = [
    { label: 'Operational', count: hospitals.filter((entry) => entry.status?.toLowerCase() === 'operational'), color: 'bar-teal' },
    { label: 'Under review', count: hospitals.filter((entry) => entry.status?.toLowerCase() === 'review'), color: 'bar-orange' },
    { label: 'Pending', count: hospitals.filter((entry) => entry.status?.toLowerCase() === 'pending'), color: 'bar-purple' },
  ]
  const workloadBars = [
    { label: 'Patients', count: patients.length, color: 'bar-teal' },
    { label: 'Appointments', count: appointments.length, color: 'bar-blue' },
    { label: 'Open lab cases', count: openLabCases, color: 'bar-orange' },
  ]
  const maxWorkload = Math.max(1, ...workloadBars.map((item) => item.count))
  const roleTitles = {
    doctor: 'Clinical Overview',
    receptionist: 'Front Desk Overview',
    pharmacist: 'Pharmacy Overview',
    lab_technician: 'Laboratory Overview',
    accountant: 'Billing Overview',
  }
  const quickLinkIcons = {
    patients: '👥', appointments: '🗓', clinical: '🩺', pharmacy: '💊',
    laboratory: '🧪', billing: '💳', hospitals: '🏥', users: '🛡', activity: '📊',
  }
  const quickLinkPriority = isSuperAdmin
    ? ['hospitals', 'users', 'patients', 'activity']
    : visibleSections.filter((item) => item.id !== 'dashboard').map((item) => item.id)
  const quickLinks = quickLinkPriority
    .map((sectionId) => visibleSections.find((item) => item.id === sectionId))
    .filter(Boolean)
    .slice(0, 4)
  const operationalPercent = hospitals.length
    ? Math.round((hospitalStatuses[0].count.length / hospitals.length) * 100)
    : 0
  const highlightedHospital = hospitals[0]

  return (
    <div className="hospital-manager-dashboard">
      <header className="manager-header">
        <h2>{isSuperAdmin ? 'Network Overview' : roleTitles[user?.roleName] || 'Hospital Overview'}</h2>
        <div className="manager-header-actions">
          <div className="header-user-pill">
            <span className="mini-avatar">👤</span>
            <span>{user?.displayName || 'David Williams'}</span>
          </div>
        </div>
      </header>

      <div className="manager-grid">
        <section className="manager-column left-column">
          {isSuperAdmin ? (
            <div className="panel-card chat-card">
              <div className="chat-header-row">
                <span>System at a glance</span>
                <span className="camera-pill">●</span>
              </div>
              <div className="network-summary">
                <div><span>Hospitals</span><strong>{hospitals.length}</strong></div>
                <div><span>Registered patients</span><strong>{patients.length}</strong></div>
                <div><span>System users</span><strong>{users.length}</strong></div>
              </div>
            </div>
          ) : (
            <div className="panel-card chat-card">
              <div className="chat-header-row">
                <span>Workspace Summary</span>
                <span className="camera-pill">●</span>
              </div>
              <div className="network-summary">
                <div><span>Patients</span><strong>{patients.length}</strong></div>
                <div><span>Appointments</span><strong>{appointments.length}</strong></div>
                <div><span>Open lab cases</span><strong>{openLabCases}</strong></div>
              </div>
            </div>
          )}

          <div className="quick-grid">
            {quickLinks.map((item) => (
              <button key={item.id} type="button" className="quick-card" onClick={() => onNavigate(item.id)}>
                <span className="quick-icon">{quickLinkIcons[item.id] || '↗'}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="panel-card timeline-card">
            <div className="section-title">{isSuperAdmin ? 'Recent System Activity' : 'Patient History Timeline'}</div>
            <div className="timeline-list">
              {recentActivity.slice(0, 3).map((entry, index) => (
                <div className="timeline-item" key={entry.id || `${entry.time}-${entry.action}`}>
                  <span className={`timeline-dot ${index === 1 ? 'warning' : index === 2 ? 'success' : ''}`} />
                  <div>
                    <strong>{entry.action}</strong>
                    <small>{entry.details || entry.time || 'Recent activity'}</small>
                  </div>
                </div>
              ))}
              {!recentActivity.length && <p className="empty-state">No recent activity.</p>}
            </div>
          </div>
        </section>

        <section className="manager-column center-column">
          <div className="panel-card consult-card">
            <div className="consult-header-row">
              <span>{isSuperAdmin ? 'Hospital Network Status' : 'Current Workload'}</span>
              <span className="tag">{isSuperAdmin ? 'FACILITY OVERVIEW' : 'LIVE RECORD COUNTS'}</span>
            </div>
            <div className="bars-chart" aria-label="consultation chart">
              {isSuperAdmin ? hospitalStatuses.map((status) => (
                <div className="bar-group" key={status.label}>
                  <span className={`bar ${status.color}`} style={{ height: `${Math.max(12, hospitals.length ? (status.count.length / hospitals.length) * 90 : 12)}%` }} />
                  <span className="bar-label">{status.label} ({status.count.length})</span>
                </div>
              )) : (
                workloadBars.map((item) => (
                  <div className="bar-group" key={item.label}>
                    <span className={`bar ${item.color}`} style={{ height: `${Math.max(12, (item.count / maxWorkload) * 90)}%` }} />
                    <span className="bar-label">{item.label} ({item.count})</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel-card stats-card">
            <div className="section-title">{isSuperAdmin ? 'Network Operations' : 'Laboratory Progress'}</div>
            <div className="billing-row">
              <div className="donut-chart" style={{ background: `conic-gradient(#4cc0c3 0 ${isSuperAdmin ? operationalPercent : labCompletionPercent}%, #f5bf71 ${isSuperAdmin ? operationalPercent : labCompletionPercent}% 100%)` }}>
                <div className="donut-center">
                  <strong>{isSuperAdmin ? `${operationalPercent}%` : `${labCompletionPercent}%`}</strong>
                  <span>{isSuperAdmin ? 'Operational' : 'Complete'}</span>
                </div>
              </div>
              <div className="billing-legend">
                {isSuperAdmin ? (
                  <>
                    <div className="legend-item"><span className="legend-swatch green" /> Operational <strong>{hospitalStatuses[0].count.length}</strong></div>
                    <div className="legend-item"><span className="legend-swatch orange" /> Needs review <strong>{hospitalStatuses[1].count.length + hospitalStatuses[2].count.length}</strong></div>
                    <div className="legend-item"><span className="legend-swatch blue" /> Total hospitals <strong>{hospitals.length}</strong></div>
                  </>
                ) : (
                  <>
                    <div className="legend-item"><span className="legend-swatch green" /> Completed <strong>{completedLabCases}</strong></div>
                    <div className="legend-item"><span className="legend-swatch orange" /> Open <strong>{openLabCases}</strong></div>
                    <div className="legend-item"><span className="legend-swatch blue" /> Total orders <strong>{labOrders.length}</strong></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="manager-column right-column">
          {isSuperAdmin ? (
            <>
              <div className="panel-card doctor-month-card">
                <div className="doctor-photo">🏥</div>
                <div className="doctor-ribbon">LATEST NETWORK FACILITY</div>
                <button type="button" className="doctor-button" onClick={() => onNavigate('hospitals')} aria-label="Open hospital network">↗</button>
                <h3>{highlightedHospital?.name || 'No hospitals registered'}</h3>
              </div>
              <div className="panel-card directory-card">
                <div className="section-title">Hospital Network</div>
                <div className="doctor-list">
                  {hospitals.slice(0, 4).map((hospital) => (
                    <div key={hospital.id} className="doctor-row">
                      <div className="doctor-meta">
                        <strong>{hospital.name}</strong>
                        <span>{hospital.location || hospital.address || hospital.province || 'Location not provided'}</span>
                      </div>
                      <span className="doctor-phone">{hospital.status || 'Pending'}</span>
                    </div>
                  ))}
                  {!hospitals.length && <p className="empty-doctors">No hospitals registered.</p>}
                </div>
              </div>
            </>
          ) : (
          <>
          <div className="panel-card doctor-month-card">
            <div className="doctor-photo">👨‍⚕️</div>
                <div className="doctor-ribbon">CLINICAL TEAM</div>
            <h3>{featuredDoctor?.name || featuredDoctor?.full_name || featuredDoctor?.username || 'No doctor account'}</h3>
          </div>

          <div className="panel-card directory-card">
            <div className="section-title">Doctor Directory</div>
            <div className="doctor-list">
              {doctorProfiles.map((doctor) => (
                <div key={doctor.id} className="doctor-row">
                  <div className="doctor-meta">
                    <strong>{doctor.name || doctor.full_name || doctor.username}</strong>
                    <span>Doctor</span>
                  </div>
                  <span className="doctor-phone">{doctor.phone || 'No phone'}</span>
                </div>
              ))}
              {!doctorProfiles.length && <p className="empty-doctors">No doctor accounts yet.</p>}
            </div>
          </div>
          </>
          )}
        </aside>
      </div>
    </div>
  )
}
