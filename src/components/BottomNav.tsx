import React from 'react';
import { Inbox, FolderArchive, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'inbox' | 'vault' | 'settings';
  onChangeTab: (tab: 'inbox' | 'vault' | 'settings') => void;
  vaultCount?: number;
  inboxCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  vaultCount = 0,
  inboxCount = 0,
}) => {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${activeTab === 'inbox' ? 'active' : ''}`}
        onClick={() => onChangeTab('inbox')}
        style={{ position: 'relative' }}
      >
        <Inbox size={22} />
        <span>Inbox</span>
        {inboxCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '18px',
              background: 'var(--accent-primary)',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '9999px',
              minWidth: '16px',
              textAlign: 'center',
            }}
          >
            {inboxCount}
          </span>
        )}
      </button>

      <button
        className={`nav-item ${activeTab === 'vault' ? 'active' : ''}`}
        onClick={() => onChangeTab('vault')}
        style={{ position: 'relative' }}
      >
        <FolderArchive size={22} />
        <span>Vault</span>
        {vaultCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '18px',
              background: 'var(--accent-primary)',
              color: '#FFFFFF',
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: '9999px',
              minWidth: '16px',
              textAlign: 'center',
            }}
          >
            {vaultCount}
          </span>
        )}
      </button>

      <button
        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onChangeTab('settings')}
      >
        <Settings size={22} />
        <span>Settings</span>
      </button>
    </nav>
  );
};
