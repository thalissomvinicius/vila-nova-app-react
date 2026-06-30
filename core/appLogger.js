import { Platform } from 'react-native';
import { AppConfig } from './config';
import { AppDatabase } from './database';

const MAX_LOG_ROWS = 500;
const LOG_LEVELS = new Set(['debug', 'info', 'warn', 'error']);
const originalConsole = {
  debug: console.debug?.bind(console) || console.log.bind(console),
  log: console.log.bind(console),
  info: console.info?.bind(console) || console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

let isInstalled = false;
let isWritingLog = false;

function redactSensitiveText(value) {
  return String(value ?? '')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redigido]')
    .replace(/("?(?:jwt_token|refresh_token|supabaseAnonKey|senha|password)"?\s*[:=]\s*)"[^"]+"/gi, '$1"[redigido]"')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt_redigido]');
}

function stringifyLogValue(value) {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return String(value);

  try {
    return JSON.stringify(value);
  } catch (_) {
    return String(value);
  }
}

function stackFromDetails(details) {
  if (details instanceof Error) return details.stack || null;
  if (details?.stack) return String(details.stack);
  return null;
}

function persistLog(level, message, details = null) {
  if (isWritingLog) return;

  const normalizedLevel = LOG_LEVELS.has(level) ? level : 'info';
  const safeMessage = redactSensitiveText(message).slice(0, 4000);
  const stacktrace = stackFromDetails(details);

  isWritingLog = true;
  try {
    AppDatabase.insert('logs', {
      nivel: normalizedLevel,
      mensagem: safeMessage,
      stacktrace: stacktrace ? redactSensitiveText(stacktrace).slice(0, 6000) : null,
      usuario_id: null,
      criado_em: new Date().toISOString(),
    });

    AppDatabase.run(
      'DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY criado_em DESC LIMIT ?)',
      [MAX_LOG_ROWS]
    );
  } catch (_) {
    // Logging must never break the app.
  } finally {
    isWritingLog = false;
  }
}

export function logAppEvent(level, message, details = null) {
  const text = Array.isArray(message)
    ? message.map(stringifyLogValue).join(' ')
    : stringifyLogValue(message);
  persistLog(level, text, details);
}

function wrapConsoleMethod(methodName, level) {
  console[methodName] = (...args) => {
    originalConsole[methodName](...args);
    logAppEvent(level, args.map(stringifyLogValue).join(' '), args.find((item) => item instanceof Error) || null);
  };
}

function installGlobalErrorCapture() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      logAppEvent('error', event.message || 'Erro global no navegador', event.error || null);
    });

    window.addEventListener('unhandledrejection', (event) => {
      logAppEvent('error', 'Promise rejeitada sem tratamento', event.reason || null);
    });
    return;
  }

  if (global.ErrorUtils?.getGlobalHandler && global.ErrorUtils?.setGlobalHandler) {
    const previousHandler = global.ErrorUtils.getGlobalHandler();
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      logAppEvent('error', `${isFatal ? 'Fatal' : 'Erro'} global: ${error?.message || error}`, error);
      previousHandler?.(error, isFatal);
    });
  }
}

export function initializeAppLogger() {
  if (isInstalled) return;
  isInstalled = true;

  wrapConsoleMethod('debug', 'debug');
  wrapConsoleMethod('log', 'info');
  wrapConsoleMethod('info', 'info');
  wrapConsoleMethod('warn', 'warn');
  wrapConsoleMethod('error', 'error');
  installGlobalErrorCapture();
  logAppEvent('info', 'Logger local inicializado', {
    platform: Platform.OS,
    appVersion: AppConfig.appVersion,
  });
}

export function readAppLogs(limit = MAX_LOG_ROWS) {
  try {
    return AppDatabase.getAll('SELECT * FROM logs ORDER BY criado_em DESC LIMIT ?', [limit]);
  } catch (error) {
    return [{
      nivel: 'error',
      mensagem: `Falha ao ler logs locais: ${error.message}`,
      stacktrace: error.stack || null,
      criado_em: new Date().toISOString(),
    }];
  }
}

export function clearAppLogs() {
  try {
    AppDatabase.run('DELETE FROM logs');
  } catch (_) {}
}

export function buildLogsExport() {
  const logs = readAppLogs();
  return {
    schema: 'vilanova_app_logs_export_v1',
    gerado_em: new Date().toISOString(),
    app: {
      version: AppConfig.appVersion,
      platform: Platform.OS,
    },
    total: logs.length,
    logs,
  };
}
