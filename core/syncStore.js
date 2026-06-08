import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { AppDatabase } from './database';
import { ApiService } from './api';

export const useSyncStore = create((set, get) => ({
  queue: [],
  logs: [],
  isSyncing: false,
  syncStatusText: 'Aguardando ação',
  lastSyncLabel: 'Nunca sincronizado',

  addLog(message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    set((state) => ({
      logs: [...state.logs, `[${timestamp}] ${message}`],
    }));
  },

  clearLogs() {
    set({ logs: [] });
  },

  async loadQueue() {
    try {
      const results = AppDatabase.getAll(
        "SELECT * FROM sync_queue WHERE status = 'pendente' OR status = 'erro' ORDER BY criado_em ASC"
      );
      set({ queue: results });

      const lastSync = await SecureStore.getItemAsync('last_sync_time');
      if (lastSync) {
        set({ lastSyncLabel: lastSync });
      }
    } catch (e) {
      get().addLog(`Erro ao carregar fila: ${e.message}`);
    }
  },

  async runSync(forceSimulate = false) {
    const { isSyncing, queue, addLog, loadQueue } = get();
    if (isSyncing) return;

    set({ isSyncing: true, syncStatusText: 'Iniciando sincronização...' });
    addLog('Iniciando processo de sincronização...');

    await loadQueue();
    const currentQueue = get().queue;

    if (currentQueue.length === 0) {
      addLog('Nenhum registro pendente na fila.');
      set({ isSyncing: false, syncStatusText: 'Fila vazia' });
      return;
    }

    addLog(`Total de registros pendentes: ${currentQueue.length}`);

    // Check connectivity
    const netState = await NetInfo.fetch();
    const hasInternet = netState.isConnected;

    if (!hasInternet && !forceSimulate) {
      addLog('Sem conexão com a internet. Sincronização abortada.');
      set({ isSyncing: false, syncStatusText: 'Erro: Sem Conexão' });
      return;
    }

    if (forceSimulate) {
      addLog('⚠ MODO DE SIMULAÇÃO ATIVADO ⚠');
      await get()._executeSimulatedSync(currentQueue);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of currentQueue) {
      try {
        addLog(`Enviando item ${item.tipo} (${item.referencia_id.substring(0, 8)})...`);
        
        // Update item status to "enviando"
        AppDatabase.run("UPDATE sync_queue SET status = 'enviando' WHERE id = ?", [item.id]);

        if (item.tipo === 'resposta') {
          const payload = JSON.parse(item.payload_json);
          await ApiService.syncRespostas([payload]);

          // Update local response table
          AppDatabase.run(
            "UPDATE respostas SET status = 'sincronizado', enviado_em = ? WHERE id = ?",
            [new Date().toISOString(), item.referencia_id]
          );
        } else if (item.tipo === 'anexo') {
          const payload = JSON.parse(item.payload_json);
          await ApiService.syncAnexo(item.referencia_id, payload.caminho_local);

          // Update local attachments table
          AppDatabase.run(
            "UPDATE anexos SET enviado = 1 WHERE resposta_id = ? AND caminho_local = ?",
            [item.referencia_id, payload.caminho_local]
          );
        }

        // Success: Update queue status
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

        AppDatabase.run(
          "UPDATE respostas SET status = 'erro', erro_msg = ? WHERE id = ?",
          [e.message, item.referencia_id]
        );
      }
    }

    // Pull forms update from central API
    try {
      addLog('Baixando novos formulários do servidor central...');
      const response = await ApiService.getFormularios();
      const forms = response.data;
      
      for (const form of forms) {
        AppDatabase.run(
          'INSERT OR REPLACE INTO formularios (id, area_id, titulo, descricao, versao, ativo, campos_json, atualizado_em) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
          [form.id, form.area_id, form.titulo, form.descricao, form.versao, JSON.stringify(form.campos), new Date().toISOString()]
        );
      }
      addLog('Formulários locais atualizados.');
    } catch (e) {
      addLog(`Erro ao puxar novos formulários: ${e.message} (Utilizando cópias offline)`);
    }

    const formattedDate = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    await SecureStore.setItemAsync('last_sync_time', formattedDate);

    addLog(`Sincronização concluída: ${successCount} sucessos, ${errorCount} falhas.`);
    await loadQueue();
    set({
      isSyncing: false,
      syncStatusText: errorCount === 0 ? 'Sincronizado' : 'Concluído com falhas',
      lastSyncLabel: formattedDate,
    });
  },

  async _executeSimulatedSync(currentQueue) {
    const { addLog, loadQueue } = get();

    for (const item of currentQueue) {
      addLog(`Simulando envio de ${item.tipo} (${item.referencia_id.substring(0, 8)})...`);
      
      // Delay to simulate network transmission
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
        AppDatabase.run(
          "UPDATE anexos SET enviado = 1 WHERE resposta_id = ?",
          [item.referencia_id]
        );
      }

      addLog(`Item (${item.referencia_id.substring(0, 8)}) simulado com sucesso.`);
    }

    const formattedDate = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    
    await SecureStore.setItemAsync('last_sync_time', formattedDate);

    addLog('Sincronização simulada com sucesso!');
    await loadQueue();
    set({
      isSyncing: false,
      syncStatusText: 'Simulado com sucesso',
      lastSyncLabel: formattedDate,
    });
  }
}));
