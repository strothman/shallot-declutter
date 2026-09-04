import React, { useState } from 'react';
import { 
  Search, 
  ExternalLink, 
  Trash2, 
  Folder, 
  Calendar, 
  CheckCircle,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import type { ScannedDocument } from '../types';

interface VaultHistoryProps {
  documents: ScannedDocument[];
  onDeleteDoc: (id: string) => void;
  onOpenScanner: () => void;
}

export const VaultHistory: React.FC<VaultHistoryProps> = ({
  documents,
  onDeleteDoc,
  onOpenScanner,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const filterCategories = ['All', 'EOB', 'Medical Bill', 'Tax', 'Receipt'];

  const filteredDocs = documents.filter((doc) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      doc.metadata.suggestedFilename.toLowerCase().includes(term) ||
      doc.metadata.issuer.toLowerCase().includes(term) ||
      doc.metadata.summary.toLowerCase().includes(term) ||
      doc.metadata.targetFolder.toLowerCase().includes(term) ||
      doc.metadata.tags.some((t) => t.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'EOB') return doc.metadata.documentType.includes('EOB');
    if (selectedFilter === 'Medical Bill') return doc.metadata.documentType.includes('Medical Bill');
    if (selectedFilter === 'Tax') return doc.metadata.documentType.includes('Tax');
    if (selectedFilter === 'Receipt') return doc.metadata.documentType.includes('Receipt');

    return true;
  });

  const eobCount = documents.filter((d) => d.metadata.documentType.includes('EOB')).length;
  const billCount = documents.filter((d) => d.metadata.documentType.includes('Bill')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Metrics Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {documents.length}
          </span>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Files</p>
        </div>
        <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
            {eobCount}
          </span>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>EOBs Filed</p>
        </div>
        <div className="glass-panel" style={{ padding: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
            {billCount}
          </span>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Bills Tracked</p>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <Search
          size={18}
          color="var(--text-muted)"
          style={{ position: 'absolute', left: '14px', top: '14px' }}
        />
        <input
          type="text"
          className="input-field"
          style={{ paddingLeft: '42px' }}
          placeholder="Search by insurer, doctor, or keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {filterCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedFilter(cat)}
            className="pill"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              cursor: 'pointer',
              background: selectedFilter === cat ? 'var(--accent-primary)' : 'var(--bg-surface-elevated)',
              color: selectedFilter === cat ? '#FFFFFF' : 'var(--text-secondary)',
              borderColor: selectedFilter === cat ? 'transparent' : 'var(--border-glass)',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            marginTop: '10px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileSpreadsheet size={28} color="var(--accent-primary)" />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
            {searchTerm ? 'No matching paperwork found' : 'Your Document Vault is empty'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '280px' }}>
            {searchTerm
              ? 'Try adjusting your search keywords or filter category.'
              : 'Scan your physical EOBs, medical statements, or receipts to have them auto-filed here.'}
          </p>
          {!searchTerm && (
            <button className="btn-primary" onClick={onOpenScanner} style={{ marginTop: '8px' }}>
              Scan First Document
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="glass-panel"
              style={{
                padding: '14px',
                display: 'flex',
                gap: '12px',
                position: 'relative',
              }}
            >
              {/* Thumbnail */}
              {doc.pages[0] ? (
                <img
                  src={doc.pages[0]}
                  alt="Scanned thumbnail"
                  style={{
                    width: '56px',
                    height: '74px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass-bright)',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '56px',
                    height: '74px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={24} color="var(--text-muted)" />
                </div>
              )}

              {/* Information */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <span
                    className="pill pill-indigo"
                    style={{ fontSize: '10px', padding: '2px 8px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {doc.metadata.documentType}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {doc.metadata.statementDate}
                  </span>
                </div>

                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                  }}
                >
                  {doc.metadata.issuer}
                </h4>

                <p
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-cyan)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {doc.metadata.suggestedFilename}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <Folder size={12} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.metadata.targetFolder}
                  </span>
                </div>

                {/* Amount Due Pill */}
                {doc.metadata.amountDue && doc.metadata.amountDue !== 'N/A' && (
                  <div style={{ marginTop: '4px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: doc.metadata.amountDue.includes('$0.00') ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        background: doc.metadata.amountDue.includes('$0.00') ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      {doc.metadata.amountDue}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                {doc.driveLink ? (
                  <a
                    href={doc.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-icon"
                    style={{ width: '32px', height: '32px' }}
                    title="Open in Google Drive"
                  >
                    <ExternalLink size={16} color="var(--accent-cyan)" />
                  </a>
                ) : (
                  <button
                    className="btn-icon"
                    style={{ width: '32px', height: '32px' }}
                    title="Local document"
                  >
                    <CheckCircle size={16} color="var(--accent-emerald)" />
                  </button>
                )}

                <button
                  onClick={() => onDeleteDoc(doc.id)}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
