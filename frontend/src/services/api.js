import axios from 'axios';

const instance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
});

export const getRunbooks = () => instance.get('/runbooks');

export default instance;
