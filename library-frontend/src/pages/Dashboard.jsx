import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  bookService,
  borrowService,
  lossService,
  streamService,
} from '../services/libraryApi';
import { tokens } from '../styles/tokens';
import { Card, Avatar, StatusBadge, Button } from '../components/SharedComponents';

function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: '☀️' };
  if (hour < 17) return { text: 'Good afternoon', icon: '🌤️' };
  return { text: 'Good evening', icon: '🌙' };
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Each piece of data has its own state
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalStreams: 0,
    pendingLosses: 0,
    activeBorrows: 0,
    overdueBorrows: 0,
  });

  // Recent data for the quick view lists
  const [pendingLosses, setPendingLosses] = useState([]);
  const [overdueBorrows, setOverdueBorrows] = useState([]);

  // Track loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // useEffect — runs once when Dashboard page loads
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch multiple things at the same time using Promise.all
      // This is faster than fetching one by one
      // All requests fire simultaneously and we wait for ALL to finish
      const [
        booksRes,
        streamsRes,
        pendingLossRes,
        activeBorrowRes,
        overdueBorrowRes,
      ] = await Promise.all([
        bookService.getAll(),
        streamService.getAll(),
        lossService.getPending(),
        borrowService.getActive(),
        borrowService.getOverdue(),
      ]);

      // Update stats from responses
      setStats({
        totalBooks: booksRes.data.length,
        totalStreams: streamsRes.data.filter(s => s.active).length,
        pendingLosses: pendingLossRes.data.length,
        activeBorrows: activeBorrowRes.data.length,
        overdueBorrows: overdueBorrowRes.data.length,
      });

      // Store the actual data for the lists below
      // Limit to 5 items for the dashboard preview
      setPendingLosses(pendingLossRes.data.slice(0, 5));
      setOverdueBorrows(overdueBorrowRes.data.slice(0, 5));

    } catch (err) {
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const greeting = timeOfDayGreeting();

  // Show loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading dashboard…</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card style={{ textAlign: 'center', borderColor: tokens.colors.dangerBorder }}>
        <p style={{ color: tokens.colors.danger, margin: '0 0 16px' }}>{error}</p>
        <Button variant="primary" onClick={loadDashboardData}>Retry</Button>
      </Card>
    );
  }

  return (
    <div>

      {/* ── GREETING / HERO CARD ─────────────────────────── */}
      <div style={styles.heroCard}>
        <div style={styles.heroDecor} />
        <div style={styles.heroLeft}>
          <div style={styles.heroGreeting}>
            <span style={{ fontSize: 22 }}>{greeting.icon}</span>
            {greeting.text}, {user?.fullName?.split(' ')[0]}
          </div>
          <p style={styles.heroSub}>
            Here's what's happening in the library today.
          </p>
        </div>
        <div style={styles.heroActions}>
          <Button
            variant="accent"
            onClick={() => navigate('/distributions')}
            style={styles.heroBtn}
          >
            📷 Scan Book
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/students')}
            style={{ ...styles.heroBtn, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)' }}
          >
            + Add Student
          </Button>
        </div>
      </div>

      {/* ── STAT CARDS ───────────────────────────────────── */}
      <div style={styles.statsGrid}>

        <StatCard
          icon="📚"
          label="Book Titles"
          value={stats.totalBooks}
          color={tokens.colors.primary}
          onClick={() => navigate('/books')}
        />

        <StatCard
          icon="🏫"
          label="Active Streams"
          value={stats.totalStreams}
          color={tokens.colors.accent}
          onClick={() => navigate('/classes')}
        />

        <StatCard
          icon="📖"
          label="Active Borrows"
          value={stats.activeBorrows}
          color={tokens.colors.info}
          onClick={() => navigate('/borrows')}
        />

        <StatCard
          icon="⚠️"
          label="Pending Losses"
          value={stats.pendingLosses}
          color={tokens.colors.warning}
          onClick={() => navigate('/losses')}
        />

        <StatCard
          icon="🔴"
          label="Overdue Borrows"
          value={stats.overdueBorrows}
          color={tokens.colors.danger}
          onClick={() => navigate('/borrows')}
        />

      </div>

      {/* ── BOTTOM LISTS ─────────────────────────────────── */}
      <div style={styles.listsGrid}>

        {/* Pending Loss Reports */}
        <Card style={styles.listCard}>
          <div style={styles.listHeader}>
            <span style={styles.listTitle}>⚠️ Pending Loss Reports</span>
            <span style={styles.listCount}>{stats.pendingLosses} total</span>
          </div>

          {pendingLosses.length === 0 ? (
            <div style={styles.emptyState}>🎉 No pending losses</div>
          ) : (
            <>
              {pendingLosses.map((report, index) => (
                <div key={index} style={styles.listItem}>
                  <Avatar
                    name={report.student?.fullName}
                    size={36}
                    background={tokens.colors.dangerLight}
                  />
                  <div style={styles.listItemLeft}>
                    <div style={styles.listItemName}>
                      {report.student?.fullName || 'Unknown Student'}
                    </div>
                    <div style={styles.listItemSub}>
                      {report.bookCopy?.bookDetails?.titleName
                        || report.bookCopy?.qrCode
                        || 'Unknown Book'}
                      {' • '}Flagged {report.dateFlagged}
                    </div>
                  </div>
                  <StatusBadge status={report.source} />
                </div>
              ))}
              <div style={styles.viewAllRow}>
                <button style={styles.viewAllLink} onClick={() => navigate('/losses')}>
                  View All →
                </button>
              </div>
            </>
          )}
        </Card>

        {/* Overdue Borrows */}
        <Card style={styles.listCard}>
          <div style={styles.listHeader}>
            <span style={styles.listTitle}>🔴 Overdue Borrows</span>
            <span style={styles.listCount}>{stats.overdueBorrows} total</span>
          </div>

          {overdueBorrows.length === 0 ? (
            <div style={styles.emptyState}>🎉 No overdue borrows</div>
          ) : (
            <>
              {overdueBorrows.map((record, index) => (
                <div key={index} style={styles.listItem}>
                  <Avatar
                    name={record.student?.fullName}
                    size={36}
                    background={tokens.colors.warningLight}
                  />
                  <div style={styles.listItemLeft}>
                    <div style={styles.listItemName}>
                      {record.student?.fullName || 'Unknown Student'}
                    </div>
                    <div style={styles.listItemSub}>
                      {record.bookCopy?.bookDetails?.titleName
                        || record.bookCopy?.qrCode
                        || 'Unknown Book'}
                      {' • '}Due {record.dateDue}
                    </div>
                  </div>
                  <StatusBadge status="OVERDUE" />
                </div>
              ))}
              <div style={styles.viewAllRow}>
                <button style={styles.viewAllLink} onClick={() => navigate('/borrows')}>
                  View All →
                </button>
              </div>
            </>
          )}
        </Card>

      </div>
    </div>
  );
}

