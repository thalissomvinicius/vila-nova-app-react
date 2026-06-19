import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Location from 'expo-location';
import {
  Button as PaperButton,
  Card,
  Chip,
  Divider,
  ProgressBar,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { buildLegacyPayload, observacaoFotos } from '../../core/cqoPayload';
import { AppDatabase } from '../../core/database';
import { Colors } from '../../core/colors';
import { parseCamposJson } from '../../core/formSchema';
import { BottomNav, TopBar } from '../../components/PrototypeChrome';

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
import CampoParcela from '../../components/CampoParcela';
import CampoAssinatura from '../../components/CampoAssinatura';
import CampoAcompanhamento from '../../components/CampoAcompanhamento';
import CampoLinhasCqoCorte from '../../components/CampoLinhasCqoCorte';
import CampoLinhasCqoCarreamento from '../../components/CampoLinhasCqoCarreamento';
import { exportRecord } from '../../core/reportExporter';
import { isValidParcelForFarm } from '../../core/inventoryParcels';
import { captureImageWithGps } from '../../core/mediaCapture';

const hasFilledValue = (value) => {
  if (Array.isArray(value)) {
    return value.some((item) => hasFilledValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((cellValue) => hasFilledValue(cellValue));
  }

  return value !== null
    && value !== undefined
    && value.toString().trim().length > 0;
};

const photoUriFromValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.uri || '';
  return '';
};

const GPS_TRACK_DISTANCE_METERS = 10;
const GPS_TRACK_INTERVAL_MS = 15000;
const GPS_TRACK_MAX_POINTS = 1200;
const GPS_OCCURRENCE_TIMEOUT_MS = 6500;
const DRAFT_SAVE_DELAY_MS = 700;
const SAVE_SUCCESS_FEEDBACK_MS = 1200;
const DRAFT_KEY_PREFIX = 'draft_formulario_';

const createGpsSessionId = () => (
  `gpssess_${Date.now()}_${Math.floor(Math.random() * 1000)}`
);

const draftKeyFor = (formId) => `${DRAFT_KEY_PREFIX}${formId}`;

const initialValuesForFields = (fields) => {
  const initialValues = {};
  if (!Array.isArray(fields)) return initialValues;

  fields.forEach((field) => {
    if (['linhas_cqo_corte', 'linhas_cqo_carreamento'].includes(field.tipo)) {
      initialValues[field.id] = initialLineValue(field.tipo);
    } else if (field.tipo === 'acompanhamento') {
      initialValues[field.id] = { teve: 'nao', matricula: '', nome: '' };
    } else {
      initialValues[field.id] = '';
    }
  });
  return initialValues;
};

const readDraft = (formId) => {
  if (!formId) return null;
  const key = draftKeyFor(formId);

  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }

    const row = AppDatabase.getFirst('SELECT valor FROM app_meta WHERE chave = ?', [key]);
    return row?.valor ? JSON.parse(row.valor) : null;
  } catch (error) {
    console.warn('Draft read unavailable:', error);
    return null;
  }
};

const writeDraft = (formId, payload) => {
  if (!formId) return;
  const key = draftKeyFor(formId);
  const now = new Date().toISOString();
  const value = JSON.stringify({
    ...payload,
    atualizado_em: now,
  });

  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }

    AppDatabase.run(
      'INSERT OR REPLACE INTO app_meta (chave, valor, atualizado_em) VALUES (?, ?, ?)',
      [key, value, now]
    );
  } catch (error) {
    console.warn('Draft write unavailable:', error);
  }
};

const clearDraft = (formId) => {
  if (!formId) return;
  const key = draftKeyFor(formId);

  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }

    AppDatabase.run('DELETE FROM app_meta WHERE chave = ?', [key]);
  } catch (error) {
    console.warn('Draft clear unavailable:', error);
  }
};

async function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

const parseGpsText = (value) => {
  if (!value) return null;
  const parts = value.toString().split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const latitude = parseFloat(parts[0]);
  const longitude = parseFloat(parts[1]);
  const precisao = parseFloat(parts[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    precisao: Number.isFinite(precisao) ? precisao : null,
  };
};

const formatTrackPoint = (position, source = 'auto', extra = {}) => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  precisao: position.coords.accuracy ?? null,
  altitude: position.coords.altitude ?? null,
  velocidade: position.coords.speed ?? null,
  direcao: position.coords.heading ?? null,
  capturado_em: new Date(position.timestamp || Date.now()).toISOString(),
  source,
  ...extra,
});

const formatManualTrackPoint = (value, source = 'manual') => {
  const parsed = parseGpsText(value);
  if (!parsed) return null;
  return {
    latitude: parsed.latitude,
    longitude: parsed.longitude,
    precisao: parsed.precisao,
    altitude: null,
    velocidade: null,
    direcao: null,
    capturado_em: new Date().toISOString(),
    source,
  };
};

