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

// ── LIBRARIAN ROUTE ───────────────────────────────────────────────────
// Same as ProtectedRoute, but for pages that are librarian management
// functions (Users, Classes & Streams, Books, Borrows). A TEACHER
// hitting one of these URLs directly is sent to the dashboard instead
// of a page that would just 403 on every API call — the backend is the
// actual security boundary (see TEACHER_SCOPING_PROMPT.md), this is
// only the UX layer on top of it.
function LibrarianRoute({ children }) {
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

  if (user.role !== 'LIBRARIAN') {
    return <Navigate to="/dashboard" replace />;
  }

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
            <LibrarianRoute>
              <Classes/>
            </LibrarianRoute>
          } />

          <Route path="/users" element={
            <LibrarianRoute>
              <Users/>
            </LibrarianRoute>
          } />

          <Route path="/students" element={
            <ProtectedRoute>
              <Students/>
            </ProtectedRoute>
          } />

          <Route path="/books" element={
            <LibrarianRoute>
              <Books/>
            </LibrarianRoute>
          } />

          <Route path="/distributions" element={
            <ProtectedRoute>
              <Distributions />
            </ProtectedRoute>
          } />

          <Route path="/borrows" element={
            <LibrarianRoute>
              <Borrows/>
            </LibrarianRoute>
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