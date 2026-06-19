import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { HelperText, TextInput as PaperTextInput } from 'react-native-paper';
import { Colors } from '../core/colors';

export default function CampoData({ field, value, onChange, error, visualMode }) {
  const { id, titulo, obrigatorio } = field;
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const maskDate = (text) => {
    const clean = text.replace(/\D/g, '');
    let masked = '';
    if (clean.length > 0) {
      masked += clean.substring(0, 2);
      if (clean.length > 2) {
        masked += '/' + clean.substring(2, 4);
        if (clean.length > 4) {
          masked += '/' + clean.substring(4, 8);
        }
      }
    }
    return masked;
  };

  const handleTextChange = (text) => {
    onChange(maskDate(text));
  };

  const setToday = () => {
    const today = new Date();
    setCalendarDate(today);
    setSelectedDate(today);
  };

  const setSelectedDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    onChange(`${day}/${month}/${year}`);
    setCalendarVisible(false);
  };

  const changeMonth = (offset) => {
    setCalendarDate((current) => (
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    ));
  };

  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const days = [];

    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [calendarDate]);

  const monthTitle = calendarDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const isSelectedDate = (date) => {
    if (!date || !value) return false;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return value === `${day}/${month}/${year}`;
  };

  if (visualMode === 'paper') {
    return (
      <View style={styles.paperContainer}>
        <PaperTextInput
          mode="outlined"
          label={`${titulo}${obrigatorio === 1 ? ' *' : ''}`}
          placeholder="DD/MM/AAAA"
          keyboardType="numeric"
          maxLength={10}
          value={value || ''}
          onChangeText={handleTextChange}
          error={!!error}
          outlineColor={Colors.cardBorder}
          activeOutlineColor={Colors.greenInstitutional}
          style={styles.paperInput}
          right={<PaperTextInput.Icon icon="calendar-month" onPress={() => setCalendarVisible(true)} />}
        />

        {renderCalendarModal()}
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
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={Colors.grayText}
          keyboardType="numeric"
          maxLength={10}
          value={value || ''}
          onChangeText={handleTextChange}
        />
        <TouchableOpacity style={styles.calendarButton} onPress={() => setCalendarVisible(true)}>
          <View style={styles.calendarIcon}>
            <View style={styles.calendarIconTop} />
            <View style={styles.calendarIconGrid}>
              <View style={styles.calendarIconDot} />
              <View style={styles.calendarIconDot} />
              <View style={styles.calendarIconDot} />
              <View style={styles.calendarIconDot} />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {renderCalendarModal()}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  function renderCalendarModal() {
    return (
      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarPanel}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(-1)}>
                <Text style={styles.monthButtonText}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{monthTitle}</Text>
              <TouchableOpacity style={styles.monthButton} onPress={() => changeMonth(1)}>
                <Text style={styles.monthButtonText}>{'>'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                <Text style={styles.weekDay} key={`${day}_${index}`}>{day}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {calendarDays.map((date, index) => (
                <View style={styles.daySlot} key={`day_${index}`}>
                  {date ? (
                    <TouchableOpacity
                      style={[styles.dayButton, isSelectedDate(date) ? styles.dayButtonSelected : null]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text style={[styles.dayText, isSelectedDate(date) ? styles.dayTextSelected : null]}>
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>

            <View style={styles.calendarActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setCalendarVisible(false)}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={setToday}>
                <Text style={styles.primaryButtonText}>Hoje</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
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
  calendarButton: {
    backgroundColor: Colors.greenLight,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: Colors.greenInstitutional,
  },
  todayButtonText: {
    color: Colors.greenInstitutional,
    fontWeight: '700',
    fontSize: 14,
  },
  calendarIcon: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: Colors.greenInstitutional,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  calendarIconTop: {
    height: 6,
    backgroundColor: Colors.greenInstitutional,
  },
  calendarIconGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 3,
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  calendarIconDot: {
    width: 5,
    height: 5,
    borderRadius: 2,
    backgroundColor: Colors.greenInstitutional,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  calendarPanel: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonText: {
    color: Colors.greenInstitutional,
    fontSize: 18,
    fontWeight: '900',
  },
  monthTitle: {
    color: Colors.grayDark,
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: Colors.grayText,
    fontSize: 12,
    fontWeight: '800',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  daySlot: {
    width: `${100 / 7}%`,
    padding: 3,
  },
  dayButton: {
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grayLight,
  },
  dayButtonSelected: {
    backgroundColor: Colors.greenInstitutional,
  },
  dayText: {
    color: Colors.grayDark,
    fontSize: 14,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: Colors.white,
  },
  calendarActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.grayLight,
    marginRight: 8,
  },
  secondaryButtonText: {
    color: Colors.grayDark,
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.greenInstitutional,
    marginLeft: 8,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 14,
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
