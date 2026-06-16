import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';

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

async function captureGpsPoint() {
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

async function pickImage(useCamera) {
  const options = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.55,
  };

  return useCamera
    ? ImagePicker.launchCameraAsync(options)
    : ImagePicker.launchImageLibraryAsync(options);
}

export async function captureImageWithGps(useCamera) {
  const cameraRes = await ImagePicker.requestCameraPermissionsAsync();
  const libraryRes = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (cameraRes.status !== 'granted' || libraryRes.status !== 'granted') {
    throw new Error('permissao_media');
  }

  const result = await pickImage(useCamera);
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const position = await captureGpsPoint();

  let base64 = '';
  try {
    base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    base64 = '';
  }

  return {
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
  };
}
