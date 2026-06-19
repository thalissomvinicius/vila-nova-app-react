import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { AppDatabase } from '../core/database';
import { isDateInMonth } from '../core/dateUtils';
import { useSyncStore } from '../core/syncStore';
import { Colors } from '../core/colors';
import { Chip, IconBox, ScreenShell, chromeStyles } from '../components/PrototypeChrome';

const PENDING_QUEUE_STATUSES = new Set(['pendente', 'erro', 'enviando']);

function isPendingQueueItem(item) {
  return item.tipo !== 'anexo' && PENDING_QUEUE_STATUSES.has(item.status);
}

export default function Home() {
  const router = useRouter();
  const { queue, isQueueLoading, lastSyncLabel, loadQueue } = useSyncStore();
  const [refreshing, setRefreshing] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, synced: 0, pending: 0, failed: 0 });
  const [isOnline, setIsOnline] = useState(true);

  const fetchHomeData = useCallback(async () => {
    setIsSummaryLoading(true);
    try {
      await loadQueue();
      const respostas = AppDatabase.getAll('SELECT * FROM respostas ORDER BY criado_em DESC');
      const monthRespostas = respostas.filter((item) => isDateInMonth(item.criado_em));
      const synced = monthRespostas.filter((item) => item.status === 'sincronizado').length;
      const failed = monthRespostas.filter((item) => item.status === 'erro').length;
      const pending = monthRespostas.filter((item) => item.status === 'pendente').length;

      setSummary({
        total: monthRespostas.length,
        synced,
        pending,
        failed,
      });
    } catch (_) {
      const latestQueue = useSyncStore.getState().queue;
      setSummary({ total: 0, synced: 0, pending: latestQueue.filter(isPendingQueueItem).length, failed: 0 });
    } finally {
      setIsSummaryLoading(false);
    }
  }, [loadQueue, queue.length]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  useEffect(() => {
    const applyNetworkState = (state) => {
      setIsOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    };

    NetInfo.fetch().then(applyNetworkState);
    const unsubscribe = NetInfo.addEventListener(applyNetworkState);
    return () => unsubscribe();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHomeData();
    setRefreshing(false);
  };

  const isDataLoading = isSummaryLoading || isQueueLoading;
  const syncRatio = Math.min(100, Math.round((summary.synced / Math.max(summary.total, 1)) * 100));
  const pendingQueueCount = queue.filter(isPendingQueueItem).length;
  const today = new Date();
  const operationDate = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  const currentMonth = today.toLocaleDateString('pt-BR', { month: 'long' });

  return (
    <ScreenShell title="Operação de Campo" activeNav="home">
      <StatusBar barStyle="dark-content" backgroundColor="#F7FAF6" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.greenInstitutional]} />}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Chip>{isOnline ? 'Online' : 'Offline pronto'}</Chip>
            <Text style={styles.statusPeriod}>{currentMonth}</Text>
          </View>

          <View style={styles.statusMain}>
            <View style={styles.statusTextBlock}>
              <Text style={styles.statusTitle}>Resumo mensal</Text>
              {isDataLoading ? (
                <View style={styles.statusLoadingLine}>
                  <ActivityIndicator color={Colors.white} size="small" />
                  <Text style={styles.statusLoadingText}>Carregando</Text>
                </View>
              ) : (
                <Text style={styles.statusNumber}>{summary.total}</Text>
              )}
              <Text style={styles.statusCaption}>coletas registradas</Text>
            </View>
            <View style={styles.ring}>
              {isDataLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.ringValue}>{syncRatio}%</Text>}
              <Text style={styles.ringLabel}>sinc.</Text>
            </View>
          </View>

          <View style={styles.metrics}>
            <View style={styles.metricBox}>
              {isDataLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.metricNumber}>{summary.synced}</Text>}
              <Text style={styles.metricLabel}>sincronizadas</Text>
            </View>
            <View style={styles.metricBox}>
              {isDataLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.metricNumber}>{summary.failed}</Text>}
              <Text style={styles.metricLabel}>não sinc.</Text>
            </View>
            <View style={styles.metricBox}>
              {isDataLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.metricNumber}>{summary.pending}</Text>}
              <Text style={styles.metricLabel}>pendentes</Text>
            </View>
          </View>

          <View style={styles.statusFooter}>
            <Text style={styles.statusFooterText}>Última sinc. {lastSyncLabel}</Text>
            <Text style={styles.statusFooterText}>Modo local ativo</Text>
          </View>
        </View>

        <View style={styles.overview}>
          <View style={styles.overviewCard}>
            <IconBox name="calendar-month-outline" />
            <View style={styles.overviewText}>
              <Text style={styles.overviewLabel}>Operação</Text>
              <Text style={styles.overviewValue}>{operationDate}</Text>
            </View>
          </View>
          <View style={styles.overviewCard}>
            <IconBox name="axis-arrow" amber />
            <View style={styles.overviewText}>
              <Text style={styles.overviewLabel}>Fila local</Text>
              <Text style={styles.overviewValue}>
                {isQueueLoading ? 'Carregando...' : `${pendingQueueCount} pendentes`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction icon="format-list-bulleted" label="Formulários" onPress={() => router.push('/formularios/campo')} />
          <QuickAction icon="history" label="Histórico" onPress={() => router.push('/historico')} />
          <QuickAction icon="sync" label="Sinc." onPress={() => router.push('/sync')} />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={Colors.greenDark} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: chromeStyles.screenPadding,
    paddingBottom: chromeStyles.bottomPadding,
  },
  statusCard: {
    overflow: 'hidden',
    gap: 15,
    padding: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    backgroundColor: Colors.greenInstitutional,
    shadowColor: Colors.greenInstitutional,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    elevation: 5,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPeriod: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '900',
  },
  statusMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusTextBlock: {
    flex: 1,
  },
  statusTitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    fontWeight: '700',
  },
  statusNumber: {
    color: Colors.white,
    fontSize: 54,
    lineHeight: 58,
    fontWeight: '900',
    marginTop: 3,
  },
  statusLoadingLine: {
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 3,
  },
  statusLoadingText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '900',
  },
  statusCaption: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    fontWeight: '700',
  },
  ring: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  ringValue: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  ringLabel: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 10,
    fontWeight: '900',
    marginTop: -2,
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  metricNumber: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: '900',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  statusFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.13)',
  },
  statusFooterText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '800',
  },
  overview: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  overviewCard: {
    flex: 1,
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(32,49,37,0.08)',
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  overviewText: {
    flex: 1,
    minWidth: 0,
  },
  overviewLabel: {
    color: Colors.grayText,
    fontSize: 11,
    fontWeight: '900',
  },
  overviewValue: {
    color: '#17221B',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  quickAction: {
    flex: 1,
    minHeight: 96,
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(32,49,37,0.08)',
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  quickIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.greenLight,
  },
  quickLabel: {
    color: Colors.grayDark,
    fontSize: 13,
    fontWeight: '900',
  },
});
