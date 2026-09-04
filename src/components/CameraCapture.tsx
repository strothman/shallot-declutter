import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Plus, Trash2, Sliders, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { enhanceDocumentImage } from '../services/pdfService';
import { generateSampleDocumentDataUrl } from '../utils/sampleDocs';

interface CameraCaptureProps {
  onCaptureComplete: (pages: string[]) => void;
  enhanceContrast: boolean;
  onToggleEnhanceContrast: () => void;
  isAnalyzing: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCaptureComplete,
  enhanceContrast,
  onToggleEnhanceContrast,
  isAnalyzing,
}) => {
  const [capturedPages, setCapturedPages] = useState<string[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newPages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await readFileAsDataUrl(file);
      const enhanced = await enhanceDocumentImage(dataUrl, {
        enhanceContrast,
        grayscale: false,
      });
      newPages.push(enhanced);
    }

    setCapturedPages((prev) => [...prev, ...newPages]);
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePage = (index: number) => {
    setCapturedPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLoadSample = async (type: 'eob' | 'bill' | 'tax') => {
    const sampleUrl = generateSampleDocumentDataUrl(type);
    setCapturedPages([sampleUrl]);
  };

  const handleFinishAndAnalyze = () => {
    if (capturedPages.length === 0) return;
    onCaptureComplete(capturedPages);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Hidden inputs for iOS camera and file picker */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,application/pdf"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Main Viewfinder / Capture Surface */}
      <div
        className="glass-panel"
        style={{
          position: 'relative',
          height: capturedPages.length > 0 ? '380px' : '360px',
          borderRadius: '24px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 40%, #1A243D 0%, #0D1322 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {capturedPages.length > 0 ? (
          // Preview of captured pages
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <img
              src={capturedPages[capturedPages.length - 1]}
              alt="Scanned Document Page"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: '12px',
              }}
            />
            {/* Page Count Badge */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                padding: '6px 12px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                border: '1px solid var(--border-glass)',
              }}
            >
              Page {capturedPages.length} of {capturedPages.length}
            </div>

            {/* Remove Current Page */}
            <button
              onClick={() => handleRemovePage(capturedPages.length - 1)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.85)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Remove page"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          // Empty State Document Targeting Viewfinder
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              gap: '14px',
            }}
          >
            {/* Document Corner Framing Guides */}
            <div
              style={{
                width: '180px',
                height: '220px',
                position: 'relative',
                borderRadius: '16px',
                border: '2px dashed rgba(99, 102, 241, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(99, 102, 241, 0.03)',
              }}
            >
              <Camera size={42} color="var(--accent-primary)" style={{ opacity: 0.9 }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginTop: '8px',
                }}
              >
                Frame Paperwork Here
              </span>

              {/* Corner Reticles */}
              <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '16px', height: '16px', borderTop: '3px solid var(--accent-cyan)', borderLeft: '3px solid var(--accent-cyan)', borderTopLeftRadius: '6px' }} />
              <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '16px', height: '16px', borderTop: '3px solid var(--accent-cyan)', borderRight: '3px solid var(--accent-cyan)', borderTopRightRadius: '6px' }} />
              <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '16px', height: '16px', borderBottom: '3px solid var(--accent-cyan)', borderLeft: '3px solid var(--accent-cyan)', borderBottomLeftRadius: '6px' }} />
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '16px', height: '16px', borderBottom: '3px solid var(--accent-cyan)', borderRight: '3px solid var(--accent-cyan)', borderBottomRightRadius: '6px' }} />
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '280px' }}>
              Hold camera over an EOB, invoice, or tax form. Flat lighting works best.
            </p>
          </div>
        )}
      </div>

      {/* Action Controls & Shutter Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
        }}
      >
        {/* Upload from Gallery / Files */}
        <button
          className="btn-icon"
          onClick={() => fileInputRef.current?.click()}
          title="Import photos or PDFs"
          style={{ width: '48px', height: '48px' }}
        >
          <ImageIcon size={22} color="var(--text-secondary)" />
        </button>

        {/* Primary Tactile Shutter Button */}
        <button
          className="shutter-outer"
          onClick={() => cameraInputRef.current?.click()}
          aria-label="Capture page"
        >
          <div className="shutter-inner" />
        </button>

        {/* Text Filter Enhancement Toggle */}
        <button
          className="btn-icon"
          onClick={onToggleEnhanceContrast}
          title={enhanceContrast ? 'Text sharpener ON' : 'Text sharpener OFF'}
          style={{
            width: '48px',
            height: '48px',
            background: enhanceContrast ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-surface-elevated)',
            borderColor: enhanceContrast ? 'var(--accent-primary)' : 'var(--border-glass)',
          }}
        >
          <Sliders size={20} color={enhanceContrast ? 'var(--accent-primary)' : 'var(--text-muted)'} />
        </button>
      </div>

      {/* If pages are captured: Show "Add Another Page" and "Analyze with Gemini" */}
      {capturedPages.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          <button
            className="btn-secondary"
            onClick={() => cameraInputRef.current?.click()}
            style={{ flex: 1 }}
          >
            <Plus size={16} />
            <span>Add Page ({capturedPages.length})</span>
          </button>

          <button
            className="btn-primary"
            onClick={handleFinishAndAnalyze}
            disabled={isAnalyzing}
            style={{ flex: 1.6 }}
          >
            <Sparkles size={18} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Gemini Organize'}</span>
          </button>
        </div>
      )}

      {/* Quick Test Demo Document Loader */}
      <div
        className="glass-panel"
        style={{
          padding: '16px',
          borderRadius: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Instant Sample Paperwork
          </span>
          <span className="pill pill-indigo">Quick Test</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={() => handleLoadSample('eob')}
            style={{ padding: '8px 6px', fontSize: '11px', display: 'flex', flexDirection: 'column', height: 'auto', gap: '4px' }}
          >
            <FileSpreadsheet size={16} color="#38BDF8" />
            <span>Aetna EOB</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => handleLoadSample('bill')}
            style={{ padding: '8px 6px', fontSize: '11px', display: 'flex', flexDirection: 'column', height: 'auto', gap: '4px' }}
          >
            <CheckCircle2 size={16} color="#34D399" />
            <span>Quest Bill</span>
          </button>

          <button
            className="btn-secondary"
            onClick={() => handleLoadSample('tax')}
            style={{ padding: '8px 6px', fontSize: '11px', display: 'flex', flexDirection: 'column', height: 'auto', gap: '4px' }}
          >
            <Sparkles size={16} color="#FBBF24" />
            <span>1099 Tax Form</span>
          </button>
        </div>
      </div>
    </div>
  );
};
