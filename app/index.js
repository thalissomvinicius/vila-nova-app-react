import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../core/authStore';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function routeFromSession() {
      await useAuthStore.getState().checkSession();
      if (!isMounted) return;

      const { isAuthenticated } = useAuthStore.getState();
      router.replace(isAuthenticated ? '/home' : '/login');
    }

    routeFromSession();
    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0B6B4A" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7F9',
  },
});
