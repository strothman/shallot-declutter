import type { AppSettings, ScannedDocument } from '../types';

const SETTINGS_KEY = 'shallot_declutter_settings_v1';
const VAULT_KEY = 'shallot_declutter_vault_v1';

const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: (import.meta.env.VITE_GEMINI_API_KEY as string) || '',
  geminiModel: 'gemini-3.5-flash-lite',
  googleClientId: '',
  autoFile: false,
  rootDriveFolder: 'G:\\My Drive\\IDE\\Declutter',
  enhanceContrast: true,
  useDemoMode: false,
  theme: 'shallot-plum',
};

export function applyTheme(theme: string = 'shallot-plum'): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function loadSettings(): AppSettings {
  try {
    const envKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      applyTheme('shallot-plum');
      return { ...DEFAULT_SETTINGS, geminiApiKey: envKey };
    }
    const parsed = JSON.parse(raw);
    const model = (!parsed.geminiModel || parsed.geminiModel === 'gemini-2.5-flash' || parsed.geminiModel === 'gemini-3.1-flash-lite')
      ? 'gemini-3.5-flash-lite'
      : parsed.geminiModel;

    const rootFolder = (!parsed.rootDriveFolder || parsed.rootDriveFolder === 'Shallot-Declutter')
      ? 'G:\\My Drive\\IDE\\Declutter'
      : parsed.rootDriveFolder;

    const theme = parsed.theme || 'shallot-plum';
    applyTheme(theme);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      theme,
      geminiModel: model,
      rootDriveFolder: rootFolder,
      geminiApiKey: parsed.geminiApiKey?.trim() ? parsed.geminiApiKey : envKey,
    };
  } catch {
    applyTheme('shallot-plum');
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    if (settings.theme) {
      applyTheme(settings.theme);
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function loadVault(): ScannedDocument[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveVaultItem(doc: ScannedDocument): void {
  try {
    const current = loadVault();
    // Exclude raw heavy blob/binary fields from localStorage to prevent quota exhaustion
    const sanitizedItem: ScannedDocument = {
      ...doc,
      pdfBlob: undefined, // Don't serialize Blob
      pages: doc.pages.slice(0, 1), // Keep just thumbnail in storage
    };

    const existingIndex = current.findIndex((item) => item.id === doc.id);
    if (existingIndex >= 0) {
      current[existingIndex] = sanitizedItem;
    } else {
      current.unshift(sanitizedItem);
    }
    localStorage.setItem(VAULT_KEY, JSON.stringify(current.slice(0, 50))); // Keep last 50
  } catch (err) {
    console.error('Failed to save vault item:', err);
  }
}

export function deleteVaultItem(id: string): void {
  try {
    const current = loadVault().filter((doc) => doc.id !== id);
    localStorage.setItem(VAULT_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to delete vault item:', err);
  }
}
