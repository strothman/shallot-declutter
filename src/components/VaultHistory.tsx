import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ExternalLink, 
  Trash2, 
  Calendar, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  User, 
  Edit3,
  Code,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Store,
  Settings2,
  Plus,
  Check,
  Inbox,
} from 'lucide-react';
import type { ScannedDocument, OutboxCatalogItem, AppSettings } from '../types';
import { getOutboxCatalog, updateVaultEntry, deleteVaultEntry } from '../services/inboxService';
import { loadSettings, saveSettings } from '../services/storageService';

interface VaultHistoryProps {
  documents: ScannedDocument[];
  settings?: AppSettings;
  onUpdateSettings?: (settings: AppSettings) => void;
  onDeleteDoc: (id: string) => void;
  onOpenScanner?: () => void;
  onGoToInbox?: () => void;
  onUpdateVaultCount?: (count: number) => void;
}

interface UnifiedVaultItem {
  id: string;
  source: 'catalog' | 'local';
  documentType: string;
  category: string;
  issuer: string;
  personOrPatient: string;
  providerOrDoctor: string;
  topicOrProcedure: string;
  referenceNumber: string;
  statementDate: string;
  amountDue: string;
  summary: string;
  filename: string;
  targetFolder: string;
  relativePdfPath?: string;
  relativeJsonPath?: string;
  driveLink?: string;
  thumbnailUrl?: string;
  tags: string[];
  rawMetadata?: any;
}

