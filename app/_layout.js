import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
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
        <StatusBar style="light" backgroundColor="#084C35" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#0B6B4A',
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
          <Stack.Screen name="preencher/[formId]" options={{ title: 'Preencher Coleta' }} />
          <Stack.Screen name="sync" options={{ title: 'Central de Sync' }} />
          <Stack.Screen name="historico" options={{ title: 'Histórico' }} />
        </Stack>
      </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