const getCqoGpsOccurrences = (values) => {
  const rows = [
    ...(Array.isArray(values.linhas_corte) ? values.linhas_corte : []),
    ...(Array.isArray(values.linhas_carreamento) ? values.linhas_carreamento : []),
  ];

  return rows.flatMap((row, rowIndex) => {
    const occurrences = Array.isArray(row?._gps_ocorrencias) ? row._gps_ocorrencias : [];
    return occurrences.flatMap((occurrence) => {
      const quantity = Math.max(1, Number(occurrence.quantidade) || 1);
      return Array.from({ length: quantity }, (_, quantityIndex) => ({
        ...occurrence,
        id: `${occurrence.id || `occ_${rowIndex}`}_${quantityIndex + 1}`,
        quantidade: 1,
        linha_index: rowIndex + 1,
        rua_index: occurrence.rua_index || row?.rua_index || Math.floor(rowIndex / 2) + 1,
        lado_linha: occurrence.lado_linha || row?.lado_linha || (rowIndex % 2) + 1,
        linha: occurrence.linha || row?.linha || '',
        matricula_colaborador: occurrence.matricula_colaborador || row?.matricula_colaborador || null,
      }));
    });
  });
};

const getCqoLineEvidences = (values) => {
  const rows = [
    ...(Array.isArray(values.linhas_corte) ? values.linhas_corte : []),
    ...(Array.isArray(values.linhas_carreamento) ? values.linhas_carreamento : []),
  ];

  return rows.flatMap((row, rowIndex) => {
    const legacyPhotos = row?.evidencia_foto ? [{
      ...row.evidencia_foto,
      campo_id: 'foto_linha',
      titulo: 'Foto da linha',
    }] : [];
    const groupedPhotos = row?._evidencias_fotos && typeof row._evidencias_fotos === 'object'
      ? Object.entries(row._evidencias_fotos).flatMap(([fieldId, photos]) => (
        Array.isArray(photos)
          ? photos.map((photo) => ({
            ...photo,
            campo_id: photo.campo_id || fieldId,
          }))
          : []
      ))
      : [];

    return [...legacyPhotos, ...groupedPhotos].map((photo) => ({
      ...photo,
      linha_index: rowIndex + 1,
      rua_index: photo?.rua_index || row?.rua_index || Math.floor(rowIndex / 2) + 1,
      lado_linha: photo?.lado_linha || row?.lado_linha || (rowIndex % 2) + 1,
      linha: photo?.linha || row?.linha || '',
      matricula_colaborador: row?.matricula_colaborador || null,
    }));
  });
};

const initialLineValue = (fieldType) => {
  if (fieldType === 'linhas_cqo_carreamento') {
    const createCarreamentoLine = (ruaIndex, ladoLinha) => ({
      rua_index: ruaIndex,
      lado_linha: ladoLinha,
      linha: '',
      numero_plantas_linha: '',
      cacho_mal_posicionado: '',
      cacho_nao_carreado: '',
    });

    return [
      createCarreamentoLine(1, 1),
      createCarreamentoLine(1, 2),
    ];
  }

  if (fieldType === 'linhas_cqo_corte') {
    const createCorteLine = (ruaIndex, ladoLinha) => ({
      rua_index: ruaIndex,
      lado_linha: ladoLinha,
      linha: '',
      matricula_colaborador: '',
      numero_plantas_linha: '',
      numero_plantas_observadas: '',
      numero_cachos_observados_papel: '',
      cacho_esquecido_ciclo: '',
      cacho_verde: '',
      cacho_maduro: '',
      cacho_passado: '',
      cacho_infermo: '',
      bucha: '',
      folha_mamando: '',
      cacho_talo_comprido: '',
      folha_cortada_indevida: '',
      cacho_mal_posicionado: '',
      cacho_estrela: '',
      cacho_brocado: '',
      cacho_avermelhado: '',
      _plantas_cacho_esquecido: [],
      _evidencias_fotos: {},
    });

    return [
      createCorteLine(1, 1),
      createCorteLine(1, 2),
    ];
  }

  return [];
};

