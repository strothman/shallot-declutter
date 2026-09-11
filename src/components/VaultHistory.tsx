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
  ScanLine,
  Edit3,
  Code,
  CheckCircle2,
  AlertCircle,
  X,
  Save
} from 'lucide-react';
import type { ScannedDocument, OutboxCatalogItem } from '../types';
import { getOutboxCatalog, updateVaultEntry } from '../services/inboxService';

interface VaultHistoryProps {
  documents: ScannedDocument[];
  onDeleteDoc: (id: string) => void;
  onOpenScanner: () => void;
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
  onDeleteDoc,
  onOpenScanner,
  onUpdateVaultCount,
}) => {
  const [catalogItems, setCatalogItems] = useState<OutboxCatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPerson, setSelectedPerson] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<UnifiedVaultItem | null>(null);
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');
  const [formState, setFormState] = useState<any>({});
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

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

  const categoryOptions = ['All', 'Medical', 'Insurance', 'Bills & Utilities', 'Taxes', 'Other'];

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Text search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches = 
          item.filename.toLowerCase().includes(term) ||
          item.issuer.toLowerCase().includes(term) ||
          item.personOrPatient.toLowerCase().includes(term) ||
          item.providerOrDoctor.toLowerCase().includes(term) ||
          item.topicOrProcedure.toLowerCase().includes(term) ||
          item.referenceNumber.toLowerCase().includes(term) ||
          item.summary.toLowerCase().includes(term) ||
          item.tags.some((t) => t.toLowerCase().includes(term));
        if (!matches) return false;
      }

      // Category filter
      if (selectedCategory !== 'All') {
        const itemCat = (item.category || '').toLowerCase();
        const itemType = (item.documentType || '').toLowerCase();
        const cat = selectedCategory.toLowerCase();

        if (cat === 'medical' && !itemCat.includes('medical') && !itemType.includes('mri') && !itemType.includes('medical')) {
          return false;
        } else if (cat === 'insurance' && !itemCat.includes('insurance') && !itemType.includes('eob')) {
          return false;
        } else if (cat === 'bills & utilities' && !itemCat.includes('bill') && !itemCat.includes('util') && !itemType.includes('bill')) {
          return false;
        } else if (cat === 'taxes' && !itemCat.includes('tax') && !itemType.includes('tax')) {
          return false;
        }
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
  }, [unifiedItems, searchTerm, selectedCategory, selectedPerson, selectedYear]);

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

  // Metrics
  const totalCount = unifiedItems.length;
  const eobCount = unifiedItems.filter((d) => d.documentType.includes('EOB') || d.category.includes('Insurance')).length;
  const medicalCount = unifiedItems.filter((d) => d.category.includes('Medical') || d.documentType.includes('MRI')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%' }}>
      {/* Top Metrics Ribbon with Export Button */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
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
          {/* Live Search Input */}
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
              placeholder="Search by patient, provider, procedure, MRN #, or keyword..."
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

        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
            Category:
          </span>
          {categoryOptions.map((cat) => {
            const isActive = selectedCategory === cat;
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
                }}
              >
                {cat}
              </button>
            );
          })}
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
            <button className="btn-primary" onClick={onOpenScanner} style={{ marginTop: '12px' }}>
              <ScanLine size={15} />
              <span>Capture New Document</span>
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

                    {item.source === 'local' && (
                      <button
                        onClick={() => onDeleteDoc(item.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        title="Remove from history"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
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
    </div>
  );
};
