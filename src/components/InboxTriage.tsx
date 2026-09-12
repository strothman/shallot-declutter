import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Inbox,
  RefreshCw,
  Sparkles,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  FileCheck2,
  FolderSync,
  X,
  Calendar,
  DollarSign,
  Tag,
  Building2,
  User,
  Stethoscope,
  Activity,
  Hash,
  LayoutGrid,
  List,
  FileText,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Layers,
  AlertTriangle,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Award,
  Percent,
} from 'lucide-react';
import type { InboxItem, InboxStatus, ExtractedDocData, AppSettings, ScannedDocument } from '../types';
import {
  getInboxStatus,
  getInboxFiles,
  discardInboxFile,
  fetchFileAsDataUrl,
  saveToOutbox,
  checkDuplicate,
} from '../services/inboxService';
import { analyzeDocumentWithGemini } from '../services/geminiService';
import { createPdfFromPages, dataUrlToBlob } from '../services/pdfService';
import { saveVaultItem } from '../services/storageService';
import { optimizeImageForAi } from '../services/imageOptimizer';

const DOC_TYPES = [
  'EOB',
  'Medical Bill',
  'MRI Report',
  'Imaging & Diagnostic Report',
  'Medical Record',
  'Water Bill',
  'Electric Bill',
  'Utility Bill',
  'Tax Document',
  'Receipt',
  'Recipe',
  'Prescription',
  'Insurance Policy',
  'Lab Result',
  'Legal Notice',
  'Other',
];

interface InboxTriageProps {
  settings: AppSettings;
  onFiledSuccess: (message: string) => void;
  onError: (error: string) => void;
  onUpdateBadge?: (count: number) => void;
}

