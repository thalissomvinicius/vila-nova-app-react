import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_TOKEN = 'vilanova_jwt_token';
const KEY_REFRESH = 'vilanova_refresh_token';
const KEY_USER_INFO = 'vilanova_user_info';

// Fallback in-memory storage for web environments just in case localStorage is disabled
const memoryStorage = {};

const getStorageItem = async (key) => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return memoryStorage[key] || null;
    }
  }
  return await SecureStore.getItemAsync(key);
};

const setStorageItem = async (key, value) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      memoryStorage[key] = value;
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

const deleteStorageItem = async (key) => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (_) {
      delete memoryStorage[key];
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
};

export const SecureStoreService = {
  async getItem(key) {
    return await getStorageItem(key);
  },

  async setItem(key, value) {
    await setStorageItem(key, value);
  },

  async deleteItem(key) {
    await deleteStorageItem(key);
  },

  async saveToken(token) {
    await setStorageItem(KEY_TOKEN, token);
  },

  async getToken() {
    return await getStorageItem(KEY_TOKEN);
  },

  async saveRefreshToken(token) {
    await setStorageItem(KEY_REFRESH, token);
  },

  async getRefreshToken() {
    return await getStorageItem(KEY_REFRESH);
  },

  async saveUserInfo(userInfo) {
    await setStorageItem(KEY_USER_INFO, JSON.stringify(userInfo));
  },

  async getUserInfo() {
    const raw = await getStorageItem(KEY_USER_INFO);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  },

  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  },

  async clearAll() {
    await deleteStorageItem(KEY_TOKEN);
    await deleteStorageItem(KEY_REFRESH);
    await deleteStorageItem(KEY_USER_INFO);
  },
};
