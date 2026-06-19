import { create } from 'zustand';
import { ApiService } from './api';
import { AppDatabase } from './database';
import { findSeedCollaborator } from './headcountSeed';
import { SecureStoreService } from './secureStore';

const DEFAULT_PASSWORD = '1234';

function normalizeMatricula(value) {
  return String(value || '').replace(/\D/g, '').trim();
}

function normalizePassword(value) {
  return String(value || '').trim();
}

function buildProfile(collaborator) {
  return {
    userId: collaborator.matricula,
    matricula: collaborator.matricula,
    userName: collaborator.nome,
    cargo: collaborator.cargo || 'Colaborador de Campo',
    departamento: collaborator.departamento || '',
    gestor: collaborator.gestor || '',
  };
}

function saveHeadcountLocal(collaborator) {
  const now = new Date().toISOString();
  AppDatabase.insert('headcount_colaboradores', {
    matricula: collaborator.matricula,
    senha: collaborator.senha || DEFAULT_PASSWORD,
    nome: collaborator.nome,
    departamento: collaborator.departamento || '',
    cargo: collaborator.cargo || '',
    gestor: collaborator.gestor || '',
    status: collaborator.status || 'ATIVO',
    admissao_excel: collaborator.admissao_excel || '',
    fonte_aba: collaborator.fonte_aba || '',
    fonte_arquivo: collaborator.fonte_arquivo || '',
    reference_date: collaborator.reference_date || '',
    imported_at: collaborator.imported_at || '',
    updated_at: now,
  });
}

function saveLoggedUser(profile, token) {
  const now = new Date().toISOString();
  AppDatabase.insert('usuarios', {
    id: profile.userId,
    nome: profile.userName,
    email: `${profile.matricula}@headcount.local`,
    cargo: profile.cargo,
    area_id: 'campo',
    jwt_token: token,
    criado_em: now,
    ultimo_acesso: now,
  });
}

async function persistSession(profile, token) {
  await SecureStoreService.saveToken(token);
  await SecureStoreService.saveUserInfo(profile);
  saveLoggedUser(profile, token);
}

function getLocalCollaborator(matricula) {
  return AppDatabase.getFirst(
    "SELECT * FROM headcount_colaboradores WHERE matricula = ? AND status = 'ATIVO' LIMIT 1",
    [matricula]
  );
}

function formatOnlineError(error) {
  if (error?.response?.status) {
    const details = error.response.data?.message || error.response.statusText || 'sem detalhe';
    return `Supabase HTTP ${error.response.status}: ${details}`;
  }
  if (error?.request) {
    return 'sem resposta do Supabase';
  }
  return error?.message || 'erro desconhecido';
}

export const useAuthStore = create((set) => ({
  isLoading: false,
  isAuthenticated: false,
  errorMsg: null,
  userName: null,
  cargo: 'Colaborador',
  userId: null,
  matricula: null,
  departamento: null,
  gestor: null,

  async checkSession() {
    const authenticated = await SecureStoreService.isAuthenticated();
    if (!authenticated) return;

    const userInfo = await SecureStoreService.getUserInfo();
    if (userInfo) {
      set({
        isAuthenticated: true,
        userName: userInfo.userName,
        cargo: userInfo.cargo,
        userId: userInfo.userId,
        matricula: userInfo.matricula,
        departamento: userInfo.departamento || null,
        gestor: userInfo.gestor || null,
      });
    }
  },

  async login(usuario, senha) {
    const matricula = normalizeMatricula(usuario);
    const password = normalizePassword(senha);

    if (!matricula || !password) {
      set({ isLoading: false, errorMsg: 'Informe matrícula e senha.' });
      return false;
    }

    set({ isLoading: true, errorMsg: null });

    try {
      const response = await ApiService.getHeadcountByMatricula(matricula);
      const collaborator = Array.isArray(response.data) ? response.data[0] : null;

      if (!collaborator) {
        throw new Error('Matrícula não encontrada no Headcount.');
      }

      if (password !== String(collaborator.senha || DEFAULT_PASSWORD)) {
        set({ isLoading: false, errorMsg: 'Senha incorreta para esta matrícula.' });
        return false;
      }

      saveHeadcountLocal(collaborator);
      const profile = buildProfile(collaborator);
      const token = `headcount_online_${matricula}_${Date.now()}`;
      await persistSession(profile, token);

      set({
        isLoading: false,
        isAuthenticated: true,
        userName: profile.userName,
        cargo: profile.cargo,
        userId: profile.userId,
        matricula: profile.matricula,
        departamento: profile.departamento,
        gestor: profile.gestor,
      });
      return true;
    } catch (onlineError) {
      try {
        const localCollaborator = getLocalCollaborator(matricula);
        const seedCollaborator = localCollaborator || findSeedCollaborator(matricula);

        if (!seedCollaborator) {
          set({
            isLoading: false,
            errorMsg: `Não foi possível validar online (${formatOnlineError(onlineError)}). Esta matrícula ainda não está salva offline neste aparelho.`,
          });
          return false;
        }

        if (password !== String(seedCollaborator.senha || DEFAULT_PASSWORD)) {
          set({ isLoading: false, errorMsg: 'Senha incorreta para esta matrícula.' });
          return false;
        }

        if (!localCollaborator) {
          saveHeadcountLocal(seedCollaborator);
        }

        const profile = buildProfile(seedCollaborator);
        const token = `headcount_offline_${matricula}_${Date.now()}`;
        await persistSession(profile, token);

        set({
          isLoading: false,
          isAuthenticated: true,
          userName: profile.userName,
          cargo: profile.cargo,
          userId: profile.userId,
          matricula: profile.matricula,
          departamento: profile.departamento,
          gestor: profile.gestor,
        });
        return true;
      } catch (offlineError) {
        set({
          isLoading: false,
          errorMsg: `Erro no login local: ${offlineError.message}`,
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
      matricula: null,
      departamento: null,
      gestor: null,
      errorMsg: null,
    });
  },
}));
