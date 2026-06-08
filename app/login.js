import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../core/authStore';
import { Colors } from '../core/colors';

export default function Login() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [isOnline, setIsOnline] = useState(true);

  const { login, isLoading, errorMsg } = useAuthStore();

  // Monitor network connection state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const success = await login(usuario, senha);
    if (success) {
      router.replace('/home');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.greenDark} />
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {/* Connection Status Badge */}
        <View style={styles.badgeContainer}>
          <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
            <Text style={styles.badgeText}>
              {isOnline ? 'ONLINE' : 'OFFLINE (MODO LOCAL)'}
            </Text>
          </View>
        </View>

        {/* Corporate Branding Headers */}
        <View style={styles.headerContainer}>
          <Text style={styles.logoTitle}>VILA NOVA</Text>
          <Text style={styles.logoSubtitle}>AGROINDUSTRIAL</Text>
          <Text style={styles.appTagline}>Coletor Operacional de Campo</Text>
        </View>

        {/* Login Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Acesso ao Coletor</Text>
          
          {errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Usuário</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu usuário..."
              placeholderTextColor={Colors.grayText}
              autoCapitalize="none"
              value={usuario}
              onChangeText={setUsuario}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha..."
              placeholderTextColor={Colors.grayText}
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Versão 1.0.0 (React Native)</Text>
          <Text style={styles.footerCompany}>Vila Nova Agroindustrial S/A</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#084C35', // Solid Premium Dark Green background
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeOnline: {
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  badgeOffline: {
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 1.5,
  },
  logoSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.orangeInstitutional,
    letterSpacing: 2.5,
    marginTop: -4,
  },
  appTagline: {
    fontSize: 13,
    color: '#B2D4C8',
    marginTop: 8,
    fontWeight: '500',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.grayDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#EF444415',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.grayDark,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.grayLight,
    borderWidth: 1,
    borderColor: Colors.grayMedium,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.grayDark,
  },
  button: {
    backgroundColor: Colors.greenInstitutional,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#B2D4C8',
    fontSize: 11,
  },
  footerCompany: {
    color: '#B2D4C8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
