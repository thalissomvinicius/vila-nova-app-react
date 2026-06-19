import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { HelperText, TextInput as PaperTextInput } from 'react-native-paper';
import { AppDatabase } from '../core/database';
import { Colors } from '../core/colors';
import { findSeedCollaborator } from '../core/headcountSeed';

const emptyValue = {
  teve: 'nao',
  matricula: '',
  nome: '',
};

function normalizeValue(value) {
  if (!value || typeof value !== 'object') return emptyValue;
  return {
    teve: value.teve === 'sim' ? 'sim' : 'nao',
    matricula: value.matricula || '',
    nome: value.nome || '',
  };
}

function normalizeMatricula(value) {
  return String(value || '').replace(/\D/g, '').trim();
}

export default function CampoAcompanhamento({ field, value, onChange, error }) {
  const current = useMemo(() => normalizeValue(value), [value]);
  const [lookupMessage, setLookupMessage] = useState('');

  useEffect(() => {
    if (!value || typeof value !== 'object') {
      onChange(emptyValue);
    }
  }, []);

  const resolveName = (matricula) => {
    const normalized = normalizeMatricula(matricula);
    if (!normalized) {
      setLookupMessage('');
      return '';
    }

    const local = AppDatabase.getFirst(
      'SELECT * FROM headcount_colaboradores WHERE matricula = ?',
      [normalized]
    );
    const collaborator = local || findSeedCollaborator(normalized);

    if (!collaborator?.nome) {
      setLookupMessage('Matrícula não encontrada no headcount local.');
      return '';
    }

    setLookupMessage('');
    return collaborator.nome;
  };

  const handleModeChange = (teve) => {
    setLookupMessage('');
    if (teve === 'nao') {
      onChange(emptyValue);
      return;
    }
    onChange({ ...current, teve: 'sim' });
  };

  const handleMatriculaChange = (matricula) => {
    const normalized = normalizeMatricula(matricula);
    const nome = resolveName(normalized);
    onChange({
      teve: 'sim',
      matricula: normalized,
      nome,
    });
  };

  const isSim = current.teve === 'sim';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{field.titulo}</Text>
        {field.obrigatorio === 1 ? <Text style={styles.required}> *</Text> : null}
      </View>

      <View style={[styles.box, error ? styles.boxError : null]}>
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segmentButton, !isSim ? styles.segmentActive : null]}
            onPress={() => handleModeChange('nao')}
          >
            <Text style={[styles.segmentText, !isSim ? styles.segmentTextActive : null]}>
              Não
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, isSim ? styles.segmentActive : null]}
            onPress={() => handleModeChange('sim')}
          >
            <Text style={[styles.segmentText, isSim ? styles.segmentTextActive : null]}>
              Sim
            </Text>
          </TouchableOpacity>
        </View>

        {isSim ? (
          <View style={styles.fields}>
            <PaperTextInput
              mode="outlined"
              label="Matrícula"
              value={current.matricula}
              onChangeText={handleMatriculaChange}
              keyboardType="numeric"
              outlineColor={Colors.cardBorder}
              activeOutlineColor={Colors.greenInstitutional}
              style={styles.input}
            />
            <PaperTextInput
              mode="outlined"
              label="Nome"
              value={current.nome}
              editable={false}
              outlineColor={Colors.cardBorder}
              activeOutlineColor={Colors.greenInstitutional}
              style={styles.input}
            />
            {lookupMessage ? <Text style={styles.lookupText}>{lookupMessage}</Text> : null}
          </View>
        ) : (
          <Text style={styles.emptyText}>Sem acompanhamento nesta coleta.</Text>
        )}
      </View>

      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    color: Colors.greenDark,
    fontSize: 13,
    fontWeight: '900',
  },
  required: {
    color: Colors.danger,
    fontWeight: '900',
  },
  box: {
    backgroundColor: '#F8FCFA',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    padding: 12,
  },
  boxError: {
    borderColor: Colors.danger,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#EAF4EE',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.greenInstitutional,
  },
  segmentText: {
    color: Colors.greenDark,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: Colors.white,
  },
  fields: {
    gap: 10,
  },
  input: {
    backgroundColor: Colors.white,
  },
  emptyText: {
    color: Colors.grayText,
    fontSize: 13,
    fontWeight: '700',
  },
  lookupText: {
    color: Colors.orangeInstitutional,
    fontSize: 12,
    fontWeight: '800',
  },
});
