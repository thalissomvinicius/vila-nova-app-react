import React from 'react';
import {
  View,
  Text,
  StyleSheet,
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

const FIELD_DEFINITIONS = [
  { id: 'linha', titulo: 'Linha', keyboardType: 'default' },
  { id: 'numero_plantas_linha', titulo: 'No plantas/linha' },
  { id: 'numero_plantas_observadas', titulo: 'No plantas observadas', legado: 'NumeroPlantasObservadas' },
  { id: 'numero_cachos_observados_papel', titulo: 'No cacho observado' },
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
            value={value || ''}
            onChangeText={onChange}
            keyboardType="numeric"
            placeholder="0"
            dense
            outlineColor={Colors.cardBorder}
            activeOutlineColor={Colors.greenInstitutional}
          />
          <IconButton
            icon="plus"
            mode="contained"
            size={18}
            style={styles.stepIconButton}
            iconColor={Colors.white}
            containerColor={Colors.greenInstitutional}
            onPress={() => updateByStep(1)}
          />
        </View>
      ) : (
        <PaperTextInput
          mode="outlined"
          style={styles.input}
          value={value || ''}
          onChangeText={onChange}
          keyboardType="default"
          dense
          outlineColor={Colors.cardBorder}
          activeOutlineColor={Colors.greenInstitutional}
        />
      )}
    </View>
  );
}

export default function CampoLinhasCqoCorte({ field, value, onChange, error }) {
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
              <Text style={styles.lineTitle}>Linha {rowIndex + 1}</Text>
              <Button
                mode="text"
                icon="trash-can-outline"
                textColor={Colors.danger}
                compact
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
                />
              ))}
            </View>
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
  stepInput: {
    flex: 1,
    minWidth: 76,
    backgroundColor: Colors.white,
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
