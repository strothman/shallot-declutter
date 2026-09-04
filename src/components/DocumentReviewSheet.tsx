import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Calendar, 
  Building, 
  DollarSign, 
  Folder, 
  FileText, 
  HardDrive,
  Download,
  AlertCircle
} from 'lucide-react';
import type { ScannedDocument, DocType } from '../types';

interface DocumentReviewSheetProps {
  document: ScannedDocument;
  onApproveAndFile: (updatedDoc: ScannedDocument) => void;
  onCancel: () => void;
  isFiling: boolean;
  isDriveConnected: boolean;
}

const DOC_TYPES: DocType[] = [
  'EOB (Explanation of Benefits)',
  'Medical Bill',
  'Prescription / Rx',
  'Lab / Diagnostic Result',
  'Tax Document (W-2, 1099, Notice)',
  'Receipt',
  'Insurance Policy',
  'Utility / Service Bill',
  'Legal / Government Notice',
  'Other Document'
];

export const DocumentReviewSheet: React.FC<DocumentReviewSheetProps> = ({
  document,
  onApproveAndFile,
  onCancel,
  isFiling,
  isDriveConnected,
}) => {
  const [docType, setDocType] = useState<DocType>(document.metadata.documentType);
  const [issuer, setIssuer] = useState<string>(document.metadata.issuer);
  const [statementDate, setStatementDate] = useState<string>(document.metadata.statementDate);
  const [amountDue, setAmountDue] = useState<string>(document.metadata.amountDue);
  const [summary, setSummary] = useState<string>(document.metadata.summary);
  const [filename, setFilename] = useState<string>(document.metadata.suggestedFilename);
  const [targetFolder, setTargetFolder] = useState<string>(document.metadata.targetFolder);

  const handleApprove = () => {
    const updatedDoc: ScannedDocument = {
      ...document,
      metadata: {
        ...document.metadata,
        documentType: docType,
        issuer,
        statementDate,
        amountDue,
        summary,
        suggestedFilename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
        targetFolder,
      },
    };
    onApproveAndFile(updatedDoc);
  };

  return (
    <div className="modal-overlay">
      <div className="bottom-sheet">
        <div className="sheet-handle" />

        {/* Sheet Title & AI Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={16} color="#FFFFFF" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Gemini Document Review</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Verify details before auto-filing
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isFiling}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--bg-surface-elevated)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Document Thumbnail & Quick Summary Banner */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-glass)',
            borderRadius: '16px',
            padding: '12px',
            marginBottom: '16px',
          }}
        >
          {document.pages[0] && (
            <img
              src={document.pages[0]}
              alt="Document thumbnail"
              style={{
                width: '64px',
                height: '84px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid var(--border-glass-bright)',
              }}
            />
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              AI Summary
            </span>
            <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: 500 }}>
              {summary}
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
              {document.metadata.tags.map((tag, idx) => (
                <span key={idx} className="pill pill-indigo" style={{ fontSize: '10px', padding: '2px 8px' }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Document Type Picker */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} color="var(--accent-primary)" />
              Document Classification
            </label>
            <select
              className="input-field"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              style={{ cursor: 'pointer' }}
            >
              {DOC_TYPES.map((type) => (
                <option key={type} value={type} style={{ background: '#1E293B', color: '#FFF' }}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Issuer and Statement Date (2 cols) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} color="var(--accent-cyan)" />
                Issuer / Provider
              </label>
              <input
                type="text"
                className="input-field"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g. Aetna"
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="var(--accent-emerald)" />
                Date
              </label>
              <input
                type="date"
                className="input-field"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
              />
            </div>
          </div>

          {/* Amount / Patient Responsibility */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DollarSign size={14} color="var(--accent-amber)" />
              Amount Due / Patient Responsibility
            </label>
            <input
              type="text"
              className="input-field"
              value={amountDue}
              onChange={(e) => setAmountDue(e.target.value)}
              placeholder="e.g. $0.00 or $45.00"
            />
          </div>

          {/* Document Summary */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--accent-cyan)" />
              Summary Description
            </label>
            <input
              type="text"
              className="input-field"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. In-network annual physical exam"
            />
          </div>

          {/* Standardized Filename */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={14} />
              Generated Filename
            </label>
            <input
              type="text"
              className="input-field"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            />
          </div>

          {/* Destination Google Drive Folder */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Folder size={14} color="var(--accent-primary)" />
              Target Google Drive Folder
            </label>
            <input
              type="text"
              className="input-field"
              value={targetFolder}
              onChange={(e) => setTargetFolder(e.target.value)}
              placeholder="e.g. Shallot-Declutter/Medical/EOBs/2026"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
            />
          </div>

          {/* Drive Status Alert if not connected */}
          {!isDriveConnected && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                color: 'var(--accent-amber)',
                fontSize: '12px',
              }}
            >
              <AlertCircle size={16} />
              <span>Google Drive offline: filing will save to Vault & download PDF. Connect Drive in Settings anytime.</span>
            </div>
          )}
        </div>

        {/* Bottom Approval Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '22px' }}>
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={isFiling}
            style={{ flex: 1 }}
          >
            <X size={16} />
            <span>Discard</span>
          </button>

          <button
            className="btn-primary"
            onClick={handleApprove}
            disabled={isFiling}
            style={{ flex: 2 }}
          >
            {isFiling ? (
              <span className="animate-pulse">Filing Document...</span>
            ) : isDriveConnected ? (
              <>
                <HardDrive size={18} />
                <span>File to Google Drive</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Save to Vault & Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
