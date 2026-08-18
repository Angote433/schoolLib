import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { tokens } from '../styles/tokens';
import { Input, Button, Banner } from '../components/SharedComponents';

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
      <div style={styles.decorLayer} />

      <div style={styles.card}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconWrap}>
            <span style={styles.icon}>📚</span>
          </div>
          <h1 style={styles.title}>School Library</h1>
          <p style={styles.subtitle}>Sign in to manage your library</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>

          {/* Username field */}
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <Input
              type="text"
              placeholder="Enter your username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
              disabled={loading}
              style={styles.input}
            />
          </div>

          {/* Password field */}
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={styles.input}
            />
          </div>

          {/* Error message — only shows when there is an error */}
          {error && <Banner type="error">{error}</Banner>}

          {/* Submit button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>

        </form>
      </div>

      <p style={styles.footerNote}>
        School Library Management System — for librarians &amp; staff
      </p>
    </div>
  );
}

// Styles — written as JavaScript objects
const styles = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(160deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryDark} 55%, #0B1226 100%)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: tokens.font.family,
    position: 'relative',
    overflow: 'hidden',
    padding: 20,
  },
  decorLayer: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      `radial-gradient(circle at 15% 20%, rgba(13,148,136,0.25) 0%, transparent 45%),
       radial-gradient(circle at 85% 80%, rgba(45,66,112,0.5) 0%, transparent 50%)`,
    pointerEvents: 'none',
  },
  card: {
    background: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    padding: '44px 40px',
    width: '100%',
    maxWidth: 400,
    boxShadow: tokens.shadows.xl,
    position: 'relative',
    zIndex: 1,
  },
  header: {
    textAlign: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: tokens.radius.lg,
    background: tokens.colors.surface,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
  },
  icon: {
    fontSize: 32,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: tokens.colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    margin: '6px 0 0',
    color: tokens.colors.textMuted,
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
    color: tokens.colors.textSecondary,
  },
  input: {
    height: 44,
  },
  submitBtn: {
    width: '100%',
    marginTop: 8,
  },
  footerNote: {
    marginTop: 24,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    position: 'relative',
    zIndex: 1,
  },
};
