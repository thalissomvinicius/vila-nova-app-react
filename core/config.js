import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
const DEFAULT_SUPABASE_URL = 'https://wcifxyvesmhqurqhnway.supabase.co/rest/v1';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjaWZ4eXZlc21ocXVycWhud2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDY2MjgsImV4cCI6MjA4NTc4MjYyOH0.1hnE3IuZQ5wrXtXA22GxS-pUAiSnIlZBOiuGUgS1ABw';

export const AppConfig = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    extra.apiBaseUrl ||
    DEFAULT_SUPABASE_URL,
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.supabaseAnonKey ||
    DEFAULT_SUPABASE_ANON_KEY,
  appVersion: extra.appVersion || '1.0.2',
  platform: 'android',
};

export const hasSupabaseConfig = Boolean(AppConfig.supabaseAnonKey && AppConfig.apiBaseUrl.includes('supabase.co'));
