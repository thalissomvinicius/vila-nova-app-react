import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { AppConfig } from './config';
import { SecureStoreService } from './secureStore';

const KEY_DEVICE_ID = 'vilanova_device_id';

function createDeviceId() {
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDeviceId() {
  const existing = await SecureStoreService.getItem(KEY_DEVICE_ID);
  if (existing) return existing;

  const nextId = createDeviceId();
  await SecureStoreService.setItem(KEY_DEVICE_ID, nextId);
  return nextId;
}

export async function getDeviceRegistrationPayload(userInfo = {}) {
  const deviceId = await getDeviceId();
  const now = new Date().toISOString();

  return {
    id: deviceId,
    usuario_id: userInfo.userId || userInfo.matricula || null,
    matricula: userInfo.matricula || userInfo.userId || null,
    plataforma: Platform.OS,
    app_version: AppConfig.appVersion,
    device_name: Constants.deviceName || null,
    expo_project_id: Constants.expoConfig?.extra?.eas?.projectId || null,
    ultimo_login_em: now,
    ultimo_sync_em: now,
    updated_at: now,
  };
}
