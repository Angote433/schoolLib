import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import Users from './pages/Users';
import Students from './pages/Students';
import Books from './pages/Books';
import Distributions from './pages/Distributions';
import Borrows from './pages/Borrows';
import Losses from './pages/Losses';

// ── PLACEHOLDER PAGES ─────────────────────────────────────────────────
// We build each one properly from Day 4 onwards
// For now they just show the page name so navigation works

function PlaceholderPage({ name }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 40,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h2 style={{ margin: 0, color: '#1a1a2e' }}>{name}</h2>
      <p style={{ color: '#666', marginTop: 8 }}>
        This page is coming soon. We build it step by step.
      </p>
    </div>
  );
}

// ── PROTECTED ROUTE ───────────────────────────────────────────────────
// Wraps pages that require login
// Also wraps them in the Layout so they all get the sidebar
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#666',
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Wrap with Layout — gives sidebar to every protected page
  return <Layout>{children}</Layout>;
}

// ── APP ───────────────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Public — no layout */}
          <Route path="/" element={<Login />} />

          {/* Protected — all wrapped in Layout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/classes" element={
            <ProtectedRoute>
              <Classes/>
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute>
              <Users/>
            </ProtectedRoute>
          } />

          <Route path="/students" element={
            <ProtectedRoute>
              <Students/>
            </ProtectedRoute>
          } />

          <Route path="/books" element={
            <ProtectedRoute>
              <Books/>
            </ProtectedRoute>
          } />

          <Route path="/distributions" element={
            <ProtectedRoute>
              <Distributions />
            </ProtectedRoute>
          } />

          <Route path="/borrows" element={
            <ProtectedRoute>
              <Borrows/>
            </ProtectedRoute>
          } />

          <Route path="/losses" element={
            <ProtectedRoute>
              <Losses />
            </ProtectedRoute>
          } />

          {/* Catch all unknown URLs */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;