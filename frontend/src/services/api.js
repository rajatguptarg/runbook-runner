import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://0.0.0.0:8000',
});

// Add a request interceptor to include the API key
instance.interceptors.request.use(
  (config) => {
    const apiKey = localStorage.getItem('apiKey');
    if (apiKey) {
      config.headers['X-API-KEY'] = apiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- Auth ---
export const signup = (data) => instance.post('/users/signup', data);
export const login = (data) => instance.post('/users/login', data);

// --- Runbooks ---
export const getRunbooks = () => instance.get('/runbooks');
export const getRunbookDetails = (id) => instance.get(`/runbooks/${id}`);
export const createRunbook = (data) => instance.post('/runbooks', data);
export const updateRunbook = (id, data) => instance.put(`/runbooks/${id}`, data);
export const deleteRunbook = (id) => instance.delete(`/runbooks/${id}`);
export const executeRunbook = (id) => instance.post(`/runbooks/${id}/execute`);
export const executeBlock = (block, runbook_id) =>
  instance.post('/blocks/execute', { block, runbook_id });

// --- Executions ---
export const getExecutions = () => instance.get('/executions');
export const getExecutionStatus = (id) => instance.get(`/executions/${id}`);
export const clearExecutions = () => instance.delete('/executions/clear');

// --- Credentials ---
export const getCredentials = () => instance.get('/credentials');
export const createCredential = (data) => instance.post('/credentials', data);
export const deleteCredential = (id) => instance.delete(`/credentials/${id}`);

// --- Audit ---
export const getAuditLogs = () => instance.get('/audit');


export default instance;
