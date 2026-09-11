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
  Palette
} from 'lucide-react';
import type { AppSettings, ThemeMode } from '../types';
import { applyTheme } from '../services/storageService';

const THEME_OPTIONS: { id: ThemeMode; name: string; dot: string; desc: string; icon: string }[] = [
  { id: 'shallot-plum', name: 'Shallot Plum', dot: '#D48244', desc: 'Warm Copper & Velvet Plum (Kitchen Keeper Signature)', icon: '🧅' },
  { id: 'high-contrast-slate', name: 'High-Contrast Slate', dot: '#38BDF8', desc: 'Pure White Text on Charcoal (Maximum Legibility)', icon: '🌙' },
  { id: 'crisp-light', name: 'Crisp Light Mode', dot: '#4F46E5', desc: 'Clean Paper White & Deep Ink (Zero Eye Strain)', icon: '☀️' },
  { id: 'forest-pine', name: 'Forest Pine', dot: '#10B981', desc: 'Calming Sage & Mint (Minimal Blue Light)', icon: '🌲' },
  { id: 'deep-indigo', name: 'Cyber Midnight', dot: '#6366F1', desc: 'Classic Deep Indigo Dark Theme', icon: '🌌' },
];

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
  const [geminiModel, setGeminiModel] = useState(settings.geminiModel || 'gemini-3.5-flash-lite');
  const [autoFile, setAutoFile] = useState(settings.autoFile);
  const [rootDriveFolder, setRootDriveFolder] = useState(settings.rootDriveFolder || 'Shallot-Declutter');
  const [enhanceContrast, setEnhanceContrast] = useState(settings.enhanceContrast ?? true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(settings.theme || 'shallot-plum');

  const handleSelectTheme = (theme: ThemeMode) => {
    setSelectedTheme(theme);
    applyTheme(theme);
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      geminiApiKey,
      geminiModel,
      autoFile,
      rootDriveFolder,
      enhanceContrast,
      theme: selectedTheme,
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
                <option value="gemini-3.5-flash-lite" style={{ background: '#1E293B', color: '#FFF' }}>Gemini 3.5 Flash-Lite (Recommended — 600ms & High Capacity)</option>
                <option value="gemini-3.7-flash" style={{ background: '#1E293B', color: '#FFF' }}>Gemini 3.7 Flash (High-Accuracy Reasoning)</option>
                <option value="gemini-3.1-flash-lite" style={{ background: '#1E293B', color: '#FFF' }}>Gemini 3.1 Flash-Lite</option>
                <option value="gemini-3.5-flash" style={{ background: '#1E293B', color: '#FFF' }}>Gemini 3.5 Flash (Standard Production)</option>
              </select>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Used to inspect scanned documents, identify EOBs/bills, extract dates, and generate structured filenames. Leave empty to use built-in smart simulation.
            </p>
          </div>

          {/* Section 2: Google Drive Storage */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardDrive size={18} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Google Drive Storage</h3>
              </div>
              <span className="pill pill-emerald" style={{ fontSize: '11px', fontWeight: 700 }}>
                ● Connected & Synced
              </span>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                ✓ Google Drive for Desktop Active
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Your files are synchronized automatically through Google Drive on your computer:
                <div style={{ marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#FFF' }}>
                  📥 <strong>Inbox:</strong> G:\My Drive\IDE\Declutter\Inbox
                  <br />
                  📤 <strong>Outbox:</strong> G:\My Drive\IDE\Declutter\Outbox
                  <br />
                  🗄️ <strong>Archive:</strong> G:\My Drive\IDE\Declutter\Archive
                </div>
                <div style={{ color: 'var(--accent-emerald)', marginTop: '8px', fontWeight: 600 }}>
                  Processed raw scans move cleanly to Archive so you can manually delete them whenever you choose!
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Folder & Automation Preferences */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Folder size={14} color="var(--accent-primary)" />
                Declutter Base Folder (Google Drive)
              </label>
              <input
                type="text"
                className="input-field"
                value={rootDriveFolder}
                onChange={(e) => setRootDriveFolder(e.target.value)}
                placeholder="G:\My Drive\IDE\Declutter"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                The root directory on your PC containing your <code style={{ color: 'var(--accent-teal)' }}>\Inbox</code> and <code style={{ color: 'var(--accent-teal)' }}>\Outbox</code> folders.
              </p>
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

          {/* Section 4: Eye Comfort & Color Theme */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Palette size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Visual Theme & Eye Comfort</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Click any theme to preview live
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
              {THEME_OPTIONS.map((th) => {
                const isCurrent = selectedTheme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => handleSelectTheme(th.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isCurrent ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                      background: isCurrent ? 'rgba(255, 255, 255, 0.08)' : 'var(--input-bg)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>{th.icon}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700 }}>{th.name}</span>
                          <span
                            style={{
                              width: '9px',
                              height: '9px',
                              borderRadius: '50%',
                              backgroundColor: th.dot,
                              display: 'inline-block',
                              boxShadow: `0 0 8px ${th.dot}`,
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {th.desc}
                        </div>
                      </div>
                    </div>
                    {isCurrent && (
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                        }}
                      >
                        <Check size={14} />
                      </div>
                    )}
                  </button>
                );
              })}
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