export const VaultHistory: React.FC<VaultHistoryProps> = ({
  documents,
  settings,
  onUpdateSettings,
  onDeleteDoc,
  onOpenScanner,
  onGoToInbox,
  onUpdateVaultCount,
}) => {
  const [catalogItems, setCatalogItems] = useState<OutboxCatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPerson, setSelectedPerson] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [selectedStore, setSelectedStore] = useState<string>('All');

  // Category Customization state
  const [showCategoryCustomizer, setShowCategoryCustomizer] = useState<boolean>(false);
  const [newCustomCategoryInput, setNewCustomCategoryInput] = useState<string>('');
  const [activeSettings, setActiveSettings] = useState<AppSettings>(() => settings || loadSettings());

  useEffect(() => {
    if (settings) {
      setActiveSettings(settings);
    }
  }, [settings]);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<UnifiedVaultItem | null>(null);
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');
  const [formState, setFormState] = useState<any>({});
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<UnifiedVaultItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch Outbox/index.json catalog from desktop API (reconciled against physical files)
  const refreshCatalog = async () => {
    try {
      const data = await getOutboxCatalog();
      if (data && Array.isArray(data.catalog)) {
        setCatalogItems(data.catalog);
        if (onUpdateVaultCount && typeof data.total === 'number') {
          onUpdateVaultCount(data.total);
        }
      }
    } catch (err) {
      console.warn('Could not load Outbox catalog:', err);
    }
  };

  useEffect(() => {
    refreshCatalog();
  }, []);

  // When physical desktop catalog is available, it is our verified source of truth
  const unifiedItems: UnifiedVaultItem[] = useMemo(() => {
    if (catalogItems.length > 0) {
      return catalogItems.map((item) => {
        const filename = item.relativePdfPath ? item.relativePdfPath.split(/[/\\]/).pop() || '' : '';
        return {
          id: item.id,
          source: 'catalog',
          documentType: item.documentType || 'Other',
          category: item.metadata?.category || 'General',
          issuer: item.issuer || item.metadata?.issuer || 'Unknown Issuer',
          personOrPatient: item.personOrPatient || item.metadata?.personOrPatient || item.metadata?.patientOrAccount || 'N/A',
          providerOrDoctor: item.providerOrDoctor || item.metadata?.providerOrDoctor || '',
          topicOrProcedure: item.topicOrProcedure || item.metadata?.topicOrProcedure || '',
          referenceNumber: item.referenceNumber || item.metadata?.referenceNumber || '',
          statementDate: item.statementDate || item.metadata?.statementDate || '',
          amountDue: item.amountDue || item.metadata?.amountDue || 'N/A',
          summary: item.metadata?.summary || '',
          filename: filename || item.metadata?.suggestedFilename || 'Document.pdf',
          targetFolder: item.relativePdfPath ? item.relativePdfPath.split(/[/\\]/).slice(0, -1).join('/') : item.documentType,
          relativePdfPath: item.relativePdfPath,
          relativeJsonPath: item.relativeJsonPath,
          thumbnailUrl: item.metadata && (item.metadata as any).thumbnail,
          tags: item.tags || item.metadata?.tags || [],
          rawMetadata: item.metadata || {
            documentType: item.documentType,
            issuer: item.issuer,
            personOrPatient: item.personOrPatient,
            statementDate: item.statementDate,
            amountDue: item.amountDue,
            referenceNumber: item.referenceNumber,
            providerOrDoctor: item.providerOrDoctor,
            topicOrProcedure: item.topicOrProcedure,
            tags: item.tags || [],
          },
        };
      });
    }

    // Fallback if desktop API is not yet loaded or offline: local documents
    return documents.map((doc) => ({
      id: doc.id,
      source: 'local',
      documentType: doc.metadata.documentType || 'Other',
      category: doc.metadata.category || 'General',
      issuer: doc.metadata.issuer || 'Unknown Issuer',
      personOrPatient: doc.metadata.personOrPatient || doc.metadata.patientOrAccount || 'N/A',
      providerOrDoctor: doc.metadata.providerOrDoctor || '',
      topicOrProcedure: doc.metadata.topicOrProcedure || '',
      referenceNumber: doc.metadata.referenceNumber || '',
      statementDate: doc.metadata.statementDate || '',
      amountDue: doc.metadata.amountDue || 'N/A',
      summary: doc.metadata.summary || '',
      filename: doc.metadata.suggestedFilename || 'Document.pdf',
      targetFolder: doc.metadata.targetFolder || doc.metadata.documentType,
      driveLink: doc.driveLink,
      thumbnailUrl: doc.pages && doc.pages[0] ? doc.pages[0] : undefined,
      tags: doc.metadata.tags || [],
      rawMetadata: doc.metadata,
    }));
  }, [catalogItems, documents]);

  // Edit Handlers
  const handleStartEdit = (item: UnifiedVaultItem) => {
    setEditingItem(item);
    setEditMode('form');
    const initialForm = {
      documentType: item.documentType || '',
      category: item.category || 'General',
      issuer: item.issuer || '',
      personOrPatient: item.personOrPatient === 'N/A' ? '' : item.personOrPatient,
      statementDate: item.statementDate || '',
      referenceNumber: item.referenceNumber || '',
      providerOrDoctor: item.providerOrDoctor || '',
      topicOrProcedure: item.topicOrProcedure || '',
      amountDue: item.amountDue === 'N/A' ? '' : item.amountDue,
      summary: item.summary || '',
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
    };
    setFormState(initialForm);
    const metaToFormat = item.rawMetadata || initialForm;
    setRawJsonText(JSON.stringify(metaToFormat, null, 2));
    setJsonError(null);
    setSaveSuccessMsg(null);
  };

  const handleSwitchMode = (mode: 'form' | 'json') => {
    if (mode === 'json' && editMode === 'form') {
      const tagsArray = typeof formState.tags === 'string'
        ? formState.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : (formState.tags || []);
      const merged = {
        ...(editingItem?.rawMetadata || {}),
        ...formState,
        tags: tagsArray,
      };
      setRawJsonText(JSON.stringify(merged, null, 2));
      setJsonError(null);
      setEditMode('json');
    } else if (mode === 'form' && editMode === 'json') {
      try {
        const parsed = JSON.parse(rawJsonText);
        setFormState({
          documentType: parsed.documentType || '',
          category: parsed.category || 'General',
          issuer: parsed.issuer || '',
          personOrPatient: parsed.personOrPatient || parsed.patientOrAccount || '',
          statementDate: parsed.statementDate || '',
          referenceNumber: parsed.referenceNumber || '',
          providerOrDoctor: parsed.providerOrDoctor || '',
          topicOrProcedure: parsed.topicOrProcedure || '',
          amountDue: parsed.amountDue || '',
          summary: parsed.summary || '',
          tags: Array.isArray(parsed.tags) ? parsed.tags.join(', ') : (parsed.tags || ''),
        });
        setJsonError(null);
        setEditMode('form');
      } catch (err: any) {
        setJsonError(`Fix JSON syntax error before switching views: ${err.message}`);
      }
    }
  };

  const handlePrettifyJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      setRawJsonText(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (e: any) {
      setJsonError(`JSON Syntax Error: ${e.message}`);
    }
  };

  const handleJsonChange = (val: string) => {
    setRawJsonText(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(`JSON Syntax Error: ${err.message}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    setJsonError(null);

    try {
      let updatedMetadata: any;
      if (editMode === 'json') {
        try {
          updatedMetadata = JSON.parse(rawJsonText);
        } catch (e: any) {
          setJsonError(`Invalid JSON: ${e.message}`);
          setIsSavingEdit(false);
          return;
        }
      } else {
        const tagsArray = typeof formState.tags === 'string'
          ? formState.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : (formState.tags || []);

        updatedMetadata = {
          ...(editingItem.rawMetadata || {}),
          documentType: formState.documentType,
          category: formState.category,
          issuer: formState.issuer,
          personOrPatient: formState.personOrPatient,
          patientOrAccount: formState.personOrPatient,
          statementDate: formState.statementDate,
          referenceNumber: formState.referenceNumber,
          providerOrDoctor: formState.providerOrDoctor,
          topicOrProcedure: formState.topicOrProcedure,
          amountDue: formState.amountDue || '$0.00',
          summary: formState.summary,
          tags: tagsArray,
        };
      }

      if (editingItem.relativeJsonPath) {
        const res = await updateVaultEntry({
          relativeJsonPath: editingItem.relativeJsonPath,
          updatedMetadata,
        });
        if (res && Array.isArray(res.catalog)) {
          setCatalogItems(res.catalog);
          if (onUpdateVaultCount) {
            onUpdateVaultCount(res.total);
          }
        }
      }

      setSaveSuccessMsg('Document metadata saved to disk & catalog refreshed!');
      setTimeout(() => {
        setEditingItem(null);
        setSaveSuccessMsg(null);
      }, 700);
    } catch (err: any) {
      setJsonError(`Save failed: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Handlers
  const handlePromptDelete = (item: UnifiedVaultItem) => {
    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      if (itemToDelete.relativePdfPath || itemToDelete.relativeJsonPath) {
        const res = await deleteVaultEntry({
          relativePdfPath: itemToDelete.relativePdfPath,
          relativeJsonPath: itemToDelete.relativeJsonPath,
        });
        if (res && Array.isArray(res.catalog)) {
          setCatalogItems(res.catalog);
          if (onUpdateVaultCount) {
            onUpdateVaultCount(res.total);
          }
        }
      }

      // Also delete from local ledger if present
      onDeleteDoc(itemToDelete.id);
      setItemToDelete(null);
    } catch (err: any) {
      alert(`Failed to delete document: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Unique lists for filtering
  const availablePeople = useMemo(() => {
    const people = new Set<string>();
    unifiedItems.forEach((item) => {
      if (item.personOrPatient && item.personOrPatient !== 'N/A' && item.personOrPatient.trim()) {
        people.add(item.personOrPatient.trim());
      }
    });
    return Array.from(people).sort();
  }, [unifiedItems]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    unifiedItems.forEach((item) => {
      const y = item.statementDate?.slice(0, 4);
      if (y && /^\d{4}$/.test(y)) {
        years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [unifiedItems]);

  // Unique Store / Merchant list
  const availableStores = useMemo(() => {
    const stores = new Map<string, number>();
    unifiedItems.forEach((item) => {
      const storeName = item.rawMetadata?.receiptDetails?.store?.name ||
        (item.issuer && item.issuer !== 'Unknown Issuer' && item.issuer !== 'N/A' ? item.issuer : null);
      if (storeName && storeName.trim()) {
        const clean = storeName.trim();
        stores.set(clean, (stores.get(clean) || 0) + 1);
      }
    });
    return Array.from(stores.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [unifiedItems]);

  // Canonical category resolver
  const getItemCategory = (item: UnifiedVaultItem): string => {
    const docType = (item.documentType || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();

    if (docType === 'receipt' || cat.includes('receipt') || !!item.rawMetadata?.receiptDetails) {
      return 'Receipts';
    }
    if (docType === 'recipe' || cat.includes('recipe')) {
      return 'Recipes';
    }
    if (cat.includes('medical') || docType.includes('mri') || docType.includes('medical') || docType.includes('lab')) {
      return 'Medical';
    }
    if (cat.includes('insurance') || docType.includes('eob')) {
      return 'Insurance';
    }
    if (cat.includes('bill') || cat.includes('util') || docType.includes('bill')) {
      return 'Bills & Utilities';
    }
    if (cat.includes('tax') || docType.includes('tax')) {
      return 'Taxes';
    }
    return item.category || 'Other';
  };

  // Category counts and dynamic discovery
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: unifiedItems.length };
    unifiedItems.forEach((item) => {
      const c = getItemCategory(item);
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [unifiedItems]);

  // Compute which categories to display as pills
  const displayedCategories = useMemo(() => {
    const defaults = ['Receipts', 'Recipes', 'Medical', 'Bills & Utilities', 'Insurance', 'Taxes'];
    const pinned = activeSettings.pinnedCategories || defaults;
    const custom = activeSettings.customCategories || [];

    // Categories in vault with > 0 items
    const activeInVault = Object.keys(categoryCounts).filter((k) => k !== 'All' && (categoryCounts[k] || 0) > 0);

    // Combine 'All' + pinned + activeInVault + custom preserving unique order
    return Array.from(new Set(['All', ...pinned, ...activeInVault, ...custom]));
  }, [categoryCounts, activeSettings]);

  // Category customization handlers
  const handleTogglePinnedCategory = (cat: string) => {
    const defaults = ['Receipts', 'Recipes', 'Medical', 'Bills & Utilities', 'Insurance', 'Taxes'];
    const currentPinned = activeSettings.pinnedCategories || defaults;
    let updated: string[];
    if (currentPinned.includes(cat)) {
      updated = currentPinned.filter((c) => c !== cat);
    } else {
      updated = [...currentPinned, cat];
    }
    const newSettings = { ...activeSettings, pinnedCategories: updated };
    setActiveSettings(newSettings);
    saveSettings(newSettings);
    onUpdateSettings?.(newSettings);
  };

  const handleAddCustomCategory = () => {
    const trimmed = newCustomCategoryInput.trim();
    if (!trimmed) return;
    const currentCustom = activeSettings.customCategories || [];
    if (!currentCustom.includes(trimmed)) {
      const updatedCustom = [...currentCustom, trimmed];
      const currentPinned = activeSettings.pinnedCategories || ['Receipts', 'Recipes', 'Medical', 'Bills & Utilities', 'Insurance', 'Taxes'];
      const updatedPinned = [...currentPinned, trimmed];
      const newSettings = { ...activeSettings, customCategories: updatedCustom, pinnedCategories: updatedPinned };
      setActiveSettings(newSettings);
      saveSettings(newSettings);
      onUpdateSettings?.(newSettings);
    }
    setNewCustomCategoryInput('');
  };

  const handleRemoveCustomCategory = (cat: string) => {
    const updatedCustom = (activeSettings.customCategories || []).filter((c) => c !== cat);
    const updatedPinned = (activeSettings.pinnedCategories || []).filter((c) => c !== cat);
    const newSettings = { ...activeSettings, customCategories: updatedCustom, pinnedCategories: updatedPinned };
    setActiveSettings(newSettings);
    saveSettings(newSettings);
    onUpdateSettings?.(newSettings);
    if (selectedCategory === cat) {
      setSelectedCategory('All');
    }
  };

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Text search (including deep search inside receipt line items)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesBasic = 
          item.filename.toLowerCase().includes(term) ||
          item.issuer.toLowerCase().includes(term) ||
          item.personOrPatient.toLowerCase().includes(term) ||
          item.providerOrDoctor.toLowerCase().includes(term) ||
          item.topicOrProcedure.toLowerCase().includes(term) ||
          item.referenceNumber.toLowerCase().includes(term) ||
          item.summary.toLowerCase().includes(term) ||
          item.tags.some((t) => t.toLowerCase().includes(term));

        const matchesReceiptItems = item.rawMetadata?.receiptDetails?.lineItems?.some((li: any) =>
          (li.name && li.name.toLowerCase().includes(term)) ||
          (li.rawText && li.rawText.toLowerCase().includes(term)) ||
          (li.category && li.category.toLowerCase().includes(term))
        );

        if (!matchesBasic && !matchesReceiptItems) return false;
      }

      // Category filter
      if (selectedCategory !== 'All') {
        const itemCat = getItemCategory(item);
        if (selectedCategory === 'Receipts') {
          if (itemCat !== 'Receipts') return false;
        } else if (selectedCategory === 'Recipes') {
          if (itemCat !== 'Recipes') return false;
        } else if (selectedCategory === 'Medical') {
          if (itemCat !== 'Medical') return false;
        } else if (selectedCategory === 'Insurance') {
          if (itemCat !== 'Insurance') return false;
        } else if (selectedCategory === 'Bills & Utilities') {
          if (itemCat !== 'Bills & Utilities') return false;
        } else if (selectedCategory === 'Taxes') {
          if (itemCat !== 'Taxes') return false;
        } else {
          if (itemCat.toLowerCase() !== selectedCategory.toLowerCase() && (item.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
            return false;
          }
        }
      }

      // Store / Merchant filter
      if (selectedStore !== 'All') {
        const storeName = item.rawMetadata?.receiptDetails?.store?.name || item.issuer || '';
        if (!storeName.toLowerCase().includes(selectedStore.toLowerCase())) return false;
      }

      // Person filter
      if (selectedPerson !== 'All') {
        if (item.personOrPatient !== selectedPerson) return false;
      }

      // Year filter
      if (selectedYear !== 'All') {
        if (!item.statementDate.startsWith(selectedYear)) return false;
      }

      return true;
    });
  }, [unifiedItems, searchTerm, selectedCategory, selectedStore, selectedPerson, selectedYear]);

  // Metrics calculation
  const totalCount = unifiedItems.length;
  const eobCount = unifiedItems.filter((d) => d.documentType.includes('EOB') || d.category.includes('Insurance')).length;
  const medicalCount = unifiedItems.filter((d) => d.category.includes('Medical') || d.documentType.includes('MRI')).length;

  // Receipt Financial Spending & Savings Metrics
  const receiptMetrics = useMemo(() => {
    let totalSpent = 0;
    let totalSaved = 0;
    let count = 0;

    filteredItems.forEach((item) => {
      const isReceipt = getItemCategory(item) === 'Receipts';
      if (isReceipt) {
        count++;
        const fin = item.rawMetadata?.receiptDetails?.financials;
        if (fin?.total !== undefined) {
          totalSpent += fin.total;
        } else if (item.amountDue && item.amountDue !== 'N/A') {
          const parsed = parseFloat(item.amountDue.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) totalSpent += parsed;
        }
        if (fin?.totalSavings !== undefined) {
          totalSaved += fin.totalSavings;
        }
      }
    });

    return { totalSpent, totalSaved, count };
  }, [filteredItems]);

  // Export filtered view to CSV
  const handleExportCsv = () => {
    if (filteredItems.length === 0) return;

    const headers = [
      'Statement Date',
      'Category',
      'Document Type',
      'Issuer / Facility',
      'Person / Patient',
      'Ordering Doctor',
      'Procedure / Topic',
      'Reference / MRN / Claim #',
      'Amount Due',
      'Filename',
      'Target Folder',
      'Tags',
      'Summary',
    ];

    const escapeCsv = (str: string | undefined | null) => {
      const val = str ? String(str).replace(/"/g, '""') : '';
      return `"${val}"`;
    };

    const rows = filteredItems.map((item) => [
      escapeCsv(item.statementDate),
      escapeCsv(item.category),
      escapeCsv(item.documentType),
      escapeCsv(item.issuer),
      escapeCsv(item.personOrPatient),
      escapeCsv(item.providerOrDoctor),
      escapeCsv(item.topicOrProcedure),
      escapeCsv(item.referenceNumber),
      escapeCsv(item.amountDue),
      escapeCsv(item.filename),
      escapeCsv(item.targetFolder),
      escapeCsv(item.tags.join(', ')),
      escapeCsv(item.summary),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `Shallot_Declutter_Catalog_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isReceiptsView = selectedCategory === 'Receipts' || selectedStore !== 'All';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
      {/* Top Metrics Ribbon with Export Button */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {isReceiptsView ? (
          <>
            <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {receiptMetrics.count}
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Receipts Filtered
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#38BDF8' }}>
                ${receiptMetrics.totalSpent.toFixed(2)}
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Total Spent
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#4ADE80' }}>
                ${receiptMetrics.totalSaved.toFixed(2)}
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Total Savings & Discounts
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {totalCount}
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Cataloged Assets
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {medicalCount}
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Medical & Diagnostic
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {eobCount}
              </span>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                Insurance & EOBs
              </p>
            </div>
          </>
        )}

        <div
          className="glass-panel"
          style={{
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(212, 130, 68, 0.08)',
            border: '1px solid var(--border-glass-bright)',
          }}
        >
          <button
            onClick={handleExportCsv}
            disabled={filteredItems.length === 0}
            className="btn-primary"
            style={{
              padding: '8px 14px',
              fontSize: '12px',
              width: '100%',
              justifyContent: 'center',
              boxShadow: 'none',
            }}
            title="Export filtered catalog to CSV spreadsheet for taxes and expense reporting"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {filteredItems.length} records ready
          </span>
        </div>
      </div>

      {/* Multi-Facet Filter Bar */}
      <div className="glass-panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Live Search Input (with deep receipt line-item support) */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search
              size={16}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '12px', top: '12px' }}
            />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '38px', height: '38px', fontSize: '13px' }}
              placeholder="Search by patient, provider, item, grocery, or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Store / Merchant Dropdown Filter */}
          {availableStores.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Store size={14} color="#F59E0B" />
              <select
                className="input-field"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                style={{ height: '38px', fontSize: '12px', paddingRight: '24px', cursor: 'pointer', minWidth: '150px' }}
              >
                <option value="All">All Stores / Places ({availableStores.length})</option>
                {availableStores.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({s.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Person / Patient Dropdown Filter */}
          {availablePeople.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} color="var(--accent-primary)" />
              <select
                className="input-field"
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                style={{ height: '38px', fontSize: '12px', paddingRight: '24px', cursor: 'pointer', minWidth: '150px' }}
              >
                <option value="All">All People ({availablePeople.length})</option>
                {availablePeople.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Year Filter Dropdown/Pills */}
          {availableYears.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="var(--accent-cyan)" />
              <select
                className="input-field"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ height: '38px', fontSize: '12px', paddingRight: '24px', cursor: 'pointer', minWidth: '100px' }}
              >
                <option value="All">All Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Dynamic & Customizable Category Pills Ribbon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Category:
          </span>
          {displayedCategories.map((cat) => {
            const isActive = selectedCategory === cat;
            const count = categoryCounts[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="pill"
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: isActive ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  borderColor: isActive ? 'transparent' : 'var(--border-glass)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{cat}</span>
                {count !== undefined && count > 0 && cat !== 'All' && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '8px',
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                      color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                      fontWeight: 700,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          {/* Customize Categories Trigger Button */}
          <button
            onClick={() => setShowCategoryCustomizer(true)}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'transparent',
              border: '1px dashed var(--border-glass-bright)',
              borderRadius: '20px',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              marginLeft: '4px',
            }}
            title="Customize which categories appear on your filter bar"
          >
            <Settings2 size={12} />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredItems.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '16px',
              background: 'rgba(212, 130, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileSpreadsheet size={28} color="var(--accent-primary)" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
            {searchTerm || selectedCategory !== 'All' || selectedPerson !== 'All'
              ? 'No paperwork matching current filters'
              : 'Your Master Catalog is Ready'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '360px', margin: 0 }}>
            {searchTerm || selectedCategory !== 'All' || selectedPerson !== 'All'
              ? 'Try resetting the filters or searching for another term.'
              : 'Files you process from your Inbox will appear here with full metadata search, duplicate protection, and CSV export.'}
          </p>
          {(searchTerm || selectedCategory !== 'All' || selectedPerson !== 'All') ? (
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                setSelectedPerson('All');
                setSelectedYear('All');
              }}
              style={{ marginTop: '8px' }}
            >
              Clear All Filters
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={onGoToInbox || onOpenScanner}
              style={{ marginTop: '12px' }}
            >
              <Inbox size={15} />
              <span>Open Inbox & Triage</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass-panel"
              style={{
                padding: '16px',
                display: 'flex',
                gap: '14px',
                position: 'relative',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
              }}
            >
              {/* Document Icon / Thumbnail */}
              <div
                style={{
                  width: '60px',
                  height: '80px',
                  borderRadius: '10px',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-glass-bright)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt="Thumbnail"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <>
                    <FileText size={24} color="var(--accent-primary)" />
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                        marginTop: '4px',
                      }}
                    >
                      PDF
                    </span>
                  </>
                )}
              </div>

              {/* Information Body */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span
                    className="pill"
                    style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      maxWidth: '160px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      background: 'rgba(212, 130, 68, 0.12)',
                      color: 'var(--accent-primary)',
                      border: '1px solid rgba(212, 130, 68, 0.25)',
                    }}
                  >
                    {item.documentType}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {item.statementDate || 'Unknown Date'}
                  </span>
                </div>

                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                    color: 'var(--text-primary)',
                  }}
                  title={item.issuer}
                >
                  {item.issuer}
                </h4>

                {/* Patient or Procedure Details */}
                {(item.personOrPatient !== 'N/A' || item.topicOrProcedure) && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.personOrPatient !== 'N/A' && (
                      <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {item.personOrPatient}
                      </span>
                    )}
                    {item.topicOrProcedure && (
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        • {item.topicOrProcedure}
                      </span>
                    )}
                  </div>
                )}

                {/* Reference Number if present */}
                {item.referenceNumber && (
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    Ref: {item.referenceNumber}
                  </div>
                )}

                {/* Receipt Quick Metrics (Items, Savings, Fuel) */}
                {item.rawMetadata?.receiptDetails && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        color: '#D8B4FE',
                        fontWeight: 600,
                      }}
                    >
                      🛒 {item.rawMetadata.receiptDetails.lineItems?.length || 0} items
                    </span>
                    {item.rawMetadata.receiptDetails.financials?.totalSavings ? (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: 'rgba(34, 197, 94, 0.12)',
                          color: '#4ADE80',
                          fontWeight: 600,
                        }}
                      >
                        Saved ${item.rawMetadata.receiptDetails.financials.totalSavings.toFixed(2)}
                      </span>
                    ) : null}
                    {item.rawMetadata.receiptDetails.rewards?.fuelPointsEarned ? (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: 'rgba(234, 179, 8, 0.12)',
                          color: '#FACC15',
                          fontWeight: 600,
                        }}
                      >
                        +{item.rawMetadata.receiptDetails.rewards.fuelPointsEarned} fuel pts
                      </span>
                    ) : null}
                  </div>
                )}

                <p
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}
                  title={item.filename}
                >
                  {item.filename}
                </p>

                {/* Bottom Row: Amount & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  {item.amountDue && item.amountDue !== 'N/A' ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: item.amountDue.includes('$0.00') ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        background: item.amountDue.includes('$0.00') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      Due: {item.amountDue}
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No balance</span>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Edit Metadata & JSON Button */}
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="btn-icon"
                      style={{ width: '30px', height: '30px' }}
                      title="Edit Document Metadata & Sidecar JSON"
                    >
                      <Edit3 size={14} color="var(--accent-primary)" />
                    </button>

                    {/* Direct Outbox PDF Opener */}
                    {item.relativePdfPath ? (
                      <a
                        href={`/api/outbox/file?path=${encodeURIComponent(item.relativePdfPath)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon"
                        style={{ width: '30px', height: '30px' }}
                        title="Open PDF Document"
                      >
                        <ExternalLink size={15} color="var(--accent-primary)" />
                      </a>
                    ) : item.driveLink ? (
                      <a
                        href={item.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon"
                        style={{ width: '30px', height: '30px' }}
                        title="Open in Google Drive"
                      >
                        <ExternalLink size={15} color="var(--accent-cyan)" />
                      </a>
                    ) : null}

                    {/* Delete Vault Item Button */}
                    <button
                      onClick={() => handlePromptDelete(item)}
                      className="btn-icon"
                      style={{
                        width: '30px',
                        height: '30px',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      title="Delete from Vault (with confirmation)"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Entry Modal Overlay */}
      {editingItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => !isSavingEdit && setEditingItem(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              border: '1px solid var(--border-glass-bright)',
              background: 'var(--bg-surface)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(212, 130, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Edit3 size={18} color="var(--accent-primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Edit Vault Document Entry
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                    {editingItem.relativeJsonPath || editingItem.filename}
                  </p>
                </div>
              </div>

              {/* View Mode Switcher Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('form')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: editMode === 'form' ? 'var(--accent-primary)' : 'transparent',
                    color: editMode === 'form' ? '#FFFFFF' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FileText size={13} />
                  <span>Field Form</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('json')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: editMode === 'json' ? 'var(--accent-primary)' : 'transparent',
                    color: editMode === 'json' ? '#FFFFFF' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Code size={13} />
                  <span>Raw JSON</span>
                </button>
              </div>

              <button
                onClick={() => !isSavingEdit && setEditingItem(null)}
                className="btn-icon"
                style={{ width: '32px', height: '32px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {saveSuccessMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: 'var(--accent-emerald)',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {jsonError && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{jsonError}</span>
                </div>
              )}

              {editMode === 'form' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      DOCUMENT TYPE
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formState.documentType || ''}
                      onChange={(e) => setFormState({ ...formState, documentType: e.target.value })}
                      placeholder="e.g. EOB, Medical Bill, MRI Report"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      CATEGORY
                    </label>
                    <select
                      className="input-field"
                      value={formState.category || 'General'}
                      onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                    >
                      <option value="Medical">Medical</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Bills & Utilities">Bills & Utilities</option>
                      <option value="Taxes">Taxes</option>
                      <option value="Legal">Legal</option>
                      <option value="Personal">Personal</option>
                      <option value="Recipes & Cooking">Recipes & Cooking</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      ISSUER / FACILITY / COMPANY
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formState.issuer || ''}
                      onChange={(e) => setFormState({ ...formState, issuer: e.target.value })}
                      placeholder="e.g. Aetna, Diagnostic Imaging, City Water"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      PERSON / PATIENT / ACCOUNT HOLDER
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formState.personOrPatient || ''}
                      onChange={(e) => setFormState({ ...formState, personOrPatient: e.target.value })}
                      placeholder="e.g. Jane Doe"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      STATEMENT DATE (YYYY-MM-DD)
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={formState.statementDate || ''}
                      onChange={(e) => setFormState({ ...formState, statementDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      AMOUNT DUE
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formState.amountDue || ''}
                      onChange={(e) => setFormState({ ...formState, amountDue: e.target.value })}
                      placeholder="e.g. $0.00 or $125.50"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      REFERENCE / MRN / CLAIM #
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formState.referenceNumber || ''}
                      onChange={(e) => setFormState({ ...formState, referenceNumber: e.target.value })}
                      placeholder="e.g. MRN12345 or Claim #987654"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      PROVIDER / ORDERING DOCTOR
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formState.providerOrDoctor || ''}
                      onChange={(e) => setFormState({ ...formState, providerOrDoctor: e.target.value })}
                      placeholder="e.g. Dr. Jane Smith, MD"
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      TOPIC / PROCEDURE
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formState.topicOrProcedure || ''}
                      onChange={(e) => setFormState({ ...formState, topicOrProcedure: e.target.value })}
                      placeholder="e.g. Lumbar Spine MRI Without Contrast"
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      SUMMARY & CLINICAL / BILLING NOTES
                    </label>
                    <textarea
                      className="input-field"
                      rows={3}
                      style={{ height: 'auto', resize: 'vertical' }}
                      value={formState.summary || ''}
                      onChange={(e) => setFormState({ ...formState, summary: e.target.value })}
                      placeholder="Extracted key information or user notes..."
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      TAGS (COMMA SEPARATED)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formState.tags || ''}
                      onChange={(e) => setFormState({ ...formState, tags: e.target.value })}
                      placeholder="e.g. medical, mri, lumbar, spine, radiology"
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Directly edit the JSON sidecar stored on disk in your Outbox folder:
                    </span>
                    <button
                      type="button"
                      onClick={handlePrettifyJson}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px' }}
                    >
                      Format / Prettify
                    </button>
                  </div>
                  <textarea
                    className="input-field"
                    rows={18}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      height: '360px',
                      resize: 'vertical',
                      lineHeight: 1.5,
                      background: 'rgba(0, 0, 0, 0.3)',
                      whiteSpace: 'pre',
                    }}
                    value={rawJsonText}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-glass)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-surface-elevated)',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Changes will immediately update the sidecar file and rebuild the vault index.
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => !isSavingEdit && setEditingItem(null)}
                  disabled={isSavingEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || Boolean(jsonError && editMode === 'json')}
                >
                  <Save size={14} />
                  <span>{isSavingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {itemToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={() => !isDeleting && setItemToDelete(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              background: 'var(--bg-surface)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} color="#EF4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Delete Document from Vault?
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Please confirm to remove this document from your vault.
                </p>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Document:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {itemToDelete.filename}
                </span>
              </div>
              {itemToDelete.issuer && itemToDelete.issuer !== 'Unknown' && itemToDelete.issuer !== 'N/A' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Issuer:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{itemToDelete.issuer}</span>
                </div>
              )}
              {itemToDelete.personOrPatient && itemToDelete.personOrPatient !== 'N/A' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Person / Patient:</span>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{itemToDelete.personOrPatient}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{itemToDelete.statementDate || 'Unknown'}</span>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              This document and its metadata sidecar will be safely moved to your <strong>Archive/Trash</strong> folder and removed from the active Vault catalog.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  borderColor: '#EF4444',
                }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                <Trash2 size={14} />
                <span>{isDeleting ? 'Deleting...' : 'Delete Document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Customizer Modal */}
      {showCategoryCustomizer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 7, 12, 0.78)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={() => setShowCategoryCustomizer(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-glass-bright)',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5), 0 0 20px rgba(212, 130, 68, 0.15)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(212, 130, 68, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Settings2 size={20} color="var(--accent-primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Customize Category Filter Bar
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Choose which categories appear as quick filters on your ribbon.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryCustomizer(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Standard Categories Selection */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                Standard Categories
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                {['Receipts', 'Recipes', 'Medical', 'Bills & Utilities', 'Insurance', 'Taxes'].map((cat) => {
                  const pinned = (activeSettings.pinnedCategories || ['Receipts', 'Recipes', 'Medical', 'Bills & Utilities', 'Insurance', 'Taxes']).includes(cat);
                  const count = categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleTogglePinnedCategory(cat)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: pinned ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                        background: pinned ? 'rgba(212, 130, 68, 0.12)' : 'var(--bg-surface-elevated)',
                        color: pinned ? 'var(--text-primary)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            border: pinned ? 'none' : '1px solid var(--border-glass-bright)',
                            background: pinned ? 'var(--accent-primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {pinned && <Check size={12} color="#FFFFFF" />}
                        </div>
                        <span>{cat}</span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          padding: '1px 5px',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.06)',
                        }}
                      >
                        {count} docs
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom User Categories */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                Your Custom Categories
              </label>

              {/* Add Custom Category Form */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Vehicle Maintenance, Work Expenses..."
                  value={newCustomCategoryInput}
                  onChange={(e) => setNewCustomCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomCategory();
                    }
                  }}
                  style={{ flex: 1, height: '36px', fontSize: '12px' }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddCustomCategory}
                  disabled={!newCustomCategoryInput.trim()}
                  style={{ padding: '0 14px', height: '36px', fontSize: '12px' }}
                >
                  <Plus size={14} />
                  <span>Add</span>
                </button>
              </div>

              {/* Custom Categories List */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {activeSettings.customCategories && activeSettings.customCategories.length > 0 ? (
                  activeSettings.customCategories.map((cat) => {
                    const count = categoryCounts[cat] || 0;
                    return (
                      <span
                        key={cat}
                        className="pill"
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          background: 'rgba(56, 189, 248, 0.12)',
                          borderColor: 'rgba(56, 189, 248, 0.3)',
                          color: '#38BDF8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{cat}</span>
                        <span style={{ fontSize: '9px', opacity: 0.8 }}>({count})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomCategory(cat)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            padding: '0 2px',
                            opacity: 0.7,
                          }}
                          title={`Remove category "${cat}"`}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })
                ) : (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No custom categories added yet. Add one above to create custom filter pills!
                  </span>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: '11px', padding: '6px 10px' }}
                onClick={() => {
                  const defaults = ['Receipts', 'Recipes', 'Medical', 'Bills & Utilities', 'Insurance', 'Taxes'];
                  const resetSettings = {
                    ...activeSettings,
                    pinnedCategories: defaults,
                  };
                  setActiveSettings(resetSettings);
                  saveSettings(resetSettings);
                  onUpdateSettings?.(resetSettings);
                }}
              >
                Reset Default Categories
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowCategoryCustomizer(false)}
                style={{ fontSize: '12px', padding: '8px 18px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
