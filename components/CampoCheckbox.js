import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../core/colors';

export default function CampoCheckbox({ field, value, onChange, error }) {
  const { id, titulo, opcoes = [], obrigatorio } = field;

  // Split selected options by comma
  const selectedList = value
    ? value.split(',').map((item) => item.trim()).filter((item) => item.length > 0)
    : [];

  const handleToggle = (option) => {
    let newList;
    if (selectedList.includes(option)) {
      newList = selectedList.filter((item) => item !== option);
    } else {
      newList = [...selectedList, option];
    }
    onChange(newList.join(','));
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>
      <View style={[styles.checkboxGroup, error ? styles.groupError : null]}>
        {opcoes.map((option, index) => {
          const isSelected = selectedList.includes(option);
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.checkboxRow,
                isSelected ? styles.checkboxRowSelected : null,
                index < opcoes.length - 1 ? styles.borderBottom : null,
              ]}
              onPress={() => handleToggle(option)}
            >
              <View
                style={[
                  styles.checkboxSquare,
                  isSelected ? styles.squareSelected : null,
                ]}
              >
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
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
  checkboxGroup: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  groupError: {
    borderColor: Colors.danger,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checkboxRowSelected: {
    backgroundColor: Colors.grayLight,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.grayText,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  squareSelected: {
    borderColor: Colors.greenInstitutional,
    backgroundColor: Colors.greenInstitutional,
  },
  checkMark: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '900',
    marginTop: -2,
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
