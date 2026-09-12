import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InboxTriage } from './components/InboxTriage';
import { CameraCapture } from './components/CameraCapture';
import { DocumentReviewSheet } from './components/DocumentReviewSheet';
import { VaultHistory } from './components/VaultHistory';
import { SettingsModal } from './components/SettingsModal';
import type { AppSettings, ScannedDocument } from './types';
import { loadSettings, saveSettings, loadVault, saveVaultItem, deleteVaultItem } from './services/storageService';
import { getInboxStatus } from './services/inboxService';
import { analyzeDocumentWithGemini } from './services/geminiService';
import { createPdfFromPages } from './services/pdfService';
import { uploadPdfToDrive } from './services/driveService';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'scan' | 'vault' | 'settings'>('inbox');
  const [inboxCount, setInboxCount] = useState<number>(0);
  const [vaultCount, setVaultCount] = useState<number>(0);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [vault, setVault] = useState<ScannedDocument[]>(loadVault);
  const [activeReviewDoc, setActiveReviewDoc] = useState<ScannedDocument | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFiling, setIsFiling] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const refreshCounts = async () => {
    try {
      const status = await getInboxStatus();
      setInboxCount(status.inboxCount);
      if (typeof status.vaultCount === 'number') {
        setVaultCount(status.vaultCount);
      }
    } catch (err) {
      console.warn('Could not sync status counts:', err);
    }
  };

  useEffect(() => {
    refreshCounts();
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleCaptureComplete = async (pages: string[]) => {
    if (pages.length === 0) return;
    setIsAnalyzing(true);

    try {
      // 1. Generate clean multi-page PDF in parallel
      const pdfBlob = await createPdfFromPages(pages);

      // 2. Perform multimodal analysis with Gemini
      const metadata = await analyzeDocumentWithGemini(
        pages[0],
        settings.geminiApiKey,
        settings.geminiModel,
        settings.rootDriveFolder
      );

      const newDoc: ScannedDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        pages,
        pdfBlob,
        metadata,
        status: 'ready',
      };

      // 3. If Auto-File mode is enabled, immediately upload
      if (settings.autoFile) {
        await executeFiling(newDoc);
      } else {
        setActiveReviewDoc(newDoc);
      }
    } catch (err: any) {
      showToast(err?.message || 'Error processing document', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeFiling = async (docToUpload: ScannedDocument) => {
    setIsFiling(true);
    try {
      const pdfBlob = docToUpload.pdfBlob || (await createPdfFromPages(docToUpload.pages));
      const uploadResult = await uploadPdfToDrive({
        pdfBlob,
        filename: docToUpload.metadata.suggestedFilename,
        folderPath: docToUpload.metadata.targetFolder,
        accessToken: settings.googleAccessToken,
      });

      const finalizedDoc: ScannedDocument = {
        ...docToUpload,
        status: 'filed',
        driveFileId: uploadResult.fileId,
        driveLink: uploadResult.webViewLink,
      };

      // Save to local vault ledger
      saveVaultItem(finalizedDoc);
      setVault(loadVault());
      setActiveReviewDoc(null);

      if (uploadResult.isSimulated) {
        showToast(`Document saved to Vault & downloaded: ${finalizedDoc.metadata.suggestedFilename}`, 'info');
      } else {
        showToast(`Filed to Google Drive: ${finalizedDoc.metadata.targetFolder}`, 'success');
      }

      // Transition to Vault view
      setActiveTab('vault');
    } catch (err: any) {
      showToast(err?.message || 'Failed to file document', 'error');
    } finally {
      setIsFiling(false);
    }
  };

  const handleDeleteDoc = (id: string) => {
    deleteVaultItem(id);
    setVault(loadVault());
    showToast('Document removed from ledger', 'info');
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    showToast('Settings saved', 'success');
  };

  return (
    <div className="app-container">
      {/* Desktop Top Header & Navigation */}
      <Header
        settings={settings}
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (tab === 'settings') {
            setShowSettingsModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onChangeTheme={(theme) => handleUpdateSettings({ ...settings, theme })}
        inboxCount={inboxCount}
        vaultCount={vaultCount}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Floating Notification Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '72px',
            right: '32px',
            maxWidth: '420px',
            width: 'auto',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 20px',
            borderRadius: '12px',
            background: toast.type === 'error' ? '#EF4444' : toast.type === 'info' ? '#3B82F6' : '#10B981',
            color: '#FFFFFF',
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            fontSize: '13px',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} />
          ) : toast.type === 'info' ? (
            <Info size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
      )}

      {/* Main Desktop Workspace Body */}
      <main className="app-content">
        {activeTab === 'inbox' && (
          <InboxTriage
            settings={settings}
            onFiledSuccess={(msg) => {
              showToast(msg, 'success');
              refreshCounts();
            }}
            onError={(err) => showToast(err, 'error')}
            onUpdateBadge={(count) => setInboxCount(count)}
          />
        )}

        {activeTab === 'scan' && (
          <CameraCapture
            onCaptureComplete={handleCaptureComplete}
            enhanceContrast={settings.enhanceContrast}
            onToggleEnhanceContrast={() =>
              setSettings((prev) => ({ ...prev, enhanceContrast: !prev.enhanceContrast }))
            }
            isAnalyzing={isAnalyzing}
          />
        )}

        {activeTab === 'vault' && (
          <VaultHistory
            documents={vault}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onDeleteDoc={handleDeleteDoc}
            onOpenScanner={() => setActiveTab('scan')}
            onUpdateVaultCount={(count) => setVaultCount(count)}
          />
        )}

        {activeTab === 'settings' && (
          <div style={{ paddingBottom: '20px' }}>
            <SettingsModal
              settings={settings}
              onSaveSettings={handleUpdateSettings}
              onClose={() => setActiveTab('inbox')}
            />
          </div>
        )}
      </main>

      {/* Document Review Bottom Sheet */}
      {activeReviewDoc && (
        <DocumentReviewSheet
          document={activeReviewDoc}
          onApproveAndFile={executeFiling}
          onCancel={() => setActiveReviewDoc(null)}
          isFiling={isFiling}
          isDriveConnected={Boolean(settings.googleAccessToken)}
        />
      )}

      {/* Settings Modal (when opened from gear) */}
      {showSettingsModal && activeTab !== 'settings' && (
        <SettingsModal
          settings={settings}
          onSaveSettings={handleUpdateSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};

export default App;
