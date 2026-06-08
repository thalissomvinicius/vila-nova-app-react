import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../core/colors';

export default function CampoMoeda({ field, value, onChange, error }) {
  const { id, titulo, placeholder, obrigatorio } = field;

  const formatBRL = (text) => {
    const clean = text.replace(/\D/g, '');
    if (!clean) return '';

    const number = parseInt(clean, 10);
    const reals = Math.floor(number / 100).toString();
    const cents = (number % 100).toString().padStart(2, '0');

    // Format thousands points
    const formattedReals = reals.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `R$ ${formattedReals},${cents}`;
  };

  const handleChangeText = (text) => {
    const formatted = formatBRL(text);
    onChange(formatted);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder={placeholder || 'R$ 0,00'}
          placeholderTextColor={Colors.grayText}
          keyboardType="numeric"
          value={value || ''}
          onChangeText={handleChangeText}
        />
      </View>
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
  inputWrapper: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.grayDark,
    fontWeight: '600',
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