// ── STAT CARD COMPONENT ───────────────────────────────────────────────
function StatCard({ icon, label, value, color, onClick }) {
  return (
    <Card hoverable onClick={onClick} style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: color + '18', color }}>
        {icon}
      </div>
      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </Card>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────
const styles = {
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  loadingText: {
    color: tokens.colors.textMuted,
    fontSize: 15,
  },

  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    background: `linear-gradient(120deg, ${tokens.colors.primary} 0%, ${tokens.colors.primaryDark} 100%)`,
    borderRadius: tokens.radius.lg,
    padding: '28px 32px',
    marginBottom: tokens.spacing.lg,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 20,
    boxShadow: tokens.shadows.lg,
  },
  heroDecor: {
    position: 'absolute',
    top: -60, right: -40,
    width: 220, height: 220,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(13,148,136,0.35) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroLeft: { position: 'relative', zIndex: 1 },
  heroGreeting: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 24, fontWeight: 700, color: '#fff',
  },
  heroSub: {
    margin: '8px 0 0', color: 'rgba(255,255,255,0.65)', fontSize: 14,
  },
  heroActions: {
    display: 'flex', gap: 10, position: 'relative', zIndex: 1, flexWrap: 'wrap',
  },
  heroBtn: { height: 44 },

  // Stats grid — 5 cards in a row
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 20,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    flexShrink: 0,
  },
  statValue: {
    fontSize: 30,
    fontWeight: 800,
    color: tokens.colors.textPrimary,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 6,
    fontWeight: 500,
  },

  // Two column lists
  listsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: tokens.spacing.lg,
  },
  listCard: { padding: 0, overflow: 'hidden' },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: `1px solid ${tokens.colors.border}`,
    background: tokens.colors.surface,
  },
  listTitle: {
    fontWeight: 700,
    fontSize: 14,
    color: tokens.colors.textPrimary,
  },
  listCount: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    background: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    padding: '2px 10px',
    borderRadius: tokens.radius.full,
    fontWeight: 600,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 20px',
    borderBottom: `1px solid ${tokens.colors.surface}`,
  },
  listItemLeft: {
    flex: 1,
    minWidth: 0,
  },
  listItemName: {
    fontSize: 13,
    fontWeight: 600,
    color: tokens.colors.textPrimary,
  },
  listItemSub: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyState: {
    textAlign: 'center',
    padding: '36px 20px',
    color: tokens.colors.textMuted,
    fontSize: 14,
  },
  viewAllRow: {
    padding: '10px 20px 14px',
    textAlign: 'right',
  },
  viewAllLink: {
    background: 'none',
    border: 'none',
    color: tokens.colors.accent,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: tokens.font.family,
    padding: 0,
  },
};
