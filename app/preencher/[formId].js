import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import {
  Button as PaperButton,
  Card,
  Chip,
  Divider,
  ProgressBar,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { AppDatabase } from '../../core/database';
import { Colors } from '../../core/colors';

// Import all 12 field components
import CampoTexto from '../../components/CampoTexto';
import CampoNumero from '../../components/CampoNumero';
import CampoMoeda from '../../components/CampoMoeda';
import CampoData from '../../components/CampoData';
import CampoHora from '../../components/CampoHora';
import CampoSelecao from '../../components/CampoSelecao';
import CampoCheckbox from '../../components/CampoCheckbox';
import CampoRadio from '../../components/CampoRadio';
import CampoObservacao from '../../components/CampoObservacao';
import CampoFoto from '../../components/CampoFoto';
import CampoGps from '../../components/CampoGps';
import CampoAssinatura from '../../components/CampoAssinatura';
import CampoLinhasCqoCorte from '../../components/CampoLinhasCqoCorte';
import CampoLinhasCqoCarreamento from '../../components/CampoLinhasCqoCarreamento';

const hasFilledValue = (value) => {
  if (Array.isArray(value)) {
    return value.some((row) => (
      row
      && Object.values(row).some((cellValue) => (
        cellValue !== null
        && cellValue !== undefined
        && cellValue.toString().trim().length > 0
      ))
    ));
  }

  return value !== null
    && value !== undefined
    && value.toString().trim().length > 0;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const normalized = value.toString().replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumRows = (rows, fieldIds) => {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((total, row) => {
    const value = fieldIds.reduce((found, fieldId) => {
      if (found !== null && found !== undefined && found !== '') return found;
      return row?.[fieldId];
    }, null);
    return total + toNumber(value);
  }, 0);
};

const buildCqoCorteLegacyPayload = (formId, values) => {
  if (formId !== 'form_cqo_corte') return null;

  const rows = Array.isArray(values.linhas_corte) ? values.linhas_corte : [];

  return {
    origem_formulario: 'CQO Corte e Carreamento.xlsx',
    destino_referencia: {
      arquivo: 'E:\\TECNICA\\Qualidade Agricola\\1_Digitacao_CQO.xlsx',
      aba: 'corte',
      tabela: 'dig_corte',
    },
    status: 'rascunho_tecnico_pendente_validacao',
    campos_digitados: {
      NomePolo: values.nome_polo || null,
      NomeFazenda: values.nome_fazenda || null,
      Parcela: values.parcela || null,
      DataAvaliacao: values.data_avaliacao || null,
      ciclo_mes: values.ciclo_mes || null,
      MatriculaAvaliadores: values.matricula_avaliador || null,
      'Fiscal Resp': values.fiscal_resp || null,
      MatriculaDigitador: values.matricula_avaliador || null,
      Observacao: values.observacao || null,
    },
    previa_agregada_linhas: {
      NumeroPlantasObservadas: sumRows(rows, ['numero_plantas_observadas', 'numero_na_linha']),
      NumeroCahosObservadosPapel: sumRows(rows, ['numero_cachos_observados_papel', 'numero_cacho_observado']),
      CachoEsquecidoCiclo: sumRows(rows, ['cacho_esquecido_ciclo', 'cacho_esquecido']),
      CachoVerde: sumRows(rows, ['cacho_verde']),
      CachoMaduro: sumRows(rows, ['cacho_maduro']),
      CachoPassado: sumRows(rows, ['cacho_passado']),
      FolhaMamando: sumRows(rows, ['folha_mamando']),
      CachoTaloComprido: sumRows(rows, ['cacho_talo_comprido']),
      folhaCortadaIndev: sumRows(rows, ['folha_cortada_indevida']),
      cachoMalOosicionado: sumRows(rows, ['cacho_mal_posicionado']),
      CachoEstrela: sumRows(rows, ['cacho_estrela', 'cachos_estrela']),
      CachoBrocado: sumRows(rows, ['cacho_brocado', 'cachos_brocados']),
      CachoAvermelhado: sumRows(rows, ['cacho_avermelhado', 'cachos_avermelhados']),
      FrutoSolto: sumRows(rows, ['fruto_solto']),
      'Ciclo FrutoSolto': sumRows(rows, ['ciclo_fruto_solto']),
    },
    formulas_referencia_nao_autoritativas: {
      NumeroCahosObservados: 'CachoVerde + CachoMaduro + CachoPassado + CachoAvermelhado',
      'estimativa de cacho perdido/pla': 'CachoEsquecidoCiclo / NumeroPlantasObservadas * N de plantas Atual',
      'perdas t': 'estimativa de cacho perdido/pla * Peso Kg CORTE / 1000',
    },
    linhas_raw: rows,
  };
};

const buildCqoCarreamentoLegacyPayload = (formId, values) => {
  if (formId !== 'form_cqo_carreamento_fruto_solto') return null;

  const rows = Array.isArray(values.linhas_carreamento) ? values.linhas_carreamento : [];

  return {
    origem_formulario: 'CQO Corte e Carreamento.xlsx',
    destino_referencia: {
      arquivo: 'E:\\TECNICA\\Qualidade Agricola\\1_Digitacao_CQO.xlsx',
      aba: 'carreamento',
      tabela: 'dig_carreamento',
    },
    status: 'rascunho_tecnico_pendente_validacao',
    campos_digitados: {
      NomePolo: values.nome_polo || null,
      NomeFazenda: values.nome_fazenda || null,
      Parcela: values.parcela || null,
      AnoPlantio: values.ano_plantio || null,
      Densidade: values.densidade || null,
      TotalPlantasParcela: values.total_plantas_parcela || null,
      TotalCachosCarreados: values.total_cachos_carreados || null,
      Variedade: values.variedade || null,
      DataAvaliacao: values.data_avaliacao || null,
      Ciclo_mes: values.ciclo_mes || null,
      MatriculaAvaliadores: values.matricula_avaliador || null,
      'Fiscal Resp': values.fiscal_resp || null,
      MatriculaDigitador: values.matricula_avaliador || null,
      Observacao: values.observacao || null,
    },
    previa_agregada_linhas: {
      NumeroPlantasObservadas: sumRows(rows, ['numero_plantas_observadas']),
      cachoMalPosicionado: sumRows(rows, ['cacho_mal_posicionado']),
      Cachonaocarreado: sumRows(rows, ['cacho_nao_carreado']),
      PesoMedio: sumRows(rows, ['peso_medio']),
    },
    formulas_referencia_nao_autoritativas: {
      Ano: 'ano(DataAvaliacao)',
      Mes: 'primeiro dia do mes da DataAvaliacao',
      CicloDoMes: 'mes(DataAvaliacao)',
      'estimativa de perdas cnc/pla': 'Cachonaocarreado / NumeroPlantasObservadas * N de plantas Atual',
      'perdas t': 'estimativa de perdas cnc/pla * Peso Kg carreamento / 1000',
    },
    linhas_raw: rows,
  };
};

const buildLegacyPayload = (formId, values) => (
  buildCqoCorteLegacyPayload(formId, values)
  || buildCqoCarreamentoLegacyPayload(formId, values)
);

export default function FormularioPreencher() {
  const router = useRouter();
  const { formId, titulo } = useLocalSearchParams();
  const currentFormId = Array.isArray(formId) ? formId[0] : formId;

  const [form, setForm] = useState(null);
  const [campos, setCampos] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    try {
      const result = AppDatabase.getFirst('SELECT * FROM formularios WHERE id = ?', [currentFormId]);
      if (result) {
        setForm(result);
        const parsedCampos = JSON.parse(result.campos_json);
        setCampos(parsedCampos);

        // Initialize values map
        const initialValues = {};
        parsedCampos.forEach((field) => {
          initialValues[field.id] = ['linhas_cqo_corte', 'linhas_cqo_carreamento'].includes(field.tipo) ? [] : '';
        });
        setFormValues(initialValues);
      }
    } catch (e) {
      console.error('Error loading form template:', e);
      Alert.alert('Erro', 'Não foi possível carregar o formulário.');
    } finally {
      setIsLoading(false);
    }
  }, [currentFormId]);

  // Calculate field filling progress ratio
  const getProgressInfo = () => {
    if (campos.length === 0) return { ratio: 0, percentage: 0, filled: 0 };
    let filled = 0;
    campos.forEach((field) => {
      const val = formValues[field.id];
      if (hasFilledValue(val)) {
        filled++;
      }
    });
    const ratio = filled / campos.length;
    return {
      ratio,
      percentage: Math.round(ratio * 100),
      filled,
    };
  };

  const handleValueChange = (fieldId, val) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: val,
    }));

    // Clear validation error when value is filled
    if (formErrors[fieldId] && hasFilledValue(val)) {
      setFormErrors((prev) => ({
        ...prev,
        [fieldId]: null,
      }));
    }
  };

  const validateForm = () => {
    let isValid = true;
    const errors = {};

    campos.forEach((field) => {
      const val = formValues[field.id];
      const obrigatorio = field.obrigatorio === 1 || field.obrigatorio === true;
      if (obrigatorio && !hasFilledValue(val)) {
        errors[field.id] = `${field.titulo} é obrigatório`;
        isValid = false;
      }
    });

    setFormErrors(errors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Campos pendentes', 'Preencha todos os campos obrigatórios (*).');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setIsSaving(true);

    try {
      // Fetch User info
      const userRes = AppDatabase.getFirst('SELECT id FROM usuarios LIMIT 1');
      const userId = userRes ? userRes.id : `offline_uid_${Date.now()}`;

      const respostaId = `res_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const dateStr = new Date().toISOString();
      const mapeamentoLegado = buildLegacyPayload(currentFormId, formValues);

      // 1. Save response in respuestas table
      AppDatabase.insert('respostas', {
        id: respostaId,
        formulario_id: currentFormId,
        usuario_id: userId,
        dados_json: JSON.stringify(formValues),
        status: 'pendente',
        criado_em: dateStr,
      });

      // 2. Scan for specific native fields to populate sub-tables
      campos.forEach((field) => {
        const val = formValues[field.id];
        if (Array.isArray(val) || !hasFilledValue(val)) return;

        const textVal = val.toString();

        if (field.tipo === 'foto') {
          AppDatabase.insert('anexos', {
            id: `anexo_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            resposta_id: respostaId,
            campo_id: field.id,
            caminho_local: textVal,
            nome_arquivo: textVal.split('/').pop() || 'photo.jpg',
            tamanho_bytes: 0,
            tipo_mime: 'image/jpeg',
            enviado: 0,
            criado_em: dateStr,
          });
        } else if (field.tipo === 'assinatura') {
          AppDatabase.insert('assinaturas', {
            id: `sig_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            resposta_id: respostaId,
            campo_id: field.id,
            caminho_png: textVal,
            enviado: 0,
            criado_em: dateStr,
          });
        } else if (field.tipo === 'gps') {
          const parts = textVal.split(',');
          if (parts.length === 2) {
            AppDatabase.insert('gps', {
              id: `gps_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              resposta_id: respostaId,
              campo_id: field.id,
              latitude: parseFloat(parts[0]),
              longitude: parseFloat(parts[1]),
              precisao: 5.0,
              capturado_em: dateStr,
            });
          }
        }
      });

      // 3. Queue item for sync transmission
      AppDatabase.insert('sync_queue', {
        id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tipo: 'resposta',
        referencia_id: respostaId,
        payload_json: JSON.stringify({
          resposta_id: respostaId,
          formulario_id: currentFormId,
          formulario_versao: form?.versao || null,
          usuario_id: userId,
          dados: formValues,
          mapeamento_legado: mapeamentoLegado,
          criado_em: dateStr,
        }),
        status: 'pendente',
        tentativas: 0,
        max_tentativas: 3,
        criado_em: dateStr,
      });

      Alert.alert(
        'Sucesso!',
        'A coleta foi salva localmente e adicionada à fila de sincronização.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (e) {
      console.error('Error saving collected form:', e);
      Alert.alert('Erro', `Falha ao gravar os dados: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field) => {
    const isCqoCorte = currentFormId === 'form_cqo_corte';
    const props = {
      key: field.id,
      field,
      value: formValues[field.id],
      onChange: (val) => handleValueChange(field.id, val),
      error: formErrors[field.id],
      visualMode: isCqoCorte ? 'paper' : 'default',
    };

    switch (field.tipo) {
      case 'texto': return <CampoTexto {...props} />;
      case 'numero': return <CampoNumero {...props} />;
      case 'moeda': return <CampoMoeda {...props} />;
      case 'data': return <CampoData {...props} />;
      case 'hora': return <CampoHora {...props} />;
      case 'selecao': return <CampoSelecao {...props} />;
      case 'checkbox': return <CampoCheckbox {...props} />;
      case 'radio': return <CampoRadio {...props} />;
      case 'observacao': return <CampoObservacao {...props} />;
      case 'foto': return <CampoFoto {...props} />;
      case 'gps': return <CampoGps {...props} />;
      case 'assinatura': return <CampoAssinatura {...props} />;
      case 'linhas_cqo_corte': return <CampoLinhasCqoCorte {...props} />;
      case 'linhas_cqo_carreamento': return <CampoLinhasCqoCarreamento {...props} />;
      default:
        return (
          <View style={styles.errorField} key={field.id}>
            <Text style={styles.errorFieldText}>
              Campo não suportado: {field.tipo}
            </Text>
          </View>
        );
    }
  };

  const renderCqoCorteSection = (title, subtitle, fieldIds) => {
    const sectionFields = campos.filter((field) => fieldIds.includes(field.id));
    if (sectionFields.length === 0) return null;

    return (
      <Card style={styles.paperSectionCard} mode="elevated" key={title}>
        <Card.Content>
          <Text style={styles.paperSectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.paperSectionSubtitle}>{subtitle}</Text> : null}
          <Divider style={styles.paperSectionDivider} />
          {sectionFields.map((field) => renderField(field))}
        </Card.Content>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.greenInstitutional} size="large" />
      </View>
    );
  }

  const { ratio, percentage, filled } = getProgressInfo();
  const isCqoCorte = currentFormId === 'form_cqo_corte';

  return (
    <View style={[styles.container, isCqoCorte ? styles.cqoContainer : null]}>
      <Stack.Screen options={{ title: titulo || 'Coleta de Campo' }} />
      <StatusBar barStyle="light-content" backgroundColor={Colors.greenDark} />

      {/* Dynamic Progress Bar */}
      {isCqoCorte ? (
        <View style={styles.paperProgressHeader}>
          <View style={styles.paperTitleRow}>
            <View style={styles.paperTitleBlock}>
              <Text style={styles.paperEyebrow}>Piloto CQO</Text>
              <Text style={styles.paperTitle}>Corte</Text>
            </View>
            <Chip compact icon="cloud-off-outline" style={styles.offlineChip} textStyle={styles.offlineChipText}>
              Offline
            </Chip>
          </View>
          <View style={styles.progressTextRow}>
            <Text style={[styles.progressLabel, styles.cqoProgressLabel]}>
              {filled} de {campos.length} campos preenchidos
            </Text>
            <Text style={[styles.progressPercent, styles.cqoProgressPercent]}>{percentage}%</Text>
          </View>
          <ProgressBar progress={ratio} color={Colors.greenInstitutional} style={styles.paperProgressBar} />
        </View>
      ) : (
        <View style={styles.progressHeader}>
          <View style={styles.progressTextRow}>
            <Text style={styles.progressLabel}>
              {filled} de {campos.length} campos preenchidos
            </Text>
            <Text style={styles.progressPercent}>{percentage}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${percentage}%` }]} />
          </View>
        </View>
      )}

      {/* Fields List */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContainer,
          isCqoCorte ? styles.cqoScrollContainer : null,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {form?.descricao && !isCqoCorte ? (
          <Text style={styles.formDescription}>{form.descricao}</Text>
        ) : null}

        {isCqoCorte ? (
          <>
            {renderCqoCorteSection(
              'Identificacao da coleta',
              'Dados principais usados para organizar a avaliacao no escritorio.',
              ['nome_polo', 'nome_fazenda', 'parcela', 'data_avaliacao', 'ciclo_mes']
            )}
            {renderCqoCorteSection(
              'Responsaveis',
              'Informe quem avaliou e quem acompanhou a coleta.',
              ['matricula_avaliador', 'fiscal_resp']
            )}
            {campos.find((field) => field.id === 'linhas_corte') ? renderField(campos.find((field) => field.id === 'linhas_corte')) : null}
            {renderCqoCorteSection(
              'Fechamento',
              'Registre observacoes, localizacao e assinatura manual.',
              ['observacao', 'gps_cqo_corte', 'assinatura_manual']
            )}
          </>
        ) : (
          campos.map((field) => renderField(field))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.bottomBar, isCqoCorte ? styles.cqoBottomBar : null]}>
        {isCqoCorte ? (
          <PaperButton
            mode="contained"
            icon="content-save-outline"
            onPress={handleSave}
            disabled={isSaving}
            loading={isSaving}
            style={styles.paperSaveButton}
            contentStyle={styles.paperSaveButtonContent}
          >
            Salvar coleta offline
          </PaperButton>
        ) : (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Salvar Coleta</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cqoContainer: {
    backgroundColor: '#EAF4EE',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  progressHeader: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  paperProgressHeader: {
    backgroundColor: Colors.greenDark,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomWidth: 4,
    borderBottomColor: Colors.orangeInstitutional,
  },
  paperTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  paperTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  paperEyebrow: {
    color: Colors.orangeInstitutional,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  paperTitle: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: '900',
  },
  offlineChip: {
    backgroundColor: Colors.orangeLight,
  },
  offlineChipText: {
    color: Colors.orangeInstitutional,
    fontWeight: '800',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.grayText,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.greenInstitutional,
  },
  cqoProgressLabel: {
    color: '#D8F3E6',
  },
  cqoProgressPercent: {
    color: Colors.orangeLight,
  },
  track: {
    height: 6,
    backgroundColor: Colors.grayLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: Colors.greenInstitutional,
    borderRadius: 3,
  },
  paperProgressBar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#FFFFFF45',
  },
  scrollContainer: {
    padding: 20,
  },
  cqoScrollContainer: {
    padding: 14,
    paddingTop: 16,
  },
  paperSectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 6,
    borderLeftColor: Colors.orangeInstitutional,
    borderWidth: 1,
    borderColor: '#D5E5DB',
  },
  paperSectionTitle: {
    color: Colors.greenDark,
    fontSize: 18,
    fontWeight: '900',
  },
  paperSectionSubtitle: {
    color: Colors.grayText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  paperSectionDivider: {
    marginTop: 12,
    marginBottom: 14,
  },
  formDescription: {
    fontSize: 13,
    color: Colors.grayText,
    lineHeight: 18,
    marginBottom: 20,
  },
  errorField: {
    backgroundColor: '#EF444415',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  errorFieldText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  bottomBar: {
    backgroundColor: Colors.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  cqoBottomBar: {
    backgroundColor: Colors.greenDark,
    borderTopColor: Colors.orangeInstitutional,
    borderTopWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  saveButton: {
    backgroundColor: Colors.greenInstitutional,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  paperSaveButton: {
    borderRadius: 12,
    backgroundColor: Colors.orangeInstitutional,
  },
  paperSaveButtonContent: {
    minHeight: 52,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
