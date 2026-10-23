import { DEFAULT_PASSWORD } from '../api'

export default function Login({ loginIdentifier, setLoginIdentifier, loginPassword, setLoginPassword, onSubmit, loading, error }) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-mark">SH</div>
          <div>
            <h1>Smart Hospital</h1>
            <span>Unified healthcare operations</span>
          </div>
        </div>

        <div className="contact-strip">
          <div>
            <strong>Contact</strong>
            <span>+250 788 000 000</span>
          </div>
          <div>
            <strong>Email</strong>
            <span>support@smart-hospital.org</span>
          </div>
          <div>
            <strong>Location</strong>
            <span>Kigali, Rwanda</span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="auth-form">
          <label>
            <span>Username / Email / Phone</span>
            <input
              type="text"
              value={loginIdentifier}
              onChange={(event) => setLoginIdentifier(event.target.value)}
              placeholder="Enter username or email or phone"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder={DEFAULT_PASSWORD}
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="password-note">
          Default password for all users: <strong>{DEFAULT_PASSWORD}</strong>
        </div>
      </div>
    </div>
  )
}
