import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSyncStore } from '../core/syncStore';
import { useAuthStore } from '../core/authStore';
import { Colors } from '../core/colors';

export default function Sync() {
  const router = useRouter();
  const { queue, logs, isSyncing, syncStatusText, runSync, clearLogs, loadQueue } = useSyncStore();

  const flatListRef = useRef(null);
  const logScrollRef = useRef(null);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Auto scroll terminal logs to bottom on update
  useEffect(() => {
    if (logScrollRef.current) {
      setTimeout(() => {
        logScrollRef.current.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [logs]);

  const handleSync = async (forceSimulate = false) => {
    await runSync(forceSimulate);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'enviando': return '🔄';
      case 'erro': return '⚠️';
      case 'pendente':
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'enviando': return Colors.greenInstitutional;
      case 'erro': return Colors.danger;
      case 'pendente':
      default:
        return Colors.warning;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Central de Sync',
          headerRight: () => (
            <TouchableOpacity onPress={clearLogs} style={styles.headerRightBtn}>
              <Text style={styles.headerRightText}>Limpar</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <StatusBar barStyle="light-content" backgroundColor={Colors.greenDark} />

      {/* Sync Queue Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryTextContainer}>
          <Text style={styles.summaryLabel}>Registros na Fila</Text>
          <Text style={styles.summaryCount}>{queue.length} pendentes</Text>
        </View>
        <Text style={styles.summaryLargeIcon}>
          {isSyncing ? '🔄' : queue.length === 0 ? '☁️' : '📤'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.syncBtn, isSyncing ? styles.btnDisabled : null]}
          onPress={() => handleSync(false)}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Text style={styles.syncBtnIcon}>🔄</Text>
              <Text style={styles.syncBtnText}>Sincronizar</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.simulateBtn, isSyncing ? styles.btnDisabled : null]}
          onPress={() => handleSync(true)}
          disabled={isSyncing}
        >
          <Text style={styles.simulateBtnIcon}>▶</Text>
          <Text style={styles.simulateBtnText}>Simular Envio</Text>
        </TouchableOpacity>
      </View>

      {/* Queue Items List */}
      <View style={styles.queueContainer}>
        <Text style={styles.sectionTitle}>Fila de Envio ({queue.length})</Text>
        {queue.length === 0 ? (
          <View style={styles.emptyQueue}>
            <Text style={styles.emptyIcon}>☁️</Text>
            <Text style={styles.emptyTitle}>Nenhuma coleta pendente</Text>
            <Text style={styles.emptyText}>
              Todos os registros foram transmitidos com sucesso ao servidor central.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={queue}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.queueList}
            renderItem={({ item }) => (
              <View style={styles.queueCard}>
                <View
                  style={[
                    styles.statusBadgeDot,
                    { backgroundColor: getStatusColor(item.status) + '15' },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{getStatusIcon(item.status)}</Text>
                </View>
                <View style={styles.queueCardDetails}>
                  <Text style={styles.queueCardTitle}>
                    {item.tipo === 'resposta' ? 'Ficha de Coleta' : 'Anexo de Evidência'}
                  </Text>
                  <Text style={styles.queueCardSub}>
                    ID: {item.referencia_id.substring(0, 8)}... | Tentativas: {item.tentativas}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.queueCardStatus,
                    { color: getStatusColor(item.status) },
                  ]}
                >
                  {item.status.toUpperCase()}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Visual Terminal Logs */}
      <View style={styles.terminalHeader}>
        <Text style={styles.terminalHeaderTitle}>🐚 CONSOLE DE TRANSMISSÃO</Text>
      </View>
      <View style={styles.terminal}>
        <ScrollView
          ref={logScrollRef}
          contentContainerStyle={styles.terminalScroll}
        >
          {logs.length === 0 ? (
            <Text style={styles.idleTerminalText}>
              Console ocioso. Aguardando sincronização...
            </Text>
          ) : (
            logs.map((logLine, index) => {
              let logColor = '#10B981'; // Default Green
              if (logLine.includes('Erro') || logLine.includes('Falha')) {
                logColor = '#EF4444'; // Red
              } else if (logLine.includes('⚠') || logLine.includes('Simulação')) {
                logColor = '#F59E0B'; // Amber
              }
              return (
                <Text key={index} style={[styles.terminalText, { color: logColor }]}>
                  {logLine}
                </Text>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRightBtn: {
    paddingHorizontal: 8,
  },
  headerRightText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.grayText,
    textTransform: 'uppercase',
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.grayDark,
    marginTop: 4,
  },
  summaryLargeIcon: {
    fontSize: 36,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  syncBtn: {
    flex: 1,
    backgroundColor: Colors.greenInstitutional,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  syncBtnIcon: {
    color: Colors.white,
    fontSize: 16,
    marginRight: 6,
  },
  syncBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
  },
  simulateBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.greenInstitutional,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  simulateBtnIcon: {
    color: Colors.greenInstitutional,
    fontSize: 12,
    marginRight: 6,
  },
  simulateBtnText: {
    color: Colors.greenInstitutional,
    fontWeight: '800',
    fontSize: 15,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  queueContainer: {
    flex: 3,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.grayDark,
    marginBottom: 12,
  },
  queueList: {
    paddingBottom: 16,
  },
  queueCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadgeDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  queueCardDetails: {
    flex: 1,
  },
  queueCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.grayDark,
  },
  queueCardSub: {
    fontSize: 11,
    color: Colors.grayText,
    marginTop: 2,
  },
  queueCardStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyQueue: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.3,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.grayDark,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.grayText,
    textAlign: 'center',
    lineHeight: 18,
  },
  terminalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  terminalHeaderTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
  },
  terminal: {
    flex: 2,
    backgroundColor: '#0F172A',
    marginHorizontal: 16,
    marginBottom: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  terminalScroll: {
    padding: 16,
  },
  idleTerminalText: {
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  terminalText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
});
