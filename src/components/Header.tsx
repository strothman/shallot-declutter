import React from 'react';
import { Sparkles, HardDrive, Settings, FileText } from 'lucide-react';
import type { AppSettings } from '../types';

interface HeaderProps {
  settings: AppSettings;
  onOpenSettings: () => void;
  activeTab: 'scan' | 'vault' | 'settings';
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onOpenSettings,
  activeTab,
}) => {
  const isDriveConnected = Boolean(settings.googleAccessToken);
  const isGeminiConnected = Boolean(settings.geminiApiKey?.trim());

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <FileText size={20} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h1 style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Shallot
            </h1>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                color: 'var(--accent-cyan)',
                background: 'rgba(6, 182, 212, 0.12)',
                padding: '2px 6px',
                borderRadius: '6px',
              }}
            >
              Declutter
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            AI Paper & EOB Organizer
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Connection status indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            title={isGeminiConnected ? 'Gemini AI active' : 'Gemini in Demo mode'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              background: isGeminiConnected
                ? 'rgba(99, 102, 241, 0.15)'
                : 'rgba(245, 158, 11, 0.15)',
              color: isGeminiConnected ? 'var(--accent-primary)' : 'var(--accent-amber)',
              border: `1px solid ${isGeminiConnected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            <Sparkles size={12} />
            <span>{isGeminiConnected ? 'Gemini' : 'AI Demo'}</span>
          </div>

          <div
            title={isDriveConnected ? 'Google Drive synced' : 'Google Drive offline'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 600,
              background: isDriveConnected
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(148, 163, 184, 0.1)',
              color: isDriveConnected ? 'var(--accent-emerald)' : 'var(--text-muted)',
              border: `1px solid ${isDriveConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
            }}
          >
            <HardDrive size={12} />
            <span>{isDriveConnected ? 'Drive' : 'Local'}</span>
          </div>
        </div>

        {activeTab !== 'settings' && (
          <button
            className="btn-icon"
            onClick={onOpenSettings}
            aria-label="Settings"
            style={{ width: '36px', height: '36px', borderRadius: '10px' }}
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </header>
  );
};
