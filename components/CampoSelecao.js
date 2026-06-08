import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import {
  Button,
  HelperText,
  List,
  Modal as PaperModal,
  Portal,
  RadioButton,
  Surface,
} from 'react-native-paper';
import { Colors } from '../core/colors';

export default function CampoSelecao({ field, value, onChange, error, visualMode }) {
  const { id, titulo, opcoes = [], obrigatorio } = field;
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (option) => {
    onChange(option);
    setModalVisible(false);
  };

  if (visualMode === 'paper') {
    return (
      <View style={styles.paperContainer}>
        <Button
          mode="outlined"
          icon="chevron-down"
          contentStyle={styles.paperSelectContent}
          labelStyle={[
            styles.paperSelectLabel,
            !value ? styles.paperPlaceholderLabel : null,
          ]}
          style={[
            styles.paperSelectButton,
            error ? styles.paperSelectError : null,
          ]}
          onPress={() => setModalVisible(true)}
        >
          {value || `${titulo}${obrigatorio === 1 ? ' *' : ''}`}
        </Button>

        <Portal>
          <PaperModal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={styles.paperModalContent}
          >
            <Surface style={styles.paperModalSurface} elevation={2}>
              <Text style={styles.paperModalTitle}>{titulo}</Text>
              <FlatList
                data={opcoes}
                keyExtractor={(item, index) => `${item}_${index}`}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => (
                  <List.Item
                    title={item}
                    onPress={() => handleSelect(item)}
                    right={() => (
                      <RadioButton
                        value={item}
                        status={value === item ? 'checked' : 'unchecked'}
                        onPress={() => handleSelect(item)}
                      />
                    )}
                    titleStyle={value === item ? styles.paperSelectedText : null}
                  />
                )}
              />
              <Button onPress={() => setModalVisible(false)}>Fechar</Button>
            </Surface>
          </PaperModal>
        </Portal>

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
      <TouchableOpacity
        style={[styles.pickerTrigger, error ? styles.pickerError : null]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.valueText, !value ? styles.placeholderText : null]}>
          {value || 'Selecione uma opção...'}
        </Text>
        <Text style={styles.arrowIcon}>▼</Text>
      </TouchableOpacity>

      {/* Options Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{titulo}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>Fechar</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={opcoes}
              keyExtractor={(item, index) => index.toString()}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    value === item ? styles.selectedOption : null,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === item ? styles.selectedOptionText : null,
                    ]}
                  >
                    {item}
                  </Text>
                  {value === item && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  paperContainer: {
    marginBottom: 10,
  },
  paperSelectButton: {
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    backgroundColor: '#F8FCFA',
    borderWidth: 1,
  },
  paperSelectError: {
    borderColor: Colors.danger,
  },
  paperSelectContent: {
    minHeight: 58,
    justifyContent: 'space-between',
    flexDirection: 'row-reverse',
  },
  paperSelectLabel: {
    color: Colors.grayDark,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    textAlign: 'left',
  },
  paperPlaceholderLabel: {
    color: Colors.grayText,
    fontWeight: '600',
  },
  paperModalContent: {
    padding: 18,
  },
  paperModalSurface: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    maxHeight: '75%',
    paddingVertical: 10,
  },
  paperModalTitle: {
    color: Colors.greenDark,
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  paperSelectedText: {
    color: Colors.greenInstitutional,
    fontWeight: '800',
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
  pickerTrigger: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerError: {
    borderColor: Colors.danger,
  },
  valueText: {
    fontSize: 15,
    color: Colors.grayDark,
    fontWeight: '500',
  },
  placeholderText: {
    color: Colors.grayText,
  },
  arrowIcon: {
    fontSize: 12,
    color: Colors.grayText,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: 24,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.grayDark,
  },
  closeBtn: {
    color: Colors.greenInstitutional,
    fontWeight: '700',
    fontSize: 14,
  },
  optionItem: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: Colors.greenLight,
  },
  optionText: {
    fontSize: 15,
    color: Colors.grayDark,
  },
  selectedOptionText: {
    fontWeight: '700',
    color: Colors.greenInstitutional,
  },
  checkIcon: {
    fontSize: 16,
    color: Colors.greenInstitutional,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.grayLight,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
