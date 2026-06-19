import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppDatabase } from '../core/database';
import { Colors } from '../core/colors';
import { exportRecord } from '../core/reportExporter';
import { ScreenShell, chromeStyles } from '../components/PrototypeChrome';

function parseDados(item) {
  try {
    return JSON.parse(item.dados_json || '{}');
  } catch (_) {
    return {};
  }
}

function formType(item) {
  const title = String(item.form_titulo || item.formulario_id || '').toLowerCase();
  if (title.includes('carreamento')) return 'Carreamento';
  if (title.includes('corte')) return 'CQO Corte';
  return item.form_titulo || 'Formulário';
}

function statusLabel(status) {
  if (status === 'sincronizado') return 'Sincronizado';
  if (status === 'erro') return 'Revisar';
  return 'Pendente';
}

function statusStyle(status) {
  if (status === 'sincronizado') return 'synced';
  if (status === 'erro') return 'failed';
  return 'pending';
}

const MONTHS = [
  { value: 'todos', label: 'Todos' },
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Fev' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Abr' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Ago' },
  { value: '09', label: 'Set' },
  { value: '10', label: 'Out' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dez' },
];

const YEAR_LOOKBACK = 6;

function parseRecordDate(item) {
  const dados = parseDados(item);
  const rawDate = dados.data_avaliacao || item.criado_em;

  if (typeof rawDate === 'string') {
    const brMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      return { month: brMatch[2], year: brMatch[3], label: rawDate };
    }
  }

  const date = new Date(rawDate);
  if (!Number.isNaN(date.getTime())) {
    return {
      month: String(date.getMonth() + 1).padStart(2, '0'),
      year: String(date.getFullYear()),
      label: date.toLocaleDateString('pt-BR'),
    };
  }

  return { month: 'sem_mes', year: 'sem_ano', label: 'Data nao informada' };
}

function canModifyRecord(item) {
  return item.status === 'pendente' || item.status === 'erro' || item.status === 'enviando';
}

