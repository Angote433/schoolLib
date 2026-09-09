import { createContext, useContext, useState, useEffect } from 'react';
import { userService } from '../services/libraryApi';

//create the context
const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  // user stores the logged in user's info
  // null means nobody is logged in
  const [user, setUser] = useState(null);

  // loading prevents the app from redirecting before
  // it checks if someone was already logged in
  const [loading, setLoading] = useState(true);

  // When the app first loads, check if a token exists
  // This handles page refresh — user stays logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      // Someone was already logged in — restore their session
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // Saved data was corrupted — clear it
        localStorage.clear();
      }
    }

    // Done checking — app can now decide where to send the user
    setLoading(false);
  }, []);

  // login function — called after successful login API call
  // userData = the user object from the server response
  // token = the JWT token from the server response
  const login = (userData, token) => {
    // Save to browser storage so it survives page refresh
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    // Update the notice board
    setUser(userData);
  };

  // logout function — clears everything
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Merge partial changes into the cached user (e.g. after a profile
  // save) — keeps the sidebar/top bar in sync without a full reload.
  const updateUser = (updates) => {
    setUser(prev => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  // Re-pulls the caller's own profile from the server and merges it in —
  // in particular streamId/streamName, which can go stale in localStorage
  // when a librarian reassigns a teacher's stream while that teacher is
  // already logged in (see FEATURES_BATCH_2_PROMPT.md Feature 3.4).
  // GET /api/users/me always includes streamId/streamName (null when
  // absent) so a removed stream actually overwrites the cached value
  // instead of leaving it stale.
  const refreshUser = async () => {
    try {
      const res = await userService.getMe();
      updateUser(res.data);
      return res.data;
    } catch {
      // Non-fatal — keep the cached profile, try again on next navigation.
      return null;
    }
  };

  // Make these values available to every page
  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — shortcut for reading the context
// Instead of writing useContext(AuthContext) every time
// you just write useAuth()
export function useAuth() {
  return useContext(AuthContext);
}