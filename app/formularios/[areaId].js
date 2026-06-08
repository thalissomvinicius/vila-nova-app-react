import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { AppDatabase } from '../../core/database';
import { Colors } from '../../core/colors';

export default function FormulariosLista() {
  const router = useRouter();
  const { areaId, nome } = useLocalSearchParams();
  const [formularios, setFormularios] = useState([]);

  useEffect(() => {
    try {
      const results = AppDatabase.getAll(
        'SELECT * FROM formularios WHERE area_id = ? AND ativo = 1',
        [areaId]
      );
      
      const mapped = results.map(row => {
        let count = 0;
        try {
          const fields = JSON.parse(row.campos_json);
          count = Array.isArray(fields) ? fields.length : 0;
        } catch (_) {}
        return { ...row, camposCount: count };
      });

      setFormularios(mapped);
    } catch (e) {
      console.error('Error fetching forms:', e);
    }
  }, [areaId]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: nome || 'Formulários' }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.greenDark} />
      
      {formularios.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📂</Text>
          <Text style={styles.emptyTitle}>Nenhum formulário disponível</Text>
          <Text style={styles.emptyText}>
            Sincronize o aplicativo na Central de Sync para baixar as fichas de coleta de campo disponíveis para esta área.
          </Text>
        </View>
      ) : (
        <FlatList
          data={formularios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: `/preencher/${item.id}`,
                  params: { titulo: item.titulo },
                })
              }
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.titulo}</Text>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>V{item.versao}</Text>
                </View>
              </View>
              {item.descricao ? (
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {item.descricao}
                </Text>
              ) : null}
              <View style={styles.cardFooter}>
                <Text style={styles.footerIcon}>📋</Text>
                <Text style={styles.footerText}>
                  {item.camposCount} campos de coleta
                </Text>
                <Text style={styles.arrowIcon}>➔</Text>
              </View>
            </TouchableOpacity>
          )}
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
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.grayDark,
    flex: 1,
    marginRight: 8,
  },
  versionBadge: {
    backgroundColor: `${Colors.greenInstitutional}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  versionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.greenInstitutional,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.grayText,
    lineHeight: 18,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.grayLight,
    paddingTop: 12,
  },
  footerIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  footerText: {
    fontSize: 12,
    color: Colors.grayText,
    fontWeight: '600',
    flex: 1,
  },
  arrowIcon: {
    fontSize: 14,
    color: Colors.grayText,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    color: Colors.grayText,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.grayDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.grayText,
    textAlign: 'center',
    lineHeight: 20,
  },
});
