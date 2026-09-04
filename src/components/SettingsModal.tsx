import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  HardDrive, 
  Folder, 
  ExternalLink, 
  Check, 
  Eye, 
  EyeOff,
  LogOut
} from 'lucide-react';
import type { AppSettings } from '../types';
import { requestGoogleDriveAuth } from '../services/driveService';

interface SettingsModalProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClose,
}) => {
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
  const [geminiModel, setGeminiModel] = useState(settings.geminiModel || 'gemini-2.5-flash');
  const [googleClientId, setGoogleClientId] = useState(settings.googleClientId);
  const [autoFile, setAutoFile] = useState(settings.autoFile);
  const [rootDriveFolder, setRootDriveFolder] = useState(settings.rootDriveFolder || 'Shallot-Declutter');
  const [enhanceContrast, setEnhanceContrast] = useState(settings.enhanceContrast ?? true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isAuthenticatingDrive, setIsAuthenticatingDrive] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleConnectGoogleDrive = async () => {
    if (!googleClientId.trim()) {
      setAuthError('Please enter your Google Client ID below first.');
      return;
    }
    setAuthError(null);
    setIsAuthenticatingDrive(true);
    try {
      const token = await requestGoogleDriveAuth(googleClientId.trim());
      const updated: AppSettings = {
        ...settings,
        geminiApiKey,
        geminiModel,
        googleClientId,
        googleAccessToken: token,
        autoFile,
        rootDriveFolder,
        enhanceContrast,
      };
      onSaveSettings(updated);
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to authenticate with Google Drive');
    } finally {
      setIsAuthenticatingDrive(false);
    }
  };

  const handleDisconnectDrive = () => {
    const updated: AppSettings = {
      ...settings,
      googleAccessToken: undefined,
      googleUserEmail: undefined,
    };
    onSaveSettings(updated);
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      geminiApiKey,
      geminiModel,
      googleClientId,
      autoFile,
      rootDriveFolder,
      enhanceContrast,
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="bottom-sheet" style={{ maxHeight: '94vh' }}>
        <div className="sheet-handle" />

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: 800 }}>Settings & Cloud Sync</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Configure Gemini intelligence and Google Drive
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: '32px', height: '32px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Gemini AI Intelligence */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Gemini AI API Key</h3>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '12px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
              >
                <span>Get Free Key</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                className="input-field"
                style={{ paddingRight: '40px', fontFamily: 'var(--font-mono)' }}
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                }}
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                Gemini Vision Model
              </label>
              <select
                className="input-field"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="gemini-2.5-flash" style={{ background: '#1E293B', color: '#FFF' }}>Gemini 2.5 Flash (Recommended - Fastest & Multi-modal)</option>
                <option value="gemini-1.5-flash" style={{ background: '#1E293B', color: '#FFF' }}>Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro" style={{ background: '#1E293B', color: '#FFF' }}>Gemini 1.5 Pro</option>
              </select>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Used to inspect scanned documents, identify EOBs/bills, extract dates, and generate structured filenames. Leave empty to use built-in smart simulation.
            </p>
          </div>

          {/* Section 2: Google Drive Auto-Filing */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardDrive size={18} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Google Drive Sync</h3>
              </div>
              {settings.googleAccessToken ? (
                <span className="pill pill-emerald" style={{ fontSize: '11px' }}>
                  Connected
                </span>
              ) : (
                <span className="pill" style={{ fontSize: '11px' }}>
                  Not Connected
                </span>
              )}
            </div>

            {/* Google Client ID Input */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                OAuth 2.0 Web Client ID
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="xxxxxx-xxxxxx.apps.googleusercontent.com"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Connect / Disconnect Buttons */}
            {settings.googleAccessToken ? (
              <button
                className="btn-secondary"
                onClick={handleDisconnectDrive}
                style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
              >
                <LogOut size={16} />
                <span>Disconnect Google Drive</span>
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={handleConnectGoogleDrive}
                disabled={isAuthenticatingDrive}
              >
                <HardDrive size={16} />
                <span>{isAuthenticatingDrive ? 'Connecting...' : 'Sign in with Google Drive'}</span>
              </button>
            )}

            {authError && (
              <p style={{ fontSize: '12px', color: 'var(--accent-rose)' }}>{authError}</p>
            )}

            {/* Quick Setup Instructions Collapsible / Note */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              <strong>How to get a free Google Client ID:</strong>
              <ol style={{ paddingLeft: '16px', marginTop: '4px' }}>
                <li>Go to Google Cloud Console → Create a project.</li>
                <li>Enable the <strong>Google Drive API</strong>.</li>
                <li>Under Credentials → Create OAuth Client ID (Web Application).</li>
                <li>Add your app origin (e.g. <code>http://localhost:5173</code>) to Authorized JavaScript origins.</li>
              </ol>
            </div>
          </div>

          {/* Section 3: Folder & Automation Preferences */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Folder size={14} color="var(--accent-primary)" />
                Root Folder in Google Drive
              </label>
              <input
                type="text"
                className="input-field"
                value={rootDriveFolder}
                onChange={(e) => setRootDriveFolder(e.target.value)}
                placeholder="Shallot-Declutter"
              />
            </div>

            {/* Auto-File Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>Auto-File Mode</span>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Automatically save and upload without waiting for manual confirmation.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoFile}
                onChange={(e) => setAutoFile(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            {/* Contrast Filter Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>Enhance Document Contrast</span>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Auto-whiten background and sharpen paper ink for clearer OCR.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enhanceContrast}
                onChange={(e) => setEnhanceContrast(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
              />
            </div>
          </div>

          {/* Save Button */}
          <button className="btn-primary" onClick={handleSave} style={{ marginTop: '6px' }}>
            <Check size={18} />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
};