export default function FormularioPreencher() {
  const router = useRouter();
  const { formId, titulo, respostaId } = useLocalSearchParams();
  const currentFormId = Array.isArray(formId) ? formId[0] : formId;
  const currentRespostaId = Array.isArray(respostaId) ? respostaId[0] : respostaId;

  const [form, setForm] = useState(null);
  const [campos, setCampos] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [gpsTrack, setGpsTrack] = useState([]);
  const [isTrackingGps, setIsTrackingGps] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const scrollRef = useRef(null);
  const saveFeedbackAnim = useRef(new Animated.Value(0)).current;
  const gpsWatchRef = useRef(null);
  const lastGpsPointRef = useRef(null);
  const gpsSessionIdRef = useRef(createGpsSessionId());
  const hasUserEditedRef = useRef(false);
  const draftReadyRef = useRef(false);

  useEffect(() => {
    try {
      draftReadyRef.current = false;
      hasUserEditedRef.current = false;
      setDraftSavedAt(null);
      setLoadError(null);
      const result = AppDatabase.getFirst('SELECT * FROM formularios WHERE id = ?', [currentFormId]);
      if (!result) {
        throw new Error('formulario_nao_encontrado');
      }

      setForm(result);
      const parsedCampos = parseCamposJson(result.campos_json);
      if (parsedCampos.length === 0) {
        throw new Error('schema_formulario_invalido');
      }
      setCampos(parsedCampos);

      const initialValues = initialValuesForFields(parsedCampos);
      const existingResponse = currentRespostaId
        ? AppDatabase.getFirst('SELECT * FROM respostas WHERE id = ?', [currentRespostaId])
        : null;
      const existingValues = existingResponse?.dados_json ? JSON.parse(existingResponse.dados_json) : null;
      const draft = currentRespostaId ? null : readDraft(currentFormId);
      const draftValues = draft?.values && typeof draft.values === 'object'
        ? { ...initialValues, ...draft.values }
        : existingValues && typeof existingValues === 'object'
          ? { ...initialValues, ...existingValues }
          : initialValues;
      const draftTrack = Array.isArray(draft?.gpsTrack) ? draft.gpsTrack : [];

      setFormValues(draftValues);
      setGpsTrack(draftTrack);
      gpsSessionIdRef.current = draft?.session_id || createGpsSessionId();
      lastGpsPointRef.current = draftTrack[draftTrack.length - 1] || null;
      setDraftSavedAt(draft?.atualizado_em || null);
      hasUserEditedRef.current = false;
      draftReadyRef.current = true;
    } catch (e) {
      console.error('Error loading form template:', e);
      setLoadError(e?.message || 'erro_formulario');
      Alert.alert('Erro', 'Não foi possível carregar o formulário.');
    } finally {
      setIsLoading(false);
    }
  }, [currentFormId, currentRespostaId]);

  useEffect(() => {
    if (isLoading || !draftReadyRef.current || !hasUserEditedRef.current) {
      return undefined;
    }

    const payload = {
      values: formValues,
      gpsTrack,
      session_id: gpsSessionIdRef.current,
    };

    const saveDraft = (updateState = true) => {
      const savedAt = new Date().toISOString();
      writeDraft(currentFormId, payload);
      if (updateState) setDraftSavedAt(savedAt);
    };

    const timer = setTimeout(saveDraft, DRAFT_SAVE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      saveDraft(false);
    };
  }, [currentFormId, formValues, gpsTrack, isLoading]);

  useEffect(() => {
    if (!saveFeedback) return undefined;

    saveFeedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(saveFeedbackAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(SAVE_SUCCESS_FEEDBACK_MS),
      Animated.timing(saveFeedbackAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setSaveFeedback(null));

    return undefined;
  }, [saveFeedback, saveFeedbackAnim]);

  useEffect(() => {
    const applyNetworkState = (state) => {
      setIsOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    };

    NetInfo.fetch().then(applyNetworkState);
    const unsubscribe = NetInfo.addEventListener(applyNetworkState);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const isCqoTrackingForm = currentFormId === 'form_cqo_corte'
      || currentFormId === 'form_cqo_carreamento_fruto_solto';

    const stopGpsWatch = () => {
      gpsWatchRef.current?.remove?.();
      gpsWatchRef.current = null;
      setIsTrackingGps(false);
    };

    if (!isCqoTrackingForm || isLoading) {
      stopGpsWatch();
      return undefined;
    }

    let isActive = true;
    const appendPoint = (point) => {
      lastGpsPointRef.current = point;
      setGpsTrack((prev) => [...prev, point].slice(-GPS_TRACK_MAX_POINTS));
    };

    const startGpsTracking = async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (isActive) setIsTrackingGps(false);
          return;
        }

        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (isActive) setIsTrackingGps(false);
          return;
        }

        const initialPosition = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (isActive) appendPoint(formatTrackPoint(initialPosition, 'inicio', {
          session_id: gpsSessionIdRef.current,
        }));

        const watch = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: GPS_TRACK_INTERVAL_MS,
            distanceInterval: GPS_TRACK_DISTANCE_METERS,
            mayShowUserSettingsDialog: true,
          },
          (position) => {
            if (isActive) appendPoint(formatTrackPoint(position, 'auto', {
              session_id: gpsSessionIdRef.current,
            }));
          }
        );

        if (!isActive) {
          watch.remove();
          return;
        }

        gpsWatchRef.current = watch;
        setIsTrackingGps(true);
      } catch (error) {
        console.warn('GPS tracking unavailable:', error);
        if (isActive) setIsTrackingGps(false);
      }
    };

    startGpsTracking();

    return () => {
      isActive = false;
      stopGpsWatch();
    };
  }, [currentFormId, isLoading]);

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

  const captureOccurrenceGps = async (metadata = {}) => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) return lastGpsPointRef.current;

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return lastGpsPointRef.current;

      const position = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          mayShowUserSettingsDialog: true,
        }),
        GPS_OCCURRENCE_TIMEOUT_MS
      );
      const point = {
        ...formatTrackPoint(position, 'ocorrencia', {
          session_id: gpsSessionIdRef.current,
        }),
        session_id: gpsSessionIdRef.current,
        occurrence_meta: metadata,
      };
      lastGpsPointRef.current = point;
      setGpsTrack((prev) => [...prev, point].slice(-GPS_TRACK_MAX_POINTS));
      return point;
    } catch (error) {
      console.warn('GPS occurrence capture unavailable:', error);
      return lastGpsPointRef.current
        ? {
          ...lastGpsPointRef.current,
          source: 'ocorrencia_fallback',
          session_id: gpsSessionIdRef.current,
          capturado_em: new Date().toISOString(),
          occurrence_meta: metadata,
        }
        : null;
    }
  };

  const captureLinePhoto = async (metadata = {}) => {
    try {
      const photo = await captureImageWithGps();
      if (!photo) return null;
      return {
        ...photo,
        session_id: gpsSessionIdRef.current,
        source: 'linha_camera',
        occurrence_meta: metadata,
      };
    } catch (error) {
      if (error?.message === 'permissao_media') {
        Alert.alert('Permissao necessaria', 'O aplicativo precisa de acesso a camera.');
      } else {
        Alert.alert('Erro', 'Nao foi possivel capturar a foto da linha.');
      }
      return null;
    }
  };

  const handleValueChange = (fieldId, val) => {
    hasUserEditedRef.current = true;
    setFormValues((prev) => {
      const nextValues = {
        ...prev,
        [fieldId]: val,
      };

      if (fieldId === 'nome_fazenda' && prev.parcela && !isValidParcelForFarm(val, prev.parcela)) {
        nextValues.parcela = '';
      }

      return nextValues;
    });

    if (fieldId.startsWith('gps_')) {
      const point = formatManualTrackPoint(val);
      if (point) {
        setGpsTrack((prev) => [...prev, point].slice(-GPS_TRACK_MAX_POINTS));
      }
    }

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

    const parcelaValue = formValues.parcela;
    if (
      hasFilledValue(parcelaValue)
      && formValues.nome_fazenda
      && !isValidParcelForFarm(formValues.nome_fazenda, parcelaValue)
    ) {
      errors.parcela = 'Selecione uma parcela existente para a fazenda informada.';
      isValid = false;
    }

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

      const respostaIdFinal = currentRespostaId || `res_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const dateStr = new Date().toISOString();
      const mapeamentoLegado = buildLegacyPayload(currentFormId, formValues);
      const gpsTrackPayload = gpsTrack.map((point, index) => ({
        ...point,
        ordem: index + 1,
      }));
      const cqoGpsOccurrences = getCqoGpsOccurrences(formValues);
      const cqoLineEvidences = getCqoLineEvidences(formValues);
      const valuesForSave = {
        ...formValues,
        gps_track: gpsTrackPayload,
        cqo_ocorrencias_gps: cqoGpsOccurrences,
        cqo_evidencias_foto: cqoLineEvidences,
        gps_track_meta: {
          session_id: gpsSessionIdRef.current,
          modo: 'coleta_continua',
          intervalo_ms: GPS_TRACK_INTERVAL_MS,
          distancia_metros: GPS_TRACK_DISTANCE_METERS,
          total_pontos: gpsTrackPayload.length,
          total_ocorrencias: cqoGpsOccurrences.length,
          iniciado_em: gpsTrackPayload[0]?.capturado_em || null,
          finalizado_em: gpsTrackPayload[gpsTrackPayload.length - 1]?.capturado_em || null,
        },
      };

      if (currentRespostaId) {
        AppDatabase.run('DELETE FROM sync_queue WHERE referencia_id = ?', [currentRespostaId]);
        AppDatabase.run('DELETE FROM anexos WHERE resposta_id = ?', [currentRespostaId]);
        AppDatabase.run('DELETE FROM gps WHERE resposta_id = ?', [currentRespostaId]);
        AppDatabase.run('DELETE FROM assinaturas WHERE resposta_id = ?', [currentRespostaId]);
      }

      // 1. Save response in respuestas table
      AppDatabase.insert('respostas', {
        id: respostaIdFinal,
        formulario_id: currentFormId,
        usuario_id: userId,
        dados_json: JSON.stringify(valuesForSave),
        status: 'pendente',
        criado_em: dateStr,
      });

      // 2. Scan for specific native fields to populate sub-tables
      campos.forEach((field) => {
        const val = formValues[field.id];
        if (Array.isArray(val) || !hasFilledValue(val)) return;

        const textVal = val.toString();

        if (field.tipo === 'foto') {
          const photoUri = photoUriFromValue(val);
          if (!photoUri) return;

          AppDatabase.insert('anexos', {
            id: `anexo_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            resposta_id: respostaIdFinal,
            campo_id: field.id,
            caminho_local: photoUri,
            nome_arquivo: photoUri.split('/').pop() || 'photo.jpg',
            tamanho_bytes: 0,
            tipo_mime: 'image/jpeg',
            enviado: 0,
            criado_em: dateStr,
          });

          if (val?.gps) {
            AppDatabase.insert('gps', {
              id: `gps_foto_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              resposta_id: respostaIdFinal,
              campo_id: field.id,
              latitude: val.gps.latitude,
              longitude: val.gps.longitude,
              precisao: val.gps.precisao,
              altitude: val.gps.altitude,
              capturado_em: val.gps.capturado_em || dateStr,
            });
          }
        } else if (field.tipo === 'assinatura') {
          AppDatabase.insert('assinaturas', {
            id: `sig_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            resposta_id: respostaIdFinal,
            campo_id: field.id,
            caminho_png: textVal,
            enviado: 0,
            criado_em: dateStr,
          });
        } else if (field.tipo === 'gps') {
          const parsedGps = parseGpsText(textVal);
          if (parsedGps) {
            AppDatabase.insert('gps', {
              id: `gps_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              resposta_id: respostaIdFinal,
              campo_id: field.id,
              latitude: parsedGps.latitude,
              longitude: parsedGps.longitude,
              precisao: parsedGps.precisao,
              altitude: null,
              capturado_em: dateStr,
            });
          }
        }
      });

      gpsTrackPayload.forEach((point) => {
        AppDatabase.insert('gps', {
          id: `gps_track_${Date.now()}_${point.ordem}_${Math.floor(Math.random() * 1000)}`,
          resposta_id: respostaIdFinal,
          campo_id: 'gps_track',
          latitude: point.latitude,
          longitude: point.longitude,
          precisao: point.precisao,
          altitude: point.altitude,
          capturado_em: point.capturado_em || dateStr,
        });
      });

      cqoGpsOccurrences.forEach((occurrence, index) => {
        const occurrenceLocationId = occurrence.linha || `rua_${occurrence.rua_index || occurrence.linha_index || index + 1}_lado_${occurrence.lado_linha || 1}`;
        AppDatabase.insert('gps', {
          id: `gps_ocorrencia_${Date.now()}_${index + 1}_${Math.floor(Math.random() * 1000)}`,
          resposta_id: respostaIdFinal,
          campo_id: `ocorrencia_${occurrence.campo_id}_linha_${occurrenceLocationId}`,
          latitude: occurrence.latitude,
          longitude: occurrence.longitude,
          precisao: occurrence.precisao,
          altitude: occurrence.altitude,
          capturado_em: occurrence.capturado_em || dateStr,
        });
      });

      cqoLineEvidences.forEach((photo, index) => {
        const photoCampoId = photo.campo_id || 'foto_linha';
        const photoLocationId = photo.linha || `rua_${photo.rua_index || photo.linha_index || index + 1}_lado_${photo.lado_linha || 1}`;
        const photoFieldId = `foto_${photoCampoId}_linha_${photoLocationId}`;

        AppDatabase.insert('anexos', {
          id: `anexo_linha_${Date.now()}_${index + 1}_${Math.floor(Math.random() * 1000)}`,
          resposta_id: respostaIdFinal,
          campo_id: photoFieldId,
          caminho_local: photo.uri,
          nome_arquivo: photo.uri.split('/').pop() || 'linha.jpg',
          tamanho_bytes: 0,
          tipo_mime: photo.mimeType || 'image/jpeg',
          enviado: 0,
          criado_em: photo.capturedAt || dateStr,
        });

        if (photo.gps) {
          AppDatabase.insert('gps', {
            id: `gps_linha_${Date.now()}_${index + 1}_${Math.floor(Math.random() * 1000)}`,
            resposta_id: respostaIdFinal,
            campo_id: photoFieldId,
            latitude: photo.gps.latitude,
            longitude: photo.gps.longitude,
            precisao: photo.gps.precisao,
            altitude: photo.gps.altitude,
            capturado_em: photo.gps.capturado_em || photo.capturedAt || dateStr,
          });
        }
      });

      observacaoFotos(formValues).forEach((photo, index) => {
        const photoFieldId = `foto_observacao_${index + 1}`;

        AppDatabase.insert('anexos', {
          id: `anexo_observacao_${Date.now()}_${index + 1}_${Math.floor(Math.random() * 1000)}`,
          resposta_id: respostaIdFinal,
          campo_id: photoFieldId,
          caminho_local: photo.uri,
          nome_arquivo: photo.uri?.split('/').pop() || `observacao_${index + 1}.jpg`,
          tamanho_bytes: 0,
          tipo_mime: photo.mimeType || 'image/jpeg',
          enviado: 0,
          criado_em: photo.capturedAt || dateStr,
        });

        if (photo.gps) {
          AppDatabase.insert('gps', {
            id: `gps_observacao_${Date.now()}_${index + 1}_${Math.floor(Math.random() * 1000)}`,
            resposta_id: respostaIdFinal,
            campo_id: photoFieldId,
            latitude: photo.gps.latitude,
            longitude: photo.gps.longitude,
            precisao: photo.gps.precisao,
            altitude: photo.gps.altitude,
            capturado_em: photo.gps.capturado_em || photo.capturedAt || dateStr,
          });
        }
      });

      // 3. Queue item for sync transmission
      AppDatabase.insert('sync_queue', {
        id: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        tipo: 'resposta',
        referencia_id: respostaIdFinal,
        payload_json: JSON.stringify({
          resposta_id: respostaIdFinal,
          formulario_id: currentFormId,
          formulario_versao: form?.versao || null,
          usuario_id: userId,
          dados: valuesForSave,
          mapeamento_legado: mapeamentoLegado,
          gps_pontos: [
            ...gpsTrackPayload.map((point) => ({
              session_id: point.session_id || gpsSessionIdRef.current,
              source: point.source || 'auto',
              campo_id: 'gps_track',
              latitude: point.latitude,
              longitude: point.longitude,
              precisao: point.precisao,
              altitude: point.altitude,
              capturado_em: point.capturado_em || dateStr,
            })),
            ...cqoGpsOccurrences.map((occurrence, index) => {
              const occurrenceLocationId = occurrence.linha || `rua_${occurrence.rua_index || occurrence.linha_index || index + 1}_lado_${occurrence.lado_linha || 1}`;
              return {
                session_id: occurrence.session_id || gpsSessionIdRef.current,
                source: occurrence.source || 'ocorrencia',
                campo_id: `ocorrencia_${occurrence.campo_id}_linha_${occurrenceLocationId}`,
                latitude: occurrence.latitude,
                longitude: occurrence.longitude,
                precisao: occurrence.precisao,
                altitude: occurrence.altitude,
                capturado_em: occurrence.capturado_em || dateStr,
              };
            }),
          ],
          criado_em: dateStr,
        }),
        status: 'pendente',
        tentativas: 0,
        max_tentativas: 3,
        criado_em: dateStr,
      });

      clearDraft(currentFormId);
      hasUserEditedRef.current = false;
      setDraftSavedAt(null);
      setSaveFeedback({
        title: currentRespostaId ? 'Coleta atualizada na fila' : 'Coleta enviada para a fila',
        subtitle: currentRespostaId ? 'Voltando para a lista de coletas.' : 'Os campos serão liberados para a próxima coleta.',
      });
      scrollRef.current?.scrollTo({ y: 0, animated: true });

      await new Promise((resolve) => setTimeout(resolve, SAVE_SUCCESS_FEEDBACK_MS + 260));

      if (currentRespostaId) {
        router.back();
      } else {
        setFormValues(initialValuesForFields(campos));
        setFormErrors({});
        setGpsTrack([]);
        gpsSessionIdRef.current = createGpsSessionId();
        lastGpsPointRef.current = null;
      }
    } catch (e) {
      console.error('Error saving collected form:', e);
      Alert.alert('Erro', `Falha ao gravar os dados: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLocalResponse = (responseId) => {
    AppDatabase.run('DELETE FROM sync_queue WHERE referencia_id = ?', [responseId]);
    AppDatabase.run('DELETE FROM anexos WHERE resposta_id = ?', [responseId]);
    AppDatabase.run('DELETE FROM gps WHERE resposta_id = ?', [responseId]);
    AppDatabase.run('DELETE FROM assinaturas WHERE resposta_id = ?', [responseId]);
    AppDatabase.run('DELETE FROM respostas WHERE id = ?', [responseId]);
  };

  const resetCurrentCollection = () => {
    const initialValues = initialValuesForFields(campos);
    clearDraft(currentFormId);
    setFormValues(initialValues);
    setFormErrors({});
    setGpsTrack([]);
    setDraftSavedAt(null);
    gpsSessionIdRef.current = createGpsSessionId();
    lastGpsPointRef.current = null;
    hasUserEditedRef.current = false;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleDiscardCollection = () => {
    Alert.alert(
      'Descartar coleta',
      'Deseja excluir esta coleta local e comecar uma nova em branco?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            if (currentRespostaId) {
              deleteLocalResponse(currentRespostaId);
              router.back();
              return;
            }

            resetCurrentCollection();
            setSaveFeedback({
              title: 'Coleta descartada',
              subtitle: 'Os campos foram limpos para iniciar uma nova avaliacao.',
            });
          },
        },
      ]
    );
  };

  const handleExport = async (format) => {
    try {
      await exportRecord({
        type: currentFormId === 'form_cqo_carreamento_fruto_solto' ? 'carreamento' : 'corte',
        values: formValues,
        format,
      });
    } catch (error) {
      Alert.alert('Erro', `Não foi possível gerar o arquivo: ${error.message}`);
    }
  };

  const renderField = (field) => {
    const isCqoCorte = currentFormId === 'form_cqo_corte';
    const isCarreamento = currentFormId === 'form_cqo_carreamento_fruto_solto';
    const isCqo = isCqoCorte || isCarreamento;
    const props = {
      key: field.id,
      field,
      value: formValues[field.id],
      onChange: (val) => handleValueChange(field.id, val),
      error: formErrors[field.id],
      visualMode: 'default',
      captureOccurrenceGps,
      captureLinePhoto,
    };

    if (field.id === 'parcela') {
      return (
        <CampoParcela
          {...props}
          farmName={formValues.nome_fazenda}
        />
      );
    }

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
      case 'acompanhamento': return <CampoAcompanhamento {...props} />;
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

  if (loadError || !form) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7FAF6" />
        <TopBar title="Formulario" showBack compact />
        <View style={styles.formErrorState}>
          <MaterialCommunityIcons name="file-alert-outline" size={42} color={Colors.danger} />
          <Text style={styles.formErrorTitle}>Formulario indisponivel</Text>
          <Text style={styles.formErrorText}>
            Sincronize o app novamente ou escolha outro formulario.
          </Text>
        </View>
        <BottomNav active="forms" />
      </View>
    );
  }

  const { ratio, percentage, filled } = getProgressInfo();
  const isCqoCorte = currentFormId === 'form_cqo_corte';
  const isCarreamento = currentFormId === 'form_cqo_carreamento_fruto_solto';
  const isCqo = isCqoCorte || isCarreamento;
  const heroTitle = isCarreamento ? 'Carreamento' : isCqoCorte ? 'Corte' : (titulo || 'Coleta');

  return (
    <KeyboardAvoidingView
      style={[styles.container, isCqo ? styles.cqoContainer : null]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F7FAF6" />
      <TopBar title={heroTitle} showBack compact />

      {/* Fields List */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContainer,
          isCqo ? styles.cqoScrollContainer : null,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {isCqo ? (
          <View style={styles.paperProgressHeader}>
            {saveFeedback ? (
              <Animated.View
                style={[
                  styles.saveFeedback,
                  {
                    opacity: saveFeedbackAnim,
                    transform: [{
                      translateY: saveFeedbackAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    }],
                  },
                ]}
              >
                <Text style={styles.saveFeedbackTitle}>{saveFeedback.title}</Text>
                <Text style={styles.saveFeedbackSubtitle}>{saveFeedback.subtitle}</Text>
              </Animated.View>
            ) : null}
            <View style={styles.paperTitleRow}>
              <View style={styles.paperTitleBlock}>
                <Text style={styles.paperEyebrow}>{isCarreamento ? 'Qualidade Agrícola' : 'Piloto CQO'}</Text>
                <Text style={styles.paperTitle}>{heroTitle}</Text>
              </View>
              <View style={styles.paperHeaderActions}>
                <TouchableOpacity style={styles.discardButton} onPress={handleDiscardCollection}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color="#9F1239" />
                  <Text style={styles.discardButtonText}>Descartar</Text>
                </TouchableOpacity>
                <Chip
                  compact
                  icon={isOnline ? 'wifi' : 'cloud-off-outline'}
                  style={isOnline ? styles.onlineChip : styles.offlineChip}
                  textStyle={isOnline ? styles.onlineChipText : styles.offlineChipText}
                >
                  {isOnline ? 'Online' : 'Offline'}
                </Chip>
              </View>
            </View>
            <View style={styles.progressTextRow}>
              <Text style={[styles.progressLabel, styles.cqoProgressLabel]}>
                {filled} de {campos.length} campos preenchidos
              </Text>
              <Text style={[styles.progressPercent, styles.cqoProgressPercent]}>{percentage}%</Text>
            </View>
            <ProgressBar progress={ratio} color={Colors.greenInstitutional} style={styles.paperProgressBar} />
            <Text style={styles.gpsTrackText}>
              GPS trilha: {isTrackingGps ? `${gpsTrack.length} pontos coletados` : 'aguardando permissão ou sinal'}
            </Text>
            {draftSavedAt ? (
              <Text style={styles.draftStatusText}>
                Rascunho salvo automaticamente
              </Text>
            ) : null}
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

        {form?.descricao && !isCqo ? (
          <Text style={styles.formDescription}>{form.descricao}</Text>
        ) : null}

        {isCqoCorte ? (
          <>
            {renderCqoCorteSection(
              'Identificação da coleta',
              'Dados principais usados para organizar a avaliação no escritório.',
              ['nome_polo', 'nome_fazenda', 'parcela', 'data_avaliacao', 'ciclo_mes']
            )}
            {renderCqoCorteSection(
              'Responsáveis',
              'Informe quem avaliou e quem acompanhou a coleta.',
              ['matricula_avaliador', 'matricula_avaliador_2', 'fiscal_resp', 'fiscal_resp_equipe']
            )}
            {campos.find((field) => field.id === 'linhas_corte') ? renderField(campos.find((field) => field.id === 'linhas_corte')) : null}
            {renderCqoCorteSection(
              'Fechamento',
              'Registre observações e acompanhamento da coleta.',
              ['observacao', 'acompanhamento']
            )}
          </>
        ) : isCarreamento ? (
          <>
            {renderCqoCorteSection(
              'Identificação da coleta',
              'Dados principais usados para organizar a avaliação no escritório.',
              [
                'nome_polo',
                'nome_fazenda',
                'parcela',
                'ano_plantio',
                'densidade',
                'total_plantas_parcela',
                'total_cachos_carreados',
                'variedade',
                'data_avaliacao',
                'ciclo_mes',
              ]
            )}
            {renderCqoCorteSection(
              'Responsáveis',
              'Informe quem avaliou e quem fiscalizou a coleta.',
              ['matricula_avaliador', 'matricula_avaliador_2', 'fiscal_resp', 'fiscal_resp_equipe']
            )}
            {campos.find((field) => field.id === 'linhas_carreamento') ? renderField(campos.find((field) => field.id === 'linhas_carreamento')) : null}
            {renderCqoCorteSection(
              'Fechamento',
              'Registre observações e acompanhamento da coleta.',
              ['observacao', 'acompanhamento']
            )}
          </>
        ) : (
          campos.map((field) => renderField(field))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      <View
        style={[
          styles.bottomBar,
          isCqo ? styles.cqoBottomBar : null,
          isKeyboardVisible ? styles.bottomBarKeyboard : null,
        ]}
      >
        {isCqo ? (
          <>
            <View style={styles.exportButtonRow}>
              <PaperButton
                mode="outlined"
                icon="file-pdf-box"
                onPress={() => handleExport('pdf')}
                style={styles.paperExportButton}
                contentStyle={styles.paperExportButtonContent}
              >
                PDF
              </PaperButton>
            </View>
            <PaperButton
              mode="contained"
              icon="content-save-outline"
              onPress={handleSave}
              disabled={isSaving}
              loading={isSaving}
              style={styles.paperSaveButton}
              contentStyle={styles.paperSaveButtonContent}
            >
              Enviar para fila
            </PaperButton>
          </>
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
      {!isKeyboardVisible ? <BottomNav active="forms" /> : null}
    </KeyboardAvoidingView>
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
  formErrorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 92,
    backgroundColor: Colors.background,
  },
  formErrorTitle: {
    color: Colors.grayDark,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  formErrorText: {
    color: Colors.grayText,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
    textAlign: 'center',
  },
  progressHeader: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderBottomColor: Colors.cardBorder,
    borderColor: Colors.cardBorder,
  },
  paperProgressHeader: {
    backgroundColor: Colors.greenDark,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderBottomWidth: 0,
  },
  saveFeedback: {
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  saveFeedbackTitle: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '900',
  },
  saveFeedbackSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  paperTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
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
    fontSize: 27,
    fontWeight: '900',
  },
  paperHeaderActions: {
    alignItems: 'flex-end',
    gap: 7,
  },
  discardButton: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: 'rgba(159,18,57,0.24)',
    borderRadius: 8,
    backgroundColor: '#FFE4E6',
  },
  discardButtonText: {
    color: '#9F1239',
    fontSize: 11,
    fontWeight: '900',
  },
  paperSubtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  offlineChip: {
    backgroundColor: Colors.orangeLight,
  },
  offlineChipText: {
    color: Colors.orangeInstitutional,
    fontWeight: '800',
  },
  onlineChip: {
    backgroundColor: Colors.greenLight,
  },
  onlineChipText: {
    color: Colors.greenInstitutional,
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
    height: 9,
    borderRadius: 6,
    backgroundColor: '#FFFFFF45',
  },
  gpsTrackText: {
    color: '#D8F3E6',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  draftStatusText: {
    color: Colors.orangeLight,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  scrollContainer: {
    padding: 20,
  },
  cqoScrollContainer: {
    padding: 14,
    paddingTop: 12,
  },
  paperSectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(32,49,37,0.09)',
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
    marginBottom: 78,
  },
  cqoBottomBar: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.cardBorder,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bottomBarKeyboard: {
    display: 'none',
  },
  saveButton: {
    backgroundColor: Colors.greenInstitutional,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  paperSaveButton: {
    borderRadius: 8,
    backgroundColor: Colors.orangeInstitutional,
  },
  paperSaveButtonContent: {
    minHeight: 52,
  },
  exportButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  paperExportButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: Colors.greenInstitutional,
  },
  paperExportButtonContent: {
    minHeight: 42,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
