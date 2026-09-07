import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { lossService } from '../services/libraryApi';
import { tokens } from '../styles/tokens';
import { Avatar } from './SharedComponents';
import useScreenSize from '../hooks/useScreenSize';

// Navigation items — each one is a link in the sidebar
// path = URL, label = display text, icon = emoji for now
const NAV_ITEMS = [
  { path: '/dashboard',     label: 'Dashboard',        icon: '📊', section: 'Overview' },
  { path: '/classes',       label: 'Classes & Streams', icon: '🏫', section: 'People' },
  { path: '/users',         label: 'Users',             icon: '👥', section: 'People' },
  { path: '/students',      label: 'Students',          icon: '🎓', section: 'People' },
  { path: '/books',         label: 'Books',             icon: '📚', section: 'Library' },
  { path: '/distributions', label: 'Distributions',     icon: '📦', section: 'Library' },
  { path: '/borrows',       label: 'Borrows',           icon: '📖', section: 'Library' },
  { path: '/losses',        label: 'Loss Reports',      icon: '⚠️', section: 'Library' },
];

// Breadcrumb section shown in the top bar next to the page title —
// mirrors the grouping used in the sidebar so users always know
// which part of the system they're in.
const SECTION_LABELS = {
  Overview: 'Overview',
  People: 'People',
  Library: 'Library',
};

