import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { AppDatabase } from '../core/database';
import { isDateInMonth } from '../core/dateUtils';
import { useAuthStore } from '../core/authStore';
import { Colors } from '../core/colors';
import { exportJsonFile } from '../core/reportExporter';
import { ScreenShell, chromeStyles } from '../components/PrototypeChrome';

function initialsFromName(name) {
  return String(name || 'Colaborador')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '--';
}

function safeParseJson(value) {
  if (!value || typeof value !== 'string') return value || null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
}

function rowsFromTable(sql) {
  try {
    return AppDatabase.getAll(sql);
  } catch (error) {
    return [{ erro_exportacao: error.message }];
  }
}

function redactUserRow(user) {
  if (!user || typeof user !== 'object') return user;
  return {
    ...user,
    jwt_token: user.jwt_token ? '[redigido]' : null,
    refresh_token: user.refresh_token ? '[redigido]' : null,
  };
}

function buildTechnicalExport() {
  const respostas = rowsFromTable('SELECT * FROM respostas ORDER BY criado_em DESC');
  const syncQueue = rowsFromTable('SELECT * FROM sync_queue ORDER BY criado_em DESC');
  const anexos = rowsFromTable('SELECT * FROM anexos ORDER BY criado_em DESC');
  const gps = rowsFromTable('SELECT * FROM gps ORDER BY capturado_em DESC');
  const assinaturas = rowsFromTable('SELECT * FROM assinaturas ORDER BY criado_em DESC');
  const formularios = rowsFromTable('SELECT * FROM formularios ORDER BY titulo ASC');
  const usuarios = rowsFromTable('SELECT * FROM usuarios');
  const appMeta = rowsFromTable('SELECT * FROM app_meta');

  const coletas = respostas.map((resposta) => {
    const fila = syncQueue.filter((item) => item.referencia_id === resposta.id);
    return {
      id: resposta.id,
      formulario_id: resposta.formulario_id,
      usuario_id: resposta.usuario_id,
      status: resposta.status,
      criado_em: resposta.criado_em,
      enviado_em: resposta.enviado_em || null,
      erro_msg: resposta.erro_msg || null,
      dados: safeParseJson(resposta.dados_json),
      fila_sincronizacao: fila.map((item) => ({
        ...item,
        payload_json_parseado: safeParseJson(item.payload_json),
      })),
      anexos: anexos.filter((item) => item.resposta_id === resposta.id),
      gps: gps.filter((item) => item.resposta_id === resposta.id),
      assinaturas: assinaturas.filter((item) => item.resposta_id === resposta.id),
    };
  });

  return {
    schema: 'vilanova_app_debug_export_v1',
    gerado_em: new Date().toISOString(),
    finalidade: 'Exportacao tecnica local para leitura por IA/suporte. Contem coletas agrupadas e tokens de sessao redigidos.',
    resumo: {
      total_coletas: respostas.length,
      pendentes: respostas.filter((item) => item.status === 'pendente').length,
      sincronizadas: respostas.filter((item) => item.status === 'sincronizado').length,
      com_erro: respostas.filter((item) => item.status === 'erro').length,
      itens_fila: syncQueue.length,
      anexos: anexos.length,
      pontos_gps: gps.length,
      assinaturas: assinaturas.length,
      rascunhos: appMeta.filter((item) => String(item.chave || '').startsWith('draft_formulario_')).length,
    },
    coletas,
    tabelas_brutas: {
      respostas: respostas.map((item) => ({
        ...item,
        dados_json_parseado: safeParseJson(item.dados_json),
      })),
      sync_queue: syncQueue.map((item) => ({
        ...item,
        payload_json_parseado: safeParseJson(item.payload_json),
      })),
      anexos,
      gps,
      assinaturas,
      formularios: formularios.map((item) => ({
        ...item,
        campos_json_parseado: safeParseJson(item.campos_json),
      })),
      usuarios: usuarios.map(redactUserRow),
      app_meta: appMeta.map((item) => ({
        ...item,
        valor_parseado: safeParseJson(item.valor),
      })),
    },
  };
}

