import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Font from 'expo-font';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { AppDatabase } from '../core/database';
import { useAuthStore } from '../core/authStore';
import { Colors } from '../core/colors';

const paperTheme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.greenInstitutional,
    onPrimary: Colors.white,
    primaryContainer: Colors.greenLight,
    secondary: Colors.orangeInstitutional,
    secondaryContainer: Colors.orangeLight,
    background: Colors.background,
    surface: Colors.surface,
    surfaceVariant: Colors.grayLight,
    outline: Colors.cardBorder,
    error: Colors.danger,
  },
};

export default function RootLayout() {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;

    const isFontTimeout = (reason) => (
      typeof reason?.message === 'string'
      && reason.message.includes('ms timeout exceeded')
    );

    Font.loadAsync(MaterialCommunityIcons.font).catch((error) => {
      if (!isFontTimeout(error)) {
        console.warn('Icon font load unavailable:', error);
      }
    });

    const handleUnhandledRejection = (event) => {
      if (isFontTimeout(event.reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // 1. Initialize SQLite Database schemas and seed data
  useEffect(() => {
    try {
      AppDatabase.initialize();
      console.log('Banco de dados inicializado com sucesso.');
    } catch (e) {
      console.error('Erro ao inicializar banco de dados:', e);
    }
  }, []);

  // 2. Restore User JWT Session
  useEffect(() => {
    useAuthStore.getState().checkSession();
  }, []);

  // Authentication guard is handled by index.js and individual pages to prevent Expo Router loops

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.greenInstitutional} />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.greenInstitutional,
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '800',
            },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="formularios/[areaId]" options={{ title: 'Formulários' }} />
          <Stack.Screen name="preencher/[formId]" options={{ headerShown: false }} />
          <Stack.Screen name="sync" options={{ title: 'Central de Sincronização' }} />
          <Stack.Screen name="historico" options={{ title: 'Histórico' }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