// TEACHER accounts only manage their own stream — Users, Classes &
// Streams and Books (title/copy registration + printing) are librarian
// management functions the backend already 403s them on, so they're
// hidden from navigation too rather than showing dead links.
const TEACHER_VISIBLE_PATHS = ['/dashboard', '/students', '/distributions', '/losses'];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // useLocation tells you the current URL
  // Used to highlight the active nav item
  const location = useLocation();

  const { isMobile, isDesktop } = useScreenSize();
  const isCompact = !isDesktop; // tablet or mobile — sidebar becomes a drawer

  // Controls whether sidebar is collapsed or expanded (desktop only)
  const [collapsed, setCollapsed] = useState(false);

  // Controls whether the drawer sidebar is open (tablet/mobile only)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Pending loss count — shown as a small notification bell badge
  const [pendingLossCount, setPendingLossCount] = useState(0);

  useEffect(() => {
    lossService.getPending()
      .then(res => setPendingLossCount(res.data.length))
      .catch(() => setPendingLossCount(0));
  }, [location.pathname]);

  // Close the drawer whenever the route changes — covers nav taps,
  // browser back/forward, and programmatic navigation alike.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (isCompact) setDrawerOpen(false);
  };

  const isTeacher = user?.role === 'TEACHER';

  const visibleNavItems = (isTeacher
    ? NAV_ITEMS.filter(item => TEACHER_VISIBLE_PATHS.includes(item.path))
    : NAV_ITEMS
  ).map(item =>
    // "Students" reads as "My Students" for a teacher, whose view is
    // always scoped to their own stream — makes that scope obvious.
    item.path === '/students' && isTeacher
      ? { ...item, label: 'My Students' }
      : item
  );

  const visibleSections = ['Overview', 'People', 'Library'].filter(
    section => visibleNavItems.some(item => item.section === section)
  );

  const currentItem = visibleNavItems.find(item => item.path === location.pathname)
    || NAV_ITEMS.find(item => item.path === location.pathname);

  // Desktop: permanent sidebar, width driven by the collapse toggle.
  // Compact (tablet/mobile): fixed-width drawer that slides in/out.
  const sidebarWidth = isCompact ? 264 : (collapsed ? 68 : 236);
  const showCollapsedVisuals = !isCompact && collapsed;

  return (
    <div style={styles.container}>

      {/* ── DRAWER BACKDROP — tablet/mobile only ─────────── */}
      {isCompact && drawerOpen && (
        <div style={styles.backdrop} onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── SIDEBAR ────────────────────────────────────── */}
      <aside
        style={{
          ...styles.sidebar,
          width: sidebarWidth,
          ...(isCompact
            ? {
                transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
                boxShadow: drawerOpen ? tokens.shadows.xl : 'none',
              }
            : {}),
        }}
      >

        {/* Logo area */}
        <div style={styles.logoArea}>
          <span style={styles.logoIcon}>📚</span>
          {!showCollapsedVisuals && (
            <div>
              <div style={styles.logoText}>School Library</div>
              <div style={styles.logoSub}>Management System</div>
            </div>
          )}
          {isCompact && (
            <button
              onClick={() => setDrawerOpen(false)}
              style={styles.drawerCloseBtn}
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* User info */}
        <div style={{
          ...styles.userArea,
          justifyContent: showCollapsedVisuals ? 'center' : 'flex-start',
        }}>
          <div style={styles.userAvatar}>
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!showCollapsedVisuals && (
            <div style={{ overflow: 'hidden' }}>
              <div style={styles.userName}>{user?.fullName}</div>
              <span style={styles.userRoleBadge}>{user?.role}</span>
            </div>
          )}
        </div>

        {/* Navigation links, grouped by section */}
        <nav style={styles.nav}>
          {visibleSections.map(section => (
            <div key={section}>
              {!showCollapsedVisuals && (
                <div style={styles.navSectionLabel}>
                  {SECTION_LABELS[section]}
                </div>
              )}
              {visibleNavItems.filter(item => item.section === section).map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    style={{
                      ...styles.navItem,
                      ...(isActive ? styles.navItemActive : {}),
                      justifyContent: showCollapsedVisuals ? 'center' : 'flex-start',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                    title={showCollapsedVisuals ? item.label : ''}
                  >
                    <span style={styles.navIcon}>{item.icon}</span>
                    {!showCollapsedVisuals && <span style={styles.navLabel}>{item.label}</span>}
                    {isActive && !showCollapsedVisuals && <span style={styles.navActiveDot} />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse toggle button — desktop only, drawer has its own close button */}
        {!isCompact && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={styles.collapseBtn}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span style={{ display: 'inline-block', transition: 'transform 0.25s ease', transform: collapsed ? 'rotate(180deg)' : 'none' }}>
              ←
            </span>
            {!collapsed && <span>Collapse</span>}
          </button>
        )}

        {/* Logout — separated from nav with a top border, red tint */}
        <div style={styles.logoutWrapper}>
          <button
            onClick={handleLogout}
            style={{
              ...styles.logoutBtn,
              justifyContent: showCollapsedVisuals ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.12)'}
            title={showCollapsedVisuals ? 'Logout' : ''}
          >
            <span>🚪</span>
            {!showCollapsedVisuals && <span>Logout</span>}
          </button>
        </div>

      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <div style={{ ...styles.mainWrapper, marginLeft: isCompact ? 0 : sidebarWidth }}>

        {/* Top bar */}
        <header style={styles.topBar}>
          <div style={styles.topBarLeft}>
            {isCompact && (
              <button
                onClick={() => setDrawerOpen(true)}
                style={styles.hamburgerBtn}
                aria-label="Open menu"
              >
                ☰
              </button>
            )}

            <div style={styles.breadcrumb}>
              {!isMobile && currentItem && (
                <>
                  <span style={styles.breadcrumbSection}>
                    {SECTION_LABELS[currentItem.section]}
                  </span>
                  <span style={styles.breadcrumbSep}>/</span>
                </>
              )}
              <span style={styles.breadcrumbPage}>
                {currentItem?.label || 'School Library'}
              </span>
            </div>
          </div>

          <div style={styles.topBarRight}>
            {/* Notification bell — pending loss reports */}
            <button
              style={styles.bellBtn}
              onClick={() => navigate('/losses')}
              title="Pending loss reports"
              onMouseEnter={e => e.currentTarget.style.background = tokens.colors.surface}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              🔔
              {pendingLossCount > 0 && (
                <span style={styles.bellBadge}>
                  {pendingLossCount > 9 ? '9+' : pendingLossCount}
                </span>
              )}
            </button>

            {isMobile ? (
              <Avatar name={user?.fullName} size={32} background={tokens.colors.primary} />
            ) : (
              <div style={styles.topBarUserBlock}>
                <Avatar name={user?.fullName} size={32} background={tokens.colors.primary} />
                <div style={styles.topBarUserText}>
                  <span style={styles.topBarUser}>{user?.fullName}</span>
                  <span style={styles.topBarUserRole}>{user?.role}</span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content — changes with navigation */}
        <main style={{ ...styles.content, padding: isMobile ? 16 : isCompact ? 22 : 28 }}>
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
    fontFamily: tokens.font.family,
    background: tokens.colors.surface,
  },

  // Drawer backdrop — tablet/mobile only
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.5)',
    zIndex: 150,
  },

  // Sidebar
  sidebar: {
    background: `linear-gradient(180deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryDark} 100%)`,
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    transition: 'width 0.25s ease, transform 0.25s ease',
    overflow: 'hidden',
    zIndex: 200,
  },

  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '22px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
    position: 'relative',
  },
  logoIcon: { fontSize: 40, flexShrink: 0, lineHeight: 1 },
  logoText: {
    color: '#ffffff',
    fontWeight: 700,
    fontSize: 15,
    whiteSpace: 'nowrap',
  },
  logoSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    whiteSpace: 'nowrap',
    marginTop: 1,
  },
  drawerCloseBtn: {
    position: 'absolute',
    top: '50%',
    right: 14,
    transform: 'translateY(-50%)',
    width: 40, height: 40,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    fontSize: 15,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 17,
    flexShrink: 0,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRoleBadge: {
    display: 'inline-block',
    marginTop: 4,
    color: 'rgba(255,255,255,0.85)',
    background: 'rgba(255,255,255,0.14)',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.4,
    padding: '2px 8px',
    borderRadius: tokens.radius.full,
    whiteSpace: 'nowrap',
  },

  nav: {
    flex: 1,
    padding: '14px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflowY: 'auto',
  },
  navSectionLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    padding: '14px 12px 6px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.65)',
    cursor: 'pointer',
    width: '100%',
    fontSize: 13,
    transition: 'background 0.15s ease, color 0.15s ease',
    textAlign: 'left',
    position: 'relative',
    height: 44,
    boxSizing: 'border-box',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.15)',
    color: '#ffffff',
    boxShadow: `inset 3px 0 0 ${tokens.colors.accent}`,
  },
  navIcon: { fontSize: 17, flexShrink: 0, width: 20, textAlign: 'center' },
  navLabel: { whiteSpace: 'nowrap', fontWeight: 500, flex: 1 },
  navActiveDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: tokens.colors.accent, flexShrink: 0,
  },

  collapseBtn: {
    margin: '4px 10px',
    padding: '9px 12px',
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.55)',
    cursor: 'pointer',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    textAlign: 'left',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  logoutWrapper: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '10px',
    flexShrink: 0,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    background: 'rgba(220,38,38,0.12)',
    border: 'none',
    borderRadius: 8,
    color: '#FCA5A5',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    width: '100%',
    transition: tokens.transition,
  },

  // Main content area
  mainWrapper: {
    flex: 1,
    transition: 'margin-left 0.25s ease',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    minWidth: 0,
  },
  topBar: {
    background: tokens.colors.card,
    padding: '0 16px',
    height: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${tokens.colors.border}`,
    boxShadow: tokens.shadows.sm,
    position: 'sticky',
    top: 0,
    zIndex: 50,
    gap: 12,
  },
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  hamburgerBtn: {
    width: 44, height: 44,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: tokens.colors.textPrimary,
    flexShrink: 0,
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    minWidth: 0,
    overflow: 'hidden',
  },
  breadcrumbSection: {
    color: tokens.colors.textMuted,
    fontWeight: 500,
  },
  breadcrumbSep: {
    color: tokens.colors.textMuted,
  },
  breadcrumbPage: {
    fontWeight: 700,
    color: tokens.colors.textPrimary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexShrink: 0,
  },
  bellBtn: {
    position: 'relative',
    width: 36, height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: tokens.transition,
  },
  bellBadge: {
    position: 'absolute',
    top: 2, right: 2,
    background: tokens.colors.danger,
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    minWidth: 15,
    height: 15,
    borderRadius: tokens.radius.full,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0 3px',
    border: `1.5px solid ${tokens.colors.card}`,
  },
  topBarUserBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    borderLeft: `1px solid ${tokens.colors.border}`,
  },
  topBarUserText: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.3,
  },
  topBarUser: {
    fontSize: 13,
    fontWeight: 700,
    color: tokens.colors.textPrimary,
  },
  topBarUserRole: {
    fontSize: 11,
    color: tokens.colors.textMuted,
  },
  content: {
    padding: 28,
    flex: 1,
    minWidth: 0,
  },
};
