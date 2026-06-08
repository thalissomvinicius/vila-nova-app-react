import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../core/colors';

export default function CampoHora({ field, value, onChange, error }) {
  const { id, titulo, obrigatorio } = field;

  const maskTime = (text) => {
    const clean = text.replace(/\D/g, '');
    let masked = '';
    if (clean.length > 0) {
      masked += clean.substring(0, 2);
      if (clean.length > 2) {
        masked += ':' + clean.substring(2, 4);
      }
    }
    return masked;
  };

  const handleTextChange = (text) => {
    onChange(maskTime(text));
  };

  const setNow = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    onChange(`${hours}:${minutes}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="HH:MM"
          placeholderTextColor={Colors.grayText}
          keyboardType="numeric"
          maxLength={5}
          value={value || ''}
          onChangeText={handleTextChange}
        />
        <TouchableOpacity style={styles.nowButton} onPress={setNow}>
          <Text style={styles.nowButtonText}>Agora</Text>
        </TouchableOpacity>
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
  inputRow: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.grayDark,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  nowButton: {
    backgroundColor: Colors.greenLight,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: Colors.greenInstitutional,
  },
  nowButtonText: {
    color: Colors.greenInstitutional,
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
