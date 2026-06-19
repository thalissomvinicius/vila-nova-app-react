import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { Colors } from '../core/colors';
import { useAuthStore } from '../core/authStore';

export default function Login() {
  const router = useRouter();
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const { login, isLoading, errorMsg } = useAuthStore();
  const accentValue = React.useRef(new Animated.Value(0)).current;
  const fieldValue = React.useRef(new Animated.Value(0)).current;
  const entranceValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    Animated.timing(entranceValue, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const accentAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(accentValue, {
          toValue: 1,
          duration: isLoading ? 900 : 2400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(accentValue, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(isLoading ? 120 : 900),
      ])
    );

    const fieldAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(fieldValue, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fieldValue, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ])
    );

    accentAnimation.start();
    fieldAnimation.start();
    return () => {
      accentAnimation.stop();
      fieldAnimation.stop();
    };
  }, [accentValue, entranceValue, fieldValue, isLoading]);

  const handleLogin = async () => {
    const success = await login(matricula, senha);
    if (success) {
      router.replace('/home');
    }
  };

  const accentTranslateX = accentValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-84, 84],
  });
  const fieldTranslateY = fieldValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });
  const fieldOpacity = fieldValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0.62],
  });
  const cardTranslateY = entranceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.greenDark} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.fieldPattern,
          {
            opacity: fieldOpacity,
            transform: [{ rotate: '-8deg' }, { translateY: fieldTranslateY }],
          },
        ]}
      >
        <View style={styles.fieldLineWide} />
        <View style={styles.fieldLine} />
        <View style={styles.fieldLineShort} />
        <View style={styles.fieldLineWide} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.statusPill}>
          <View style={[styles.statusDot, isOnline ? styles.statusDotOnline : styles.statusDotOffline]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline local'}</Text>
        </View>

        <View style={styles.header}>
          <Animated.View
            style={[
              styles.logoStage,
              {
                opacity: entranceValue,
                transform: [{ translateY: cardTranslateY }],
              },
            ]}
          >
            <View style={styles.logoPlate} />
            <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <View style={styles.accentTrack}>
              <Animated.View
                style={[
                  styles.accentSweep,
                  { transform: [{ translateX: accentTranslateX }] },
                ]}
              />
            </View>
          </Animated.View>
          <Text style={styles.eyebrow}>Operação de Campo</Text>
          <Text style={styles.title}>Coletor Vila Nova</Text>
          <Text style={styles.subtitle}>Acesse com sua matrícula do Headcount.</Text>
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: entranceValue,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          <Text style={styles.cardTitle}>Entrar no aplicativo</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Matrícula</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite sua matrícula"
              placeholderTextColor={Colors.grayText}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              returnKeyType="next"
              value={matricula}
              onChangeText={setMatricula}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha"
              placeholderTextColor={Colors.grayText}
              secureTextEntry
              returnKeyType="done"
              value={senha}
              onChangeText={setSenha}
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            Primeiro acesso precisa de internet. Depois a matrícula fica disponível offline neste aparelho.
          </Text>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Versão 1.0.2</Text>
          <Text style={styles.footerCompany}>Vila Nova Agroindustrial S/A</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 430 : undefined,
    alignSelf: 'center',
    backgroundColor: Colors.greenInstitutional,
    overflow: 'hidden',
  },
  fieldPattern: {
    position: 'absolute',
    left: -28,
    right: -28,
    top: 42,
    height: 280,
    justifyContent: 'space-around',
  },
  fieldLineWide: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 18,
  },
  fieldLine: {
    height: 1,
    backgroundColor: 'rgba(242,181,68,0.26)',
    marginHorizontal: 56,
  },
  fieldLineShort: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: 96,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    zIndex: 1,
  },
  statusPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 26,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOnline: {
    backgroundColor: Colors.success,
  },
  statusDotOffline: {
    backgroundColor: Colors.warning,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoStage: {
    width: 224,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoPlate: {
    position: 'absolute',
    width: 214,
    height: 98,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  logo: {
    width: 196,
    height: 86,
  },
  accentTrack: {
    position: 'absolute',
    bottom: 11,
    width: 118,
    height: 3,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  accentSweep: {
    width: 64,
    height: 3,
    borderRadius: 999,
    backgroundColor: Colors.orangeHighlight,
  },
  eyebrow: {
    color: '#DCE9DD',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.white,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 8,
  },
  subtitle: {
    color: '#DCE9DD',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  cardTitle: {
    color: Colors.grayDark,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 18,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    color: Colors.grayDark,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 7,
  },
  input: {
    backgroundColor: Colors.grayLight,
    borderWidth: 1,
    borderColor: Colors.grayMedium,
    borderRadius: 8,
    color: Colors.grayDark,
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  button: {
    alignItems: 'center',
    backgroundColor: Colors.orangeInstitutional,
    borderRadius: 8,
    marginTop: 8,
    paddingVertical: 15,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '900',
  },
  hint: {
    color: Colors.grayText,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    color: '#DCE9DD',
    fontSize: 11,
    fontWeight: '700',
  },
  footerCompany: {
    color: '#DCE9DD',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
  },
});
