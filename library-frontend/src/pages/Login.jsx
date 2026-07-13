import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {

  // Form state — tracks what the user types
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get the login function from AuthContext
  const { login } = useAuth();

  // navigate lets you go to another page programmatically
  const navigate = useNavigate();

  // Called when user clicks Sign In
  const handleSubmit = async (e) => {
    // Prevent page reload — default form behaviour
    e.preventDefault();

    // Clear any previous error
    setError('');

    // Show loading state
    setLoading(true);

    try {
      // Step 1 — send credentials to Spring Boot
      // POST /api/auth/login with username and password
      const response = await api.post('/auth/login', {
        userName: userName,
        password: password,
      });

      // Step 2 — server responded with 200 OK
      // response.data contains:
      // { token, userId, fullName, role, userName }
      const data = response.data;

      console.log('Login successful:', data);

      // Step 3 — store token and user in AuthContext
      // This also saves to localStorage for page refresh
      login(data, data.token);

      // Step 4 — go to dashboard
      navigate('/dashboard');

    } catch (err) {
      // Login failed — show error message
      if (err.response) {
        // Server responded with an error e.g. 401 wrong password
        setError(err.response.data || 'Invalid username or password');
      } else {
        // Network error — cannot reach server
        setError('Cannot connect to server.');
      }
    } finally {
      // Always hide loading state when done
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.icon}>📚</div>
          <h1 style={styles.title}>Autolibrary</h1>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Username field */}
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter your username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Password field */}
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {/* Error message — only shows when there is an error */}
          {error && (
            <div style={styles.error}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit button */}
          <button
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

        </form>
      </div>
    </div>
  );
}

// Styles — written as JavaScript objects
// Same as CSS but with camelCase property names
const styles = {
  page: {
    minHeight: '100vh',
    background: '#f0f2f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Segoe UI, sans-serif',
  },
  card: {
    background: '#ffffff',
    borderRadius: 12,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  subtitle: {
    margin: '6px 0 0',
    color: '#666',
    fontSize: 14,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
  },
  input: {
    padding: '10px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif',
  },
  error: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#c53030',
    fontSize: 13,
  },
  button: {
    background: '#1a1a2e',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: 'Segoe UI, sans-serif',
  },
};