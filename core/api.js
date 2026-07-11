import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { SecureStoreService } from './secureStore';
import { AppConfig } from './config';
import { getDeviceId } from './deviceIdentity';
import { stripInlineBase64 } from './mediaPayload';
import { createImageThumbnailForUpload, getLocalImageSizeBytes, optimizeImageForUpload } from './imageOptimizer';

const ATTACHMENT_BUCKET = 'mobile-anexos';
const MAX_RESTORE_ROWS = 300;

export const ApiClient = axios.create({
  baseURL: AppConfig.apiBaseUrl,
  timeout: 30000,
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

function buildGpsRows(respostas) {
  return respostas.flatMap((payload) => (
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
}

function isSupabaseSchemaCacheError(error) {
  const message = String(error?.response?.data?.message || error?.message || '');
  return error?.response?.status === 400 && message.toLowerCase().includes('schema cache');
}

function isSupabaseMissingColumnError(error) {
  const message = String(error?.response?.data?.message || error?.message || '').toLowerCase();
  const details = String(error?.response?.data?.details || '').toLowerCase();
  return error?.response?.status === 400
    && (
      message.includes('could not find')
      || message.includes('column')
      || details.includes('schema cache')
      || details.includes('column')
    );
}

async function postMobileRespostasRows(rows) {
  return ApiClient.post('/mobile_respostas', rows, {
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
  });
}

function stripAttachmentExtendedColumns(row) {
  const compatible = { ...row };
  delete compatible.thumbnail_storage_path;
  delete compatible.thumbnail_tamanho_bytes;
  delete compatible.original_tamanho_bytes;
  delete compatible.otimizado;
  return compatible;
}

async function postMobileAnexosRows(rows) {
  return ApiClient.post('/mobile_anexos', rows, {
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
  });
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }));

  return results;
}

export const ApiService = {
  async login(usuario, senha) {
    return ApiClient.post('/auth/login', { usuario, senha });
  },

  async authenticateMobileCollaborator(matricula, senha) {
    return ApiClient.post('/rpc/mobile_authenticate', {
      p_matricula: matricula,
      p_senha: senha,
    });
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

  async upsertMobileUsuario(profile) {
    if (!profile?.matricula && !profile?.userId) return null;

    const now = new Date().toISOString();
    const row = {
      id: profile.userId || profile.matricula,
      matricula: profile.matricula || profile.userId,
      nome: profile.userName || profile.nome || 'Colaborador',
      cargo: profile.cargo || null,
      departamento: profile.departamento || null,
      gestor: profile.gestor || null,
      ultimo_login_em: now,
      updated_at: now,
    };

    return ApiClient.post('/mobile_usuarios', [row], {
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
    });
  },

  async upsertMobileDispositivo(devicePayload) {
    if (!devicePayload?.id) return null;

    return ApiClient.post('/mobile_dispositivos', [devicePayload], {
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
    });
  },

  async touchMobileDispositivo(devicePayload) {
    if (!devicePayload?.id) return null;

    return ApiClient.post('/mobile_dispositivos', [{
      ...devicePayload,
      ultimo_sync_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }], {
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
    });
  },

  async syncRespostas(respostas) {
    const deviceId = await getDeviceId();
    const rows = respostas.map((payload) => ({
      id: payload.resposta_id,
      formulario_id: payload.formulario_id,
      formulario_versao: payload.formulario_versao || null,
      usuario_id: payload.usuario_id || null,
      dados_json: stripInlineBase64(payload.dados || {}),
      mapeamento_legado: stripInlineBase64(payload.mapeamento_legado || null),
      status: 'pendente_validacao',
      dispositivo_id: payload.dispositivo_id || deviceId,
      criado_em: payload.criado_em || new Date().toISOString(),
      enviado_em: new Date().toISOString(),
      origem: 'app_android',
      updated_at: new Date().toISOString(),
    }));

    let response;
    try {
      response = await postMobileRespostasRows(rows);
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error)) throw error;

      const compatibleRows = respostas.map((payload) => ({
        id: payload.resposta_id,
        formulario_id: payload.formulario_id,
        usuario_id: payload.usuario_id || null,
        dados_json: stripInlineBase64({
          ...(payload.dados || {}),
          _formulario_versao: payload.formulario_versao || null,
          _mapeamento_legado: payload.mapeamento_legado || null,
        }),
        status: 'pendente_validacao',
        criado_em: payload.criado_em || new Date().toISOString(),
        enviado_em: new Date().toISOString(),
      }));

      response = await postMobileRespostasRows(compatibleRows);
      response.syncWarnings = ['Supabase sem colunas novas em mobile_respostas; envio feito em modo compatível.'];
    }

    const syncResults = {
      gpsCount: 0,
      attachmentCount: 0,
      mediaBlockingErrors: [],
      warnings: [...(response.syncWarnings || [])],
    };

    try {
      const gpsResult = await this.syncGpsPontos(respostas);
      syncResults.gpsCount = gpsResult.count || 0;
    } catch (error) {
      const message = `GPS não enviado agora: ${error?.message || error}`;
      syncResults.warnings.push(message);
      syncResults.mediaBlockingErrors.push(message);
    }

    try {
      const attachmentResult = await this.syncAnexosMetadata(respostas);
      syncResults.attachmentCount = attachmentResult.count || 0;
    } catch (error) {
      const message = `Fotos não enviadas agora: ${error?.message || error}`;
      syncResults.warnings.push(message);
      syncResults.mediaBlockingErrors.push(message);
    }

    response.syncResults = syncResults;

    return response;
  },

  async syncGpsPontos(respostas) {
    const gpsRows = buildGpsRows(respostas);
    if (gpsRows.length === 0) return { count: 0 };

    await ApiClient.post('/mobile_gps', gpsRows, {
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
    });

    return { count: gpsRows.length };
  },

  async syncAnexosMetadata(respostas) {
    const rows = (await mapWithConcurrency(respostas, 2, (payload) => collectAttachmentRows(payload))).flat();
    if (rows.length === 0) return { count: 0 };

    try {
      await postMobileAnexosRows(rows);
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error) && !isSupabaseMissingColumnError(error)) throw error;
      await postMobileAnexosRows(rows.map(stripAttachmentExtendedColumns));
    }

    return { count: rows.length };
  },

  async getUserResponses(usuarioId, limit = MAX_RESTORE_ROWS) {
    return ApiClient.get('/mobile_respostas', {
      params: {
        select: 'id,formulario_id,formulario_versao,usuario_id,dados_json,mapeamento_legado,status,dispositivo_id,criado_em,enviado_em,recebido_em,updated_at,erro_msg,tentativas',
        usuario_id: `eq.${usuarioId}`,
        order: 'criado_em.desc',
        limit,
      },
    });
  },

  async getGpsByResponseIds(responseIds) {
    return fetchByResponseIds('/mobile_gps', responseIds, 'id,resposta_id,campo_id,latitude,longitude,precisao,altitude,capturado_em');
  },

  async getAnexosByResponseIds(responseIds) {
    const extendedSelect = 'id,resposta_id,campo_id,storage_path,thumbnail_storage_path,thumbnail_tamanho_bytes,original_tamanho_bytes,otimizado,nome_arquivo,tamanho_bytes,tipo_mime,criado_em';
    const compatibleSelect = 'id,resposta_id,campo_id,storage_path,nome_arquivo,tamanho_bytes,tipo_mime,criado_em';
    try {
      return await fetchByResponseIds('/mobile_anexos', responseIds, extendedSelect);
    } catch (error) {
      if (!isSupabaseSchemaCacheError(error) && !isSupabaseMissingColumnError(error)) throw error;
      return fetchByResponseIds('/mobile_anexos', responseIds, compatibleSelect);
    }
  },

  async logMobileSync({ status, mensagem, respostaId = null, dispositivoId = null }) {
    try {
      return await ApiClient.post('/mobile_sync_logs', [{
        resposta_id: respostaId,
        dispositivo_id: dispositivoId || await getDeviceId(),
        status,
        mensagem,
        criado_em: new Date().toISOString(),
      }], {
        headers: {
          Prefer: 'return=minimal',
        },
      });
    } catch (_) {
      return null;
    }
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

  async getMobileAppConfig() {
    return ApiClient.get('/mobile_app_config', {
      params: {
        select: 'id,latest_version,min_version,apk_url,mensagem,updated_at',
        id: 'eq.default',
        limit: 1,
      },
    });
  },
};

