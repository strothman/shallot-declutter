import React, { useState } from 'react';
import { Sparkles, HardDrive, Settings, FileText, Inbox, FolderArchive, Palette, Check } from 'lucide-react';
import type { AppSettings, ThemeMode } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  activeTab: 'inbox' | 'vault' | 'settings';
  onChangeTab: (tab: 'inbox' | 'vault' | 'settings') => void;
  onChangeTheme: (theme: ThemeMode) => void;
  inboxCount?: number;
  vaultCount?: number;
}

const THEMES: { id: ThemeMode; name: string; dot: string; desc: string; icon: string }[] = [
  { id: 'shallot-plum', name: 'Shallot Plum', dot: '#D48244', desc: 'Warm Copper & Velvet Plum (Kitchen Keeper)', icon: '🧅' },
  { id: 'high-contrast-slate', name: 'High-Contrast Slate', dot: '#38BDF8', desc: 'Pure White Text on Charcoal (Max Visibility)', icon: '🌙' },
  { id: 'crisp-light', name: 'Crisp Light Mode', dot: '#4F46E5', desc: 'Paper White & Deep Ink (Zero Eye Strain)', icon: '☀️' },
  { id: 'forest-pine', name: 'Forest Pine', dot: '#10B981', desc: 'Calming Sage & Mint (Low Blue Light)', icon: '🌲' },
  { id: 'deep-indigo', name: 'Cyber Midnight', dot: '#6366F1', desc: 'Original Deep Indigo Classic', icon: '🌌' },
];

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  activeTab,
  onChangeTab,
  onChangeTheme,
  inboxCount = 0,
  vaultCount = 0,
}) => {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const currentTheme = settings.theme || 'shallot-plum';
  const isGeminiConnected = Boolean(settings.geminiApiKey?.trim());

  return (
    <header className="app-header">
      {/* App Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '11px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
            flexShrink: 0,
          }}
        >
          <FileText size={20} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', margin: 0 }}>
              Shallot
            </h1>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: 'var(--accent-cyan)',
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                padding: '2px 7px',
                borderRadius: '6px',
              }}
            >
              Personal Data Entry
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            AI Personal Data Entry & Document Suite
          </p>
        </div>
      </div>

      {/* Desktop Main Navigation Tabs */}
      <nav className="desktop-nav-tabs">
        <button
          className={`desktop-nav-tab ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => onChangeTab('inbox')}
        >
          <Inbox size={16} />
          <span>Inbox Triage</span>
          {inboxCount > 0 && (
            <span
              style={{
                background: activeTab === 'inbox' ? 'rgba(255,255,255,0.25)' : 'var(--accent-primary)',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center',
              }}
            >
              {inboxCount}
            </span>
          )}
        </button>

        <button
          className={`desktop-nav-tab ${activeTab === 'vault' ? 'active' : ''}`}
          onClick={() => onChangeTab('vault')}
        >
          <FolderArchive size={16} />
          <span>Document Vault</span>
          {vaultCount > 0 && (
            <span
              style={{
                background: activeTab === 'vault' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center',
              }}
            >
              {vaultCount}
            </span>
          )}
        </button>
      </nav>

      {/* System Status & Settings Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            title={isGeminiConnected ? `${settings.geminiModel || 'Gemini 3.5'} Active` : 'API Key Missing'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              background: isGeminiConnected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isGeminiConnected ? 'var(--accent-primary)' : 'var(--accent-rose)',
              border: `1px solid ${isGeminiConnected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}
          >
            <Sparkles size={13} />
            <span>{isGeminiConnected ? (settings.geminiModel?.includes('3.7') ? 'Gemini 3.7' : 'Gemini 3.5') : 'No API Key'}</span>
          </div>

          <div
            title="Google Drive for Desktop active at G:\My Drive\IDE\Declutter"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-emerald)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <HardDrive size={13} />
            <span>Drive Synced</span>
          </div>
        </div>

        {/* Theme Picker Dropdown Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            onClick={() => setShowThemePicker((prev) => !prev)}
            title="Switch Theme (Eye Comfort & High Contrast)"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: showThemePicker ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
              background: showThemePicker ? 'var(--accent-primary)' : 'rgba(255,255,255,0.04)',
              color: showThemePicker ? '#FFFFFF' : 'var(--text-primary)',
            }}
          >
            <Palette size={18} />
          </button>

          {/* Theme Dropdown Popover */}
          {showThemePicker && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: '0',
                width: '300px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-glass-bright)',
                borderRadius: '16px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
                padding: '12px',
                zIndex: 100,
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  color: 'var(--text-muted)',
                  padding: '4px 8px 8px',
                  borderBottom: '1px solid var(--border-glass)',
                  marginBottom: '8px',
                }}
              >
                Color Theme & Eye Comfort
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {THEMES.map((th) => {
                  const isActive = currentTheme === th.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => {
                        onChangeTheme(th.id);
                        setShowThemePicker(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                        background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px' }}>{th.icon}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{th.name}</span>
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: th.dot,
                                display: 'inline-block',
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {th.desc}
                          </div>
                        </div>
                      </div>

                      {isActive && <Check size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          className="btn-icon"
          onClick={onOpenSettings}
          title="Settings & Storage Config"
          style={{ width: '38px', height: '38px', borderRadius: '10px' }}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
