import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Stack } from 'expo-router';
import { AppDatabase } from '../core/database';
import { Colors } from '../core/colors';

export default function Historico() {
  const [activeTab, setActiveTab] = useState('pendente'); // 'pendente' or 'sincronizado'
  const [submissions, setSubmissions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const fetchHistory = useCallback(() => {
    try {
      const results = AppDatabase.getAll(`
        SELECT r.*, f.titulo as form_titulo, f.area_id
        FROM respostas r
        LEFT JOIN formularios f ON r.formulario_id = f.id
        ORDER BY r.criado_em DESC
      `);
      setSubmissions(results);
    } catch (e) {
      console.error('Error fetching history:', e);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const getStatusBadge = (status) => {
    let color = Colors.warning;
    let label = 'Pendente';
    if (status === 'sincronizado') {
      color = Colors.greenInstitutional;
      label = 'Sincronizado';
    } else if (status === 'erro') {
      color = Colors.danger;
      label = 'Erro';
    }

    return (
      <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.badgeText, { color }]}>{label.toUpperCase()}</Text>
      </View>
    );
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (_) {
      return isoString;
    }
  };

  // Filter list by active tab
  const filteredData = submissions.filter((item) => {
    if (activeTab === 'pendente') {
      return item.status === 'pendente' || item.status === 'erro';
    }
    return item.status === 'sincronizado';
  });

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Histórico de Coletas',
          headerRight: () => (
            <TouchableOpacity onPress={fetchHistory} style={styles.headerRightBtn}>
              <Text style={styles.headerRightText}>🔄 Atualizar</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <StatusBar barStyle="light-content" backgroundColor={Colors.greenDark} />

      {/* Tabs Controller */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pendente' ? styles.activeTab : null]}
          onPress={() => {
            setActiveTab('pendente');
            setExpandedId(null);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'pendente' ? styles.activeTabText : null]}>
            Pendentes / Erros
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sincronizado' ? styles.activeTab : null]}
          onPress={() => {
            setActiveTab('sincronizado');
            setExpandedId(null);
          }}
        >
          <Text style={[styles.tabText, activeTab === 'sincronizado' ? styles.activeTabText : null]}>
            Sincronizados
          </Text>
        </TouchableOpacity>
      </View>

      {/* History List */}
      {filteredData.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>Nenhuma coleta nesta aba</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'pendente'
              ? 'Não há coletas pendentes de sincronização local.'
              : 'Nenhuma coleta foi transmitida ao servidor ainda.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
            let dataObject = {};
            try {
              dataObject = JSON.parse(item.dados_json);
            } catch (_) {}

            return (
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>
                      {item.form_titulo || 'Formulário'}
                    </Text>
                    <Text style={styles.cardTime}>{formatDate(item.criado_em)}</Text>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    {getStatusBadge(item.status)}
                    <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expandPanel}>
                    <Text style={styles.expandedSecTitle}>Dados Coletados:</Text>
                    <View style={styles.dataList}>
                      {Object.entries(dataObject).map(([key, val]) => {
                        const cleanKey = key.replace('_', ' ').toUpperCase();
                        let displayValue = val ? val.toString() : '';

                        if (displayValue.startsWith('file://')) {
                          displayValue = '📸 [Foto salva no aparelho]';
                        } else if (displayValue.startsWith('data:image/')) {
                          displayValue = '✍️ [Assinatura capturada]';
                        }

                        return (
                          <View key={key} style={styles.dataRow}>
                            <Text style={styles.dataKey}>{cleanKey}:</Text>
                            <Text style={styles.dataVal}>{displayValue}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {item.status === 'erro' && item.erro_msg && (
                      <View style={styles.errorContainer}>
                        <Text style={styles.errorHeading}>⚠️ Erro de Transmissão:</Text>
                        <Text style={styles.errorBody}>{item.erro_msg}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRightBtn: {
    paddingRight: 8,
  },
  headerRightText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.greenInstitutional,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.grayText,
  },
  activeTabText: {
    color: Colors.greenInstitutional,
    fontWeight: '800',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.grayDark,
  },
  cardTime: {
    fontSize: 11,
    color: Colors.grayText,
    marginTop: 4,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  expandIcon: {
    fontSize: 10,
    color: Colors.grayText,
  },
  expandPanel: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grayLight,
    backgroundColor: Colors.grayLight,
  },
  expandedSecTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.grayText,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  dataList: {
    marginBottom: 4,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dataKey: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.grayText,
    width: 120,
  },
  dataVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.grayDark,
    flex: 1,
  },
  errorContainer: {
    marginTop: 12,
    backgroundColor: '#EF444410',
    borderWidth: 1,
    borderColor: '#EF444430',
    borderRadius: 8,
    padding: 12,
  },
  errorHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.danger,
    marginBottom: 2,
  },
  errorBody: {
    fontSize: 11,
    color: Colors.danger,
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    opacity: 0.3,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.grayDark,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.grayText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
