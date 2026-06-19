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
  { id: 'linha', titulo: 'Número da linha', keyboardType: 'default' },
  { id: 'matricula_colaborador', titulo: 'Matrícula do colaborador', keyboardType: 'default' },
  { id: 'numero_plantas_linha', titulo: 'Nº de plantas/linha' },
  { id: 'numero_plantas_observadas', titulo: 'Nº de plantas observadas', legado: 'NumeroPlantasObservadas' },
  { id: 'cacho_maduro', titulo: 'Cacho maduro', legado: 'CachoMaduro' },
  { id: 'cacho_verde', titulo: 'Cacho verde', legado: 'CachoVerde' },
  { id: 'cacho_avermelhado', titulo: 'Cacho avermelhado', legado: 'CachoAvermelhado' },
  { id: 'cacho_passado', titulo: 'Cacho passado', legado: 'CachoPassado' },
  { id: 'cacho_infermo', titulo: 'Cacho infermo', legado: 'CachoInfermo' },
  { id: 'numero_cachos_observados_papel', titulo: 'Total de cachos observados', readOnly: true },
  { id: 'cacho_esquecido_ciclo', titulo: 'Cacho esquecido', legado: 'CachoEsquecidoCiclo' },
  { id: 'bucha', titulo: 'Bucha', legado: 'Bucha' },
  { id: 'cacho_mal_posicionado', titulo: 'Palha mal posicionada', legado: 'cachoMalOosicionado' },
  { id: 'cacho_talo_comprido', titulo: 'Cacho talo comprido', legado: 'CachoTaloComprido' },
  { id: 'folha_mamando', titulo: 'Folha mamando', legado: 'FolhaMamando' },
  { id: 'folha_cortada_indevida', titulo: 'Folha cortada indevida', legado: 'folhaCortadaIndev' },
  { id: 'cacho_estrela', titulo: 'Cacho estrela', legado: 'CachoEstrela' },
  { id: 'cacho_brocado', titulo: 'Cacho brocado', legado: 'CachoBrocado' },
];

const OCCURRENCE_FIELD_IDS = new Set([
  'cacho_esquecido_ciclo',
  'cacho_verde',
  'cacho_maduro',
  'cacho_passado',
  'cacho_infermo',
  'bucha',
  'cacho_talo_comprido',
  'cacho_mal_posicionado',
  'cacho_estrela',
  'cacho_brocado',
  'cacho_avermelhado',
]);

const CACHO_TOTAL_FIELD_IDS = [
  'cacho_esquecido_ciclo',
  'cacho_verde',
  'cacho_maduro',
  'cacho_passado',
  'cacho_infermo',
  'bucha',
  'cacho_talo_comprido',
  'cacho_estrela',
  'cacho_avermelhado',
];

const PHOTO_FIELD_IDS = new Set([
  ...OCCURRENCE_FIELD_IDS,
  'folha_mamando',
  'folha_cortada_indevida',
]);

const WEIGHING_FIELD_IDS = new Set([
  'cacho_maduro',
  'cacho_verde',
  'cacho_avermelhado',
  'cacho_passado',
  'cacho_infermo',
]);

const createEmptyLine = (ruaIndex = 1, lado = 1) => (
  FIELD_DEFINITIONS.reduce((acc, field) => {
    acc[field.id] = field.keyboardType === 'default' ? '' : '';
    return acc;
  }, {
    rua_index: ruaIndex,
    lado_linha: lado,
  })
);

const normalizeLineRow = (row, index) => ({
  rua_index: row?.rua_index || row?.rua || Math.floor(index / 2) + 1,
  lado_linha: row?.lado_linha || ((index % 2) + 1),
  linha: row?.linha || (index % 2 === 0 ? row?.linha_1 : row?.linha_2) || '',
  ...row,
});

const rowsToRuaGroups = (rows) => {
  const normalizedRows = rows.map((row, index) => normalizeLineRow(row, index));
  const groups = [];

  normalizedRows.forEach((row, index) => {
    const groupIndex = Math.floor(index / 2);
    if (!groups[groupIndex]) {
      groups[groupIndex] = {
        ruaIndex: row.rua_index || groupIndex + 1,
        rows: [],
      };
    }
    groups[groupIndex].rows[index % 2] = row;
  });

  return groups.map((group, groupIndex) => ({
    ruaIndex: group.ruaIndex || groupIndex + 1,
    rows: [0, 1].map((lineIndex) => (
      group.rows[lineIndex] || createEmptyLine(group.ruaIndex || groupIndex + 1, lineIndex + 1)
    )),
  }));
};

