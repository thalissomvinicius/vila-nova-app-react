import axios from 'axios';
import { SecureStoreService } from './secureStore';
import { AppConfig } from './config';

export const ApiClient = axios.create({
  baseURL: AppConfig.apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Automatically inject JWT tokens into all outgoing requests
ApiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStoreService.getToken();
    if (AppConfig.supabaseAnonKey) {
      config.headers.apikey = AppConfig.supabaseAnonKey;
      config.headers['Authorization'] = `Bearer ${AppConfig.supabaseAnonKey}`;
    } else if (token) {
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

  async getHeadcountByMatricula(matricula) {
    return ApiClient.get('/headcount_colaboradores', {
      params: {
        select: 'matricula,senha,nome,departamento,cargo,gestor,status,admissao_excel,fonte_aba,fonte_arquivo,reference_date,imported_at',
        matricula: `eq.${matricula}`,
        status: 'eq.ATIVO',
        limit: 1,
      },
    });
  },

  async getHeadcountPage(offset = 0, limit = 500) {
    return ApiClient.get('/headcount_colaboradores', {
      params: {
        select: 'matricula,senha,nome,departamento,cargo,gestor,status,admissao_excel,fonte_aba,fonte_arquivo,reference_date,imported_at',
        status: 'eq.ATIVO',
        order: 'matricula.asc',
        offset,
        limit,
      },
    });
  },

  async syncRespostas(respostas) {
    const rows = respostas.map((payload) => ({
      id: payload.resposta_id,
      formulario_id: payload.formulario_id,
      formulario_versao: payload.formulario_versao || null,
      usuario_id: payload.usuario_id || null,
      dados_json: payload.dados || {},
      mapeamento_legado: payload.mapeamento_legado || null,
      status: 'pendente_validacao',
      criado_em: payload.criado_em || new Date().toISOString(),
      enviado_em: new Date().toISOString(),
      origem: 'app_android',
      updated_at: new Date().toISOString(),
    }));

    const response = await ApiClient.post('/mobile_respostas', rows, {
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
    });

    const gpsRows = respostas.flatMap((payload) => (
      Array.isArray(payload.gps_pontos)
        ? payload.gps_pontos
          .filter((point) => Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude)))
          .map((point, index) => ({
            id: `gps_${payload.resposta_id}_${index + 1}`,
            resposta_id: payload.resposta_id,
            campo_id: point.campo_id || 'gps',
            latitude: Number(point.latitude),
            longitude: Number(point.longitude),
            precisao: point.precisao ?? null,
            altitude: point.altitude ?? null,
            capturado_em: point.capturado_em || payload.criado_em || new Date().toISOString(),
          }))
        : []
    ));

    if (gpsRows.length > 0) {
      try {
        await ApiClient.post('/mobile_gps', gpsRows, {
          headers: {
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
        });
      } catch (gpsError) {
        console.warn('GPS points sync failed after response sync:', gpsError?.message || gpsError);
      }
    }

    return response;
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
    return ApiClient.get('/mobile_formularios', {
      params: {
        select: 'id,area_id,titulo,descricao,versao,campos_json',
        ativo: 'eq.true',
      },
    });
  },
};