export default function Historico() {
  const router = useRouter();
  const [records, setRecords] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));

  const fetchHistory = useCallback(() => {
    setIsHistoryLoading(true);
    try {
      const results = AppDatabase.getAll(`
        SELECT r.*, f.titulo as form_titulo, f.area_id
        FROM respostas r
        LEFT JOIN formularios f ON r.formulario_id = f.id
        ORDER BY r.criado_em DESC
      `);
      setRecords(results);
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useFocusEffect(fetchHistory);

  const yearOptions = useMemo(() => {
    const years = records
      .map((item) => parseRecordDate(item).year)
      .filter((year) => year && year !== 'sem_ano');
    const defaultYears = Array.from({ length: YEAR_LOOKBACK }, (_, index) => (
      String(currentDate.getFullYear() - index)
    ));
    const uniqueYears = Array.from(new Set([...defaultYears, ...years]));
    return ['todos', ...uniqueYears.sort((a, b) => Number(b) - Number(a))];
  }, [records]);

  const filteredRecords = useMemo(() => records.filter((item) => {
    const dateInfo = parseRecordDate(item);
    const matchMonth = selectedMonth === 'todos' || dateInfo.month === selectedMonth;
    const matchYear = selectedYear === 'todos' || dateInfo.year === selectedYear;
    return matchMonth && matchYear;
  }), [records, selectedMonth, selectedYear]);

  const emitRecord = async (item, format) => {
    const type = formType(item);
    const dados = parseDados(item);

    try {
      await exportRecord({
        type: type === 'Carreamento' ? 'carreamento' : 'corte',
        values: dados,
        format,
      });
    } catch (e) {
      Alert.alert('Erro ao emitir', e.message);
    }
  };

  const editRecord = (item) => {
    if (!canModifyRecord(item)) {
      Alert.alert('Coleta enviada', 'Esta coleta ja foi sincronizada e nao pode ser editada no app.');
      return;
    }

    router.push({
      pathname: `/preencher/${item.formulario_id}`,
      params: {
        titulo: item.form_titulo || 'Coleta',
        respostaId: item.id,
      },
    });
  };

  const deleteRecord = (item) => {
    if (!canModifyRecord(item)) {
      Alert.alert('Coleta enviada', 'Esta coleta ja foi sincronizada e nao pode ser excluida no app.');
      return;
    }

    Alert.alert(
      'Excluir coleta',
      'Deseja excluir esta coleta local e remover ela da fila de sincronizacao?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            AppDatabase.run('DELETE FROM sync_queue WHERE referencia_id = ?', [item.id]);
            AppDatabase.run('DELETE FROM anexos WHERE resposta_id = ?', [item.id]);
            AppDatabase.run('DELETE FROM gps WHERE resposta_id = ?', [item.id]);
            AppDatabase.run('DELETE FROM assinaturas WHERE resposta_id = ?', [item.id]);
            AppDatabase.run('DELETE FROM respostas WHERE id = ?', [item.id]);
            fetchHistory();
          },
        },
      ]
    );
  };

  return (
    <ScreenShell title="Histórico" activeNav="history" showBack>
      <StatusBar barStyle="dark-content" backgroundColor="#F7FAF6" />
      {isHistoryLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.greenInstitutional} />
          <Text style={styles.emptyTitle}>Carregando coletas</Text>
          <Text style={styles.emptyText}>Buscando o historico local do aparelho.</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="history" size={46} color={Colors.greenInstitutional} />
          <Text style={styles.emptyTitle}>Nenhuma coleta registrada</Text>
          <Text style={styles.emptyText}>As coletas salvas localmente aparecem aqui com emissão por registro.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={(
            <View style={styles.filtersCard}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filtro</Text>
                <Text style={styles.filterMeta}>{filteredRecords.length} de {records.length}</Text>
              </View>
              <View style={styles.filterSelectRow}>
                <FilterSelect
                  label="Mes"
                  value={selectedMonth}
                  options={MONTHS}
                  onChange={setSelectedMonth}
                />
                <FilterSelect
                  label="Ano"
                  value={selectedYear}
                  options={yearOptions.map((year) => ({
                    value: year,
                    label: year === 'todos' ? 'Todos' : year,
                  }))}
                  onChange={setSelectedYear}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyFiltered}>
              <MaterialCommunityIcons name="filter-off-outline" size={32} color={Colors.greenInstitutional} />
              <Text style={styles.emptyTitle}>Nenhuma coleta nesse filtro</Text>
              <Text style={styles.emptyText}>Troque o mes ou ano para ver outros registros.</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const dados = parseDados(item);
            const type = formType(item);
            const fazenda = dados.nome_fazenda || dados.fazenda || 'Fazenda não informada';
            const parcela = dados.parcela || 'Parcela --';
            const styleKey = statusStyle(item.status);
            const dateInfo = parseRecordDate(item);
            const canModify = canModifyRecord(item);

            return (
              <View style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <Text style={styles.recordType}>{type}</Text>
                  <View style={[styles.statusBadge, styles[`status_${styleKey}`]]}>
                    <Text style={[styles.statusText, styles[`statusText_${styleKey}`]]}>
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordBody}>
                  <Text style={styles.recordFarm}>{fazenda}</Text>
                  <Text style={styles.recordMeta}>
                    {parcela} - {dateInfo.label} - {canModify ? 'salvo localmente' : 'enviado'}
                  </Text>
                </View>

                <View style={styles.recordActions}>
                  {canModify ? (
                    <ActionButton
                      label="Editar"
                      icon="pencil-outline"
                      variant="edit"
                      onPress={() => editRecord(item)}
                    />
                  ) : null}
                  <ActionButton
                    label="PDF"
                    icon="file-pdf-box"
                    variant="mini"
                    onPress={() => emitRecord(item, 'pdf')}
                  />
                  {canModify ? (
                    <ActionButton
                      label="Excluir"
                      icon="trash-can-outline"
                      variant="delete"
                      onPress={() => deleteRecord(item)}
                    />
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </ScreenShell>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.filterSelect}>
      <Text style={styles.filterLabel}>{label}</Text>
      <TouchableOpacity style={styles.filterSelectButton} onPress={() => setVisible(true)}>
        <Text style={styles.filterSelectValue}>{selected?.label || 'Todos'}</Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.greenDark} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.filterModalClose}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              ItemSeparatorComponent={() => <View style={styles.filterModalSeparator} />}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.filterModalOption, active ? styles.filterModalOptionActive : null]}
                    onPress={() => {
                      onChange(item.value);
                      setVisible(false);
                    }}
                  >
                    <Text style={[styles.filterModalOptionText, active ? styles.filterModalOptionTextActive : null]}>
                      {item.label}
                    </Text>
                    {active ? <MaterialCommunityIcons name="check" size={18} color={Colors.greenInstitutional} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function ActionButton({ label, icon, variant, onPress }) {
  const isMini = variant === 'mini';
  const isDelete = variant === 'delete';
  return (
    <TouchableOpacity style={isDelete ? styles.deleteButton : isMini ? styles.miniButton : styles.editButton} onPress={onPress}>
      <MaterialCommunityIcons
        name={icon}
        size={15}
        color={isDelete ? '#9F1239' : isMini ? Colors.orangeDark : Colors.greenDark}
      />
      <Text style={isDelete ? styles.deleteButtonText : isMini ? styles.miniButtonText : styles.editButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: chromeStyles.screenPadding,
    paddingBottom: chromeStyles.bottomPadding,
    gap: 12,
  },
  filtersCard: {
    gap: 9,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(32,49,37,0.09)',
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  filterTitle: {
    color: Colors.greenInstitutional,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  filterMeta: {
    color: Colors.grayText,
    fontSize: 11,
    fontWeight: '800',
  },
  filterSelectRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterSelect: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  filterLabel: {
    color: Colors.grayText,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  filterSelectButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(31,122,77,0.2)',
    borderRadius: 8,
    backgroundColor: '#F2F8F2',
  },
  filterSelectValue: {
    color: Colors.greenDark,
    fontSize: 14,
    fontWeight: '900',
  },
  filterModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  filterModal: {
    maxHeight: '58%',
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: Colors.white,
  },
  filterModalHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EE',
  },
  filterModalTitle: {
    color: Colors.greenDark,
    fontSize: 16,
    fontWeight: '900',
  },
  filterModalClose: {
    color: Colors.orangeDark,
    fontSize: 13,
    fontWeight: '900',
  },
  filterModalOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    backgroundColor: Colors.white,
  },
  filterModalOptionActive: {
    backgroundColor: Colors.greenLight,
  },
  filterModalOptionText: {
    color: Colors.grayDark,
    fontSize: 15,
    fontWeight: '800',
  },
  filterModalOptionTextActive: {
    color: Colors.greenInstitutional,
    fontWeight: '900',
  },
  filterModalSeparator: {
    height: 1,
    backgroundColor: '#EEF2EE',
  },
  recordCard: {
    gap: 13,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(32,49,37,0.09)',
    borderRadius: 8,
    backgroundColor: Colors.white,
    shadowColor: '#203125',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 26,
    elevation: 2,
  },
  recordTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EE',
  },
  recordType: {
    color: Colors.greenInstitutional,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusBadge: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  status_pending: {
    backgroundColor: Colors.orangeLight,
  },
  status_synced: {
    backgroundColor: Colors.greenLight,
  },
  status_failed: {
    backgroundColor: '#FFE4E6',
  },
  statusText_pending: {
    color: '#7B4A08',
  },
  statusText_synced: {
    color: Colors.greenDark,
  },
  statusText_failed: {
    color: '#9F1239',
  },
  recordBody: {
    minWidth: 0,
  },
  recordFarm: {
    color: '#17221B',
    fontSize: 16,
    fontWeight: '900',
  },
  recordMeta: {
    color: Colors.grayText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1.2,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(31,122,77,0.24)',
    borderRadius: 8,
    backgroundColor: '#F2F8F2',
  },
  miniButton: {
    flex: 0.78,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(217,140,16,0.28)',
    borderRadius: 8,
    backgroundColor: Colors.orangeLight,
  },
  deleteButton: {
    flex: 0.86,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(159,18,57,0.2)',
    borderRadius: 8,
    backgroundColor: '#FFE4E6',
  },
  editButtonText: {
    color: Colors.greenDark,
    fontSize: 12,
    fontWeight: '900',
  },
  miniButtonText: {
    color: Colors.orangeDark,
    fontSize: 12,
    fontWeight: '900',
  },
  deleteButtonText: {
    color: '#9F1239',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingBottom: chromeStyles.bottomPadding,
  },
  emptyFiltered: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 190,
    padding: 24,
  },
  emptyTitle: {
    color: Colors.grayDark,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.grayText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
});
