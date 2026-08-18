import { useState, useEffect } from 'react';
import { userService, streamService } from '../services/libraryApi';
import { tokens } from '../styles/tokens';
import {
  Modal, FormField, Input, Button, Banner, EmptyState,
  Tabs, Card, Avatar,
} from '../components/SharedComponents';

export default function Users() {

  const [users, setUsers] = useState([]);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  // 'ALL' | 'TEACHER' | 'LIBRARIAN'
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Search text — filters by name locally without API call
  const [searchText, setSearchText] = useState('');

  // Modal control
  // null | 'createUser' | 'confirmDeactivate' | 'confirmActivate'
  const [modal, setModal] = useState(null);

  // The user being acted on (deactivate/activate)
  const [selectedUser, setSelectedUser] = useState(null);

  // Create user form
  const [form, setForm] = useState({
    fullName: '',
    userName: '',
    passwordHash: '',
    role: 'TEACHER',
  });

  // Feedback
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  //LOAD DATA
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, streamsRes] = await Promise.all([
        userService.getAll(),
        streamService.getAll(),
      ]);
      setUsers(usersRes.data);
      setStreams(streamsRes.data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // ── FILTER LOGIC ──────────────────────────────────────
  const filteredUsers = users.filter((user) => {
    const roleMatch = roleFilter === 'ALL' || user.role === roleFilter;
    const searchMatch =
      searchText === '' ||
      user.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
      user.userName.toLowerCase().includes(searchText.toLowerCase());
    return roleMatch && searchMatch;
  });

  const countAll = users.length;
  const countTeachers = users.filter(u => u.role === 'TEACHER').length;
  const countLibrarians = users.filter(u => u.role === 'LIBRARIAN').length;

  // ── CREATE USER ───────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await userService.create(form);
      showSuccess(
        `${form.role === 'TEACHER' ? 'Teacher' : 'Librarian'} account created for ${form.fullName}`
      );
      closeModal();
      loadData();
      setForm({ fullName: '', userName: '', passwordHash: '', role: 'TEACHER' });
    } catch (err) {
      setError(err.response?.data || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // ── DEACTIVATE ────────────────────────────────────────
  const handleDeactivate = async () => {
    setSubmitting(true);
    try {
      await userService.deactivate(selectedUser.userId);
      showSuccess(`${selectedUser.fullName}'s account has been deactivated`);
      closeModal();
      loadData();
    } catch (err) {
      setError(err.response?.data || 'Failed to deactivate user');
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  // ── ACTIVATE ──────────────────────────────────────────
  const handleActivate = async () => {
    setSubmitting(true);
    try {
      await userService.activate(selectedUser.userId);
      showSuccess(`${selectedUser.fullName}'s account has been activated`);
      closeModal();
      loadData();
    } catch (err) {
      setError(err.response?.data || 'Failed to activate user');
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  // ── HELPERS ───────────────────────────────────────────
  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const closeModal = () => {
    setModal(null);
    setSelectedUser(null);
    setError('');
  };

  const getTeacherStream = (user) => {
    if (user.role !== 'TEACHER') return null;
    const stream = streams.find(s => s.teacher?.userId === user.userId);
    return stream ? stream.streamName : null;
  };

  // ── RENDER ────────────────────────────────────────────
  return (
    <div>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Users</h1>
          <p style={styles.pageSub}>Manage librarian and teacher accounts</p>
        </div>
        <Button variant="primary" onClick={() => setModal('createUser')}>
          + Create User
        </Button>
      </div>

      {/* ── FEEDBACK ─────────────────────────────────── */}
      {success && <Banner type="success">{success}</Banner>}
      {error && !modal && <Banner type="error">{error}</Banner>}

      {/* ── FILTER TABS + SEARCH ─────────────────────── */}
      <div style={styles.controls}>
        <Tabs
          variant="pill"
          items={[
            { key: 'ALL', label: `All (${countAll})` },
            { key: 'TEACHER', label: `Teachers (${countTeachers})` },
            { key: 'LIBRARIAN', label: `Librarians (${countLibrarians})` },
          ]}
          active={roleFilter}
          onChange={setRoleFilter}
        />
        <Input
          style={styles.searchInput}
          placeholder="🔍  Search by name or username..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
      </div>

      {/* ── USERS GRID ───────────────────────────────── */}
      {loading ? (
        <div style={styles.loadingText}>Loading users…</div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon="👤"
          title={searchText ? 'No users match your search' : 'No users found'}
          subtitle={!searchText && 'Click "Create User" to add the first user'}
        />
      ) : (
        <div style={styles.usersGrid}>
          {filteredUsers.map((user) => (
            <UserCard
              key={user.userId}
              user={user}
              streamName={getTeacherStream(user)}
              onDeactivate={() => {
                setSelectedUser(user);
                setModal('confirmDeactivate');
              }}
              onActivate={() => {
                setSelectedUser(user);
                setModal('confirmActivate');
              }}
            />
          ))}
        </div>
      )}

      {/* ── CREATE USER MODAL ────────────────────────── */}
      {modal === 'createUser' && (
        <Modal title="Create New User" onClose={closeModal}>
          <form onSubmit={handleCreate}>
            {error && <Banner type="error">{error}</Banner>}

            <FormField label="Full Name">
              <Input
                placeholder="e.g. John Kamau"
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Username" hint="This is what they use to log in">
              <Input
                placeholder="e.g. jkamau"
                value={form.userName}
                onChange={e => setForm({ ...form, userName: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Password" hint="Share this with the user so they can log in">
              <Input
                type="password"
                placeholder="Set initial password"
                value={form.passwordHash}
                onChange={e => setForm({ ...form, passwordHash: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Role">
              <div style={styles.roleSelector}>
                <div
                  style={{
                    ...styles.roleOption,
                    ...(form.role === 'TEACHER' ? styles.roleOptionSelected : {}),
                  }}
                  onClick={() => setForm({ ...form, role: 'TEACHER' })}
                >
                  <span style={styles.roleOptionIcon}>🎓</span>
                  <div>
                    <div style={styles.roleOptionName}>Teacher</div>
                    <div style={styles.roleOptionDesc}>Can manage students and scan books</div>
                  </div>
                  {form.role === 'TEACHER' && <span style={styles.checkmark}>✓</span>}
                </div>

                <div
                  style={{
                    ...styles.roleOption,
                    ...(form.role === 'LIBRARIAN' ? styles.roleOptionSelected : {}),
                  }}
                  onClick={() => setForm({ ...form, role: 'LIBRARIAN' })}
                >
                  <span style={styles.roleOptionIcon}>📚</span>
                  <div>
                    <div style={styles.roleOptionName}>Librarian</div>
                    <div style={styles.roleOptionDesc}>Full access to all features</div>
                  </div>
                  {form.role === 'LIBRARIAN' && <span style={styles.checkmark}>✓</span>}
                </div>
              </div>
            </FormField>

            <div style={styles.modalActions}>
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create User'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── CONFIRM DEACTIVATE MODAL ─────────────────── */}
      {modal === 'confirmDeactivate' && (
        <Modal title="Deactivate Account" onClose={closeModal}>
          {error && <Banner type="error">{error}</Banner>}
          <div style={styles.confirmContent}>
            <div style={styles.confirmIcon}>⚠️</div>
            <p style={styles.confirmText}>
              Are you sure you want to deactivate{' '}
              <strong>{selectedUser?.fullName}</strong>'s account?
            </p>
            <p style={styles.confirmSub}>
              They will no longer be able to log in.
              You can reactivate their account at any time.
            </p>
          </div>
          <div style={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="danger" onClick={handleDeactivate} disabled={submitting}>
              {submitting ? 'Deactivating…' : 'Yes, Deactivate'}
            </Button>
          </div>
        </Modal>
      )}

      {/* ── CONFIRM ACTIVATE MODAL ───────────────────── */}
      {modal === 'confirmActivate' && (
        <Modal title="Activate Account" onClose={closeModal}>
          {error && <Banner type="error">{error}</Banner>}
          <div style={styles.confirmContent}>
            <div style={styles.confirmIcon}>✅</div>
            <p style={styles.confirmText}>
              Reactivate <strong>{selectedUser?.fullName}</strong>'s account?
            </p>
            <p style={styles.confirmSub}>
              They will be able to log in again immediately.
            </p>
          </div>
          <div style={styles.modalActions}>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" onClick={handleActivate} disabled={submitting}>
              {submitting ? 'Activating…' : 'Yes, Activate'}
            </Button>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ── USER CARD COMPONENT ───────────────────────────────────────────────
function UserCard({ user, streamName, onDeactivate, onActivate }) {
  const isLibrarian = user.role === 'LIBRARIAN';
  const isActive = user.active;

  return (
    <Card style={{ opacity: isActive ? 1 : 0.65 }} hoverable>
      <div style={cardStyles.top}>
        <Avatar
          name={user.fullName}
          size={44}
          background={isLibrarian ? tokens.colors.primary : tokens.colors.accent}
        />
        <div style={cardStyles.badges}>
          <span style={{
            ...cardStyles.roleBadge,
            background: isLibrarian ? tokens.colors.infoLight : tokens.colors.successLight,
            color: isLibrarian ? tokens.colors.info : tokens.colors.success,
          }}>
            {isLibrarian ? '📚 Librarian' : '🎓 Teacher'}
          </span>
          <span style={{
            ...cardStyles.statusBadge,
            background: isActive ? tokens.colors.successLight : tokens.colors.dangerLight,
            color: isActive ? tokens.colors.success : tokens.colors.danger,
          }}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div style={cardStyles.name}>{user.fullName}</div>
      <div style={cardStyles.username}>@{user.userName}</div>

      {user.role === 'TEACHER' && (
        <div style={cardStyles.streamInfo}>
          <span style={{
            ...cardStyles.streamDot,
            background: streamName ? tokens.colors.success : tokens.colors.borderStrong,
          }} />
          {streamName ? `Manages stream ${streamName}` : 'No stream assigned yet'}
        </div>
      )}

      <div style={cardStyles.actions}>
        {isActive ? (
          <Button variant="danger" size="sm" style={{ width: '100%' }} onClick={onDeactivate}>
            Deactivate
          </Button>
        ) : (
          <Button variant="success" size="sm" style={{ width: '100%' }} onClick={onActivate}>
            Activate
          </Button>
        )}
      </div>
    </Card>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const styles = {
  pageHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: tokens.spacing.lg, flexWrap: 'wrap', gap: 12,
  },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: tokens.colors.textPrimary },
  pageSub: { margin: '4px 0 0', color: tokens.colors.textSecondary, fontSize: 14 },
  controls: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: tokens.spacing.md, gap: 16, flexWrap: 'wrap',
  },
  searchInput: { width: 280 },
  loadingText: { color: tokens.colors.textMuted, padding: 20, textAlign: 'center', fontSize: 14 },
  usersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: tokens.spacing.md,
  },
  roleSelector: { display: 'flex', flexDirection: 'column', gap: 8 },
  roleOption: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: tokens.radius.sm,
    border: `1.5px solid ${tokens.colors.border}`,
    cursor: 'pointer', transition: tokens.transition,
  },
  roleOptionSelected: {
    border: `1.5px solid ${tokens.colors.primary}`,
    background: tokens.colors.surface,
  },
  roleOptionIcon: { fontSize: 20, flexShrink: 0 },
  roleOptionName: { fontSize: 14, fontWeight: 600, color: tokens.colors.textPrimary },
  roleOptionDesc: { fontSize: 12, color: tokens.colors.textMuted, marginTop: 2 },
  checkmark: { marginLeft: 'auto', color: tokens.colors.success, fontWeight: 700, fontSize: 16 },
  confirmContent: { textAlign: 'center', padding: '8px 0 16px' },
  confirmIcon: { fontSize: 40, marginBottom: 12 },
  confirmText: { fontSize: 15, color: tokens.colors.textPrimary, margin: '0 0 8px', lineHeight: 1.5 },
  confirmSub: { fontSize: 13, color: tokens.colors.textMuted, margin: 0, lineHeight: 1.5 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
};

const cardStyles = {
  top: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  badges: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  roleBadge: { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: tokens.radius.full, whiteSpace: 'nowrap' },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: tokens.radius.full },
  name: { fontSize: 16, fontWeight: 700, color: tokens.colors.textPrimary },
  username: { fontSize: 12, color: tokens.colors.textMuted, marginTop: 2 },
  streamInfo: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: tokens.colors.textSecondary, marginTop: 8,
  },
  streamDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  actions: { marginTop: 14 },
};
