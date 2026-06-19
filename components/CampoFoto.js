import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { Colors } from '../core/colors';

const GPS_TIMEOUT_MS = 6000;

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

async function capturePhotoGps() {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) return null;

    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 120000,
      requiredAccuracy: 120,
    });

    try {
      const current = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        }),
        GPS_TIMEOUT_MS
      );
      const lastAccuracy = lastKnown?.coords?.accuracy ?? Number.POSITIVE_INFINITY;
      const currentAccuracy = current.coords.accuracy ?? Number.POSITIVE_INFINITY;
      return currentAccuracy <= lastAccuracy ? current : lastKnown;
    } catch {
      return lastKnown;
    }
  } catch {
    return null;
  }
}

function normalizePhotoValue(value) {
  if (!value) return null;
  if (typeof value === 'string') return { uri: value };
  if (typeof value === 'object') return value;
  return null;
}

export default function CampoFoto({ field, value, onChange, error }) {
  const { titulo, obrigatorio } = field;
  const [isLoading, setIsLoading] = useState(false);
  const photo = normalizePhotoValue(value);

  const requestPermissions = async () => {
    const cameraRes = await ImagePicker.requestCameraPermissionsAsync();
    const libraryRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraRes.status === 'granted' && libraryRes.status === 'granted';
  };

  const handlePickImage = async (useCamera) => {
    setIsLoading(true);
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permissao necessaria',
        'O aplicativo precisa de permissoes de camera e galeria para funcionar.'
      );
      setIsLoading(false);
      return;
    }

    try {
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.55,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const position = await capturePhotoGps();
        let base64 = '';

        try {
          base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } catch {
          base64 = '';
        }

        onChange({
          uri: asset.uri,
          base64,
          mimeType: 'image/jpeg',
          width: asset.width || null,
          height: asset.height || null,
          capturedAt: new Date().toISOString(),
          gps: position ? {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            precisao: position.coords.accuracy ?? null,
            altitude: position.coords.altitude ?? null,
            capturado_em: new Date(position.timestamp || Date.now()).toISOString(),
          } : null,
        });
      }
    } catch (e) {
      console.error('Error picking image:', e);
      Alert.alert('Erro', 'Ocorreu um erro ao capturar a foto.');
    } finally {
      setIsLoading(false);
    }
  };

  const showSourceDialog = () => {
    Alert.alert(
      'Selecionar foto',
      'Escolha a origem da imagem de evidencia:',
      [
        { text: 'Camera', onPress: () => handlePickImage(true) },
        { text: 'Galeria', onPress: () => handlePickImage(false) },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{titulo}</Text>
        {obrigatorio === 1 && <Text style={styles.required}> *</Text>}
      </View>

      <TouchableOpacity
        style={[
          styles.photoBox,
          error ? styles.photoBoxError : null,
          photo ? styles.photoBoxActive : null,
        ]}
        onPress={photo ? null : showSourceDialog}
        activeOpacity={0.8}
      >
        {photo ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />
            {photo.gps ? (
              <View style={styles.gpsBadge}>
                <Text style={styles.gpsBadgeText}>GPS</Text>
              </View>
            ) : null}
            <TouchableOpacity style={styles.deleteBadge} onPress={() => onChange('')}>
              <Text style={styles.deleteText}>x</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            {isLoading ? (
              <ActivityIndicator color={Colors.greenInstitutional} size="large" />
            ) : (
              <>
                <Text style={styles.placeholderIcon}>CAM</Text>
                <Text style={styles.placeholderText}>Registrar imagem geolocalizada</Text>
              </>
            )}
          </View>
        )}
      </TouchableOpacity>

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
  photoBox: {
    height: 180,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBoxError: {
    borderColor: Colors.danger,
  },
  photoBoxActive: {
    borderWidth: 0,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  deleteBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  gpsBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(11, 107, 74, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gpsBadgeText: {
    color: Colors.white,
    fontWeight: '900',
    fontSize: 11,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 18,
    color: Colors.grayText,
    opacity: 0.75,
    marginBottom: 8,
    fontWeight: '900',
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.grayText,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '600',
  },
});
