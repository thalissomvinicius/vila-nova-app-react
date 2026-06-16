import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  Button,
  Card,
  Divider,
  HelperText,
  IconButton,
  TextInput as PaperTextInput,
} from 'react-native-paper';
import { Colors } from '../core/colors';
import { normalizeIntegerInput, readIntegerInput } from '../core/numberInput';

const FIELD_DEFINITIONS = [
  { id: 'linha', titulo: 'Linha', keyboardType: 'default' },
  { id: 'numero_plantas_linha', titulo: 'Nº de plantas/linha' },
  { id: 'numero_plantas_observadas', titulo: 'Nº de plantas observadas', legado: 'NumeroPlantasObservadas' },
  { id: 'numero_cachos_observados_papel', titulo: 'Nº de cachos observados' },
  { id: 'cacho_esquecido_ciclo', titulo: 'Cacho esquecido', legado: 'CachoEsquecidoCiclo' },
  { id: 'cacho_verde', titulo: 'Cacho verde', legado: 'CachoVerde' },
  { id: 'cacho_maduro', titulo: 'Cacho maduro', legado: 'CachoMaduro' },
  { id: 'cacho_passado', titulo: 'Cacho passado', legado: 'CachoPassado' },
  { id: 'folha_mamando', titulo: 'Folha mamando', legado: 'FolhaMamando' },
  { id: 'cacho_talo_comprido', titulo: 'Cacho talo comprido', legado: 'CachoTaloComprido' },
  { id: 'folha_cortada_indevida', titulo: 'Folha cortada indevida', legado: 'folhaCortadaIndev' },
  { id: 'cacho_mal_posicionado', titulo: 'Cacho mal posicionado', legado: 'cachoMalOosicionado' },
  { id: 'cacho_estrela', titulo: 'Cacho estrela', legado: 'CachoEstrela' },
  { id: 'cacho_brocado', titulo: 'Cacho brocado', legado: 'CachoBrocado' },
  { id: 'cacho_avermelhado', titulo: 'Cacho avermelhado', legado: 'CachoAvermelhado' },
  { id: 'fruto_solto', titulo: 'Fruto solto', legado: 'FrutoSolto' },
  { id: 'ciclo_fruto_solto', titulo: 'Ciclo fruto solto', legado: 'Ciclo FrutoSolto' },
];

const OCCURRENCE_FIELD_IDS = new Set([
  'cacho_esquecido_ciclo',
  'cacho_verde',
  'cacho_maduro',
  'cacho_passado',
  'folha_mamando',
  'cacho_talo_comprido',
  'folha_cortada_indevida',
  'cacho_mal_posicionado',
  'cacho_estrela',
  'cacho_brocado',
  'cacho_avermelhado',
  'fruto_solto',
]);

const createEmptyLine = () => (
  FIELD_DEFINITIONS.reduce((acc, field) => {
    acc[field.id] = field.keyboardType === 'default' ? '' : '';
    return acc;
  }, {})
);

const getOccurrenceCount = (row, fieldId) => {
  const occurrences = Array.isArray(row?._gps_ocorrencias) ? row._gps_ocorrencias : [];
  return occurrences
    .filter((occurrence) => occurrence.campo_id === fieldId)
    .reduce((total, occurrence) => total + (Number(occurrence.quantidade) || 1), 0);
};

function LineField({ definition, value, occurrenceCount, onChange, onNumericChange, isCapturing }) {
  const isNumeric = definition.keyboardType !== 'default';

  const updateByStep = (step) => {
    const current = readIntegerInput(value);
    const nextValue = Math.max(0, current + step);
    onNumericChange(String(nextValue), nextValue - current);
  };

  return (
    <View style={styles.fieldBox}>
      <Text style={styles.fieldLabel}>{definition.titulo}</Text>
      {isNumeric ? (
        <View style={styles.stepper}>
          <IconButton
            icon="minus"
            mode="contained-tonal"
            size={18}
            style={styles.stepIconButton}
            iconColor={Colors.greenInstitutional}
            onPress={() => updateByStep(-1)}
          />
          <PaperTextInput
            mode="outlined"
            style={styles.stepInput}
            value={value === null || value === undefined ? '' : String(value)}
            onChangeText={(textValue) => {
              const current = readIntegerInput(value);
              const normalizedText = normalizeIntegerInput(textValue);
              const next = Math.max(0, readIntegerInput(normalizedText));
              onNumericChange(normalizedText, next - current);
            }}
            keyboardType="numeric"
            placeholder="0"
            dense
            outlineColor={Colors.cardBorder}
            activeOutlineColor={Colors.greenInstitutional}
          />
          {isCapturing ? (
            <View style={[styles.stepIconButton, styles.captureLoadingButton]}>
              <ActivityIndicator color={Colors.white} size="small" />
            </View>
          ) : (
            <IconButton
              icon="plus"
              mode="contained"
              size={18}
              style={styles.stepIconButton}
              iconColor={Colors.white}
              containerColor={Colors.greenInstitutional}
              onPress={() => updateByStep(1)}
            />
          )}
        </View>
      ) : (
        <PaperTextInput
          mode="outlined"
          style={styles.input}
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={onChange}
          keyboardType="default"
          dense
          outlineColor={Colors.cardBorder}
          activeOutlineColor={Colors.greenInstitutional}
        />
      )}
      {occurrenceCount > 0 && (
        <Text style={styles.gpsOccurrenceText}>
          GPS: {occurrenceCount} ocorrencia(s) georreferenciada(s)
        </Text>
      )}
      {isCapturing && (
        <Text style={styles.gpsCaptureText}>Capturando GPS...</Text>
      )}
    </View>
  );
}

