import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/libraryApi';
import { tokens } from '../styles/tokens';
import {
  FormField, Input, Button, Banner, Card,
} from '../components/SharedComponents';
import Icon from '../components/Icon';

const MIN_PASSWORD_LENGTH = 8;

export default function Settings() {
  const { updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // ── PROFILE ────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [fullName, setFullName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await userService.getMe();
      setProfile(res.data);
      setFullName(res.data.fullName || '');
    } catch {
      setProfileError('Failed to load your profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setSavingProfile(true);
    try {
      const res = await userService.updateProfile({ fullName });
      setProfile(res.data);
      updateUser(res.data);
      showProfileSuccess('Profile updated');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const showProfileSuccess = (msg) => {
    setProfileSuccess(msg);
    setTimeout(() => setProfileSuccess(''), 4000);
  };

  // ── PASSWORD ───────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Inline validation — computed on every render, shown only once the
  // user has typed something so an empty form doesn't open with errors.
  const lengthError = newPassword && newPassword.length < MIN_PASSWORD_LENGTH
    ? `Must be at least ${MIN_PASSWORD_LENGTH} characters`
    : '';
  const mismatchError = confirmPassword && confirmPassword !== newPassword
    ? 'Passwords do not match'
    : '';

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await userService.changePassword({ currentPassword, newPassword, confirmPassword });

      // The API is stateless — the JWT we're holding stays valid until
      // it expires. Rather than build server-side token invalidation, we
      // just clear the session here and send the user back to login.
      // The message goes through localStorage, not navigate() state —
      // logout() flips ProtectedRoute's own redirect-to-"/" logic, which
      // can fire after this navigate() and silently win the race,
      // dropping any state we attached. See Login.jsx.
      localStorage.setItem('authMessage', 'Password updated. Please log in again.');
      logout();
      navigate('/');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loadingProfile) {
    return <div style={styles.loadingText}>Loading settings…</div>;
  }

  return (
    <div>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>Settings</h1>
        <p style={styles.pageSub}>Manage your profile and password</p>
      </div>

      {/* ── PROFILE SECTION ────────────────────────────── */}
      <Card style={{ marginBottom: 20 }}>
        <h2 style={styles.sectionTitle}>Profile</h2>

        {profileSuccess && <Banner type="success">{profileSuccess}</Banner>}
        {profileError && <Banner type="error">{profileError}</Banner>}

        <form onSubmit={handleSaveProfile}>
          <FormField label="Username">
            <Input value={profile?.userName || ''} disabled style={styles.readOnlyField} />
          </FormField>
          <FormField label="Role">
            <Input value={profile?.role === 'LIBRARIAN' ? 'Librarian' : 'Teacher'} disabled style={styles.readOnlyField} />
          </FormField>
          <FormField label="Assigned Stream">
            <Input value={profile?.streamName || 'No stream assigned'} disabled style={styles.readOnlyField} />
          </FormField>
          <FormField label="Full Name">
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </FormField>

          <Button type="submit" variant="primary" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </Button>
        </form>
      </Card>

      {/* ── CHANGE PASSWORD SECTION ───────────────────── */}
      <Card>
        <h2 style={styles.sectionTitle}>Change Password</h2>
        <p style={styles.sectionHint}>
          You will be signed out and asked to log in again after a successful change.
        </p>

        {passwordError && <Banner type="error">{passwordError}</Banner>}

        <form onSubmit={handleChangePassword}>
          <FormField label="Current Password">
            <PasswordField
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              show={showCurrent}
              onToggleShow={() => setShowCurrent(s => !s)}
              required
            />
          </FormField>

          <FormField label="New Password" error={lengthError}>
            <PasswordField
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              show={showNew}
              onToggleShow={() => setShowNew(s => !s)}
              required
            />
          </FormField>

          <FormField label="Confirm New Password" error={mismatchError}>
            <PasswordField
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              show={showConfirm}
              onToggleShow={() => setShowConfirm(s => !s)}
              required
            />
          </FormField>

          <Button type="submit" variant="primary" disabled={changingPassword}>
            {changingPassword ? 'Changing…' : 'Change Password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

// ── PASSWORD FIELD WITH SHOW/HIDE TOGGLE ────────────────────────────────
// Essential on a phone — a teacher can't see what they typed otherwise,
// and unseen typos are exactly the class of problem behind earlier
// failed logins.
function PasswordField({ value, onChange, show, onToggleShow, required }) {
  return (
    <div style={styles.passwordWrap}>
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={onToggleShow}
        style={styles.toggleBtn}
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        <Icon name={show ? 'eye-off' : 'eye'} size={16} />
      </button>
    </div>
  );
}

const styles = {
  loadingText: { color: tokens.colors.textMuted, padding: 40, textAlign: 'center', fontSize: 14 },
  pageHeader: { marginBottom: tokens.spacing.lg },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: tokens.colors.textPrimary },
  pageSub: { margin: '4px 0 0', color: tokens.colors.textSecondary, fontSize: 14 },
  sectionTitle: { margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: tokens.colors.textPrimary },
  sectionHint: { margin: '0 0 16px', fontSize: 12.5, color: tokens.colors.textMuted, lineHeight: 1.5 },
  readOnlyField: { background: tokens.colors.surface, color: tokens.colors.textMuted, cursor: 'not-allowed' },
  passwordWrap: { position: 'relative' },
  toggleBtn: {
    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
    width: 34, height: 34, borderRadius: tokens.radius.sm,
    border: 'none', background: 'transparent', cursor: 'pointer',
    fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
