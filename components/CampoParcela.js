import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../core/colors';
import { formatParcelValue, getParcelsByFarm } from '../core/inventoryParcels';

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export default function CampoParcela({ field, value, onChange, error, farmName }) {
  const { titulo, obrigatorio } = field;
  const [modalVisible, setModalVisible] = useState(false);
  const [query, setQuery] = useState('');

  const parcels = useMemo(() => getParcelsByFarm(farmName), [farmName]);
  const filteredParcels = useMemo(() => {
    const search = normalizeSearch(query);
    if (!search) return parcels.slice(0, 80);
    return parcels
      .filter((parcel) => (
        normalizeSearch(parcel.parcel).includes(search)
        || normalizeSearch(parcel.block).includes(search)
        || normalizeSearch(parcel.cultivar).includes(search)
      ))
      .slice(0, 80);
  }, [parcels, query]);

  const disabled = !farmName || parcels.length === 0;

  const handleSelect = (parcel) => {
    onChange(parcel.parcel);
    setModalVisible(false);
    setQuery('');
  };

  const handleSubmitQuery = () => {
    const typed = formatParcelValue(query);
    const exact = parcels.find((parcel) => parcel.parcel === typed);
    if (exact) handleSelect(exact);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>

      <TouchableOpacity
        style={[
          styles.trigger,
          error ? styles.triggerError : null,
          disabled ? styles.triggerDisabled : null,
        ]}
        onPress={() => {
          if (!disabled) setModalVisible(true);
        }}
        activeOpacity={disabled ? 1 : 0.8}
      >
        <View style={styles.triggerTextBlock}>
          <Text style={[styles.valueText, !value ? styles.placeholderText : null]}>
            {value || (farmName ? 'Escolher parcela real da fazenda' : 'Selecione a fazenda primeiro')}
          </Text>
          {farmName ? (
            <Text style={styles.helperLine}>
              {parcels.length} parcela(s) disponíveis em {farmName}
            </Text>
          ) : null}
        </View>
        <Text style={styles.arrowIcon}>v</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Selecionar parcela</Text>
                <Text style={styles.modalSubtitle}>{farmName}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Digite para buscar. Ex: A-1, C-12, G-23"
              placeholderTextColor={Colors.grayText}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="characters"
              onSubmitEditing={handleSubmitQuery}
              returnKeyType="done"
            />

            <FlatList
              keyboardShouldPersistTaps="handled"
              data={filteredParcels}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={(
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Parcela não encontrada</Text>
                  <Text style={styles.emptyText}>
                    Confira a fazenda selecionada ou busque pelo bloco/parcela do inventário.
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    value === item.parcel ? styles.selectedOption : null,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.optionTextBlock}>
                    <Text style={[
                      styles.optionTitle,
                      value === item.parcel ? styles.selectedOptionText : null,
                    ]}
                    >
                      {item.parcel}
                    </Text>
                    <Text style={styles.optionMeta}>
                      Bloco {item.block || '--'} | {item.year || '--'} | {item.cultivar || 'Cultivar não informado'}
                    </Text>
                    <Text style={styles.optionMeta}>
                      {item.plants || 0} plantas | {Number(item.areaHa || 0).toFixed(2)} ha
                    </Text>
                  </View>
                  {value === item.parcel && <Text style={styles.checkIcon}>OK</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
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
  trigger: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  triggerError: {
    borderColor: Colors.danger,
  },
  triggerDisabled: {
    opacity: 0.68,
  },
  triggerTextBlock: {
    flex: 1,
  },
  valueText: {
    fontSize: 15,
    color: Colors.grayDark,
    fontWeight: '800',
  },
  placeholderText: {
    color: Colors.grayText,
    fontWeight: '600',
  },
  helperLine: {
    color: Colors.grayText,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  arrowIcon: {
    color: Colors.greenInstitutional,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '78%',
    paddingBottom: 18,
  },
  modalHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.grayDark,
  },
  modalSubtitle: {
    color: Colors.grayText,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    color: Colors.greenInstitutional,
    fontWeight: '800',
    fontSize: 14,
  },
  searchInput: {
    margin: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.grayDark,
    backgroundColor: '#F8FCFA',
  },
  optionItem: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  selectedOption: {
    backgroundColor: Colors.greenLight,
  },
  optionTextBlock: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    color: Colors.grayDark,
    fontWeight: '900',
  },
  optionMeta: {
    color: Colors.grayText,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  selectedOptionText: {
    color: Colors.greenInstitutional,
  },
  checkIcon: {
    color: Colors.greenInstitutional,
    fontWeight: '900',
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.grayLight,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: Colors.grayDark,
    fontWeight: '900',
    fontSize: 15,
  },
  emptyText: {
    color: Colors.grayText,
    textAlign: 'center',
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '700',
  },
});
