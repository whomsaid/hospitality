export default function Activity({ logs, query, setQuery }) {
  const visibleLogs = query ? logs.filter((log) => {
    const text = `${log.action || ''} ${log.details || ''} ${log.actor || log.user || ''} ${log.location || ''}`.toLowerCase()
    return text.includes(query.toLowerCase())
  }) : logs

  return (
    <div className="timeline-box">
      <div className="search-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search patient logs by NID or action"
        />
      </div>

      <div className="timeline">
        {visibleLogs.length ? visibleLogs.map((log) => (
            <div key={log.id || `${log.time}-${log.action}`} className="timeline-item">
              <div className="timeline-time">{log.time || new Date(log.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="timeline-content">
                <strong>{log.action}</strong>
                <span>{log.actor || log.user}</span>
                <small>{log.location}</small>
                <p>{log.details}</p>
              </div>
            </div>
          )) : <p className="empty-state">No activity matches your search.</p>}
      </div>
    </div>
  )
}
