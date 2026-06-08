import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../core/authStore';
import { useSyncStore } from '../core/syncStore';
import { AppDatabase } from '../core/database';
import { Colors } from '../core/colors';

// Simple mapping from DB icone names to MaterialIcons
const mapIconName = (name) => {
  switch (name) {
    case 'agriculture': return '🚜';
    case 'grass': return '🌱';
    case 'factory': return '🏭';
    case 'health-and-safety':
    case 'health_and_safety': return '🛡️';
    case 'build': return '🔧';
    case 'local-shipping':
    case 'local_shipping': return '🚚';
    case 'warehouse': return '📦';
    case 'business': return '🏢';
    default: return '📄';
  }
};

export default function Home() {
  const router = useRouter();
  const { userName, cargo, logout } = useAuthStore();
  const { queue, lastSyncLabel, loadQueue } = useSyncStore();

  const [areas, setAreas] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHomeData = useCallback(() => {
    try {
      // 1. Fetch areas from database
      const dbAreas = AppDatabase.getAll("SELECT * FROM areas WHERE ativo = 1 ORDER BY ordem ASC");
      
      // 2. Count active forms for each area
      const mapped = dbAreas.map((area) => {
        const formCountRes = AppDatabase.getFirst(
          "SELECT COUNT(*) as count FROM formularios WHERE area_id = ? AND ativo = 1",
          [area.id]
        );
        return {
          ...area,
          formCount: formCountRes ? formCountRes.count : 0,
        };
      });

      setAreas(mapped);
      // 3. Load sync queue count
      loadQueue();
    } catch (e) {
      console.error('Error fetching home data:', e);
    }
  }, [loadQueue]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const onRefresh = async () => {
    setRefreshing(true);
    fetchHomeData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const pendingCount = queue.length;
  const shortName = userName ? userName.split(' ')[0] : 'Colaborador';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.greenDark} />
      
      {/* Premium Header Layout */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {shortName} 👋</Text>
          <Text style={styles.cargo}>{cargo || 'Assistente Administrativo'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/historico')}
            accessibilityLabel="Histórico"
          >
            <Text style={styles.headerButtonText}>⏳</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/sync')}
            accessibilityLabel="Sincronização"
          >
            <Text style={styles.headerButtonText}>☁️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, styles.logoutButton]}
            onPress={handleLogout}
            accessibilityLabel="Sair"
          >
            <Text style={styles.headerButtonText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.greenInstitutional]} />
        }
      >
        {/* Sync Status Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerSubtitle}>Status do Sistema</Text>
            <Text style={styles.bannerTitle}>
              {pendingCount} registros pendentes
            </Text>
            <Text style={styles.bannerSyncLabel}>
              Último sync: {lastSyncLabel}
            </Text>
          </View>
          <View style={styles.bannerIconContainer}>
            <Text style={styles.bannerIcon}>
              {pendingCount > 0 ? '📤' : '✅'}
            </Text>
          </View>
        </View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>Áreas Operacionais</Text>

        {/* Operational Areas Grid */}
        <View style={styles.grid}>
          {areas.map((area) => (
            <TouchableOpacity
              key={area.id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: `/formularios/${area.id}`,
                  params: { nome: area.nome },
                })
              }
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: `${area.cor}15` }, // Hex with opacity
                ]}
              >
                <Text style={[styles.cardIcon, { color: area.cor }]}>
                  {mapIconName(area.icone)}
                </Text>
              </View>
              <Text style={styles.cardName}>{area.nome}</Text>
              <Text style={styles.cardCount}>{area.formCount} formulários</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.paddingBottom} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.greenInstitutional,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: 'System',
  },
  cargo: {
    fontSize: 12,
    color: '#B2D4C8',
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  headerButtonText: {
    fontSize: 18,
  },
  scrollContainer: {
    padding: 16,
  },
  banner: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.greenInstitutional,
    marginBottom: 24,
    shadowColor: Colors.greenInstitutional,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  bannerContent: {
    flex: 1,
  },
  bannerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B2D4C8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
    marginTop: 4,
  },
  bannerSyncLabel: {
    fontSize: 11,
    color: '#B2D4C8',
    marginTop: 6,
  },
  bannerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerIcon: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.grayDark,
    marginBottom: 16,
    paddingLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.grayDark,
  },
  cardCount: {
    fontSize: 12,
    color: Colors.grayText,
    marginTop: 4,
    fontWeight: '500',
  },
  paddingBottom: {
    height: 60,
  },
});
