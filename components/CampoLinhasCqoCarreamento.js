import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../core/colors';
import { normalizeIntegerInput, readIntegerInput } from '../core/numberInput';

const FIELD_DEFINITIONS = [
  { id: 'linha', titulo: 'Linha', keyboardType: 'default' },
  { id: 'numero_plantas_linha', titulo: 'Nº de plantas/linha' },
  { id: 'cacho_mal_posicionado', titulo: 'Cacho mal posicionado', legado: 'cachoMalPosicionado' },
  { id: 'cacho_nao_carreado', titulo: 'Cacho não carreado', legado: 'Cachonaocarreado' },
  { id: 'numero_plantas_observadas', titulo: 'Nº de plantas observadas - fruto solto', legado: 'NumeroPlantasObservadas' },
  { id: 'peso_medio', titulo: 'Peso médio - fruto solto' },
];

const OCCURRENCE_FIELD_IDS = new Set([
  'cacho_mal_posicionado',
  'cacho_nao_carreado',
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
          <TouchableOpacity style={styles.stepButton} onPress={() => updateByStep(-1)}>
            <Text style={styles.stepButtonText}>-</Text>
          </TouchableOpacity>
          <TextInput
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
            placeholderTextColor={Colors.grayText}
          />
          <TouchableOpacity
            style={[styles.stepButton, isCapturing ? styles.stepButtonLoading : null]}
            onPress={() => updateByStep(1)}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.stepButtonText}>+</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <TextInput
          style={styles.input}
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={onChange}
          keyboardType="default"
          placeholder=""
          placeholderTextColor={Colors.grayText}
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

export default function CampoLinhasCqoCarreamento({ field, value, onChange, error, captureOccurrenceGps, captureLinePhoto }) {
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
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{field.titulo}</Text>
        {obrigatorio && <Text style={styles.required}> *</Text>}
      </View>

      {rows.length === 0 ? (
        <View style={[styles.emptyState, error ? styles.inputError : null]}>
          <Text style={styles.emptyText}>Nenhuma linha adicionada.</Text>
        </View>
      ) : (
        rows.map((row, rowIndex) => (
          <View style={[styles.lineCard, error ? styles.inputError : null]} key={`linha_carreamento_${rowIndex}`}>
            <View style={styles.lineHeader}>
              <Text style={styles.lineTitle}>Linha</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveLine(rowIndex)}
                disabled={rows.length <= 1}
              >
                <Text style={styles.removeButtonText}>Remover</Text>
              </TouchableOpacity>
            </View>

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
          </View>
        ))
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleAddLine}>
        <Text style={styles.addButtonText}>Adicionar linha</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.greenDark,
  },
  required: {
    color: Colors.danger,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(32,49,37,0.09)',
    borderRadius: 8,
    padding: 14,
  },
  emptyText: {
    color: Colors.grayText,
    fontSize: 13,
  },
  lineCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(31,122,77,0.18)',
    borderRadius: 8,
    padding: 13,
    marginBottom: 12,
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lineTitle: {
    color: Colors.greenDark,
    fontSize: 14,
    fontWeight: '900',
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
    color: Colors.grayDark,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.grayLight,
    borderWidth: 1,
    borderColor: 'rgba(32,49,37,0.11)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.grayDark,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    borderWidth: 1,
    borderColor: 'rgba(32,49,37,0.11)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepButton: {
    width: 44,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  stepButtonLoading: {
    backgroundColor: Colors.greenInstitutional,
  },
  stepButtonText: {
    color: Colors.greenDark,
    fontSize: 18,
    fontWeight: '900',
  },
  stepInput: {
    flex: 1,
    minHeight: 42,
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 6,
    fontSize: 13,
    color: Colors.grayDark,
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
    backgroundColor: Colors.orangeInstitutional,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  removeButton: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeButtonText: {
    color: Colors.danger,
    fontSize: 11,
    fontWeight: '800',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
