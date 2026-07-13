import axios from "axios";
const BASE_URL = 'http://localhost:8080/api';
const api = axios.create({
    baseURL: BASE_URL,
});

// REQUEST INTERCEPTOR
// This runs BEFORE every request is sent
// Its job: attach the JWT token to the Authorization header
api.interceptors.request.use(
  (config) => {
    // Get token from browser storage
    const token = localStorage.getItem('token');

    if (token) {
      // Attach token — this is how Spring Boot knows who you are
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR
// This runs AFTER every response comes back
// Its job: handle token expiry globally
api.interceptors.response.use(
  (response) => {
    // Request succeeded — return response as is
    return response;
  },
  (error) => {
    // If server says 401 Unauthorized or 403 Forbidden
    // Token is expired or invalid — log user out
    if (
      error.response?.status === 401 ||
      error.response?.status === 403
    ) {
      // Clear stored data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect to login page
      // Only redirect if not already on login page
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default api;