import React from 'react';
import { Sparkles, HardDrive, Settings, FileText, Inbox, FolderArchive, Camera } from 'lucide-react';
import type { AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  activeTab: 'inbox' | 'scan' | 'vault' | 'settings';
  onChangeTab: (tab: 'inbox' | 'scan' | 'vault' | 'settings') => void;
  inboxCount?: number;
  vaultCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  activeTab,
  onChangeTab,
  inboxCount = 0,
  vaultCount = 0,
}) => {
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

        <button
          className={`desktop-nav-tab ${activeTab === 'scan' ? 'active' : ''}`}
          onClick={() => onChangeTab('scan')}
        >
          <Camera size={16} />
          <span>Quick Scan / Upload</span>
        </button>
      </nav>

      {/* System Status & Settings Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            title={isGeminiConnected ? 'Gemini 3.1 Flash-Lite Active' : 'API Key Missing'}
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
            <span>{isGeminiConnected ? 'Gemini 3.1' : 'No API Key'}</span>
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
