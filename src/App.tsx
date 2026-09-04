import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { CameraCapture } from './components/CameraCapture';
import { DocumentReviewSheet } from './components/DocumentReviewSheet';
import { VaultHistory } from './components/VaultHistory';
import { SettingsModal } from './components/SettingsModal';
import type { AppSettings, ScannedDocument } from './types';
import { loadSettings, saveSettings, loadVault, saveVaultItem, deleteVaultItem } from './services/storageService';
import { analyzeDocumentWithGemini } from './services/geminiService';
import { createPdfFromPages } from './services/pdfService';
import { uploadPdfToDrive } from './services/driveService';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'vault' | 'settings'>('scan');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [vault, setVault] = useState<ScannedDocument[]>(loadVault);
  const [activeReviewDoc, setActiveReviewDoc] = useState<ScannedDocument | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFiling, setIsFiling] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

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
      {/* Top Header */}
      <Header
        settings={settings}
        activeTab={activeTab}
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Floating Notification Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(var(--sat) + 64px)',
            left: '50%',
            transform: 'translateX(-50%)',
            maxWidth: '90%',
            width: '400px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: '16px',
            background: toast.type === 'error' ? '#EF4444' : toast.type === 'info' ? '#3B82F6' : '#10B981',
            color: '#FFFFFF',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
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

      {/* Main Content Body */}
      <main className="app-content">
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
            onDeleteDoc={handleDeleteDoc}
            onOpenScanner={() => setActiveTab('scan')}
          />
        )}

        {activeTab === 'settings' && (
          <div style={{ paddingBottom: '20px' }}>
            <SettingsModal
              settings={settings}
              onSaveSettings={handleUpdateSettings}
              onClose={() => setActiveTab('scan')}
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

      {/* Bottom Mobile Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (tab === 'settings') {
            setShowSettingsModal(true);
          } else {
            setActiveTab(tab);
          }
        }}
        vaultCount={vault.length}
      />
    </div>
  );
};

export default App;