export const InboxTriage: React.FC<InboxTriageProps> = ({
  settings,
  onFiledSuccess,
  onError,
  onUpdateBadge,
}) => {
  const [inboxStatus, setInboxStatus] = useState<InboxStatus | null>(null);
  const [files, setFiles] = useState<InboxItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFiling, setIsFiling] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [previewFile, setPreviewFile] = useState<InboxItem | null>(null);
  const [activePageIdx, setActivePageIdx] = useState<number>(0);

  // Real-time Loading & Progress State
  const [triageProgress, setTriageProgress] = useState<{
    isOpen: boolean;
    step: string;
    percent: number;
  }>({ isOpen: false, step: '', percent: 0 });

  // Desktop Side-by-Side Studio state
  const [triageBundle, setTriageBundle] = useState<{
    fileNames: string[];
    pages: string[];
    metadata: ExtractedDocData;
  } | null>(null);

  // Pre-Filing Duplicate Guard state
  const [duplicateMatch, setDuplicateMatch] = useState<any | null>(null);

  // Receipt Itemization collapse state
  const [showItemization, setShowItemization] = useState(true);

  // Smart Photo Burst Auto-Grouping
  interface BurstBundle {
    id: string;
    files: InboxItem[];
    formattedTime: string;
    description: string;
  }

  const detectedBundles: BurstBundle[] = useMemo(() => {
    if (files.length < 2) return [];

    const sorted = [...files].sort((a, b) => new Date(a.mtime).getTime() - new Date(b.mtime).getTime());
    const clusters: InboxItem[][] = [];
    let currentCluster: InboxItem[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const prevTime = new Date(sorted[i - 1].mtime).getTime();
      const currTime = new Date(sorted[i].mtime).getTime();
      const diffSecs = (currTime - prevTime) / 1000;

      // Group if within 180 seconds (3 minutes) of previous photo
      if (diffSecs <= 180) {
        currentCluster.push(sorted[i]);
      } else {
        if (currentCluster.length >= 2) {
          clusters.push(currentCluster);
        }
        currentCluster = [sorted[i]];
      }
    }
    if (currentCluster.length >= 2) {
      clusters.push(currentCluster);
    }

    return clusters.map((cluster, idx) => {
      const first = cluster[0];
      let timeStr = '';
      try {
        const d = new Date(first.mtime);
        timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + ' on ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } catch {
        timeStr = first.mtime;
      }
      return {
        id: `burst_${idx}_${first.name}`,
        files: cluster,
        formattedTime: timeStr,
        description: `${cluster.length} pages captured together (${timeStr})`,
      };
    });
  }, [files]);

  // Page rotation helper (90° clockwise using offscreen canvas)
  const rotateCurrentPage = async (index: number) => {
    if (!triageBundle) return;
    const currentDataUrl = triageBundle.pages[index];
    if (!currentDataUrl || (currentDataUrl.startsWith('blob:') && triageBundle.fileNames[index]?.toLowerCase().endsWith('.pdf'))) {
      return;
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = currentDataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setTriageBundle((prev) => {
        if (!prev) return null;
        const updatedPages = [...prev.pages];
        updatedPages[index] = rotatedDataUrl;
        return { ...prev, pages: updatedPages };
      });
    } catch (e) {
      console.warn('Rotation failed:', e);
    }
  };

  // Move page position in bundle
  const movePage = (fromIndex: number, toIndex: number) => {
    if (!triageBundle) return;
    if (toIndex < 0 || toIndex >= triageBundle.pages.length) return;

    setTriageBundle((prev) => {
      if (!prev) return null;
      const pages = [...prev.pages];
      const fileNames = [...prev.fileNames];

      const [movedPage] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, movedPage);

      const [movedFile] = fileNames.splice(fromIndex, 1);
      fileNames.splice(toIndex, 0, movedFile);

      return { ...prev, pages, fileNames };
    });
    setActivePageIdx(toIndex);
  };

  // Remove individual page from bundle
  const removePageFromBundle = (index: number) => {
    if (!triageBundle || triageBundle.pages.length <= 1) return;
    if (!window.confirm(`Remove page ${index + 1} from this document bundle?`)) return;

    setTriageBundle((prev) => {
      if (!prev) return null;
      const pages = prev.pages.filter((_, i) => i !== index);
      const fileNames = prev.fileNames.filter((_, i) => i !== index);
      return { ...prev, pages, fileNames };
    });
    setActivePageIdx((prev) => Math.max(0, Math.min(prev, (triageBundle?.pages.length || 2) - 2)));
  };

  // Duplicate check effect against Outbox catalog
  useEffect(() => {
    if (!triageBundle?.metadata) {
      setDuplicateMatch(null);
      return;
    }
    const meta = triageBundle.metadata;
    let isMounted = true;
    checkDuplicate({
      ref: meta.referenceNumber,
      issuer: meta.issuer,
      date: meta.statementDate,
      amount: meta.amountDue,
    })
      .then((res) => {
        if (isMounted) {
          setDuplicateMatch(res.isDuplicate ? res.match : null);
        }
      })
      .catch(() => {
        if (isMounted) setDuplicateMatch(null);
      });

    return () => {
      isMounted = false;
    };
  }, [
    triageBundle?.metadata?.referenceNumber,
    triageBundle?.metadata?.issuer,
    triageBundle?.metadata?.statementDate,
    triageBundle?.metadata?.amountDue,
  ]);

  const loadInbox = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statusData, filesData] = await Promise.all([
        getInboxStatus().catch(() => null),
        getInboxFiles(),
      ]);

      if (statusData) {
        setInboxStatus(statusData);
      }
      setFiles(filesData.files || []);
      if (onUpdateBadge) {
        onUpdateBadge(filesData.files?.length || 0);
      }
    } catch (err: any) {
      console.warn('Could not load inbox:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onUpdateBadge]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const toggleSelectFile = (name: string) => {
    setSelectedFiles((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map((f) => f.name));
    }
  };

  const handleDiscard = async (filename: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Discard ${filename} from your Inbox?`)) return;

    try {
      await discardInboxFile(filename);
      setFiles((prev) => prev.filter((f) => f.name !== filename));
      setSelectedFiles((prev) => prev.filter((f) => f !== filename));
      onFiledSuccess(`Discarded ${filename}`);
      if (onUpdateBadge) onUpdateBadge(files.length - 1);
    } catch (err: any) {
      onError(err?.message || 'Failed to discard file');
    }
  };

  const handleStartTriage = async (singleFile?: InboxItem, customNames?: string[]) => {
    const targetNames = customNames ? customNames : singleFile ? [singleFile.name] : selectedFiles;
    if (targetNames.length === 0) return;

    setIsAnalyzing(true);
    setActivePageIdx(0);
    setTriageProgress({
      isOpen: true,
      step: `Initializing triage for ${targetNames.length} ${targetNames.length === 1 ? 'page' : 'pages'}...`,
      percent: 5,
    });

    try {
      // 1. Download selected files as Data URLs in exact user selection order
      const orderedFiles = targetNames
        .map((name) => files.find((f) => f.name === name))
        .filter((f): f is InboxItem => Boolean(f));
      const pageDataUrls: string[] = [];

      for (let i = 0; i < orderedFiles.length; i++) {
        const f = orderedFiles[i];
        setTriageProgress({
          isOpen: true,
          step: `Loading page ${i + 1} of ${orderedFiles.length}: ${f.name}...`,
          percent: Math.round(5 + ((i + 1) / orderedFiles.length) * 45),
        });
        const dataUrl = await fetchFileAsDataUrl(f.url);
        pageDataUrls.push(dataUrl);
      }

      // 2. Optimize images for AI vision (shrinks 7MB camera photos to fast 300KB web payloads)
      setTriageProgress({
        isOpen: true,
        step: `Optimizing ${pageDataUrls.length} pages for fast AI analysis...`,
        percent: 55,
      });

      const optimizedPages: string[] = [];
      for (let i = 0; i < pageDataUrls.length; i++) {
        setTriageProgress({
          isOpen: true,
          step: `Optimizing page ${i + 1} of ${pageDataUrls.length}...`,
          percent: Math.round(55 + ((i + 1) / pageDataUrls.length) * 20),
        });
        const opt = await optimizeImageForAi(pageDataUrls[i]);
        optimizedPages.push(opt);
      }

      // 3. Analyze with Gemini (using up to 3 key pages for multi-page document context)
      setTriageProgress({
        isOpen: true,
        step: `Extracting personal data points with Gemini 3.5 AI...`,
        percent: 80,
      });

      const metadata = await analyzeDocumentWithGemini(
        optimizedPages,
        settings.geminiApiKey,
        settings.geminiModel,
        'Shallot-Declutter',
        (step, percent) => {
          setTriageProgress({
            isOpen: true,
            step,
            percent,
          });
        }
      );

      setTriageProgress({
        isOpen: true,
        step: `Opening Desktop Triage Studio...`,
        percent: 100,
      });

      await new Promise((r) => setTimeout(r, 250));

      setTriageBundle({
        fileNames: orderedFiles.map((f) => f.name),
        pages: optimizedPages,
        metadata,
      });
    } catch (err: any) {
      onError(err?.message || 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
      setTriageProgress({ isOpen: false, step: '', percent: 0 });
    }
  };

  const handleApproveAndFile = async () => {
    if (!triageBundle) return;
    setIsFiling(true);
    setTriageProgress({
      isOpen: true,
      step: `Compiling ${triageBundle.pages.length} pages into standardized PDF...`,
      percent: 30,
    });

    try {
      // 1. Compile multi-page PDF or retain pristine original PDF
      let pdfBlob: Blob;

      const isSinglePdf =
        triageBundle.fileNames.length === 1 &&
        triageBundle.fileNames[0].toLowerCase().endsWith('.pdf');

      if (isSinglePdf) {
        const firstPage = triageBundle.pages[0];
        if (
          firstPage &&
          (firstPage.startsWith('data:application/pdf') ||
            firstPage.startsWith('data:;base64,JVBERi') ||
            firstPage.startsWith('JVBERi'))
        ) {
          const cleanUrl = firstPage.startsWith('JVBERi')
            ? `data:application/pdf;base64,${firstPage}`
            : firstPage;
          pdfBlob = dataUrlToBlob(cleanUrl, 'application/pdf');
        } else {
          const res = await fetch(`/api/inbox/file?name=${encodeURIComponent(triageBundle.fileNames[0])}`);
          pdfBlob = await res.blob();
        }
      } else {
        pdfBlob = await createPdfFromPages(triageBundle.pages);
      }

      setTriageProgress({
        isOpen: true,
        step: `Writing PDF & metadata JSON to Google Drive Outbox...`,
        percent: 70,
      });

      // 2. Save directly to Outbox / TYPE / YYYY / MM /
      const result = await saveToOutbox({
        fileNames: triageBundle.fileNames,
        pdfBlob,
        docType: triageBundle.metadata.documentType,
        statementDate: triageBundle.metadata.statementDate,
        filename: triageBundle.metadata.suggestedFilename,
        metadata: triageBundle.metadata,
      });

      setTriageProgress({
        isOpen: true,
        step: `Updating local vault catalog...`,
        percent: 95,
      });

      // 3. Record in local vault ledger
      const newScannedDoc: ScannedDocument = {
        id: `doc_${Date.now()}`,
        createdAt: new Date().toISOString(),
        pages: triageBundle.pages,
        pdfBlob,
        metadata: {
          ...triageBundle.metadata,
          targetFolder: `Outbox/${result.relativeFolder}`,
        },
        status: 'filed',
        driveLink: result.savedPath,
      };
      saveVaultItem(newScannedDoc);

      setTriageProgress({
        isOpen: true,
        step: `Filing complete!`,
        percent: 100,
      });
      await new Promise((r) => setTimeout(r, 300));

      // 4. Update UI
      onFiledSuccess(`Filed to Outbox: ${result.relativeFolder}\\${result.filename}`);
      setTriageBundle(null);
      setSelectedFiles([]);
      await loadInbox();
    } catch (err: any) {
      onError(err?.message || 'Failed to file document to Outbox');
    } finally {
      setIsFiling(false);
      setTriageProgress({ isOpen: false, step: '', percent: 0 });
    }
  };

  // Compute live destination folder preview based on current metadata
  const computeOutboxPreview = () => {
    if (!triageBundle) return '';
    const rawType = triageBundle.metadata.documentType || 'Other';
    const cleanType = String(rawType).replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'Other';
    const date = triageBundle.metadata.statementDate || '';
    const match = date.match(/^(\d{4})[-/.]?(\d{2})?/);
    const yyyy = match?.[1] || new Date().getFullYear().toString();
    const mm = match?.[2] || String(new Date().getMonth() + 1).padStart(2, '0');
    return `Outbox\\${cleanType}\\${yyyy}\\${mm}\\`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="inbox-desktop-workspace" style={{ width: '100%' }}>
      {/* Desktop Workspace Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-glass)',
        }}
      >
        {/* Left: Section Title & Directory Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <Inbox size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Inbox Queue
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: files.length > 0 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                  color: '#FFFFFF',
                }}
              >
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Monitoring: <code style={{ color: 'var(--accent-cyan)' }}>{inboxStatus?.inboxPath || 'G:\\My Drive\\IDE\\Declutter\\Inbox'}</code>
            </div>
          </div>
        </div>

        {/* Right: View Switches & Batch Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              padding: '2px',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                borderRadius: '6px',
                background: viewMode === 'grid' ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: viewMode === 'grid' ? '#FFFFFF' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="List View"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 10px',
                borderRadius: '6px',
                background: viewMode === 'table' ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: viewMode === 'table' ? '#FFFFFF' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <List size={16} />
            </button>
          </div>

          {/* Select All */}
          {files.length > 0 && (
            <button
              onClick={handleSelectAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {selectedFiles.length === files.length ? <CheckSquare size={16} /> : <Square size={16} />}
              <span>{selectedFiles.length === files.length ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}

          {/* Batch Triage Button */}
          {selectedFiles.length > 0 && (
            <button
              onClick={() => handleStartTriage()}
              disabled={isAnalyzing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent-gradient)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Sparkles size={16} className={isAnalyzing ? 'spin-icon' : ''} />
              <span>
                {isAnalyzing
                  ? 'Analyzing...'
                  : `Bundle & Triage (${selectedFiles.length} ${selectedFiles.length === 1 ? 'Page' : 'Pages'})`}
              </span>
            </button>
          )}

          {/* Refresh Inbox */}
          <button
            onClick={loadInbox}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} className={isLoading ? 'spin-icon' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* SMART "PHOTO BURST" AUTO-GROUPING BANNER */}
      {detectedBundles.length > 0 && selectedFiles.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {detectedBundles.map((bundle) => (
            <div
              key={bundle.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '16px',
                background: 'rgba(212, 130, 68, 0.08)',
                border: '1px solid var(--border-glass-bright)',
                gap: '14px',
                flexWrap: 'wrap',
                boxShadow: '0 4px 18px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: 'var(--shadow-glow)',
                  }}
                >
                  <Layers size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Multi-Page Document Detected
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(212, 130, 68, 0.22)',
                        color: 'var(--accent-primary)',
                        border: '1px solid rgba(212, 130, 68, 0.35)',
                      }}
                    >
                      {bundle.files.length} Pages
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    Captured in the same session around {bundle.formattedTime} ({bundle.files[0].name.slice(0, 15)}...)
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => {
                    const names = bundle.files.map((f) => f.name);
                    setSelectedFiles(names);
                    handleStartTriage(undefined, names);
                  }}
                  disabled={isAnalyzing}
                  className="btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '12px',
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={14} />
                  <span>1-Click Bundle & Triage ({bundle.files.length} Pages)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && !isLoading && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 24px',
            background: 'rgba(255, 255, 255, 0.01)',
            borderRadius: '24px',
            border: '1px dashed var(--border-glass-bright)',
            maxWidth: '720px',
            margin: '40px auto',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--accent-primary)',
            }}
          >
            <FolderSync size={36} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Your Inbox is Clean & Decluttered
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Use the Google Drive app on your phone to scan or upload receipts, bills, and medical reports into:
            <br />
            <strong style={{ color: 'var(--accent-cyan)' }}>My Drive &gt; IDE &gt; Declutter &gt; Inbox</strong>.
            <br />
            They will automatically populate here on your desktop for 1-click filing into your organized Outbox.
          </p>
          <button
            onClick={loadInbox}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-glass-bright)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Check for New Files
          </button>
        </div>
      )}

      {/* GRID VIEW */}
      {files.length > 0 && viewMode === 'grid' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          {files.map((file, idx) => {
            const isSelected = selectedFiles.includes(file.name);
            const selectionIndex = selectedFiles.indexOf(file.name);
            const isPdf = file.extension === '.pdf';

            return (
              <div
                key={file.name}
                onClick={() => toggleSelectFile(file.name)}
                style={{
                  position: 'relative',
                  background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'rgba(30, 41, 59, 0.4)',
                  borderRadius: '16px',
                  border: isSelected
                    ? '2px solid var(--accent-primary)'
                    : '1px solid var(--border-glass)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelected
                    ? '0 8px 24px rgba(99, 102, 241, 0.25)'
                    : '0 4px 12px rgba(0,0,0,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Thumbnail / Document Cover */}
                <div
                  style={{
                    width: '100%',
                    height: '190px',
                    background: '#0B0F19',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isPdf ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '16px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '14px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#EF4444',
                        }}
                      >
                        <FileText size={28} />
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.6px',
                          color: '#EF4444',
                          background: 'rgba(239, 68, 68, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        PDF DOCUMENT
                      </span>
                    </div>
                  ) : (
                    <img
                      src={file.url}
                      alt={file.name}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        background: '#0F172A',
                      }}
                    />
                  )}

                  {/* Top-Left Selection Pill */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: isSelected ? 'var(--accent-primary)' : 'rgba(15, 23, 42, 0.8)',
                      color: '#FFFFFF',
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                      backdropFilter: 'blur(6px)',
                      border: '1px solid rgba(255,255,255,0.2)',
                    }}
                  >
                    {isSelected ? selectionIndex + 1 : idx + 1}
                  </div>

                  {/* Top-Right Quick Action Buttons */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      display: 'flex',
                      gap: '6px',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      title="Quick Preview"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        border: 'none',
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      <Eye size={14} />
                    </button>

                    <button
                      onClick={(e) => handleDiscard(file.name, e)}
                      title="Discard File"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '7px',
                        border: 'none',
                        background: 'rgba(239, 68, 68, 0.8)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(6px)',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Card Details & Filing Trigger */}
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div
                    title={file.name}
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {file.name}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>{formatFileSize(file.size)}</span>
                    <span>{formatDate(file.mtime)}</span>
                  </div>

                  {/* Direct 1-Click Triage Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartTriage(file);
                    }}
                    disabled={isAnalyzing}
                    style={{
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Sparkles size={14} color="var(--accent-primary)" />
                    <span>Triage This File</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE / EXPLORER LIST VIEW */}
      {files.length > 0 && viewMode === 'table' && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            borderRadius: '16px',
            border: '1px solid var(--border-glass)',
            overflow: 'hidden',
            marginBottom: '40px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-glass)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                <th style={{ padding: '14px 16px', width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.length === files.length && files.length > 0}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '14px 16px' }}>File Name</th>
                <th style={{ padding: '14px 16px', width: '100px' }}>Type</th>
                <th style={{ padding: '14px 16px', width: '120px' }}>Size</th>
                <th style={{ padding: '14px 16px', width: '160px' }}>Date Added</th>
                <th style={{ padding: '14px 16px', width: '180px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const isSelected = selectedFiles.includes(file.name);
                const isPdf = file.extension === '.pdf';

                return (
                  <tr
                    key={file.name}
                    onClick={() => toggleSelectFile(file.name)}
                    style={{
                      borderBottom: '1px solid var(--border-glass)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectFile(file.name)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {isPdf ? (
                          <FileText size={18} color="#EF4444" />
                        ) : (
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              background: '#0B0F19',
                            }}
                          >
                            <img src={file.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        )}
                        <span>{file.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: isPdf ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: isPdf ? '#EF4444' : 'var(--accent-cyan)',
                        }}
                      >
                        {file.extension.toUpperCase().replace('.', '')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {formatFileSize(file.size)}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                      {formatDate(file.mtime)}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => setPreviewFile(file)}
                          title="Preview"
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-glass)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDiscard(file.name)}
                          title="Discard"
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: 'var(--accent-rose)',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          onClick={() => handleStartTriage(file)}
                          disabled={isAnalyzing}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'var(--accent-primary)',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Sparkles size={13} />
                          <span>Triage</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* QUICK PREVIEW LIGHTBOX */}
      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 120,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: previewFile.extension === '.pdf' ? '900px' : 'auto',
              height: previewFile.extension === '.pdf' ? '85vh' : 'auto',
              background: '#0B0F19',
              borderRadius: '16px',
              border: '1px solid var(--border-glass-bright)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid var(--border-glass)',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {previewFile.name}
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              {previewFile.extension === '.pdf' ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.name}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                />
              ) : (
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDE-BY-SIDE TRIAGE STUDIO MODAL */}
      {triageBundle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 110,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass-bright)',
              borderRadius: '24px',
              maxWidth: '1440px',
              width: '96vw',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 30px 80px rgba(0,0,0,0.85)',
              overflow: 'hidden',
            }}
          >
            {/* Studio Top Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 28px',
                borderBottom: '1px solid var(--border-glass)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Desktop Triage Studio
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Filing {triageBundle.fileNames.join(', ')} ({triageBundle.pages.length}{' '}
                    {triageBundle.pages.length === 1 ? 'page' : 'pages'})
                  </span>
                </div>
              </div>

              <button
                onClick={() => setTriageBundle(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '6px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Studio Body: Split View (Left: Document Viewer | Right: Metadata Form) */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1.15fr 1fr',
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              {/* LEFT COLUMN: DOCUMENT VIEWER */}
              <div
                style={{
                  borderRight: '1px solid var(--border-glass)',
                  background: '#070A12',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Page {activePageIdx + 1} of {triageBundle.pages.length}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      ({triageBundle.fileNames[activePageIdx]})
                    </span>
                  </div>

                  {/* Page Manipulation Toolbar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Rotate 90° Clockwise */}
                    <button
                      onClick={() => rotateCurrentPage(activePageIdx)}
                      title="Rotate Page 90° Clockwise"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-glass)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCw size={13} />
                      <span>Rotate 90°</span>
                    </button>

                    {/* Move Left */}
                    {triageBundle.pages.length > 1 && (
                      <button
                        onClick={() => movePage(activePageIdx, activePageIdx - 1)}
                        disabled={activePageIdx === 0}
                        title="Move Page Earlier (◀)"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-glass)',
                          background: activePageIdx === 0 ? 'transparent' : 'rgba(255,255,255,0.06)',
                          color: activePageIdx === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                          cursor: activePageIdx === 0 ? 'not-allowed' : 'pointer',
                          opacity: activePageIdx === 0 ? 0.5 : 1,
                        }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                    )}

                    {/* Move Right */}
                    {triageBundle.pages.length > 1 && (
                      <button
                        onClick={() => movePage(activePageIdx, activePageIdx + 1)}
                        disabled={activePageIdx === triageBundle.pages.length - 1}
                        title="Move Page Later (▶)"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-glass)',
                          background: activePageIdx === triageBundle.pages.length - 1 ? 'transparent' : 'rgba(255,255,255,0.06)',
                          color: activePageIdx === triageBundle.pages.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                          cursor: activePageIdx === triageBundle.pages.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: activePageIdx === triageBundle.pages.length - 1 ? 0.5 : 1,
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}

                    {/* Remove Page from Bundle */}
                    {triageBundle.pages.length > 1 && (
                      <button
                        onClick={() => removePageFromBundle(activePageIdx)}
                        title="Remove this page from document bundle"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: 'var(--accent-rose)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Primary Viewer Window */}
                <div
                  style={{
                    flex: 1,
                    background: '#0B0F19',
                    borderRadius: '16px',
                    border: '1px solid var(--border-glass)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {triageBundle.fileNames[activePageIdx]?.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={`/api/inbox/file?name=${encodeURIComponent(triageBundle.fileNames[activePageIdx])}`}
                      title="PDF Preview"
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  ) : (
                    <img
                      src={triageBundle.pages[activePageIdx]}
                      alt="Scanned page"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        borderRadius: '8px',
                      }}
                    />
                  )}
                </div>

                {/* Interactive Multi-Page Thumbnail Reorder Strip */}
                {triageBundle.pages.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '14px',
                      overflowX: 'auto',
                      padding: '4px 2px',
                    }}
                  >
                    {triageBundle.pages.map((pData, pIdx) => {
                      const isActive = activePageIdx === pIdx;
                      return (
                        <div
                          key={pIdx}
                          onClick={() => setActivePageIdx(pIdx)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: '52px',
                              height: '68px',
                              borderRadius: '8px',
                              border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                              overflow: 'hidden',
                              background: '#0B0F19',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <img
                              src={pData}
                              alt={`Page ${pIdx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '2px',
                                background: 'rgba(0,0,0,0.75)',
                                color: '#FFFFFF',
                                fontSize: '9px',
                                fontWeight: 800,
                                padding: '1px 4px',
                                borderRadius: '4px',
                              }}
                            >
                              {pIdx + 1}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                            }}
                          >
                            p.{pIdx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: METADATA & FILING FORM */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                  padding: '24px 28px',
                  background: 'var(--bg-surface)',
                }}
              >
                {/* Folder Destination Preview Banner */}
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: '14px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    marginBottom: '20px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      fontWeight: 700,
                    }}
                  >
                    Target Destination in Google Drive:
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--accent-cyan)',
                      marginTop: '4px',
                      wordBreak: 'break-all',
                    }}
                  >
                    📁 G:\My Drive\IDE\Declutter\{computeOutboxPreview()}{triageBundle.metadata.suggestedFilename}
                  </div>
                </div>

                {/* 2-Column Structured Metadata Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                  {/* Document Type (Folder) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <Tag size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Document Type (Folder)
                    </label>
                    <select
                      value={triageBundle.metadata.documentType}
                      onChange={(e) =>
                        setTriageBundle({
                          ...triageBundle,
                          metadata: {
                            ...triageBundle.metadata,
                            documentType: e.target.value,
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '9px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-glass-bright)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    >
                      {Array.from(new Set([triageBundle.metadata.documentType, ...DOC_TYPES])).filter(Boolean).map((dt) => (
                        <option key={dt} value={dt} style={{ background: '#1E293B', color: '#FFF' }}>
                          {dt}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Patient / Account Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <User size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Patient / Account Name
                    </label>
                    <input
                      type="text"
                      value={triageBundle.metadata.personOrPatient || triageBundle.metadata.patientOrAccount || ''}
                      onChange={(e) =>
                        setTriageBundle({
                          ...triageBundle,
                          metadata: {
                            ...triageBundle.metadata,
                            personOrPatient: e.target.value,
                            patientOrAccount: e.target.value,
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '9px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-glass-bright)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Statement Date */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Statement Date (YYYY-MM-DD)
                    </label>
                    <input
                      type="date"
                      value={triageBundle.metadata.statementDate}
                      onChange={(e) =>
                        setTriageBundle({
                          ...triageBundle,
                          metadata: {
                            ...triageBundle.metadata,
                            statementDate: e.target.value,
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '9px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-glass-bright)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Issuer / Provider / Agency */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <Building2 size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Issuer / Facility / Utility
                    </label>
                    <input
                      type="text"
                      value={triageBundle.metadata.issuer}
                      onChange={(e) =>
                        setTriageBundle({
                          ...triageBundle,
                          metadata: {
                            ...triageBundle.metadata,
                            issuer: e.target.value,
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '9px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-glass-bright)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Doctor / Attending Physician */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <Stethoscope size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Doctor / Attending Provider
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jeremy Brown, MD"
                      value={triageBundle.metadata.providerOrDoctor || ''}
                      onChange={(e) =>
                        setTriageBundle({
                          ...triageBundle,
                          metadata: {
                            ...triageBundle.metadata,
                            providerOrDoctor: e.target.value,
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '9px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-glass-bright)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Procedure / Exam / Topic */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <Activity size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Procedure / Exam / Topic
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MRI Spine Lumbar w/o Contrast"
                      value={triageBundle.metadata.topicOrProcedure || ''}
                      onChange={(e) =>
                        setTriageBundle({
                          ...triageBundle,
                          metadata: {
                            ...triageBundle.metadata,
                            topicOrProcedure: e.target.value,
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '9px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-glass-bright)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Reference # / MRN */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <Hash size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Reference # / MRN / Acct #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MRN: 7054372"
                      value={triageBundle.metadata.referenceNumber || ''}
                      onChange={(e) =>
                        setTriageBundle({
                          ...triageBundle,
                          metadata: {
                            ...triageBundle.metadata,
                            referenceNumber: e.target.value,
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '9px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-glass-bright)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  {/* Amount Due / Balance */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <DollarSign size={13} style={{ display: 'inline', marginRight: '4px' }} />
                      Amount Due / Balance
                    </label>
                    <input
                      type="text"
                      value={triageBundle.metadata.amountDue || 'N/A'}
                      onChange={(e) =>
                        setTriageBundle({
                          ...triageBundle,
                          metadata: {
                            ...triageBundle.metadata,
                            amountDue: e.target.value,
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '9px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid var(--border-glass-bright)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                {/* Standardized Filename Field */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Standardized PDF Filename
                  </label>
                  <input
                    type="text"
                    value={triageBundle.metadata.suggestedFilename}
                    onChange={(e) =>
                      setTriageBundle({
                        ...triageBundle,
                        metadata: {
                          ...triageBundle.metadata,
                          suggestedFilename: e.target.value,
                        },
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '9px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-glass-bright)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                {/* Key Findings & Impressions */}
                {Array.isArray(triageBundle.metadata.keyFindings) && triageBundle.metadata.keyFindings.length > 0 && (
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Key Findings & Impressions
                    </label>
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-glass)',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <ul style={{ margin: 0, paddingLeft: '18px' }}>
                        {triageBundle.metadata.keyFindings.map((finding, idx) => (
                          <li key={idx} style={{ marginBottom: idx === triageBundle.metadata.keyFindings!.length - 1 ? 0 : '4px' }}>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Summary
                  </label>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      lineHeight: 1.6,
                    }}
                  >
                    {triageBundle.metadata.summary}
                  </div>
                </div>

                {/* Search & Filter Tags */}
                {Array.isArray(triageBundle.metadata.tags) && triageBundle.metadata.tags.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Search & Filter Tags
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {triageBundle.metadata.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: 'rgba(56, 189, 248, 0.1)',
                            color: 'var(--accent-cyan)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* RECEIPT ITEMIZATION & BASKET BREAKDOWN (When receiptDetails exists) */}
                {triageBundle.metadata.receiptDetails && (
                  <div
                    style={{
                      marginBottom: '22px',
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(168, 85, 247, 0.35)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Header bar */}
                    <div
                      onClick={() => setShowItemization(!showItemization)}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingCart size={16} color="#C084FC" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Itemized Basket & Money App Data
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'rgba(168, 85, 247, 0.2)',
                            color: '#D8B4FE',
                            fontWeight: 600,
                          }}
                        >
                          {triageBundle.metadata.receiptDetails.lineItems?.length || 0} items
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {triageBundle.metadata.receiptDetails.financials?.totalSavings ? (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#4ADE80',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Percent size={11} /> Saved ${triageBundle.metadata.receiptDetails.financials.totalSavings.toFixed(2)}
                            {triageBundle.metadata.receiptDetails.financials.savingsPercentage ? ` (${triageBundle.metadata.receiptDetails.financials.savingsPercentage})` : ''}
                          </span>
                        ) : null}

                        {triageBundle.metadata.receiptDetails.rewards?.fuelPointsEarned ? (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: 'rgba(234, 179, 8, 0.15)',
                              color: '#FACC15',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Award size={11} /> +{triageBundle.metadata.receiptDetails.rewards.fuelPointsEarned} fuel pts
                          </span>
                        ) : null}

                        {showItemization ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                      </div>
                    </div>

                    {/* Body */}
                    {showItemization && (
                      <div style={{ padding: '14px 16px' }}>
                        {/* Store & Transaction Chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                          {triageBundle.metadata.receiptDetails.store?.name && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px' }}>
                              🏪 {triageBundle.metadata.receiptDetails.store.name} {triageBundle.metadata.receiptDetails.store.address ? `(${triageBundle.metadata.receiptDetails.store.address})` : ''}
                            </span>
                          )}
                          {triageBundle.metadata.receiptDetails.transaction?.paymentMethod && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '6px' }}>
                              💳 {triageBundle.metadata.receiptDetails.transaction.paymentMethod}
                            </span>
                          )}
                          {triageBundle.metadata.receiptDetails.rewards?.communityPartner && (
                            <span style={{ fontSize: '11px', color: '#93C5FD', background: 'rgba(59, 130, 246, 0.12)', padding: '3px 8px', borderRadius: '6px' }}>
                              🏫 Partner: {triageBundle.metadata.receiptDetails.rewards.communityPartner}
                            </span>
                          )}
                        </div>

                        {/* Line Items Table/List */}
                        <div
                          style={{
                            maxHeight: '220px',
                            overflowY: 'auto',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            background: 'rgba(0,0,0,0.2)',
                          }}
                        >
                          {triageBundle.metadata.receiptDetails.lineItems && triageBundle.metadata.receiptDetails.lineItems.length > 0 ? (
                            triageBundle.metadata.receiptDetails.lineItems.map((item, iIdx) => (
                              <div
                                key={iIdx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '8px 12px',
                                  borderBottom: iIdx === triageBundle.metadata.receiptDetails!.lineItems.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                  fontSize: '12px',
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                                    {item.category && (
                                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>
                                        {item.category}
                                      </span>
                                    )}
                                    {item.taxFlag && (
                                      <span style={{ fontSize: '10px', color: item.taxFlag === 'F' ? '#86EFAC' : '#FCA5A5', background: 'rgba(255,255,255,0.04)', padding: '1px 5px', borderRadius: '4px' }}>
                                        {item.taxFlag === 'F' ? 'Food' : 'Taxable'}
                                      </span>
                                    )}
                                  </div>
                                  {item.discountDescription && (
                                    <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '2px' }}>
                                      ↳ {item.discountDescription} {item.discount ? `(-$${item.discount.toFixed(2)})` : ''}
                                    </div>
                                  )}
                                </div>
                                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                    ${(item.totalPrice ?? item.price).toFixed(2)}
                                  </span>
                                  {item.discount ? (
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                      ${item.price.toFixed(2)}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                              No line items detected
                            </div>
                          )}
                        </div>

                        {/* Financials totals grid */}
                        {triageBundle.metadata.receiptDetails.financials && (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(4, 1fr)',
                              gap: '8px',
                              marginTop: '12px',
                              padding: '10px',
                              background: 'rgba(255,255,255,0.02)',
                              borderRadius: '8px',
                              textAlign: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subtotal</div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                ${triageBundle.metadata.receiptDetails.financials.subtotal !== undefined ? triageBundle.metadata.receiptDetails.financials.subtotal.toFixed(2) : '--'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tax</div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                ${triageBundle.metadata.receiptDetails.financials.tax !== undefined ? triageBundle.metadata.receiptDetails.financials.tax.toFixed(2) : '0.00'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Savings</div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4ADE80' }}>
                                ${triageBundle.metadata.receiptDetails.financials.totalSavings !== undefined ? triageBundle.metadata.receiptDetails.financials.totalSavings.toFixed(2) : '0.00'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Paid</div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                                ${triageBundle.metadata.receiptDetails.financials.total !== undefined ? triageBundle.metadata.receiptDetails.financials.total.toFixed(2) : triageBundle.metadata.amountDue}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PRE-FILING DUPLICATE GUARD WARNING */}
                {duplicateMatch && (
                  <div
                    style={{
                      marginBottom: '18px',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <AlertTriangle size={20} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12px', lineHeight: 1.5, flex: 1 }}>
                      <div style={{ fontWeight: 800, color: 'var(--accent-amber)' }}>
                        Potential Duplicate Detected
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        A matching document was already filed to <code style={{ color: '#FFF' }}>{duplicateMatch.relativePdfPath}</code> on {formatDate(duplicateMatch.filedAt)}.
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                        Reference #: {duplicateMatch.referenceNumber || 'N/A'} • Issuer: {duplicateMatch.issuer}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sticky Action Footer */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--border-glass)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                  }}
                >
                  <button
                    onClick={() => setTriageBundle(null)}
                    disabled={isFiling}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '12px',
                      background: 'transparent',
                      border: '1px solid var(--border-glass-bright)',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleApproveAndFile}
                    disabled={isFiling}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 28px',
                      borderRadius: '12px',
                      border: 'none',
                      background: duplicateMatch
                        ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                        : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: duplicateMatch
                        ? '0 4px 16px rgba(245, 158, 11, 0.35)'
                        : '0 4px 16px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <FileCheck2 size={18} className={isFiling ? 'spin-icon' : ''} />
                    <span>
                      {isFiling
                        ? 'Compiling PDF & Filing...'
                        : duplicateMatch
                        ? 'Confirm & File Anyway'
                        : 'Approve & Save to Outbox'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME PROGRESS BAR MODAL */}
      {triageProgress.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 160,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass-bright)',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              padding: '36px 32px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.85)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#FFFFFF',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              <Sparkles size={28} className="spin-icon" />
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Personal Data Entry in Progress
            </h3>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              Optimizing camera scans and analyzing document with Gemini 3.1
            </p>

            {/* Glowing Animated Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                marginBottom: '14px',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${triageProgress.percent}%`,
                  height: '100%',
                  borderRadius: '9999px',
                  background: 'var(--accent-gradient)',
                  transition: 'width 0.25s ease-out',
                  boxShadow: '0 0 16px rgba(99, 102, 241, 0.7)',
                }}
              />
            </div>

            {/* Current Step Label & Percentage */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <span style={{ color: 'var(--accent-cyan)', textAlign: 'left', flex: 1, paddingRight: '12px' }}>
                {triageProgress.step}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {triageProgress.percent}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