export default function Profile() {
  const router = useRouter();
  const { userName, cargo, matricula, departamento, gestor, logout } = useAuthStore();
  const [monthCount, setMonthCount] = useState(null);
  const [headcountProfile, setHeadcountProfile] = useState(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  const loadStats = useCallback(() => {
    setIsStatsLoading(true);
    try {
      const respostas = AppDatabase.getAll('SELECT * FROM respostas');
      setMonthCount(respostas.filter((item) => isDateInMonth(item.criado_em)).length);

      if (matricula) {
        const collaborator = AppDatabase.getFirst(
          "SELECT * FROM headcount_colaboradores WHERE matricula = ? AND status = 'ATIVO' LIMIT 1",
          [matricula]
        );
        setHeadcountProfile(collaborator || null);
      }
    } catch (_) {
      setMonthCount(0);
    } finally {
      setIsStatsLoading(false);
    }
  }, [matricula]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleExportTechnicalData = () => {
    Alert.alert(
      'Dados tecnicos',
      'Exportar um JSON com os dados locais das coletas, fila, GPS e anexos para analise?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Exportar',
          onPress: async () => {
            try {
              const data = buildTechnicalExport();
              const date = new Date().toISOString().slice(0, 10);
              await exportJsonFile({
                data,
                filename: `vilanova-dados-app-${date}.json`,
                dialogTitle: 'Compartilhar dados tecnicos do app',
              });
            } catch (error) {
              Alert.alert('Erro ao exportar', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenShell title="Perfil" activeNav="home" showBack>
      <StatusBar barStyle="dark-content" backgroundColor="#F7FAF6" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsFromName(userName)}</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.eyebrow}>Perfil logado</Text>
            <Text style={styles.name}>{userName || headcountProfile?.nome || 'Colaborador'}</Text>
            <Text style={styles.role}>{cargo || headcountProfile?.cargo || 'Função não informada'}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <Detail label="Matrícula" value={matricula || '--'} />
          <Detail label="Polo" value="Tomé-Açu" />
          <Detail label="Departamento" value={departamento || headcountProfile?.departamento || '--'} loading={isStatsLoading} />
          <Detail label="Gestor" value={gestor || headcountProfile?.gestor || '--'} loading={isStatsLoading} />
          <Detail label="Registros do mês" value={String(monthCount)} />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={18} color={Colors.orangeDark} />
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.techButton} onPress={handleExportTechnicalData}>
          <MaterialCommunityIcons name="database-export-outline" size={14} color={Colors.grayText} />
          <Text style={styles.techButtonText}>Dados tecnicos</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

function Detail({ label, value, loading }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {loading || value === 'null' ? (
        <ActivityIndicator size="small" color={Colors.greenInstitutional} />
      ) : (
        <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: chromeStyles.screenPadding,
    paddingBottom: chromeStyles.bottomPadding,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  avatar: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: Colors.greenInstitutional,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '900',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: Colors.greenInstitutional,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  name: {
    color: Colors.grayDark,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
    marginTop: 4,
  },
  role: {
    color: Colors.grayText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  details: {
    gap: 10,
    marginTop: 13,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  detailLabel: {
    color: Colors.grayText,
    fontSize: 13,
    fontWeight: '800',
  },
  detailValue: {
    flex: 1,
    color: Colors.grayDark,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  logoutButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 13,
    borderWidth: 1,
    borderColor: 'rgba(217,140,16,0.28)',
    borderRadius: 8,
    backgroundColor: Colors.orangeLight,
  },
  logoutText: {
    color: Colors.orangeDark,
    fontSize: 14,
    fontWeight: '900',
  },
  techButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    opacity: 0.62,
  },
  techButtonText: {
    color: Colors.grayText,
    fontSize: 11,
    fontWeight: '800',
  },
});