const getOccurrenceCount = (row, fieldId) => {
  const occurrences = Array.isArray(row?._gps_ocorrencias) ? row._gps_ocorrencias : [];
  return occurrences
    .filter((occurrence) => occurrence.campo_id === fieldId)
    .reduce((total, occurrence) => total + (Number(occurrence.quantidade) || 1), 0);
};

const getPhotosForField = (row, fieldId) => {
  const grouped = row?._evidencias_fotos;
  if (!grouped || !Array.isArray(grouped[fieldId])) return [];
  return grouped[fieldId];
};

const getCachoTotal = (row) => (
  CACHO_TOTAL_FIELD_IDS.reduce((total, fieldId) => total + readIntegerInput(row?.[fieldId]), 0)
);

function FieldPhotos({ photos, onCapture, onRemove, isCapturing }) {
  return (
    <View style={styles.itemPhotoBlock}>
      <View style={styles.itemPhotoHeader}>
        <Text style={styles.itemPhotoLabel}>{photos.length} foto(s)</Text>
        <IconButton
          icon="camera-plus-outline"
          mode="contained-tonal"
          size={17}
          onPress={onCapture}
          disabled={isCapturing}
          style={styles.itemPhotoButton}
          iconColor={Colors.greenInstitutional}
        />
      </View>
      {isCapturing ? <ActivityIndicator color={Colors.greenInstitutional} size="small" /> : null}
      {photos.length > 0 ? (
        <View style={styles.itemPhotoGrid}>
          {photos.map((photo, index) => (
            <View style={styles.itemPhotoPreview} key={`${photo.uri || 'photo'}_${index}`}>
              <Image source={{ uri: photo.uri }} style={styles.itemPhotoImage} resizeMode="cover" />
              {photo.gps ? (
                <View style={styles.photoGpsBadge}>
                  <Text style={styles.photoGpsBadgeText}>GPS</Text>
                </View>
              ) : null}
              <TouchableOpacity style={styles.photoRemoveBadge} onPress={() => onRemove(index)}>
                <Text style={styles.photoRemoveText}>x</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CachoEsquecidoPlants({ count, values, onChange }) {
  if (count <= 0) return null;
  return (
    <View style={styles.plantsBlock}>
      <Text style={styles.plantsTitle}>Número da planta na rua</Text>
      {Array.from({ length: count }, (_, index) => (
        <PaperTextInput
          key={`planta_${index}`}
          mode="outlined"
          style={styles.plantInput}
          value={values?.[index] === null || values?.[index] === undefined ? '' : String(values[index])}
          onChangeText={(text) => onChange(index, normalizeIntegerInput(text))}
          keyboardType="numeric"
          placeholder={`Planta ${index + 1}`}
          dense
          outlineColor={Colors.cardBorder}
          activeOutlineColor={Colors.greenInstitutional}
        />
      ))}
    </View>
  );
}

function CachoPesagens({ definition, count, values, onChange }) {
  if (!WEIGHING_FIELD_IDS.has(definition.id) || count <= 0) return null;

  return (
    <View style={styles.plantsBlock}>
      <Text style={styles.plantsTitle}>Pesagem - {definition.titulo}</Text>
      <View style={styles.weighGrid}>
        {values.map((peso, index) => (
          <View style={styles.weighItem} key={`pesagem_${definition.id}_${index}`}>
            <View style={styles.weighHeader}>
              <Text style={styles.weighTitle}>Cacho {index + 1}</Text>
              <TouchableOpacity onPress={() => onChange(index, null)}>
                <Text style={styles.weighRemove}>x</Text>
              </TouchableOpacity>
            </View>
            <PaperTextInput
              mode="outlined"
              style={styles.weighInput}
              value={peso === null || peso === undefined ? '' : String(peso)}
              onChangeText={(text) => onChange(index, text.replace(/[^0-9,.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="kg"
              dense
              outlineColor={Colors.cardBorder}
              activeOutlineColor={Colors.greenInstitutional}
            />
          </View>
        ))}
      </View>
      <Button
        mode="outlined"
        icon="scale"
        compact
        style={styles.weighButton}
        onPress={() => onChange(values.length, '')}
      >
        Adicionar peso
      </Button>
    </View>
  );
}

function LineField({
  definition,
  value,
  row,
  occurrenceCount,
  onChange,
  onNumericChange,
  onPhotoCapture,
  onPhotoRemove,
  onPlantNumberChange,
  onPesagemChange,
  isCapturing,
  isCapturingPhoto,
}) {
  const isNumeric = definition.keyboardType !== 'default';
  const photos = getPhotosForField(row, definition.id);
  const showPhotos = PHOTO_FIELD_IDS.has(definition.id);
  const cachoEsquecidoCount = definition.id === 'cacho_esquecido_ciclo' ? readIntegerInput(value) : 0;
  const cachoCount = readIntegerInput(value);
  const plantNumbers = Array.isArray(row?._plantas_cacho_esquecido) ? row._plantas_cacho_esquecido : [];
  const pesagens = row?._pesagens_cachos && Array.isArray(row._pesagens_cachos[definition.id])
    ? row._pesagens_cachos[definition.id]
    : [];

  const updateByStep = (step) => {
    if (definition.readOnly) return;
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
            disabled={definition.readOnly}
            onPress={() => updateByStep(-1)}
          />
          <PaperTextInput
            mode="outlined"
            style={styles.stepInput}
            value={value === null || value === undefined ? '' : String(value)}
            onChangeText={(textValue) => {
              if (definition.readOnly) return;
              const current = readIntegerInput(value);
              const normalizedText = normalizeIntegerInput(textValue);
              const next = Math.max(0, readIntegerInput(normalizedText));
              onNumericChange(normalizedText, next - current);
            }}
            keyboardType="numeric"
            placeholder="0"
            editable={!definition.readOnly}
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
              disabled={definition.readOnly}
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
      {definition.id === 'cacho_esquecido_ciclo' ? (
        <CachoEsquecidoPlants
          count={cachoEsquecidoCount}
          values={plantNumbers}
          onChange={onPlantNumberChange}
        />
      ) : null}
      <CachoPesagens
        definition={definition}
        count={cachoCount}
        values={pesagens}
        onChange={onPesagemChange}
      />
      {showPhotos ? (
        <FieldPhotos
          photos={photos}
          onCapture={onPhotoCapture}
          onRemove={onPhotoRemove}
          isCapturing={isCapturingPhoto}
        />
      ) : null}
    </View>
  );
}

export default function CampoLinhasCqoCorte({ field, value, onChange, error, captureOccurrenceGps, captureLinePhoto }) {
  const rawRows = Array.isArray(value) ? value.map((row, index) => normalizeLineRow(row, index)) : [];
  const ruaGroups = rowsToRuaGroups(rawRows);
  const rows = ruaGroups.flatMap((group) => group.rows);
  const obrigatorio = field.obrigatorio === 1 || field.obrigatorio === true;
  const [capturingKey, setCapturingKey] = useState(null);
  const [capturingPhotoKey, setCapturingPhotoKey] = useState(null);

  const handleAddRua = () => {
    const nextRuaIndex = ruaGroups.length + 1;
    onChange([
      ...rows,
      createEmptyLine(nextRuaIndex, 1),
      createEmptyLine(nextRuaIndex, 2),
    ]);
  };

  const handleRemoveRua = (groupIndex) => {
    if (ruaGroups.length <= 1) return;
    onChange(rows.filter((_, rowIndex) => Math.floor(rowIndex / 2) !== groupIndex));
  };

  const handleFieldChange = (rowIndex, fieldId, fieldValue) => {
    onChange(rows.map((row, index) => (
      index === rowIndex ? { ...row, [fieldId]: fieldValue } : row
    )));
  };

  const handlePhotoCapture = async (rowIndex, definition) => {
    if (typeof captureLinePhoto !== 'function') return;
    const captureKey = `photo_${rowIndex}_${definition.id}`;
    setCapturingPhotoKey(captureKey);
    try {
      const photo = await captureLinePhoto({
        campo_id: definition.id,
        titulo: definition.titulo,
        rua_index: rows[rowIndex]?.rua_index || Math.floor(rowIndex / 2) + 1,
        lado_linha: rows[rowIndex]?.lado_linha || (rowIndex % 2) + 1,
        linha: rows[rowIndex]?.linha || '',
        matricula_colaborador: rows[rowIndex]?.matricula_colaborador || null,
        row_index: rowIndex + 1,
      });
      if (!photo) return;
      onChange(rows.map((row, index) => (
        index === rowIndex ? {
          ...row,
          _evidencias_fotos: {
            ...(row._evidencias_fotos || {}),
            [definition.id]: [
              ...getPhotosForField(row, definition.id),
              {
                ...photo,
                campo_id: definition.id,
                titulo: definition.titulo,
                rua_index: row.rua_index || Math.floor(rowIndex / 2) + 1,
                lado_linha: row.lado_linha || (rowIndex % 2) + 1,
                linha: row.linha || '',
                matricula_colaborador: row.matricula_colaborador || null,
              },
            ],
          },
        } : row
      )));
    } finally {
      setCapturingPhotoKey(null);
    }
  };

  const handlePhotoRemove = (rowIndex, fieldId, photoIndex) => {
    onChange(rows.map((row, index) => (
      index === rowIndex ? {
        ...row,
        _evidencias_fotos: {
          ...(row._evidencias_fotos || {}),
          [fieldId]: getPhotosForField(row, fieldId).filter((_, indexPhoto) => indexPhoto !== photoIndex),
        },
      } : row
    )));
  };

  const handlePlantNumberChange = (rowIndex, plantIndex, plantValue) => {
    onChange(rows.map((row, index) => {
      if (index !== rowIndex) return row;
      const count = readIntegerInput(row.cacho_esquecido_ciclo);
      const nextPlants = Array.from({ length: count }, (_, idx) => (
        idx === plantIndex ? plantValue : (row._plantas_cacho_esquecido?.[idx] || '')
      ));
      return { ...row, _plantas_cacho_esquecido: nextPlants };
    }));
  };

  const handlePesagemChange = (rowIndex, fieldId, pesagemIndex, pesagemValue) => {
    onChange(rows.map((row, index) => {
      if (index !== rowIndex) return row;
      const previous = row._pesagens_cachos?.[fieldId] || [];
      const nextPesagens = pesagemValue === null
        ? previous.filter((_, idx) => idx !== pesagemIndex)
        : [
          ...previous.slice(0, pesagemIndex),
          pesagemValue,
          ...previous.slice(pesagemIndex + 1),
        ];

      return {
        ...row,
        _pesagens_cachos: {
          ...(row._pesagens_cachos || {}),
          [fieldId]: nextPesagens,
        },
      };
    }));
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
          rua_index: row.rua_index || Math.floor(rowIndex / 2) + 1,
          lado_linha: row.lado_linha || (rowIndex % 2) + 1,
          linha: row.linha || '',
          matricula_colaborador: row.matricula_colaborador || null,
          quantidade: delta,
        });
        if (gps) {
          gpsOccurrence = {
            id: `occ_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            campo_id: definition.id,
            titulo: definition.titulo,
            rua_index: row.rua_index || Math.floor(rowIndex / 2) + 1,
            lado_linha: row.lado_linha || (rowIndex % 2) + 1,
            linha: row.linha || '',
            matricula_colaborador: row.matricula_colaborador || null,
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

      const rowWithUpdatedValue = {
        ...currentRow,
        [definition.id]: fieldValue,
        _gps_ocorrencias: nextOccurrences,
      };

      if (definition.id === 'cacho_esquecido_ciclo') {
        const count = readIntegerInput(fieldValue);
        rowWithUpdatedValue._plantas_cacho_esquecido = Array.from({ length: count }, (_, idx) => (
          currentRow._plantas_cacho_esquecido?.[idx] || ''
        ));
      }

      if (CACHO_TOTAL_FIELD_IDS.includes(definition.id)) {
        rowWithUpdatedValue.numero_cachos_observados_papel = String(getCachoTotal(rowWithUpdatedValue));
      }

      if (WEIGHING_FIELD_IDS.has(definition.id)) {
        rowWithUpdatedValue._pesagens_cachos = {
          ...(currentRow._pesagens_cachos || {}),
          [definition.id]: currentRow._pesagens_cachos?.[definition.id] || [],
        };
      }

      return rowWithUpdatedValue;
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
        Registre cada rua avaliada como um par de duas linhas. A rua nao tem nome; informe apenas o numero de cada linha.
      </Text>

      {rows.length === 0 ? (
        <View style={[styles.emptyState, error ? styles.inputError : null]}>
          <Text style={styles.emptyText}>Nenhuma rua avaliada adicionada.</Text>
        </View>
      ) : (
        ruaGroups.map((group, groupIndex) => (
          <Card style={[styles.lineCard, error ? styles.inputError : null]} key={`rua_${groupIndex}`} mode="outlined">
            <Card.Content>
            <View style={styles.lineHeader}>
              <Text style={styles.lineTitle}>Rua avaliada {groupIndex + 1}</Text>
              <Button
                mode="text"
                icon="trash-can-outline"
                textColor={Colors.danger}
                compact
                disabled={ruaGroups.length <= 1}
                onPress={() => handleRemoveRua(groupIndex)}
              >
                Remover rua
              </Button>
            </View>
            <Divider style={styles.lineDivider} />

            <View style={styles.streetLinesRow}>
              {group.rows.map((row, lineIndex) => {
                const rowIndex = groupIndex * 2 + lineIndex;
                return (
                  <View style={styles.lineSideBlock} key={`rua_${groupIndex}_linha_${lineIndex}`}>
                    <Text style={styles.lineSideTitle}>Linha {lineIndex + 1} da rua</Text>
                    <View style={styles.fieldsGrid}>
                      {FIELD_DEFINITIONS.map((definition) => (
                        <LineField
                          key={definition.id}
                          definition={definition}
                          value={row?.[definition.id]}
                          row={row}
                          onChange={(fieldValue) => handleFieldChange(rowIndex, definition.id, fieldValue)}
                          onNumericChange={(fieldValue, delta) => handleNumericChange(rowIndex, definition, fieldValue, delta)}
                          onPhotoCapture={() => handlePhotoCapture(rowIndex, definition)}
                          onPhotoRemove={(photoIndex) => handlePhotoRemove(rowIndex, definition.id, photoIndex)}
                          onPlantNumberChange={(plantIndex, plantValue) => handlePlantNumberChange(rowIndex, plantIndex, plantValue)}
                          onPesagemChange={(pesagemIndex, pesagemValue) => handlePesagemChange(rowIndex, definition.id, pesagemIndex, pesagemValue)}
                          occurrenceCount={getOccurrenceCount(row, definition.id)}
                          isCapturing={capturingKey === `${rowIndex}_${definition.id}`}
                          isCapturingPhoto={capturingPhotoKey === `photo_${rowIndex}_${definition.id}`}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
            </Card.Content>
          </Card>
        ))
      )}

      <Button
        mode="contained"
        icon="plus"
        onPress={handleAddRua}
        style={styles.addButton}
        contentStyle={styles.addButtonContent}
      >
        Adicionar rua avaliada
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
  streetLinesRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    alignItems: 'flex-start',
  },
  lineSideBlock: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#D5E5DB',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  lineSideTitle: {
    color: Colors.greenDark,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
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
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.white,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepIconButton: {
    width: 34,
    height: 34,
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
    minWidth: 42,
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
  itemPhotoBlock: {
    marginTop: 8,
  },
  itemPhotoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemPhotoLabel: {
    color: Colors.greenDark,
    fontSize: 12,
    fontWeight: '800',
  },
  itemPhotoButton: {
    width: 34,
    height: 34,
    margin: 0,
  },
  itemPhotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  itemPhotoPreview: {
    width: 86,
    height: 86,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.white,
  },
  itemPhotoImage: {
    width: '100%',
    height: '100%',
  },
  plantsBlock: {
    marginTop: 8,
    gap: 6,
  },
  plantsTitle: {
    color: Colors.grayText,
    fontSize: 11,
    fontWeight: '800',
  },
  plantInput: {
    backgroundColor: Colors.white,
  },
  weighGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  weighItem: {
    width: 92,
    borderWidth: 1,
    borderColor: '#D5E5DB',
    borderRadius: 8,
    padding: 6,
    backgroundColor: '#FFFFFF',
  },
  weighHeader: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weighTitle: {
    color: Colors.greenDark,
    fontSize: 10,
    fontWeight: '900',
  },
  weighRemove: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '900',
    paddingHorizontal: 4,
  },
  weighInput: {
    height: 34,
    backgroundColor: Colors.white,
  },
  weighButton: {
    alignSelf: 'flex-start',
    borderColor: Colors.greenInstitutional,
    borderRadius: 8,
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
