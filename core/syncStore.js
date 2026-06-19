import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';
import { ApiService } from './api';
import { AppDatabase } from './database';
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
        AppDatabase.run(
          'INSERT OR REPLACE INTO formularios (id, area_id, titulo, descricao, versao, ativo, campos_json, atualizado_em) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
          [
            form.id,
            form.area_id,
            form.titulo,
            form.descricao,
            form.versao || 1,
            JSON.stringify(form.campos || form.campos_json || []),
            new Date().toISOString(),
          ]
        );
      });

      addLog(`Formulários locais atualizados: ${forms.length}.`);
    } catch (e) {
      addLog(`Formulários não atualizados: ${e.message}. Usando cópias offline.`);
    }
  },

  async runSync(forceSimulate = false) {
    const { isSyncing, addLog, loadQueue } = get();
    if (isSyncing) return;

    set({ isSyncing: true, syncStatusText: 'Iniciando sincronização...' });
    addLog('Iniciando processo de sincronização...');

    await loadQueue();
    const currentQueue = get().queue.filter((item) => (
      item.status === 'pendente' || item.status === 'erro'
    ));

    const netState = await NetInfo.fetch();
    const hasInternet = Boolean(netState.isConnected) && netState.isInternetReachable !== false;

    if (!hasInternet && !forceSimulate) {
      addLog('Sem conexão com a internet. Sincronização abortada.');
      set({ isSyncing: false, syncStatusText: 'Erro: sem conexão' });
      return { successCount: 0, errorCount: currentQueue.length, skipped: true };
    }

    if (forceSimulate) {
      addLog('Modo de simulação ativado.');
      return await get()._executeSimulatedSync(currentQueue);
    }

    let successCount = 0;
    let errorCount = 0;

    try {
      await get()._pullHeadcount();
    } catch (e) {
      errorCount++;
      addLog(`Erro ao atualizar headcount: ${e.message}`);
      const seeded = get().seedHeadcountLocal();
      addLog(`Headcount inicial aplicado localmente: ${seeded} colaboradores.`);
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
          await ApiService.syncRespostas([payload]);

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
        addLog(`Erro no item (${item.referencia_id.substring(0, 8)}): ${e.message}`);

        AppDatabase.run(
          "UPDATE sync_queue SET status = 'erro', tentativas = tentativas + 1, erro_msg = ? WHERE id = ?",
          [e.message, item.id]
        );

        if (item.tipo === 'resposta') {
          AppDatabase.run(
            "UPDATE respostas SET status = 'erro', erro_msg = ? WHERE id = ?",
            [e.message, item.referencia_id]
          );
        }
      }
    }

    await get()._pullForms();

    const formattedDate = formatSyncDate();
    await SecureStoreService.setItem('last_sync_time', formattedDate);

    addLog(`Sincronização concluída: ${successCount} sucessos, ${errorCount} falhas.`);
    await loadQueue();
    set({
      isSyncing: false,
      syncStatusText: errorCount === 0 ? 'Sincronizado' : 'Concluído com falhas',
      lastSyncLabel: formattedDate,
    });
    return { successCount, errorCount };
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
