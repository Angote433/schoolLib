import { useState, useEffect } from 'react';
import { userService, streamService } from '../services/libraryApi';

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
  // Filters run locally on the already loaded data
  // No extra API calls needed
  const filteredUsers = users.filter((user) => {
    // Role filter
    const roleMatch =
      roleFilter === 'ALL' || user.role === roleFilter;

    // Search filter — case insensitive name or username match
    const searchMatch =
      searchText === '' ||
      user.fullName.toLowerCase().includes(
        searchText.toLowerCase()
      ) ||
      user.userName.toLowerCase().includes(
        searchText.toLowerCase()
      );

    return roleMatch && searchMatch;
  });

  // Count helpers for the filter tabs
  const countAll = users.length;
  const countTeachers = users.filter(u => u.role === 'TEACHER').length;
  const countLibrarians = users.filter(
    u => u.role === 'LIBRARIAN'
  ).length;

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

      // Reset form
      setForm({
        fullName: '',
        userName: '',
        passwordHash: '',
        role: 'TEACHER',
      });

    } catch (err) {
      setError(err.response?.data || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // ── DEACTIVATE ────────────────────────────────────────
  const handleDeactivate = async () => {
    try {
      await userService.deactivate(selectedUser.userId);
      showSuccess(
        `${selectedUser.fullName}'s account has been deactivated`
      );
      closeModal();
      loadData();
    } catch (err) {
      setError(err.response?.data || 'Failed to deactivate user');
      closeModal();
    }
  };

  // ── ACTIVATE ──────────────────────────────────────────
  const handleActivate = async () => {
    try {
      await userService.activate(selectedUser.userId);
      showSuccess(
        `${selectedUser.fullName}'s account has been activated`
      );
      closeModal();
      loadData();
    } catch (err) {
      setError(err.response?.data || 'Failed to activate user');
      closeModal();
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

  // Find stream name for a teacher
  const getTeacherStream = (user) => {
    if (user.role !== 'TEACHER') return null;
    const stream = streams.find(
      s => s.teacher?.userId === user.userId
    );
    return stream ? stream.streamName : null;
  };

  // ── RENDER ────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Segoe UI, sans-serif' }}>

      {/* ── PAGE HEADER ──────────────────────────────── */}
      <div style={styles.pageHeader}>
        <div>
          <h1 style={styles.pageTitle}>Users</h1>
          <p style={styles.pageSub}>
            Manage librarian and teacher accounts
          </p>
        </div>
        <button
          style={styles.primaryBtn}
          onClick={() => setModal('createUser')}
        >
          + Create User
        </button>
      </div>

      {/* ── FEEDBACK ─────────────────────────────────── */}
      {success && (
        <div style={styles.successMsg}>✅ {success}</div>
      )}
      {error && !modal && (
        <div style={styles.errorMsg}>⚠️ {error}</div>
      )}

      {/* ── FILTER TABS + SEARCH ─────────────────────── */}
      <div style={styles.controls}>

        {/* Role filter tabs */}
        <div style={styles.tabs}>
          {[
            { key: 'ALL',       label: `All (${countAll})` },
            { key: 'TEACHER',   label: `Teachers (${countTeachers})` },
            { key: 'LIBRARIAN', label: `Librarians (${countLibrarians})` },
          ].map(tab => (
            <button
              key={tab.key}
              style={{
                ...styles.tab,
                ...(roleFilter === tab.key ? styles.tabActive : {}),
              }}
              onClick={() => setRoleFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search box */}
        <input
          style={styles.searchInput}
          placeholder="🔍  Search by name or username..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />

      </div>

      {/* ── USERS GRID ───────────────────────────────── */}
      {loading ? (
        <div style={styles.loadingText}>Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>👤</div>
          <div style={styles.emptyTitle}>
            {searchText
              ? 'No users match your search'
              : 'No users found'}
          </div>
          <div style={styles.emptySub}>
            {!searchText && 'Click "Create User" to add the first user'}
          </div>
        </div>
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
            {error && (
              <div style={styles.modalError}>{error}</div>
            )}

            <FormField label="Full Name">
              <input
                style={styles.input}
                placeholder="e.g. John Kamau"
                value={form.fullName}
                onChange={e => setForm({
                  ...form, fullName: e.target.value,
                })}
                required
              />
            </FormField>

            <FormField label="Username">
              <input
                style={styles.input}
                placeholder="e.g. jkamau"
                value={form.userName}
                onChange={e => setForm({
                  ...form, userName: e.target.value,
                })}
                required
              />
              <span style={styles.inputHint}>
                This is what they use to log in
              </span>
            </FormField>

            <FormField label="Password">
              <input
                style={styles.input}
                type="password"
                placeholder="Set initial password"
                value={form.passwordHash}
                onChange={e => setForm({
                  ...form, passwordHash: e.target.value,
                })}
                required
              />
              <span style={styles.inputHint}>
                Share this with the user so they can log in
              </span>
            </FormField>

            <FormField label="Role">
              <div style={styles.roleSelector}>
                {/* Teacher option */}
                <div
                  style={{
                    ...styles.roleOption,
                    ...(form.role === 'TEACHER'
                      ? styles.roleOptionSelected
                      : {}),
                  }}
                  onClick={() => setForm({
                    ...form, role: 'TEACHER',
                  })}
                >
                  <span style={styles.roleOptionIcon}>🎓</span>
                  <div>
                    <div style={styles.roleOptionName}>Teacher</div>
                    <div style={styles.roleOptionDesc}>
                      Can manage students and scan books
                    </div>
                  </div>
                  {form.role === 'TEACHER' && (
                    <span style={styles.checkmark}>✓</span>
                  )}
                </div>

                {/* Librarian option */}
                <div
                  style={{
                    ...styles.roleOption,
                    ...(form.role === 'LIBRARIAN'
                      ? styles.roleOptionSelected
                      : {}),
                  }}
                  onClick={() => setForm({
                    ...form, role: 'LIBRARIAN',
                  })}
                >
                  <span style={styles.roleOptionIcon}>📚</span>
                  <div>
                    <div style={styles.roleOptionName}>Librarian</div>
                    <div style={styles.roleOptionDesc}>
                      Full access to all features
                    </div>
                  </div>
                  {form.role === 'LIBRARIAN' && (
                    <span style={styles.checkmark}>✓</span>
                  )}
                </div>
              </div>
            </FormField>

            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  ...styles.primaryBtn,
                  opacity: submitting ? 0.7 : 1,
                }}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── CONFIRM DEACTIVATE MODAL ─────────────────── */}
      {modal === 'confirmDeactivate' && (
        <Modal title="Deactivate Account" onClose={closeModal}>
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
            <button
              style={styles.cancelBtn}
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              style={styles.dangerBtn}
              onClick={handleDeactivate}
            >
              Yes, Deactivate
            </button>
          </div>
        </Modal>
      )}

      {/* ── CONFIRM ACTIVATE MODAL ───────────────────── */}
      {modal === 'confirmActivate' && (
        <Modal title="Activate Account" onClose={closeModal}>
          <div style={styles.confirmContent}>
            <div style={styles.confirmIcon}>✅</div>
            <p style={styles.confirmText}>
              Reactivate{' '}
              <strong>{selectedUser?.fullName}</strong>'s account?
            </p>
            <p style={styles.confirmSub}>
              They will be able to log in again immediately.
            </p>
          </div>
          <div style={styles.modalActions}>
            <button
              style={styles.cancelBtn}
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              style={styles.primaryBtn}
              onClick={handleActivate}
            >
              Yes, Activate
            </button>
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
    <div style={{
      ...cardStyles.card,
      opacity: isActive ? 1 : 0.65,
    }}>

      {/* Top row — avatar + status badge */}
      <div style={cardStyles.top}>
        <div style={{
          ...cardStyles.avatar,
          background: isLibrarian ? '#1a1a2e' : '#2c7a4b',
        }}>
          {user.fullName.charAt(0).toUpperCase()}
        </div>

        <div style={cardStyles.badges}>
          {/* Role badge */}
          <span style={{
            ...cardStyles.roleBadge,
            background: isLibrarian ? '#ebf4ff' : '#f0fff4',
            color: isLibrarian ? '#2b6cb0' : '#276749',
          }}>
            {isLibrarian ? '📚 Librarian' : '🎓 Teacher'}
          </span>

          {/* Active / Inactive badge */}
          <span style={{
            ...cardStyles.statusBadge,
            background: isActive ? '#f0fff4' : '#fff5f5',
            color: isActive ? '#276749' : '#c53030',
          }}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* User info */}
      <div style={cardStyles.name}>{user.fullName}</div>
      <div style={cardStyles.username}>@{user.userName}</div>

      {/* Stream info — only for teachers */}
      {user.role === 'TEACHER' && (
        <div style={cardStyles.streamInfo}>
          <span style={cardStyles.streamDot} />
          {streamName
            ? `Manages stream ${streamName}`
            : 'No stream assigned yet'}
        </div>
      )}

      {/* Action button */}
      <div style={cardStyles.actions}>
        {isActive ? (
          <button
            style={cardStyles.deactivateBtn}
            onClick={onDeactivate}
          >
            Deactivate
          </button>
        ) : (
          <button
            style={cardStyles.activateBtn}
            onClick={onActivate}
          >
            Activate
          </button>
        )}
      </div>

    </div>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={modalStyles.backdrop} onClick={onClose}>
      <div
        style={modalStyles.box}
        onClick={e => e.stopPropagation()}
      >
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>{title}</h3>
          <button style={modalStyles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={modalStyles.body}>{children}</div>
      </div>
    </div>
  );
}

// ── FORM FIELD ────────────────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: '#333',
        marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── ALL STYLES ────────────────────────────────────────────────────────
const styles = {
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  pageTitle: {
    margin: 0, fontSize: 24,
    fontWeight: 700, color: '#1a1a2e',
  },
  pageSub: {
    margin: '4px 0 0', color: '#666', fontSize: 14,
  },
  successMsg: {
    background: '#f0fff4', border: '1px solid #c6f6d5',
    borderRadius: 8, padding: '10px 16px',
    color: '#276749', fontSize: 13, marginBottom: 16,
  },
  errorMsg: {
    background: '#fff5f5', border: '1px solid #fed7d7',
    borderRadius: 8, padding: '10px 16px',
    color: '#c53030', fontSize: 13, marginBottom: 16,
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
    flexWrap: 'wrap',
  },
  tabs: {
    display: 'flex',
    background: '#fff',
    borderRadius: 10,
    padding: 4,
    gap: 2,
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
  },
  tab: {
    padding: '7px 16px',
    borderRadius: 7,
    border: 'none',
    background: 'transparent',
    color: '#666',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    background: '#1a1a2e',
    color: '#fff',
    fontWeight: 600,
  },
  searchInput: {
    padding: '9px 14px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    width: 280,
    fontFamily: 'Segoe UI, sans-serif',
  },
  loadingText: {
    color: '#888', padding: 20,
    textAlign: 'center', fontSize: 14,
  },
  emptyState: {
    background: '#fff', borderRadius: 12,
    padding: 60, textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18, fontWeight: 700,
    color: '#1a1a2e', marginBottom: 6,
  },
  emptySub: { color: '#888', fontSize: 14 },
  usersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16,
  },
  primaryBtn: {
    background: '#1a1a2e', color: '#fff',
    border: 'none', borderRadius: 8,
    padding: '9px 18px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  cancelBtn: {
    background: '#f0f2f5', color: '#333',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    padding: '9px 18px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  dangerBtn: {
    background: '#fff5f5', color: '#c53030',
    border: '1.5px solid #fed7d7', borderRadius: 8,
    padding: '9px 18px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Segoe UI, sans-serif',
  },
  input: {
    width: '100%', padding: '9px 12px',
    border: '1.5px solid #e0e0e0', borderRadius: 8,
    fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Segoe UI, sans-serif',
  },
  inputHint: {
    fontSize: 11, color: '#999',
    marginTop: 4, display: 'block',
  },
  roleSelector: {
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  roleOption: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 14px', borderRadius: 8,
    border: '1.5px solid #e0e0e0',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  roleOptionSelected: {
    border: '1.5px solid #1a1a2e',
    background: '#f7f8fc',
  },
  roleOptionIcon: { fontSize: 20, flexShrink: 0 },
  roleOptionName: {
    fontSize: 14, fontWeight: 600, color: '#1a1a2e',
  },
  roleOptionDesc: {
    fontSize: 12, color: '#888', marginTop: 2,
  },
  checkmark: {
    marginLeft: 'auto', color: '#276749',
    fontWeight: 700, fontSize: 16,
  },
  confirmContent: { textAlign: 'center', padding: '8px 0 16px' },
  confirmIcon: { fontSize: 40, marginBottom: 12 },
  confirmText: {
    fontSize: 15, color: '#333',
    margin: '0 0 8px', lineHeight: 1.5,
  },
  confirmSub: {
    fontSize: 13, color: '#888',
    margin: 0, lineHeight: 1.5,
  },
  modalError: {
    background: '#fff5f5', border: '1px solid #fed7d7',
    borderRadius: 8, padding: '10px 14px',
    color: '#c53030', fontSize: 13, marginBottom: 16,
  },
  modalActions: {
    display: 'flex', justifyContent: 'flex-end',
    gap: 10, marginTop: 20,
  },
};

const cardStyles = {
  card: {
    background: '#fff', borderRadius: 12,
    padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column', gap: 6,
    transition: 'opacity 0.2s',
  },
  top: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 6,
  },
  avatar: {
    width: 44, height: 44, borderRadius: '50%',
    color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 18, flexShrink: 0,
  },
  badges: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  roleBadge: {
    fontSize: 11, fontWeight: 600,
    padding: '3px 8px', borderRadius: 20,
    whiteSpace: 'nowrap',
  },
  statusBadge: {
    fontSize: 11, fontWeight: 600,
    padding: '3px 8px', borderRadius: 20,
  },
  name: {
    fontSize: 16, fontWeight: 700, color: '#1a1a2e',
  },
  username: {
    fontSize: 12, color: '#888',
  },
  streamInfo: {
    display: 'flex', alignItems: 'center',
    gap: 6, fontSize: 12, color: '#555',
    marginTop: 4,
  },
  streamDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#48bb78', flexShrink: 0,
  },
  actions: { marginTop: 8 },
  deactivateBtn: {
    width: '100%', padding: '7px',
    background: '#fff5f5', color: '#c53030',
    border: '1.5px solid #fed7d7', borderRadius: 7,
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Segoe UI, sans-serif',
  },
  activateBtn: {
    width: '100%', padding: '7px',
    background: '#f0fff4', color: '#276749',
    border: '1.5px solid #c6f6d5', borderRadius: 7,
    fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Segoe UI, sans-serif',
  },
};

const modalStyles = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: 20,
  },
  box: {
    background: '#fff', borderRadius: 14,
    width: '100%', maxWidth: 460,
    maxHeight: '90vh', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '18px 22px',
    borderBottom: '1px solid #f0f2f5',
  },
  title: {
    margin: 0, fontSize: 17,
    fontWeight: 700, color: '#1a1a2e',
  },
  closeBtn: {
    background: 'none', border: 'none',
    fontSize: 16, cursor: 'pointer', color: '#888', padding: 4,
  },
  body: { padding: '20px 22px', overflowY: 'auto' },
};