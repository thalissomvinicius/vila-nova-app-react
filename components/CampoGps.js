import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Colors } from '../core/colors';

export default function CampoGps({ field, value, onChange, error }) {
  const { id, titulo, obrigatorio } = field;
  const [isLoading, setIsLoading] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  const handleCaptureGps = async () => {
    setIsLoading(true);
    setAccuracy(null);

    try {
      // 1. Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Precisamos de acesso à localização para preencher as coordenadas do formulário.'
        );
        setIsLoading(false);
        return;
      }

      // 2. Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'GPS desativado',
          'Por favor, ative a localização/GPS nas configurações do seu celular.'
        );
        setIsLoading(false);
        return;
      }

      // 3. Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
      });

      const { latitude, longitude, accuracy: prec } = position.coords;
      setAccuracy(prec);
      onChange(`${latitude},${longitude}`);
    } catch (e) {
      console.error('Error fetching location:', e);
      Alert.alert('Erro', 'Não foi possível capturar o sinal de GPS.');
    } finally {
      setIsLoading(false);
    }
  };

  const hasValue = value && value.includes(',');
  let lat = '';
  let lng = '';
  if (hasValue) {
    const parts = value.split(',');
    lat = parseFloat(parts[0]).toFixed(6);
    lng = parseFloat(parts[1]).toFixed(6);
  }

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>

      <View style={[styles.gpsBox, error ? styles.gpsBoxError : null]}>
        <View style={styles.textContainer}>
          {!hasValue && !isLoading && (
            <Text style={styles.placeholderText}>Coordenadas não capturadas</Text>
          )}

          {isLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.greenInstitutional} size="small" />
              <Text style={styles.loadingText}>Buscando sinal GPS...</Text>
            </View>
          )}

          {hasValue && !isLoading && (
            <View>
              <Text style={styles.coordText}>Lat: {lat}</Text>
              <Text style={styles.coordText}>Long: {lng}</Text>
              {accuracy && (
                <Text style={styles.accuracyText}>
                  Precisão: {accuracy.toFixed(1)}m
                </Text>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.captureBtn}
          onPress={handleCaptureGps}
          disabled={isLoading}
        >
          <Text style={styles.captureBtnText}>
            {hasValue ? 'Recapturar' : 'Capturar'}
          </Text>
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
  gpsBox: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsBoxError: {
    borderColor: Colors.danger,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.grayText,
    fontWeight: '500',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.grayText,
    marginLeft: 8,
    fontWeight: '600',
  },
  coordText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.grayDark,
    marginBottom: 2,
  },
  accuracyText: {
    fontSize: 11,
    color: Colors.greenInstitutional,
    fontWeight: 'bold',
    marginTop: 4,
  },
  captureBtn: {
    backgroundColor: Colors.greenInstitutional,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  captureBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
