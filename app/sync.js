import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import { Colors } from '../core/colors';
import { AppDatabase } from '../core/database';
import { useSyncStore } from '../core/syncStore';
import { Chip, ScreenShell, chromeStyles } from '../components/PrototypeChrome';

export default function Sync() {
  const router = useRouter();
  const {
    queue,
    isSyncing,
    isQueueLoading,
    runSync,
    loadQueue,
    lastSyncLabel,
  } = useSyncStore();
  const [isOnline, setIsOnline] = useState(true);
  const [syncNotice, setSyncNotice] = useState(null);
  const spinValue = React.useRef(new Animated.Value(0)).current;
  const pulseValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadQueue();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOnline = Boolean(state.isConnected) && state.isInternetReachable !== false;
      setIsOnline(nextOnline);
      if (nextOnline) {
        loadQueue();
      }
    });
    return () => unsubscribe();
  }, [loadQueue]);

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: isSyncing ? 950 : 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    spinAnimation.start();
    pulseAnimation.start();
    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
    };
  }, [isSyncing, pulseValue, spinValue]);

  useEffect(() => {
    if (!syncNotice) return undefined;
    const timer = setTimeout(() => setSyncNotice(null), 5200);
    return () => clearTimeout(timer);
  }, [syncNotice]);

  const coletaQueue = queue.filter((item) => item.tipo !== 'anexo');
  const pendingItems = coletaQueue.filter((item) => item.status === 'pendente' || item.status === 'enviando');
  const failedItems = coletaQueue.filter((item) => item.status === 'erro');
  const sentItems = coletaQueue.filter((item) => item.status === 'sincronizado');
  const approvedItems = coletaQueue.filter((item) => item.status === 'aprovado');
  const rejectedItems = coletaQueue.filter((item) => item.status === 'reprovado');
  const history = coletaQueue.slice(0, 12);
  const syncPercent = coletaQueue.length === 0
    ? 100
    : Math.max(12, Math.round(((sentItems.length + approvedItems.length) / coletaQueue.length) * 100));
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const pulseScale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });
  const pulseOpacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.38, 0.08],
  });

  const editQueueItem = (item) => {
    const payload = parseQueuePayload(item);
    const resposta = item.referencia_id
      ? AppDatabase.getFirst('SELECT * FROM respostas WHERE id = ?', [item.referencia_id])
      : null;
    const formularioId = payload.formulario_id || resposta?.formulario_id;

    if (!formularioId || !item.referencia_id) {
      Alert.alert('Editar coleta', 'Nao foi possivel localizar o formulario desta coleta.');
      return;
    }

    router.push({
      pathname: `/preencher/${formularioId}`,
      params: {
        respostaId: item.referencia_id,
      },
    });
  };

  const deleteQueueItem = (item) => {
    const respostaId = item.referencia_id;
    if (!respostaId) return;

    Alert.alert(
      'Excluir coleta',
      'Deseja excluir esta coleta local e remover ela da fila de sincronizacao?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            AppDatabase.run('DELETE FROM sync_queue WHERE referencia_id = ?', [respostaId]);
            AppDatabase.run('DELETE FROM anexos WHERE resposta_id = ?', [respostaId]);
            AppDatabase.run('DELETE FROM gps WHERE resposta_id = ?', [respostaId]);
            AppDatabase.run('DELETE FROM assinaturas WHERE resposta_id = ?', [respostaId]);
            AppDatabase.run('DELETE FROM respostas WHERE id = ?', [respostaId]);
            loadQueue();
          },
        },
      ]
    );
  };

  const handleRunSync = async () => {
    const result = await runSync(false);
    if (!result) return;

    if (result.errorCount > 0) {
      setSyncNotice({
        type: 'error',
        title: 'Sincronizacao concluida com falhas',
        text: `${result.successCount || 0} enviada(s), ${result.errorCount} com erro.`,
      });
      return;
    }

    setSyncNotice({
      type: 'success',
      title: 'Coletas sincronizadas',
      text: result.successCount > 0
        ? `${result.successCount} coleta(s) enviada(s) com sucesso.`
        : 'Nao havia coletas pendentes para enviar.',
    });
  };

  return (
    <ScreenShell title="Sincronizacao" activeNav="sync" showBack>
      <StatusBar barStyle="dark-content" backgroundColor="#F7FAF6" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.syncPanel}>
          <View style={styles.syncHeader}>
            <View style={styles.syncHeaderText}>
              <Chip>{isOnline ? 'Online' : 'Sem internet'}</Chip>
              <Text style={styles.syncTitle}>Historico de sincronizacao</Text>
              <Text style={styles.syncDescription}>
                Dados locais atualizados ao reconectar. Ultima sinc.: {lastSyncLabel}.
              </Text>
            </View>
            <Animated.View style={[styles.syncOrbPulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
            <Animated.View style={[styles.syncOrb, { transform: [{ rotate: spin }] }]}>
              <MaterialCommunityIcons name="sync" size={30} color={Colors.white} />
            </Animated.View>
          </View>

          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${syncPercent}%` }]} />
          </View>

          <View style={styles.syncStats}>
            <View style={styles.statBox}>
              {isQueueLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.statNumber}>{pendingItems.length}</Text>}
              <Text style={styles.statLabel}>a enviar</Text>
            </View>
            <View style={styles.statBox}>
              {isQueueLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.statNumber}>{sentItems.length}</Text>}
              <Text style={styles.statLabel}>enviados</Text>
            </View>
            <View style={styles.statBox}>
              {isQueueLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.statNumber}>{approvedItems.length}</Text>}
              <Text style={styles.statLabel}>aprovados</Text>
            </View>
            <View style={styles.statBox}>
              {isQueueLoading ? <ActivityIndicator color={Colors.white} size="small" /> : <Text style={styles.statNumber}>{failedItems.length + rejectedItems.length}</Text>}
              <Text style={styles.statLabel}>reprovados</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryAction, isSyncing ? styles.disabled : null]}
            onPress={handleRunSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryActionText}>Sincronizar agora</Text>
            )}
          </TouchableOpacity>

          {syncNotice ? (
            <View style={[
              styles.syncNotice,
              syncNotice.type === 'error' ? styles.syncNoticeError : styles.syncNoticeSuccess,
            ]}>
              <MaterialCommunityIcons
                name={syncNotice.type === 'error' ? 'alert-circle-outline' : 'check-circle-outline'}
                size={21}
                color={syncNotice.type === 'error' ? '#9F1239' : Colors.greenDark}
              />
              <View style={styles.syncNoticeTextBox}>
                <Text style={[
                  styles.syncNoticeTitle,
                  syncNotice.type === 'error' ? styles.syncNoticeErrorText : styles.syncNoticeSuccessText,
                ]}>{syncNotice.title}</Text>
                <Text style={styles.syncNoticeText}>{syncNotice.text}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.queueList}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Historico</Text>
              <Text style={styles.sectionMeta}>{history.length} registros</Text>
            </View>
            {isQueueLoading ? (
              <View style={styles.emptyQueue}>
                <ActivityIndicator size="small" color={Colors.greenInstitutional} />
                <View style={styles.emptyQueueText}>
                  <Text style={styles.emptyQueueTitle}>Carregando historico</Text>
                  <Text style={styles.emptyQueueSub}>Lendo a fila local de sincronizacao.</Text>
                </View>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.emptyQueue}>
                <MaterialCommunityIcons name="check-circle-outline" size={28} color={Colors.greenInstitutional} />
                <View style={styles.emptyQueueText}>
                  <Text style={styles.emptyQueueTitle}>Sem historico local</Text>
                  <Text style={styles.emptyQueueSub}>Conecte a rede ou envie uma coleta para atualizar esta lista.</Text>
                </View>
              </View>
            ) : (
              history.map((item) => (
                <QueueItem
                  key={item.id}
                  status={getVisualStatus(item.status)}
                  label={getStatusLabel(item.status)}
                  code={item.referencia_id || item.id}
                  description={buildQueueDescription(item)}
                  onEdit={() => editQueueItem(item)}
                  onDelete={() => deleteQueueItem(item)}
                  onSync={handleRunSync}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function getStatusLabel(status) {
  if (status === 'sincronizado') return 'Enviado';
  if (status === 'aprovado') return 'Aprovado';
  if (status === 'reprovado') return 'Reprovado';
  if (status === 'erro') return 'Revisar';
  if (status === 'enviando') return 'A enviar';
  return 'A enviar';
}

function getVisualStatus(status) {
  if (status === 'sincronizado') return 'sent';
  if (status === 'aprovado') return 'approved';
  if (status === 'reprovado' || status === 'erro') return 'failed';
  if (status === 'enviando') return 'waiting';
  return 'waiting';
}

function formatShortDate(value) {
  if (!value) return 'sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildQueueDescription(item) {
  const dateLabel = formatShortDate(item.processado_em || item.criado_em);
  const attempts = item.tentativas ? ` - ${item.tentativas} tentativa(s)` : '';
  const error = item.erro_msg ? ` - ${item.erro_msg}` : '';
  return `${item.tipo || 'Coleta'} - ${dateLabel}${attempts}${error}`;
}

function parseQueuePayload(item) {
  try {
    return JSON.parse(item.payload_json || '{}');
  } catch (_) {
    return {};
  }
}

function QueueItem({ status, label, code, description, onEdit, onDelete, onSync }) {
  const canSync = status === 'waiting' || status === 'failed';
  const canEdit = status === 'waiting' || status === 'failed';

  return (
    <View style={[styles.queueItem, styles[`queue_${status}`]]}>
      <View style={styles.queueInfo}>
        <View style={[styles.queueBadge, styles[`badge_${status}`]]}>
          <Text style={[styles.queueBadgeText, styles[`badgeText_${status}`]]}>{label}</Text>
        </View>
        <Text style={styles.queueCode} numberOfLines={1}>{code}</Text>
        <Text style={styles.queueDesc} numberOfLines={1}>{description}</Text>
      </View>
      <View style={styles.queueActions}>
        {canEdit ? (
          <>
            <TouchableOpacity style={styles.secondarySmall} onPress={onEdit}>
              <Text style={styles.secondarySmallText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteSmall} onPress={onDelete}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color="#9F1239" />
            </TouchableOpacity>
          </>
        ) : null}
        <TouchableOpacity
          style={[styles.primarySmall, !canSync ? styles.disabledSmall : null]}
          onPress={onSync}
          disabled={!canSync}
        >
          <Text style={styles.primarySmallText}>Sinc.</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: chromeStyles.screenPadding,
    paddingBottom: chromeStyles.bottomPadding,
  },
  syncPanel: {
    overflow: 'hidden',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    backgroundColor: Colors.greenInstitutional,
    shadowColor: Colors.greenInstitutional,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 34,
    elevation: 5,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  syncHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  syncTitle: {
    color: Colors.white,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 9,
  },
  syncDescription: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 5,
  },
  syncOrbPulse: {
    position: 'absolute',
    right: 14,
    top: 9,
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: Colors.orangeHighlight,
  },
  syncOrb: {
    width: 74,
    height: 74,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 37,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  meter: {
    height: 9,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  meterFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: Colors.orangeHighlight,
  },
  syncStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  statNumber: {
    color: Colors.white,
    fontSize: 21,
    fontWeight: '900',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
  },
  primaryAction: {
    minHeight: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.orangeInstitutional,
  },
  primaryActionText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.65,
  },
  disabledSmall: {
    opacity: 0.45,
  },
  syncNotice: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  syncNoticeSuccess: {
    borderColor: 'rgba(31,122,77,0.28)',
  },
  syncNoticeError: {
    borderColor: 'rgba(159,18,57,0.24)',
  },
  syncNoticeTextBox: {
    flex: 1,
    minWidth: 0,
  },
  syncNoticeTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  syncNoticeSuccessText: {
    color: Colors.greenDark,
  },
  syncNoticeErrorText: {
    color: '#9F1239',
  },
  syncNoticeText: {
    color: Colors.grayText,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  queueList: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  sectionMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyQueue: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  emptyQueueText: {
    flex: 1,
    minWidth: 0,
  },
  emptyQueueTitle: {
    color: '#17221B',
    fontSize: 14,
    fontWeight: '900',
  },
  emptyQueueSub: {
    color: Colors.grayText,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  queueItem: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 80,
    padding: 12,
    paddingLeft: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  queue_ready: {
    borderLeftWidth: 5,
    borderLeftColor: Colors.greenInstitutional,
  },
  queue_sent: {
    borderLeftWidth: 5,
    borderLeftColor: Colors.info,
  },
  queue_approved: {
    borderLeftWidth: 5,
    borderLeftColor: Colors.success,
  },
  queue_waiting: {
    borderLeftWidth: 5,
    borderLeftColor: Colors.orangeInstitutional,
  },
  queue_failed: {
    borderLeftWidth: 5,
    borderLeftColor: Colors.danger,
  },
  queueInfo: {
    flex: 1,
    minWidth: 0,
  },
  queueBadge: {
    alignSelf: 'flex-start',
    minHeight: 22,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  badge_ready: {
    backgroundColor: Colors.greenLight,
  },
  badge_sent: {
    backgroundColor: Colors.infoLight,
  },
  badge_approved: {
    backgroundColor: Colors.successLight,
  },
  badge_waiting: {
    backgroundColor: Colors.orangeLight,
  },
  badge_failed: {
    backgroundColor: '#FFE4E6',
  },
  queueBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  badgeText_ready: {
    color: Colors.greenDark,
  },
  badgeText_sent: {
    color: '#1D4ED8',
  },
  badgeText_approved: {
    color: '#047857',
  },
  badgeText_waiting: {
    color: '#7B4A08',
  },
  badgeText_failed: {
    color: '#9F1239',
  },
  queueCode: {
    color: '#17221B',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 6,
  },
  queueDesc: {
    color: Colors.grayText,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  queueActions: {
    flexDirection: 'row',
    gap: 6,
  },
  secondarySmall: {
    minWidth: 60,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(217,140,16,0.28)',
    borderRadius: 8,
    backgroundColor: Colors.orangeLight,
  },
  secondarySmallText: {
    color: Colors.orangeDark,
    fontSize: 12,
    fontWeight: '900',
  },
  deleteSmall: {
    width: 38,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(159,18,57,0.2)',
    borderRadius: 8,
    backgroundColor: '#FFE4E6',
  },
  primarySmall: {
    minWidth: 56,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.orangeInstitutional,
  },
  primarySmallText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '900',
  },
});
