import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Colors } from '../core/colors';

const FIELD_DEFINITIONS = [
  { id: 'linha', titulo: 'Linha', keyboardType: 'default' },
  { id: 'numero_plantas_linha', titulo: 'No plantas/linha' },
  { id: 'cacho_mal_posicionado', titulo: 'Cacho mal posicionado', legado: 'cachoMalPosicionado' },
  { id: 'cacho_nao_carreado', titulo: 'Cacho nao carreado', legado: 'Cachonaocarreado' },
  { id: 'numero_plantas_observadas', titulo: 'No plantas observadas - fruto solto', legado: 'NumeroPlantasObservadas' },
  { id: 'peso_medio', titulo: 'Peso medio - fruto solto' },
];

const createEmptyLine = () => (
  FIELD_DEFINITIONS.reduce((acc, field) => {
    acc[field.id] = '';
    return acc;
  }, {})
);

function LineField({ definition, value, onChange }) {
  const isNumeric = definition.keyboardType !== 'default';

  const updateByStep = (step) => {
    const current = Number.parseInt(value || '0', 10);
    const safeCurrent = Number.isFinite(current) ? current : 0;
    const nextValue = Math.max(0, safeCurrent + step);
    onChange(String(nextValue));
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
            value={value || ''}
            onChangeText={onChange}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.grayText}
          />
          <TouchableOpacity style={styles.stepButton} onPress={() => updateByStep(1)}>
            <Text style={styles.stepButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TextInput
          style={styles.input}
          value={value || ''}
          onChangeText={onChange}
          keyboardType="default"
          placeholder=""
          placeholderTextColor={Colors.grayText}
        />
      )}
    </View>
  );
}

export default function CampoLinhasCqoCarreamento({ field, value, onChange, error }) {
  const rows = Array.isArray(value) ? value : [];
  const obrigatorio = field.obrigatorio === 1 || field.obrigatorio === true;

  const handleAddLine = () => {
    onChange([...rows, createEmptyLine()]);
  };

  const handleRemoveLine = (index) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleFieldChange = (rowIndex, fieldId, fieldValue) => {
    onChange(rows.map((row, index) => (
      index === rowIndex ? { ...row, [fieldId]: fieldValue } : row
    )));
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
              <Text style={styles.lineTitle}>Linha {rowIndex + 1}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveLine(rowIndex)}
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
                />
              ))}
            </View>
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
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.grayDark,
  },
  required: {
    color: Colors.danger,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 12,
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
    fontWeight: '800',
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
    fontWeight: '700',
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.grayLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    borderColor: Colors.cardBorder,
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
  stepButtonText: {
    color: Colors.greenInstitutional,
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
  inputError: {
    borderColor: Colors.danger,
  },
  addButton: {
    backgroundColor: Colors.greenInstitutional,
    borderRadius: 12,
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