function LinePhoto({ photo, onCapture, onRemove, isCapturing }) {
  return (
    <View style={styles.photoBlock}>
      <Text style={styles.photoLabel}>Foto da linha</Text>
      {photo ? (
        <View style={styles.photoPreview}>
          <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
          {photo.gps ? (
            <View style={styles.photoGpsBadge}>
              <Text style={styles.photoGpsBadgeText}>GPS</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.photoRemoveBadge} onPress={onRemove}>
            <Text style={styles.photoRemoveText}>x</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.photoButton} onPress={onCapture} disabled={isCapturing}>
          {isCapturing ? (
            <ActivityIndicator color={Colors.greenInstitutional} size="small" />
          ) : (
            <>
              <Text style={styles.photoButtonIcon}>CAM</Text>
              <Text style={styles.photoButtonText}>Adicionar foto</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function CampoLinhasCqoCorte({ field, value, onChange, error, captureOccurrenceGps, captureLinePhoto }) {
  const rows = Array.isArray(value) ? value : [];
  const obrigatorio = field.obrigatorio === 1 || field.obrigatorio === true;
  const [capturingKey, setCapturingKey] = useState(null);
  const [capturingPhotoKey, setCapturingPhotoKey] = useState(null);

  const handleAddLine = () => {
    onChange([...rows, createEmptyLine()]);
  };

  const handleRemoveLine = (index) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleFieldChange = (rowIndex, fieldId, fieldValue) => {
    onChange(rows.map((row, index) => (
      index === rowIndex ? { ...row, [fieldId]: fieldValue } : row
    )));
  };

  const handlePhotoCapture = async (rowIndex) => {
    if (typeof captureLinePhoto !== 'function') return;
    const captureKey = `photo_${rowIndex}`;
    setCapturingPhotoKey(captureKey);
    try {
      const photo = await captureLinePhoto({
        campo_id: 'foto_linha',
        linha: rows[rowIndex]?.linha || String(rowIndex + 1),
        row_index: rowIndex + 1,
      });
      if (!photo) return;
      onChange(rows.map((row, index) => (
        index === rowIndex ? { ...row, evidencia_foto: photo } : row
      )));
    } finally {
      setCapturingPhotoKey(null);
    }
  };

  const handlePhotoRemove = (rowIndex) => {
    onChange(rows.map((row, index) => (
      index === rowIndex ? { ...row, evidencia_foto: null } : row
    )));
  };

  const removeOccurrenceQuantity = (occurrences, fieldId, quantityToRemove) => {
    let remaining = Math.abs(quantityToRemove);
    const nextOccurrences = [];

    for (let index = occurrences.length - 1; index >= 0; index -= 1) {
      const occurrence = occurrences[index];
      if (occurrence.campo_id !== fieldId || remaining <= 0) {
        nextOccurrences.unshift(occurrence);
        continue;
      }

      const quantity = Number(occurrence.quantidade) || 1;
      if (quantity > remaining) {
        nextOccurrences.unshift({ ...occurrence, quantidade: quantity - remaining });
        remaining = 0;
      } else {
        remaining -= quantity;
      }
    }

    return nextOccurrences;
  };

  const handleNumericChange = async (rowIndex, definition, fieldValue, delta) => {
    const shouldTrackGps = OCCURRENCE_FIELD_IDS.has(definition.id);
    const row = rows[rowIndex] || {};
    let gpsOccurrence = null;

    if (shouldTrackGps && delta > 0 && typeof captureOccurrenceGps === 'function') {
      const captureKey = `${rowIndex}_${definition.id}`;
      setCapturingKey(captureKey);
      try {
        const gps = await captureOccurrenceGps({
          campo_id: definition.id,
          titulo: definition.titulo,
          linha: row.linha || String(rowIndex + 1),
          quantidade: delta,
        });
        if (gps) {
          gpsOccurrence = {
            id: `occ_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            campo_id: definition.id,
            titulo: definition.titulo,
            linha: row.linha || String(rowIndex + 1),
            quantidade: delta,
            ...gps,
          };
        }
      } finally {
        setCapturingKey(null);
      }
    }

    onChange(rows.map((currentRow, index) => {
      if (index !== rowIndex) return currentRow;

      const currentOccurrences = Array.isArray(currentRow._gps_ocorrencias)
        ? currentRow._gps_ocorrencias
        : [];
      let nextOccurrences = currentOccurrences;

      if (shouldTrackGps && delta < 0) {
        nextOccurrences = removeOccurrenceQuantity(currentOccurrences, definition.id, delta);
      } else if (gpsOccurrence) {
        nextOccurrences = [...currentOccurrences, gpsOccurrence];
      }

      return {
        ...currentRow,
        [definition.id]: fieldValue,
        _gps_ocorrencias: nextOccurrences,
      };
    }));
  };

  return (
    <Card style={styles.container} mode="elevated">
      <Card.Content>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{field.titulo}</Text>
        {obrigatorio && <Text style={styles.required}> *</Text>}
      </View>
      <Text style={styles.sectionHint}>
        Registre uma ou mais linhas avaliadas nesta coleta.
      </Text>

      {rows.length === 0 ? (
        <View style={[styles.emptyState, error ? styles.inputError : null]}>
          <Text style={styles.emptyText}>Nenhuma linha adicionada.</Text>
        </View>
      ) : (
        rows.map((row, rowIndex) => (
          <Card style={[styles.lineCard, error ? styles.inputError : null]} key={`linha_${rowIndex}`} mode="outlined">
            <Card.Content>
            <View style={styles.lineHeader}>
              <Text style={styles.lineTitle}>Linha</Text>
              <Button
                mode="text"
                icon="trash-can-outline"
                textColor={Colors.danger}
                compact
                disabled={rows.length <= 1}
                onPress={() => handleRemoveLine(rowIndex)}
              >
                Remover
              </Button>
            </View>
            <Divider style={styles.lineDivider} />

            <View style={styles.fieldsGrid}>
              {FIELD_DEFINITIONS.map((definition) => (
                <LineField
                  key={definition.id}
                  definition={definition}
                  value={row?.[definition.id]}
                  onChange={(fieldValue) => handleFieldChange(rowIndex, definition.id, fieldValue)}
                  onNumericChange={(fieldValue, delta) => handleNumericChange(rowIndex, definition, fieldValue, delta)}
                  occurrenceCount={getOccurrenceCount(row, definition.id)}
                  isCapturing={capturingKey === `${rowIndex}_${definition.id}`}
                />
              ))}
            </View>
            <LinePhoto
              photo={row?.evidencia_foto}
              onCapture={() => handlePhotoCapture(rowIndex)}
              onRemove={() => handlePhotoRemove(rowIndex)}
              isCapturing={capturingPhotoKey === `photo_${rowIndex}`}
            />
            </Card.Content>
          </Card>
        ))
      )}

      <Button
        mode="contained"
        icon="plus"
        onPress={handleAddLine}
        style={styles.addButton}
        contentStyle={styles.addButtonContent}
      >
        Adicionar linha
      </Button>

      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderLeftWidth: 6,
    borderLeftColor: Colors.greenInstitutional,
    borderWidth: 1,
    borderColor: '#D5E5DB',
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.greenDark,
  },
  sectionHint: {
    color: Colors.grayText,
    fontSize: 12,
    marginBottom: 12,
  },
  required: {
    color: Colors.danger,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: '#F8FCFA',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    color: Colors.grayText,
    fontSize: 13,
  },
  lineCard: {
    backgroundColor: '#F8FCFA',
    borderRadius: 12,
    marginBottom: 12,
    borderColor: '#D5E5DB',
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lineTitle: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
    backgroundColor: Colors.greenInstitutional,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lineDivider: {
    marginBottom: 12,
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fieldBox: {
    width: '100%',
    marginBottom: 10,
  },
  fieldLabel: {
    color: Colors.greenDark,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.white,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepIconButton: {
    width: 42,
    height: 42,
    margin: 0,
    flexShrink: 0,
  },
  captureLoadingButton: {
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.greenInstitutional,
  },
  stepInput: {
    flex: 1,
    minWidth: 76,
    backgroundColor: Colors.white,
  },
  gpsOccurrenceText: {
    color: Colors.greenInstitutional,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  gpsCaptureText: {
    color: Colors.orangeInstitutional,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  photoBlock: {
    marginTop: 8,
  },
  photoLabel: {
    color: Colors.greenDark,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  photoButton: {
    minHeight: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonIcon: {
    color: Colors.grayText,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  photoButtonText: {
    color: Colors.grayDark,
    fontSize: 13,
    fontWeight: '700',
  },
  photoPreview: {
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: Colors.white,
    fontWeight: '900',
  },
  photoGpsBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(11, 107, 74, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  photoGpsBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  inputError: {
    borderColor: Colors.danger,
  },
  addButton: {
    borderRadius: 10,
    backgroundColor: Colors.greenInstitutional,
  },
  addButtonContent: {
    minHeight: 46,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
