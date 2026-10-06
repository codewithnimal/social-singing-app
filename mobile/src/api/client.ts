import axios from 'axios';

// Use environment variables in production. Hardcoding for dev foundation.
// Android emulator uses 10.0.2.2 to access host localhost.
// iOS simulator uses localhost.
// For physical devices, use your computer's local IP on the network.
const API_URL = 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Interceptor for auth will go here
apiClient.interceptors.request.use(
  async (config) => {
    // const token = await SecureStore.getItemAsync('userToken');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
