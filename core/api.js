import axios from 'axios';
import { SecureStoreService } from './secureStore';

const BASE_URL = 'https://api.vilanova-agro.com.br/v1';

export const ApiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-App-Version': '1.0.0',
    'X-Platform': 'android',
  },
});

// Automatically inject JWT tokens into all outgoing requests
ApiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStoreService.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Automatically handle unauthorized errors (clear session)
ApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await SecureStoreService.clearAll();
    }
    return Promise.reject(error);
  }
);

export const ApiService = {
  async login(usuario, senha) {
    return ApiClient.post('/auth/login', { usuario, senha });
  },

  async syncRespostas(respostas) {
    return ApiClient.post('/sync/respostas', { registros: respostas });
  },

  async syncAnexo(respostaId, caminhoLocal) {
    const fileExtension = caminhoLocal.split('.').pop() || 'jpg';
    const filename = caminhoLocal.split('/').pop() || 'upload.jpg';

    const formData = new FormData();
    formData.append('resposta_id', respostaId);
    formData.append('arquivo', {
      uri: caminhoLocal,
      name: filename,
      type: `image/${fileExtension === 'png' ? 'png' : 'jpeg'}`,
    });

    return ApiClient.post('/sync/anexos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async getFormularios() {
    return ApiClient.get('/formularios');
  },
};