function estimateBase64Size(base64) {
  const normalized = String(base64 || '').replace(/^data:[^;]+;base64,/, '');
  if (!normalized) return 0;
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function filenameFromUri(uri, fallback) {
  if (!uri) return fallback;
  const clean = String(uri).split('?')[0];
  return clean.split('/').pop() || fallback;
}

function sanitizeStorageSegment(value) {
  return String(value || 'sem_nome')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90) || 'sem_nome';
}

function storageObjectUrl(path) {
  const origin = AppConfig.apiBaseUrl.replace(/\/rest\/v1\/?$/, '');
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${origin}/storage/v1/object/${ATTACHMENT_BUCKET}/${encodedPath}`;
}

function thumbnailStoragePathFor(storagePath) {
  const parts = String(storagePath || '').split('/').filter(Boolean);
  const filename = parts.pop() || 'foto.jpg';
  const safeFilename = filename.replace(/\.[a-z0-9]+$/i, '') || 'foto';
  return [...parts, 'thumbs', `${safeFilename}_thumb.jpg`].join('/');
}

async function blobFromBase64(base64, mimeType) {
  const dataUrl = String(base64 || '').startsWith('data:')
    ? base64
    : `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
  const response = await fetch(dataUrl);
  return await response.blob();
}

async function uploadAttachmentBlob({ storagePath, body, mimeType }) {
  const response = await fetch(storageObjectUrl(storagePath), {
    method: 'PUT',
    headers: {
      apikey: AppConfig.supabaseAnonKey,
      Authorization: `Bearer ${AppConfig.supabaseAnonKey}`,
      'Content-Type': mimeType || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body,
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      detail = '';
    }
    throw new Error(`Storage HTTP ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ''}`);
  }

  return {
    storagePath,
    tamanhoBytes: body?.size || null,
  };
}

async function uploadLocalFileToStorage({ storagePath, uri, mimeType }) {
  const response = await FileSystem.uploadAsync(storageObjectUrl(storagePath), uri, {
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      apikey: AppConfig.supabaseAnonKey,
      Authorization: `Bearer ${AppConfig.supabaseAnonKey}`,
      'Content-Type': mimeType || 'image/jpeg',
      'x-upsert': 'true',
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Storage HTTP ${response.status}${response.body ? `: ${String(response.body).slice(0, 180)}` : ''}`);
  }

  return response;
}

async function tryUploadThumbnail({ storagePath, source, mimeType }) {
  try {
    const thumbnail = await createImageThumbnailForUpload({
      ...(source || {}),
      mimeType: mimeType || source?.mimeType || 'image/jpeg',
    });
    if (!thumbnail?.uri) return null;

    const thumbnailStoragePath = thumbnailStoragePathFor(storagePath);
    await uploadLocalFileToStorage({
      storagePath: thumbnailStoragePath,
      uri: thumbnail.uri,
      mimeType: thumbnail.mimeType || 'image/jpeg',
    });

    return {
      thumbnailStoragePath,
      thumbnailTamanhoBytes: await getLocalImageSizeBytes(thumbnail.uri) || thumbnail.tamanho_bytes || null,
    };
  } catch (error) {
    console.warn('Thumbnail upload skipped:', error?.message || error);
    return null;
  }
}

async function uploadAttachmentBase64({ storagePath, base64, mimeType }) {
  if (!base64) return null;
  const body = await blobFromBase64(base64, mimeType);
  const result = await uploadAttachmentBlob({ storagePath, body, mimeType });
  const dataUri = String(base64 || '').startsWith('data:')
    ? base64
    : `data:${mimeType || 'image/jpeg'};base64,${base64}`;
  const thumbnail = await tryUploadThumbnail({
    storagePath,
    source: { uri: dataUri, mimeType: mimeType || 'image/jpeg' },
    mimeType: mimeType || 'image/jpeg',
  });
  return {
    ...result,
    tamanhoBytes: result?.tamanhoBytes || estimateBase64Size(base64),
    thumbnailStoragePath: thumbnail?.thumbnailStoragePath || null,
    thumbnailTamanhoBytes: thumbnail?.thumbnailTamanhoBytes || null,
  };
}

async function uploadAttachmentFileUri({ storagePath, uri, mimeType }) {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) {
    throw new Error('arquivo local nao encontrado no aparelho');
  }

  const optimized = await optimizeImageForUpload({
    uri,
    mimeType: mimeType || 'image/jpeg',
  });
  const uploadUri = optimized.uri || uri;
  const uploadMimeType = optimized.mimeType || mimeType || 'image/jpeg';
  const uploadSize = await getLocalImageSizeBytes(uploadUri);

  await uploadLocalFileToStorage({
    storagePath,
    uri: uploadUri,
    mimeType: uploadMimeType,
  });
  const thumbnail = await tryUploadThumbnail({
    storagePath,
    source: {
      ...optimized,
      uri: uploadUri,
      mimeType: uploadMimeType,
    },
    mimeType: uploadMimeType,
  });

  return {
    storagePath,
    tamanhoBytes: uploadSize || optimized.tamanho_bytes || fileInfo.size || null,
    originalTamanhoBytes: optimized.original_tamanho_bytes || fileInfo.size || null,
    otimizado: Boolean(optimized.optimized),
    thumbnailStoragePath: thumbnail?.thumbnailStoragePath || null,
    thumbnailTamanhoBytes: thumbnail?.thumbnailTamanhoBytes || null,
  };
}

async function uploadAttachmentUri({ storagePath, uri, mimeType }) {
  if (!uri) return null;

  if (String(uri).startsWith('file://')) {
    return uploadAttachmentFileUri({ storagePath, uri, mimeType });
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Arquivo local HTTP ${response.status}`);
  }

  const body = await response.blob();
  return uploadAttachmentBlob({ storagePath, body, mimeType });
}

async function collectAttachmentRows(payload) {
  const respostaId = payload.resposta_id;
  if (!respostaId || !payload.dados || typeof payload.dados !== 'object') return [];

  const rows = [];
  const visit = (value, path = []) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, String(index + 1)]));
      return;
    }

    if (typeof value !== 'object') return;

    if (value.base64 || value.uri) {
      const index = rows.length + 1;
      const explicitCampoId = typeof value.campo_id === 'string' ? value.campo_id.trim() : '';
      const campoId = explicitCampoId || path.filter(Boolean).join('.') || `foto_${index}`;
      const filename = filenameFromUri(value.uri, `${campoId.replace(/[^a-z0-9_-]+/gi, '_')}.jpg`);
      const storagePath = [
        sanitizeStorageSegment(payload.usuario_id || 'sem_usuario'),
        sanitizeStorageSegment(respostaId),
        `${String(index).padStart(2, '0')}_${sanitizeStorageSegment(filename)}`,
      ].join('/');
      rows.push({
        id: `anexo_${respostaId}_${index}`,
        resposta_id: respostaId,
        campo_id: campoId.slice(0, 180),
        storage_path: value.storage_path || (value.uri || (value.base64 ? `inline_json://${respostaId}/${campoId}` : `anexo_pendente://${respostaId}/${campoId}`)),
        storage_upload_path: storagePath,
        base64: value.uri ? null : value.base64 || null,
        uri: value.uri || null,
        nome_arquivo: filename,
        tamanho_bytes: value.tamanho_bytes || value.size || (value.uri ? null : estimateBase64Size(value.base64)),
        tipo_mime: value.mimeType || value.tipo_mime || 'image/jpeg',
        criado_em: value.capturedAt || value.criado_em || payload.criado_em || new Date().toISOString(),
      });
    }

    Object.entries(value).forEach(([key, child]) => visit(child, [...path, key]));
  };

  visit(payload.dados);
  const dedupedRows = [];
  const seenMedia = new Set();
  rows.forEach((row) => {
    const mediaKey = row.uri ? `uri:${row.uri}` : null;
    if (mediaKey && seenMedia.has(mediaKey)) return;
    if (mediaKey) seenMedia.add(mediaKey);
    dedupedRows.push(row);
  });

  for (const row of dedupedRows) {
    try {
      if (row.uri) {
        try {
          const uploadResult = await uploadAttachmentUri({
            storagePath: row.storage_upload_path,
            uri: row.uri,
            mimeType: row.tipo_mime,
          });
          row.storage_path = uploadResult?.storagePath || uploadResult;
          row.tamanho_bytes = uploadResult?.tamanhoBytes || row.tamanho_bytes;
          row.thumbnail_storage_path = uploadResult?.thumbnailStoragePath || null;
          row.thumbnail_tamanho_bytes = uploadResult?.thumbnailTamanhoBytes || null;
          row.original_tamanho_bytes = uploadResult?.originalTamanhoBytes || row.tamanho_bytes || null;
          row.otimizado = Boolean(uploadResult?.otimizado || uploadResult?.thumbnailStoragePath);
        } catch (uriError) {
          if (!row.base64) throw uriError;
          const uploadResult = await uploadAttachmentBase64({
            storagePath: row.storage_upload_path,
            base64: row.base64,
            mimeType: row.tipo_mime,
          });
          row.storage_path = uploadResult?.storagePath || uploadResult;
          row.tamanho_bytes = uploadResult?.tamanhoBytes || row.tamanho_bytes;
          row.thumbnail_storage_path = uploadResult?.thumbnailStoragePath || null;
          row.thumbnail_tamanho_bytes = uploadResult?.thumbnailTamanhoBytes || null;
          row.original_tamanho_bytes = row.tamanho_bytes || null;
          row.otimizado = Boolean(uploadResult?.thumbnailStoragePath);
        }
      } else if (row.base64) {
        const uploadResult = await uploadAttachmentBase64({
          storagePath: row.storage_upload_path,
          base64: row.base64,
          mimeType: row.tipo_mime,
        });
        row.storage_path = uploadResult?.storagePath || uploadResult;
        row.tamanho_bytes = uploadResult?.tamanhoBytes || row.tamanho_bytes;
        row.thumbnail_storage_path = uploadResult?.thumbnailStoragePath || null;
        row.thumbnail_tamanho_bytes = uploadResult?.thumbnailTamanhoBytes || null;
        row.original_tamanho_bytes = row.tamanho_bytes || null;
        row.otimizado = Boolean(uploadResult?.thumbnailStoragePath);
      }
    } catch (error) {
      throw new Error(`Upload do anexo ${row.campo_id} falhou: ${error?.message || error}`);
    }

    delete row.base64;
    delete row.uri;
    delete row.storage_upload_path;
  }

  return dedupedRows;
}

async function fetchByResponseIds(path, responseIds, select) {
  const uniqueIds = Array.from(new Set(responseIds.filter(Boolean)));
  if (uniqueIds.length === 0) return { data: [] };

  const chunks = [];
  for (let index = 0; index < uniqueIds.length; index += 60) {
    chunks.push(uniqueIds.slice(index, index + 60));
  }

  const responses = await Promise.all(chunks.map((chunk) => (
    ApiClient.get(path, {
      params: {
        select,
        resposta_id: `in.(${chunk.join(',')})`,
      },
    })
  )));

  return {
    data: responses.flatMap((response) => (Array.isArray(response.data) ? response.data : [])),
  };
}
