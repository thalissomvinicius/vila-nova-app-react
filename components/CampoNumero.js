import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { HelperText, TextInput as PaperTextInput } from 'react-native-paper';
import { Colors } from '../core/colors';
import { normalizeIntegerInput } from '../core/numberInput';

export default function CampoNumero({ field, value, onChange, error, visualMode }) {
  const { id, titulo, placeholder, obrigatorio } = field;

  if (visualMode === 'paper') {
    return (
      <View style={styles.paperContainer}>
        <PaperTextInput
          mode="outlined"
          label={`${titulo}${obrigatorio === 1 ? ' *' : ''}`}
          placeholder={placeholder || '0'}
          keyboardType="numeric"
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={(text) => onChange(normalizeIntegerInput(text))}
          error={!!error}
          outlineColor={Colors.cardBorder}
          activeOutlineColor={Colors.greenInstitutional}
          style={styles.paperInput}
        />
        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={placeholder || '0'}
        placeholderTextColor={Colors.grayText}
        keyboardType="numeric"
        value={value === null || value === undefined ? '' : String(value)}
        onChangeText={(text) => onChange(normalizeIntegerInput(text))}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  paperContainer: {
    marginBottom: 10,
  },
  paperInput: {
    backgroundColor: '#F8FCFA',
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.greenDark,
  },
  required: {
    color: Colors.danger,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.grayDark,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
