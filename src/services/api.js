import axios from 'axios';

// W produkcji VITE_API_URL = URL backendu (np. https://api.twoja-domena.com)
// W trybie dev jest puste – użetwany proxy Vite (patrz vite.config.js)
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/^"|"$/g, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Wymagane dla httpOnly cookie (refresh token)
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor odpowiedzi – obsługa wygasłego access tokenu
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jeśli 401 i token wygasł (nie retry)
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        if (refreshRes.data.success) {
          const newToken = refreshRes.data.accessToken;
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh się nie powiódł – przekieruj do logowania
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
