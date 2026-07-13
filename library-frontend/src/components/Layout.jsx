import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Navigation items — each one is a link in the sidebar
// path = URL, label = display text, icon = emoji for now
const NAV_ITEMS = [
  { path: '/dashboard',     label: 'Dashboard',        icon: '📊' },
  { path: '/classes',       label: 'Classes & Streams', icon: '🏫' },
  { path: '/users',         label: 'Users',             icon: '👥' },
  { path: '/students',      label: 'Students',          icon: '🎓' },
  { path: '/books',         label: 'Books',             icon: '📚' },
  { path: '/distributions', label: 'Distributions',     icon: '📦' },
  { path: '/borrows',       label: 'Borrows',           icon: '📖' },
  { path: '/losses',        label: 'Loss Reports',      icon: '⚠️'  },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // useLocation tells you the current URL
  // Used to highlight the active nav item
  const location = useLocation();

  // Controls whether sidebar is collapsed or expanded
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={styles.container}>

      {/*SIDEBAR  */}
      <aside style={{
        ...styles.sidebar,
        width: collapsed ? 64 : 220,
      }}>

        {/* Logo area */}
        <div style={styles.logoArea}>
          <span style={styles.logoIcon}>📚</span>
          {!collapsed && (
            <div>
              <div style={styles.logoText}>School Library</div>
              <div style={styles.logoSub}>Management System</div>
            </div>
          )}
        </div>

        {/* User info */}
        {!collapsed && (
          <div style={styles.userArea}>
            <div style={styles.userAvatar}>
              {/* First letter of user's name */}
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div>
              <div style={styles.userName}>{user?.fullName}</div>
              <div style={styles.userRole}>{user?.role}</div>
            </div>
          </div>
        )}

        {/* Navigation links */}
        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => {
            // Check if this nav item matches the current URL
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  ...styles.navItem,
                  // Apply active style if this is the current page
                  ...(isActive ? styles.navItemActive : {}),
                  // Center icon when collapsed
                  justifyContent: collapsed ? 'center' : 'flex-start',
                }}
                // Show label as tooltip when sidebar is collapsed
                title={collapsed ? item.label : ''}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {/* Hide label when sidebar is collapsed */}
                {!collapsed && (
                  <span style={styles.navLabel}>{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={styles.collapseBtn}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '→' : '← Collapse'}
        </button>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          style={{
            ...styles.logoutBtn,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
          title={collapsed ? 'Logout' : ''}
        >
          <span>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>

      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <div style={{
        ...styles.mainWrapper,
        // Push content right when sidebar is expanded
        marginLeft: collapsed ? 64 : 220,
      }}>

        {/* Top bar */}
        <header style={styles.topBar}>
          <div style={styles.pageTitle}>
            {/* Find current page label from nav items */}
            {NAV_ITEMS.find(
              item => item.path === location.pathname
            )?.label || 'School Library'}
          </div>
          <div style={styles.topBarRight}>
            <span style={styles.topBarUser}>
              {user?.fullName}
            </span>
          </div>
        </header>

        {/* Page content — changes with navigation */}
        <main style={styles.content}>
          {children}
        </main>

      </div>

    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: 'Segoe UI, sans-serif',
    background: '#f0f2f5',
  },

  // Sidebar
  sidebar: {
    background: '#1a1a2e',
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.25s ease',
    overflow: 'hidden',
    zIndex: 100,
  },

  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoIcon: { fontSize: 24, flexShrink: 0 },
  logoText: {
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
  logoSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    whiteSpace: 'nowrap',
  },

  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 15,
    flexShrink: 0,
  },
  userName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  userRole: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    whiteSpace: 'nowrap',
  },

  nav: {
    flex: 1,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    width: '100%',
    fontSize: 13,
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.15)',
    color: '#ffffff',
  },
  navIcon: { fontSize: 16, flexShrink: 0 },
  navLabel: { whiteSpace: 'nowrap' },

  collapseBtn: {
    margin: '8px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.07)',
    border: 'none',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: 12,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '0 8px 16px',
    padding: '9px 12px',
    background: 'rgba(255,100,100,0.12)',
    border: 'none',
    borderRadius: 8,
    color: '#ff9999',
    cursor: 'pointer',
    fontSize: 13,
    width: 'calc(100% - 16px)',
  },

  // Main content area
  mainWrapper: {
    flex: 1,
    transition: 'margin-left 0.25s ease',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  topBar: {
    background: '#ffffff',
    padding: '0 24px',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  topBarUser: {
    fontSize: 13,
    color: '#666',
  },
  content: {
    padding: 24,
    flex: 1,
  },
};