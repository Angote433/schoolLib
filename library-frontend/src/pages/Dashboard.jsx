import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  bookService,
  borrowService,
  lossService,
  distributionService,
  streamService,
} from '../services/libraryApi';

export default function Dashboard() {
  const { user } = useAuth();

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
        totalStreams: streamsRes.data.filter(s => s.isActive).length,
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
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingText}>Loading dashboard...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
        <button
          style={styles.retryBtn}
          onClick={loadDashboardData}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>

      {/* Welcome message */}
      <div style={styles.welcomeSection}>
        <h1 style={styles.welcomeTitle}>
          Welcome back, {user?.fullName?.split(' ')[0]} 👋
        </h1>
        <p style={styles.welcomeSub}>
          Here is what is happening in the library today.
        </p>
      </div>

      {/* ── STAT CARDS ───────────────────────────────────── */}
      <div style={styles.statsGrid}>

        <StatCard
          icon="📚"
          label="Book Titles"
          value={stats.totalBooks}
          color="#2c5364"
        />

        <StatCard
          icon="🏫"
          label="Active Streams"
          value={stats.totalStreams}
          color="#276749"
        />

        <StatCard
          icon="📖"
          label="Active Borrows"
          value={stats.activeBorrows}
          color="#2b6cb0"
        />

        <StatCard
          icon="⚠️"
          label="Pending Losses"
          value={stats.pendingLosses}
          color="#c05621"
        />

        <StatCard
          icon="🔴"
          label="Overdue Borrows"
          value={stats.overdueBorrows}
          color="#c53030"
        />

      </div>

      {/* ── BOTTOM LISTS ─────────────────────────────────── */}
      <div style={styles.listsGrid}>

        {/* Pending Loss Reports */}
        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <span style={styles.listTitle}>⚠️ Pending Loss Reports</span>
            <span style={styles.listCount}>
              {stats.pendingLosses} total
            </span>
          </div>

          {pendingLosses.length === 0 ? (
            <div style={styles.emptyState}>
              🎉 No pending losses
            </div>
          ) : (
            pendingLosses.map((report, index) => (
              <div key={index} style={styles.listItem}>
                <div style={styles.listItemLeft}>
                  <div style={styles.listItemName}>
                    {report.student?.fullName || 'Unknown Student'}
                  </div>
                  <div style={styles.listItemSub}>
                    {report.bookCopy?.bookDetails?.titleName
                      || report.bookCopy?.qrCode
                      || 'Unknown Book'}
                  </div>
                  <div style={styles.listItemSub}>
                    Flagged: {report.dateFlagged}
                  </div>
                </div>
                <span style={{
                  ...styles.badge,
                  background: '#fff5f5',
                  color: '#c53030',
                }}>
                  {report.source}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Overdue Borrows */}
        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <span style={styles.listTitle}>🔴 Overdue Borrows</span>
            <span style={styles.listCount}>
              {stats.overdueBorrows} total
            </span>
          </div>

          {overdueBorrows.length === 0 ? (
            <div style={styles.emptyState}>
              🎉 No overdue borrows
            </div>
          ) : (
            overdueBorrows.map((record, index) => (
              <div key={index} style={styles.listItem}>
                <div style={styles.listItemLeft}>
                  <div style={styles.listItemName}>
                    {record.student?.fullName || 'Unknown Student'}
                  </div>
                  <div style={styles.listItemSub}>
                    {record.bookCopy?.bookDetails?.titleName
                      || record.bookCopy?.qrCode
                      || 'Unknown Book'}
                  </div>
                  <div style={styles.listItemSub}>
                    Due: {record.dateDue}
                  </div>
                </div>
                <span style={{
                  ...styles.badge,
                  background: '#fffff0',
                  color: '#975a16',
                }}>
                  OVERDUE
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

// ── STAT CARD COMPONENT ───────────────────────────────────────────────
// A small reusable component used only inside Dashboard
// Takes icon, label, value, and color as props
function StatCard({ icon, label, value, color }) {
  return (
    <div style={styles.statCard}>
      <div style={{
        ...styles.statIcon,
        background: color + '18',
      }}>
        {icon}
      </div>
      <div>
        <div style={styles.statValue}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </div>
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
    color: '#666',
    fontSize: 15,
    fontFamily: 'Segoe UI, sans-serif',
  },
  errorContainer: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: 12,
    padding: 24,
    textAlign: 'center',
  },
  errorText: {
    color: '#c53030',
    margin: '0 0 16px',
  },
  retryBtn: {
    padding: '8px 20px',
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
  },

  welcomeSection: {
    marginBottom: 24,
  },
  welcomeTitle: {
    margin: 0,
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a2e',
    fontFamily: 'Segoe UI, sans-serif',
  },
  welcomeSub: {
    margin: '6px 0 0',
    color: '#666',
    fontSize: 14,
    fontFamily: 'Segoe UI, sans-serif',
  },

  // Stats grid — 5 cards in a row
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    background: '#ffffff',
    borderRadius: 12,
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    flexShrink: 0,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a2e',
    lineHeight: 1,
    fontFamily: 'Segoe UI, sans-serif',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontFamily: 'Segoe UI, sans-serif',
  },

  // Two column lists
  listsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  listCard: {
    background: '#ffffff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid #f0f2f5',
  },
  listTitle: {
    fontWeight: 700,
    fontSize: 14,
    color: '#1a1a2e',
    fontFamily: 'Segoe UI, sans-serif',
  },
  listCount: {
    fontSize: 12,
    color: '#888',
    background: '#f0f2f5',
    padding: '2px 8px',
    borderRadius: 20,
    fontFamily: 'Segoe UI, sans-serif',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f7fafc',
  },
  listItemLeft: {
    flex: 1,
  },
  listItemName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    fontFamily: 'Segoe UI, sans-serif',
  },
  listItemSub: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontFamily: 'Segoe UI, sans-serif',
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 20,
    flexShrink: 0,
    marginLeft: 8,
    fontFamily: 'Segoe UI, sans-serif',
  },
  emptyState: {
    textAlign: 'center',
    padding: '30px 0',
    color: '#999',
    fontSize: 14,
    fontFamily: 'Segoe UI, sans-serif',
  },
};