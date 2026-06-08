import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../core/colors';

export default function CampoRadio({ field, value, onChange, error }) {
  const { id, titulo, opcoes = [], obrigatorio } = field;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>
      <View style={[styles.radioGroup, error ? styles.groupError : null]}>
        {opcoes.map((option, index) => {
          const isSelected = value === option;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.radioRow,
                isSelected ? styles.radioRowSelected : null,
                index < opcoes.length - 1 ? styles.borderBottom : null,
              ]}
              onPress={() => onChange(option)}
            >
              <View
                style={[
                  styles.radioCircle,
                  isSelected ? styles.circleSelected : null,
                ]}
              >
                {isSelected && <View style={styles.circleDot} />}
              </View>
              <Text
                style={[
                  styles.optionText,
                  isSelected ? styles.optionTextSelected : null,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  radioGroup: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  groupError: {
    borderColor: Colors.danger,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  radioRowSelected: {
    backgroundColor: Colors.grayLight,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.grayText,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  circleSelected: {
    borderColor: Colors.greenInstitutional,
  },
  circleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.greenInstitutional,
  },
  optionText: {
    fontSize: 15,
    color: Colors.grayDark,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: Colors.greenInstitutional,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
