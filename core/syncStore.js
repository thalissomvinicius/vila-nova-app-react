import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { ApiService } from './api';
import { logAppEvent } from './appLogger';
import { AppConfig } from './config';
import { buildLegacyPayload } from './cqoPayload';
import { AppDatabase } from './database';
import { getDeviceRegistrationPayload } from './deviceIdentity';
import { stringifyCamposJson } from './formSchema';
import { getSeedCollaborators } from './headcountSeed';
import { SecureStoreService } from './secureStore';

function formatSyncDate() {
  return new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function saveHeadcountRow(collaborator) {
  AppDatabase.insert('headcount_colaboradores', {
    matricula: collaborator.matricula,
    senha: collaborator.senha || '1234',
    nome: collaborator.nome,
    departamento: collaborator.departamento || '',
    cargo: collaborator.cargo || '',
    gestor: collaborator.gestor || '',
    status: collaborator.status || 'ATIVO',
    admissao_excel: collaborator.admissao_excel || '',
    fonte_aba: collaborator.fonte_aba || '',
    fonte_arquivo: collaborator.fonte_arquivo || '',
    reference_date: collaborator.reference_date || '',
    imported_at: collaborator.imported_at || '',
    updated_at: new Date().toISOString(),
  });
}

function deactivateMissingHeadcountRows(activeMatriculas) {
  if (!activeMatriculas.length) return;

  const placeholders = activeMatriculas.map(() => '?').join(', ');
  AppDatabase.run(
    `UPDATE headcount_colaboradores SET status = 'INATIVO', updated_at = ? WHERE status = 'ATIVO' AND matricula NOT IN (${placeholders})`,
    [new Date().toISOString(), ...activeMatriculas]
  );
}

function mapRemoteStatusToLocal(status) {
  if (status === 'aprovado') return 'aprovado';
  if (status === 'reprovado') return 'reprovado';
  if (status === 'erro') return 'erro';
  return 'sincronizado';
}

async function getCurrentUserInfo() {
  const storedUser = await SecureStoreService.getUserInfo();
  if (storedUser?.userId || storedUser?.matricula) return storedUser;

  const localUser = AppDatabase.getFirst('SELECT * FROM usuarios LIMIT 1');
  if (!localUser) return null;

  return {
    userId: localUser.id,
    matricula: String(localUser.id || '').replace(/\D/g, '') || localUser.id,
    userName: localUser.nome,
    cargo: localUser.cargo,
    departamento: null,
    gestor: null,
  };
}

function shouldPreserveLocalResponse(localResponse) {
  return ['pendente', 'erro', 'enviando'].includes(localResponse?.status);
}

function describeSyncError(error) {
  if (error?.response?.status) {
    const detail = error.response.data?.message || error.response.statusText || error.message;
    return `HTTP ${error.response.status}: ${detail}`;
  }
  return error?.message || 'erro desconhecido';
}

function isMissingOptionalSupabaseTable(error) {
  return error?.response?.status === 404
    && String(error.response.data?.message || '').includes('schema cache');
}

function safeParseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeRemoteResponseDados(remoteRow) {
  const raw = safeParseJson(remoteRow?.dados_json, {});
  const candidateRaw = raw?.dados
    || raw?.values
    || raw?.formValues
    || raw?.dados_json
    || raw?.payload?.dados
    || raw?.resposta?.dados
    || raw;
  const candidate = typeof candidateRaw === 'string'
    ? safeParseJson(candidateRaw, {})
    : candidateRaw;

  if (!candidate || typeof candidate !== 'object') return {};

  if (candidate.campos_digitados) {
    const campos = candidate.campos_digitados || {};
    const pick = (directKey, ...legacyKeys) => {
      const directValue = candidate[directKey];
      if (directValue !== null && directValue !== undefined && directValue !== '') return directValue;

      return legacyKeys
        .map((key) => campos[key])
        .find((value) => value !== null && value !== undefined && value !== '') || '';
    };

    return {
      ...candidate,
      nome_polo: pick('nome_polo', 'NomePolo', 'nome_polo'),
      nome_fazenda: pick('nome_fazenda', 'NomeFazenda', 'nome_fazenda'),
      parcela: pick('parcela', 'Parcela', 'parcela'),
      ano_plantio: pick('ano_plantio', 'AnoPlantio', 'ano_plantio'),
      densidade: pick('densidade', 'Densidade', 'densidade'),
      total_plantas_parcela: pick('total_plantas_parcela', 'TotalPlantasParcela', 'total_plantas_parcela'),
      total_cachos_carreados: pick('total_cachos_carreados', 'TotalCachosCarreados', 'total_cachos_carreados'),
      variedade: pick('variedade', 'Variedade', 'variedade'),
      data_avaliacao: pick('data_avaliacao', 'DataAvaliacao', 'data_avaliacao'),
      ciclo_mes: pick('ciclo_mes', 'Ciclo_mes', 'ciclo_mes'),
      atividade: pick('atividade', 'Atividade', 'atividade'),
      empresa: pick('empresa', 'Empresa', 'empresa'),
      empresa_tipo: pick('empresa_tipo', 'EmpresaTipo', 'empresa_tipo'),
      empresa_outra: pick('empresa_outra', 'EmpresaOutra', 'empresa_outra'),
      matricula_avaliador: pick('matricula_avaliador', 'MatriculaAvaliadores', 'matricula_avaliador'),
      matricula_avaliador_2: pick('matricula_avaliador_2', 'MatriculaAvaliador2', 'matricula_avaliador_2'),
      fiscal_resp: pick('fiscal_resp', 'Fiscal Resp', 'fiscal_resp'),
      fiscal_resp_equipe: pick('fiscal_resp_equipe', 'Fiscal Resp Equipe', 'fiscal_resp_equipe'),
      observacao: pick('observacao', 'Observacao', 'observacao'),
      linhas_corte: candidate.linhas_corte || candidate.linhas_raw || [],
      linhas_carreamento: candidate.linhas_carreamento || candidate.linhas_raw || [],
      linhas_poda: candidate.linhas_poda || candidate.linhas_raw || [],
    };
  }

  return candidate;
}

function valueContainsUri(value, uri) {
  if (!uri || !value) return false;
  if (typeof value === 'string') return value === uri;
  if (Array.isArray(value)) return value.some((item) => valueContainsUri(item, uri));
  if (typeof value === 'object') {
    return Object.values(value).some((child) => valueContainsUri(child, uri));
  }
  return false;
}

function localRowsForResponse(tableName, respostaId) {
  const rows = AppDatabase.getAll(`SELECT * FROM ${tableName} WHERE resposta_id = ?`, [respostaId]);
  return rows.filter((row) => row.resposta_id === respostaId);
}

function buildLocalMediaPayload(response) {
  const dados = safeParseJson(response.dados_json, {});
  const form = AppDatabase.getFirst('SELECT * FROM formularios WHERE id = ?', [response.formulario_id]);
  const localAnexos = localRowsForResponse('anexos', response.id);
  const localGps = localRowsForResponse('gps', response.id);
  const pendingAnexos = localAnexos.filter((anexo) => Number(anexo.enviado || 0) !== 1);
  const fallbackAnexos = pendingAnexos
    .filter((anexo) => anexo.caminho_local && !valueContainsUri(dados, anexo.caminho_local))
    .map((anexo) => ({
      campo_id: anexo.campo_id,
      uri: anexo.caminho_local,
      nome_arquivo: anexo.nome_arquivo,
      mimeType: anexo.tipo_mime || 'image/jpeg',
      capturedAt: anexo.criado_em,
    }));

  const dadosComAnexos = fallbackAnexos.length
    ? { ...dados, _local_anexos_pendentes: fallbackAnexos }
    : dados;
  const mapeamentoLegado = buildLegacyPayload(response.formulario_id, dadosComAnexos);

  return {
    payload: {
      resposta_id: response.id,
      formulario_id: response.formulario_id,
      formulario_versao: form?.versao || null,
      usuario_id: response.usuario_id,
      dados: dadosComAnexos,
      mapeamento_legado: mapeamentoLegado,
      gps_pontos: localGps.map((point) => ({
        campo_id: point.campo_id || 'gps',
        latitude: point.latitude,
        longitude: point.longitude,
        precisao: point.precisao,
        altitude: point.altitude,
        capturado_em: point.capturado_em || response.criado_em,
      })),
      criado_em: response.criado_em,
    },
    pendingAnexos,
    localGps,
  };
}

function ensurePendingResponsesQueued() {
  const responses = AppDatabase.getAll('SELECT * FROM respostas ORDER BY criado_em DESC');
  const queueRows = AppDatabase.getAll('SELECT * FROM sync_queue ORDER BY criado_em DESC');
  const queuedRefs = new Set(queueRows.map((item) => item.referencia_id).filter(Boolean));
  let createdCount = 0;

  responses
    .filter((response) => shouldPreserveLocalResponse(response) && !queuedRefs.has(response.id))
    .forEach((response) => {
      const { payload } = buildLocalMediaPayload(response);
      AppDatabase.insert('sync_queue', {
        id: `q_${response.id}`,
        tipo: 'resposta',
        referencia_id: response.id,
        payload_json: JSON.stringify(payload),
        status: response.status === 'erro' ? 'erro' : 'pendente',
        tentativas: 0,
        max_tentativas: 3,
        criado_em: response.criado_em || new Date().toISOString(),
      });
      queuedRefs.add(response.id);
      createdCount++;
    });

  return createdCount;
}

export const useSyncStore = create((set, get) => ({
  queue: [],
  logs: [],
  isSyncing: false,
  isQueueLoading: false,
  syncStatusText: 'Aguardando ação',
  lastSyncLabel: 'Nunca sincronizado',
  lastHeadcountCount: 0,

  addLog(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    logAppEvent('info', message, { source: 'sync' });
    set((state) => ({
      logs: [...state.logs, `[${timestamp}] ${message}`],
    }));
  },

  clearLogs() {
    set({ logs: [] });
  },

  seedHeadcountLocal() {
    const rows = getSeedCollaborators();
    rows.forEach(saveHeadcountRow);
    deactivateMissingHeadcountRows(rows.map((row) => row.matricula));
    set({ lastHeadcountCount: rows.length });
    return rows.length;
  },

  async loadQueue() {
    set({ isQueueLoading: true });
    try {
      const recreatedCount = ensurePendingResponsesQueued();
      if (recreatedCount > 0) {
        get().addLog(`${recreatedCount} coleta(s) pendente(s) recolocada(s) na fila.`);
      }

      const results = AppDatabase.getAll(
        `SELECT * FROM sync_queue
         ORDER BY COALESCE(processado_em, criado_em) DESC
         LIMIT 40`
      );
      set({ queue: results });

      const lastSync = await SecureStoreService.getItem('last_sync_time');
      if (lastSync) {
        set({ lastSyncLabel: lastSync });
      }
    } catch (e) {
      get().addLog(`Erro ao carregar fila: ${e.message}`);
    } finally {
      set({ isQueueLoading: false });
    }
  },

  async _pullHeadcount() {
    const { addLog } = get();
    const pageSize = 500;
    let offset = 0;
    let total = 0;
    const activeMatriculas = [];

    addLog('Atualizando base local de matrículas...');

    while (true) {
      const response = await ApiService.getHeadcountPage(offset, pageSize);
      const rows = Array.isArray(response.data) ? response.data : [];

      rows.forEach(saveHeadcountRow);
      activeMatriculas.push(...rows.map((row) => row.matricula));
      total += rows.length;

      if (rows.length < pageSize) break;
      offset += pageSize;
    }

    deactivateMissingHeadcountRows(activeMatriculas);
    set({ lastHeadcountCount: total });
    addLog(`Headcount local atualizado: ${total} colaboradores ativos.`);
  },

  async _pullForms() {
    const { addLog } = get();

    try {
      addLog('Baixando formulários do servidor central...');
      const response = await ApiService.getFormularios();
      const forms = Array.isArray(response.data) ? response.data : [];

      forms.forEach((form) => {
        const remoteVersion = Number(form.versao || 1);
        const localForm = AppDatabase.getFirst('SELECT versao FROM formularios WHERE id = ?', [form.id]);
        const localVersion = Number(localForm?.versao || 0);

        if (localVersion > remoteVersion) {
          addLog(`Formulario ${form.id} preservado localmente: app v${localVersion}, servidor v${remoteVersion}.`);
          return;
        }

        AppDatabase.run(
          'INSERT OR REPLACE INTO formularios (id, area_id, titulo, descricao, versao, ativo, campos_json, atualizado_em) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
          [
            form.id,
            form.area_id,
            form.titulo,
            form.descricao,
            remoteVersion,
            stringifyCamposJson(form.campos !== undefined ? form.campos : form.campos_json),
            new Date().toISOString(),
          ]
        );
      });

      addLog(`Formulários locais atualizados: ${forms.length}.`);
    } catch (e) {
      addLog(`Formulários não atualizados: ${e.message}. Usando cópias offline.`);
    }
  },

  async _pullAppConfig() {
    const { addLog } = get();

    try {
      const response = await ApiService.getMobileAppConfig();
      const config = Array.isArray(response.data) ? response.data[0] : null;
      if (!config) return null;

      await SecureStoreService.setItem('mobile_app_config', JSON.stringify(config));
      if (config.latest_version && config.latest_version !== AppConfig.appVersion) {
        addLog(`Nova versao disponivel: ${config.latest_version}. Atual: ${AppConfig.appVersion}.`);
      }
      return config;
    } catch (e) {
      addLog(`Config do app nao atualizada: ${e.message}`);
      return null;
    }
  },

  async _registerCloudIdentity() {
    const { addLog } = get();
    const userInfo = await getCurrentUserInfo();
    if (!userInfo) {
      addLog('Usuario local nao encontrado para vincular ao Supabase.');
      return null;
    }

    const devicePayload = await getDeviceRegistrationPayload(userInfo);
    await ApiService.upsertMobileUsuario(userInfo);
    await ApiService.touchMobileDispositivo(devicePayload);
    addLog(`Usuario ${userInfo.matricula || userInfo.userId} vinculado ao dispositivo.`);
    return { userInfo, devicePayload };
  },

  async _pullUserResponses() {
    const { addLog } = get();
    const userInfo = await getCurrentUserInfo();
    const usuarioId = userInfo?.userId || userInfo?.matricula;

    if (!usuarioId) {
      addLog('Restore ignorado: usuario local nao identificado.');
      return 0;
    }

    addLog('Restaurando coletas do usuario no Supabase...');
    const response = await ApiService.getUserResponses(usuarioId);
    const remoteRows = Array.isArray(response.data) ? response.data : [];
    const responseIds = remoteRows.map((item) => item.id).filter(Boolean);

    let restoredCount = 0;
    remoteRows.forEach((remoteRow) => {
      const localResponse = AppDatabase.getFirst('SELECT * FROM respostas WHERE id = ?', [remoteRow.id]);
      if (shouldPreserveLocalResponse(localResponse)) return;

      AppDatabase.insert('respostas', {
        id: remoteRow.id,
        formulario_id: remoteRow.formulario_id,
        usuario_id: remoteRow.usuario_id || usuarioId,
        dados_json: JSON.stringify(normalizeRemoteResponseDados(remoteRow)),
        status: mapRemoteStatusToLocal(remoteRow.status),
        criado_em: remoteRow.criado_em || remoteRow.enviado_em || remoteRow.recebido_em || new Date().toISOString(),
        enviado_em: remoteRow.enviado_em || remoteRow.recebido_em || null,
        erro_msg: remoteRow.erro_msg || null,
        tentativas: remoteRow.tentativas || 0,
      });

      AppDatabase.run('DELETE FROM sync_queue WHERE referencia_id = ?', [remoteRow.id]);
      restoredCount++;
    });

    if (responseIds.length > 0) {
      try {
        const gpsResponse = await ApiService.getGpsByResponseIds(responseIds);
        const gpsRows = Array.isArray(gpsResponse.data) ? gpsResponse.data : [];
        gpsRows.forEach((point) => {
          AppDatabase.insert('gps', {
            id: point.id,
            resposta_id: point.resposta_id,
            campo_id: point.campo_id,
            latitude: point.latitude,
            longitude: point.longitude,
            precisao: point.precisao,
            altitude: point.altitude,
            capturado_em: point.capturado_em || new Date().toISOString(),
          });
        });
      } catch (error) {
        addLog(`GPS remoto nao restaurado: ${error.message}`);
      }

      try {
        const anexosResponse = await ApiService.getAnexosByResponseIds(responseIds);
        const anexosRows = Array.isArray(anexosResponse.data) ? anexosResponse.data : [];
        anexosRows.forEach((anexo) => {
          AppDatabase.insert('anexos', {
            id: anexo.id,
            resposta_id: anexo.resposta_id,
            campo_id: anexo.campo_id,
            caminho_local: anexo.storage_path,
            nome_arquivo: anexo.nome_arquivo || 'anexo_remoto',
            tamanho_bytes: anexo.tamanho_bytes || 0,
            tipo_mime: anexo.tipo_mime || 'application/octet-stream',
            enviado: 1,
            criado_em: anexo.criado_em || new Date().toISOString(),
          });
        });
      } catch (error) {
        addLog(`Anexos remotos nao restaurados: ${error.message}`);
      }
    }

    addLog(`Restore concluido: ${restoredCount} coleta(s) localmente atualizada(s).`);
    return restoredCount;
  },

  async _syncLocalMediaBacklog() {
    const { addLog } = get();
    const responses = AppDatabase.getAll(
      `SELECT * FROM respostas
       WHERE status IN ('sincronizado', 'aprovado', 'pendente_validacao')
       ORDER BY criado_em DESC
       LIMIT 50`
    );

    let processedCount = 0;
    let gpsCount = 0;
    let attachmentCount = 0;
    let pendingCount = 0;

    for (const response of responses) {
      const { payload, pendingAnexos, localGps } = buildLocalMediaPayload(response);
      if (pendingAnexos.length === 0) continue;

      try {
        addLog(`Reenviando midias locais da coleta ${response.id.substring(0, 8)}...`);
        const gpsResult = localGps.length > 0
          ? await ApiService.syncGpsPontos([payload])
          : { count: 0 };
        const attachmentResult = await ApiService.syncAnexosMetadata([payload]);

        if (attachmentResult.count > 0) {
          AppDatabase.run('UPDATE anexos SET enviado = 1 WHERE resposta_id = ?', [response.id]);
        }

        processedCount++;
        gpsCount += gpsResult.count || 0;
        attachmentCount += attachmentResult.count || 0;
      } catch (error) {
        pendingCount++;
        addLog(`Midias da coleta ${response.id.substring(0, 8)} seguem pendentes: ${describeSyncError(error)}`);
      }
    }

    if (processedCount > 0) {
      addLog(`Midias locais reenviadas: ${attachmentCount} anexo(s), ${gpsCount} ponto(s) GPS.`);
    }
    if (pendingCount > 0) {
      addLog(`${pendingCount} coleta(s) continuam com fotos pendentes para nova tentativa.`);
    }

    return { processedCount, gpsCount, attachmentCount, pendingCount };
  },

  async runSync(forceSimulate = false, options = {}) {
    const { isSyncing, addLog, loadQueue } = get();
    if (isSyncing) return;
    const targetQueueId = options?.queueItemId || null;

    set({ isSyncing: true, syncStatusText: 'Iniciando sincronização...' });
    addLog(targetQueueId ? 'Iniciando sincronização individual...' : 'Iniciando processo de sincronização...');

    try {
      await loadQueue();
      const pendingQueue = get().queue.filter((item) => (
        item.status === 'pendente' || item.status === 'erro' || item.status === 'enviando'
      ));
      const currentQueue = targetQueueId
        ? pendingQueue.filter((item) => item.id === targetQueueId)
        : pendingQueue;

      const netState = await NetInfo.fetch();
      const hasInternet = Boolean(netState.isConnected) && netState.isInternetReachable !== false;

      if (!hasInternet && !forceSimulate) {
        addLog('Sem conexão com a internet. Sincronização abortada.');
        set({ isSyncing: false, syncStatusText: 'Erro: sem conexão' });
        return { successCount: 0, errorCount: currentQueue.length, skipped: true, targetQueueId };
      }

      if (forceSimulate) {
        addLog('Modo de simulação ativado.');
        return await get()._executeSimulatedSync(currentQueue);
      }

      let successCount = 0;
      let errorCount = 0;
      let restoredCount = 0;
      let mediaResentCount = 0;
      let mediaPendingCount = 0;
      let identityContext = null;

      try {
        identityContext = await get()._registerCloudIdentity();
      } catch (e) {
        const message = describeSyncError(e);
        if (isMissingOptionalSupabaseTable(e)) {
          addLog(`Vinculo usuario/aparelho ignorado: tabela opcional ausente (${message}).`);
        } else {
          addLog(`Erro ao vincular usuario/aparelho: ${message}`);
        }
      }

      if (!targetQueueId) {
        try {
          await get()._pullHeadcount();
        } catch (e) {
          errorCount++;
          addLog(`Erro ao atualizar headcount: ${e.message}`);
          const seeded = get().seedHeadcountLocal();
          addLog(`Headcount inicial aplicado localmente: ${seeded} colaboradores.`);
        }
      }

      if (currentQueue.length === 0) {
        addLog('Nenhum registro pendente na fila.');
      } else {
        addLog(`Total de registros pendentes: ${currentQueue.length}`);
      }

      for (const item of currentQueue) {
        try {
          addLog(`Enviando item ${item.tipo} (${item.referencia_id.substring(0, 8)})...`);

          AppDatabase.run("UPDATE sync_queue SET status = 'enviando' WHERE id = ?", [item.id]);

          if (item.tipo === 'resposta') {
            const payload = JSON.parse(item.payload_json);
            if (identityContext?.devicePayload?.id) {
              payload.dispositivo_id = identityContext.devicePayload.id;
            }
            const syncResponse = await ApiService.syncRespostas([payload]);
            const mediaResults = syncResponse?.syncResults || {};
            const blockingMediaErrors = Array.isArray(mediaResults.mediaBlockingErrors)
              ? mediaResults.mediaBlockingErrors.filter(Boolean)
              : [];

            (mediaResults.warnings || []).forEach((warning) => {
              addLog(`Aviso no item (${item.referencia_id.substring(0, 8)}): ${warning}`);
            });

            if (blockingMediaErrors.length > 0) {
              mediaPendingCount++;
              addLog(`Item (${item.referencia_id.substring(0, 8)}) enviado; midias ficaram pendentes para nova tentativa.`);
            }

            if (mediaResults.attachmentCount > 0) {
              AppDatabase.run('UPDATE anexos SET enviado = 1 WHERE resposta_id = ?', [item.referencia_id]);
            }

            AppDatabase.run(
              "UPDATE respostas SET status = 'sincronizado', enviado_em = ? WHERE id = ?",
              [new Date().toISOString(), item.referencia_id]
            );
          } else if (item.tipo === 'anexo') {
            addLog('Anexo mantido dentro do JSON da coleta. Upload separado ignorado.');
            AppDatabase.run('UPDATE anexos SET enviado = 1 WHERE resposta_id = ?', [item.referencia_id]);
            AppDatabase.run(
              "UPDATE respostas SET status = 'sincronizado', enviado_em = COALESCE(enviado_em, ?) WHERE id = ? AND status = 'erro'",
              [new Date().toISOString(), item.referencia_id]
            );
          }

          AppDatabase.run(
            "UPDATE sync_queue SET status = 'sincronizado', processado_em = ? WHERE id = ?",
            [new Date().toISOString(), item.id]
          );

          addLog(`Item (${item.referencia_id.substring(0, 8)}) sincronizado com sucesso.`);
          successCount++;
        } catch (e) {
          errorCount++;
          const message = describeSyncError(e);
          addLog(`Erro no item (${item.referencia_id.substring(0, 8)}): ${message}`);

          AppDatabase.run(
            "UPDATE sync_queue SET status = 'erro', tentativas = tentativas + 1, erro_msg = ? WHERE id = ?",
            [message, item.id]
          );

          if (item.tipo === 'resposta') {
            AppDatabase.run(
              "UPDATE respostas SET status = 'erro', erro_msg = ? WHERE id = ?",
              [message, item.referencia_id]
            );
          }
        }
      }

      if (!targetQueueId) {
        try {
          const mediaBacklog = await get()._syncLocalMediaBacklog();
          mediaResentCount = mediaBacklog.attachmentCount || 0;
          mediaPendingCount += mediaBacklog.pendingCount || 0;
        } catch (e) {
          errorCount++;
          addLog(`Midias locais nao reenviadas: ${describeSyncError(e)}`);
        }
      }

      if (!targetQueueId) {
        await get()._pullForms();
        await get()._pullAppConfig();
      }

      if (!targetQueueId) {
        try {
          restoredCount = await get()._pullUserResponses();
        } catch (e) {
          addLog(`Restore remoto ignorado nesta sincronizacao: ${describeSyncError(e)}`);
        }
      }

      const formattedDate = formatSyncDate();
      await SecureStoreService.setItem('last_sync_time', formattedDate);
      await ApiService.logMobileSync({
        status: errorCount === 0 ? 'sucesso' : 'falha_parcial',
        mensagem: `${successCount} envio(s), ${mediaResentCount} anexo(s) reenviado(s), ${mediaPendingCount} pendencia(s) de midia, ${restoredCount} restaurado(s), ${errorCount} erro(s).`,
        dispositivoId: identityContext?.devicePayload?.id || null,
      });

      addLog(`Sincronização concluída: ${successCount} sucessos, ${mediaResentCount} anexos reenviados, ${mediaPendingCount} pendências de mídia, ${restoredCount} restauradas, ${errorCount} falhas.`);
      await loadQueue();
      set({
        isSyncing: false,
        syncStatusText: errorCount === 0
          ? (mediaPendingCount > 0 ? 'Sincronizado, fotos pendentes' : 'Sincronizado')
          : 'Concluído com falhas',
        lastSyncLabel: formattedDate,
      });
      return { successCount, errorCount, restoredCount, mediaPendingCount, targetQueueId };
    } catch (e) {
      addLog(`Sincronização interrompida: ${e.message}`);
      set({ isSyncing: false, syncStatusText: 'Erro na sincronização' });
      return { successCount: 0, errorCount: 1, fatal: true };
    }
  },

  async _executeSimulatedSync(currentQueue) {
    const { addLog, loadQueue } = get();

    if (currentQueue.length === 0) {
      addLog('Nenhum registro pendente para simular.');
    }

    for (const item of currentQueue) {
      addLog(`Simulando envio de ${item.tipo} (${item.referencia_id.substring(0, 8)})...`);
      await new Promise((resolve) => setTimeout(resolve, 800));

      AppDatabase.run(
        "UPDATE sync_queue SET status = 'sincronizado', processado_em = ? WHERE id = ?",
        [new Date().toISOString(), item.id]
      );

      if (item.tipo === 'resposta') {
        AppDatabase.run(
          "UPDATE respostas SET status = 'sincronizado', enviado_em = ? WHERE id = ?",
          [new Date().toISOString(), item.referencia_id]
        );
      } else if (item.tipo === 'anexo') {
        AppDatabase.run('UPDATE anexos SET enviado = 1 WHERE resposta_id = ?', [item.referencia_id]);
      }

      addLog(`Item (${item.referencia_id.substring(0, 8)}) simulado com sucesso.`);
    }

    const formattedDate = formatSyncDate();
    await SecureStoreService.setItem('last_sync_time', formattedDate);

    addLog('Simulação concluída.');
    await loadQueue();
    set({
      isSyncing: false,
      syncStatusText: 'Simulado com sucesso',
      lastSyncLabel: formattedDate,
    });
    return { successCount: currentQueue.length, errorCount: 0, simulated: true };
  },
}));
