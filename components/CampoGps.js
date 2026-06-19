import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Colors } from '../core/colors';

const GPS_TIMEOUT_MS = 6500;
const ACCEPTABLE_ACCURACY_METERS = 35;

async function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function CampoGps({ field, value, onChange, error }) {
  const { titulo, obrigatorio } = field;
  const [isLoading, setIsLoading] = useState(false);
  const [accuracy, setAccuracy] = useState(null);

  const handleCaptureGps = async () => {
    setIsLoading(true);
    setAccuracy(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão negada',
          'Precisamos de acesso à localização para preencher as coordenadas do formulário.'
        );
        return;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'GPS desativado',
          'Ative a localização/GPS nas configurações do seu celular.'
        );
        return;
      }

      let bestPosition = await Location.getLastKnownPositionAsync({
        maxAge: 120000,
        requiredAccuracy: 100,
      });
      let bestAccuracy = bestPosition?.coords?.accuracy ?? Number.POSITIVE_INFINITY;

      if (bestPosition) setAccuracy(bestAccuracy);

      if (!bestPosition || bestAccuracy > ACCEPTABLE_ACCURACY_METERS) {
        const position = await withTimeout(
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            mayShowUserSettingsDialog: true,
          }),
          GPS_TIMEOUT_MS
        );

        const currentAccuracy = position.coords.accuracy ?? Number.POSITIVE_INFINITY;
        if (!bestPosition || currentAccuracy <= bestAccuracy) {
          bestAccuracy = currentAccuracy;
          bestPosition = position;
          setAccuracy(currentAccuracy);
        }
      }

      if (bestPosition) {
        const { latitude, longitude } = bestPosition.coords;
        const accuracyValue = Number.isFinite(bestAccuracy) ? bestAccuracy : '';
        onChange(`${latitude},${longitude},${accuracyValue}`);
      } else {
        setAccuracy(null);
        Alert.alert('GPS não encontrado', 'Não foi possível obter uma leitura de localização.');
      }
    } catch (e) {
      console.error('Error fetching location:', e);
      Alert.alert('Erro', 'Não foi possível capturar o sinal de GPS.');
    } finally {
      setIsLoading(false);
    }
  };

  const parts = value ? String(value).split(',') : [];
  const hasValue = parts.length >= 2;
  const lat = hasValue ? parseFloat(parts[0]).toFixed(6) : '';
  const lng = hasValue ? parseFloat(parts[1]).toFixed(6) : '';
  const savedAccuracy = Number(parts[2]);
  const displayAccuracy = Number.isFinite(accuracy) ? accuracy : savedAccuracy;

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
              <Text style={styles.loadingText}>Capturando GPS...</Text>
            </View>
          )}

          {hasValue && !isLoading && (
            <View>
              <Text style={styles.coordText}>Lat: {lat}</Text>
              <Text style={styles.coordText}>Long: {lng}</Text>
              {Number.isFinite(displayAccuracy) && (
                <Text style={styles.accuracyText}>
                  Precisão: {displayAccuracy.toFixed(1)}m
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
