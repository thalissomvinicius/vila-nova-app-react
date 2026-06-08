import { create } from 'zustand';
import { Platform } from 'react-native';
import { SecureStoreService } from './secureStore';
import { ApiService } from './api';
import { AppDatabase } from './database';

export const useAuthStore = create((set) => ({
  isLoading: false,
  isAuthenticated: true,
  errorMsg: null,
  userName: 'Demo',
  cargo: 'Assistente Administrativo',
  userId: 'demo-id',

  async checkSession() {
    const authenticated = await SecureStoreService.isAuthenticated();
    if (authenticated) {
      const userInfo = await SecureStoreService.getUserInfo();
      if (userInfo) {
        set({
          isAuthenticated: true,
          userName: userInfo.userName,
          cargo: userInfo.cargo,
          userId: userInfo.userId,
        });
      }
    }
  },

  async login(usuario, senha) {
    set({ isLoading: true, errorMsg: null });
    try {
      // 1. Attempt API login (Bypass on web to prevent CORS/timeout freezes in prototype)
      if (Platform.OS === 'web') {
        throw new Error("Web prototype offline mode forced");
      }
      
      const response = await ApiService.login(usuario, senha);
      const data = response.data;
      const token = data.token;
      const user = data.usuario;

      const profile = {
        userId: user.id?.toString() || Math.random().toString(),
        userName: user.nome || usuario,
        cargo: user.cargo || 'Colaborador',
      };

      await SecureStoreService.saveToken(token);
      await SecureStoreService.saveUserInfo(profile);

      // Save user in local DB
      AppDatabase.insert('usuarios', {
        id: profile.userId,
        nome: profile.userName,
        email: user.email || '',
        cargo: profile.cargo,
        jwt_token: token,
        criado_em: new Date().toISOString(),
        ultimo_acesso: new Date().toISOString(),
      });

      set({
        isLoading: false,
        isAuthenticated: true,
        userName: profile.userName,
        cargo: profile.cargo,
        userId: profile.userId,
      });
      return true;
    } catch (apiError) {
      // 2. Offline Fallback: Accept any non-empty credentials for demo purposes
      try {
        if (usuario && usuario.trim().length > 0) {
          const mockToken = `offline_token_${Date.now()}`;
          const isUserThalissom = usuario.toLowerCase().includes('thalissom');
          
          const profile = {
            userId: `offline_uid_${Date.now()}`,
            userName: usuario,
            cargo: isUserThalissom ? 'Assistente Administrativo' : 'Colaborador de Campo',
          };

          await SecureStoreService.saveToken(mockToken);
          await SecureStoreService.saveUserInfo(profile);

          // Save in local database
          try {
            AppDatabase.insert('usuarios', {
              id: profile.userId,
              nome: profile.userName,
              email: `${usuario.toLowerCase().replace(' ', '')}@vilanova.com.br`,
              cargo: profile.cargo,
              jwt_token: mockToken,
              criado_em: new Date().toISOString(),
              ultimo_acesso: new Date().toISOString(),
            });
          } catch (dbError) {
            console.error('AppDatabase insert error:', dbError);
          }

          set({
            isLoading: false,
            isAuthenticated: true,
            userName: profile.userName,
            cargo: profile.cargo,
            userId: profile.userId,
          });
          return true;
        }

        set({
          isLoading: false,
          errorMsg: 'Credenciais inválidas. Insira seu usuário e senha.',
        });
        return false;
      } catch (offlineError) {
        console.error('Offline login erro:', offlineError);
        set({
          isLoading: false,
          errorMsg: `Erro local: ${offlineError.message}`,
        });
        return false;
      }
    }
  },

  async logout() {
    await SecureStoreService.clearAll();
    set({
      isAuthenticated: false,
      userName: null,
      cargo: 'Colaborador',
      userId: null,
      errorMsg: null,
    });
  },
}));
