import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppDatabase } from '../../core/database';
import { Colors } from '../../core/colors';
import { IconBox, ScreenShell, chromeStyles } from '../../components/PrototypeChrome';

const preferredOrder = ['form_cqo_corte', 'form_cqo_carreamento_fruto_solto'];

function formMeta(form) {
  if (form.id === 'form_cqo_corte') {
    return {
      title: 'CQO Corte',
      subtitle: 'Formulário prioritário do piloto',
      icon: 'chart-bar',
      muted: false,
    };
  }

  if (form.id === 'form_cqo_carreamento_fruto_solto') {
    return {
      title: 'Carreamento',
      subtitle: 'Formulário de controle operacional',
      icon: 'format-list-text',
      muted: true,
    };
  }

  return {
    title: form.titulo,
    subtitle: form.descricao || 'Ficha de coleta disponível',
    icon: 'file-document-outline',
    muted: true,
  };
}

export default function FormulariosLista() {
  const router = useRouter();
  const { areaId } = useLocalSearchParams();
  const [formularios, setFormularios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    try {
      const results = AppDatabase.getAll(
        'SELECT * FROM formularios WHERE area_id = ? AND ativo = 1',
        [areaId || 'campo']
      );

      const onlyCqo = results
        .filter((item) => preferredOrder.includes(item.id))
        .sort((a, b) => preferredOrder.indexOf(a.id) - preferredOrder.indexOf(b.id));

      setFormularios(onlyCqo.length ? onlyCqo : results);
    } catch (e) {
      console.error('Error fetching forms:', e);
    } finally {
      setIsLoading(false);
    }
  }, [areaId]);

  return (
    <ScreenShell title="Formulários" activeNav="forms" showBack>
      <StatusBar barStyle="dark-content" backgroundColor="#F7FAF6" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.sectionTitle}>
          <Text style={styles.sectionHeading}>Qualidade Agrícola</Text>
          <Text style={styles.sectionCount}>{isLoading ? 'carregando' : `${formularios.length} modelos`}</Text>
        </View>

        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.greenInstitutional} />
            <Text style={styles.emptyTitle}>Carregando formularios</Text>
            <Text style={styles.emptyText}>Buscando modelos disponiveis no aparelho.</Text>
          </View>
        ) : formularios.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="folder-open-outline" size={44} color={Colors.greenInstitutional} />
            <Text style={styles.emptyTitle}>Nenhum formulário disponível</Text>
            <Text style={styles.emptyText}>Sincronize o app para baixar as fichas de coleta.</Text>
          </View>
        ) : (
          formularios.map((item) => {
            const meta = formMeta(item);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.formCard}
                onPress={() =>
                  router.push({
                    pathname: `/preencher/${item.id}`,
                    params: { titulo: item.titulo },
                  })
                }
              >
                <IconBox name={meta.icon} muted={meta.muted} />
                <View style={styles.formText}>
                  <Text style={styles.formTitle}>{meta.title}</Text>
                  <Text style={styles.formSubtitle}>{meta.subtitle}</Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Ativo</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: chromeStyles.screenPadding,
    paddingBottom: chromeStyles.bottomPadding,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
    marginBottom: 11,
  },
  sectionHeading: {
    color: Colors.grayDark,
    fontSize: 19,
    fontWeight: '900',
  },
  sectionCount: {
    color: Colors.grayText,
    fontSize: 13,
    fontWeight: '800',
  },
  formCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 11,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(31,122,77,0.35)',
    borderRadius: 8,
    backgroundColor: '#FBFFFC',
    shadowColor: '#203125',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 18,
    elevation: 1,
  },
  formText: {
    flex: 1,
    minWidth: 0,
  },
  formTitle: {
    color: '#17221B',
    fontSize: 15,
    fontWeight: '900',
  },
  formSubtitle: {
    color: Colors.grayText,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  badge: {
    minHeight: 25,
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: Colors.greenLight,
  },
  badgeText: {
    color: Colors.greenDark,
    fontSize: 11,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  emptyTitle: {
    color: Colors.grayDark,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 12,
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
