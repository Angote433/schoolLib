import { createContext, useContext, useState, useEffect } from 'react';

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

  // Make these values available to every page
  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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