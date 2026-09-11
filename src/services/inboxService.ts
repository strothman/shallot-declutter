import type { InboxItem, InboxStatus } from '../types';

export async function getInboxStatus(): Promise<InboxStatus> {
  const res = await fetch('/api/status');
  if (!res.ok) {
    throw new Error(`Status check failed: ${res.statusText}`);
  }
  return res.json();
}

export async function getInboxFiles(): Promise<{ inboxPath: string; files: InboxItem[] }> {
  const res = await fetch('/api/inbox');
  if (!res.ok) {
    throw new Error(`Failed to list inbox files: ${res.statusText}`);
  }
  return res.json();
}

export async function discardInboxFile(filename: string): Promise<boolean> {
  const res = await fetch(`/api/inbox/file?name=${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to discard file: ${res.statusText}`);
  }
  const data = await res.json();
  return Boolean(data.success);
}

export async function fetchFileAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.statusText}`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface SaveToOutboxParams {
  fileNames: string[];
  pdfBlob: Blob;
  docType: string;
  statementDate: string;
  filename: string;
  metadata?: any;
}

export interface SaveToOutboxResult {
  success: boolean;
  savedPath: string;
  savedJsonPath?: string;
  relativeFolder: string;
  filename: string;
  movedFiles: string[];
}

export async function saveToOutbox(params: SaveToOutboxParams): Promise<SaveToOutboxResult> {
  const pdfBase64 = await blobToBase64(params.pdfBlob);

  const res = await fetch('/api/outbox/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileNames: params.fileNames,
      pdfBase64,
      docType: params.docType,
      statementDate: params.statementDate,
      filename: params.filename,
      metadata: params.metadata,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to save to Outbox: ${errText}`);
  }

  return res.json();
}

export async function getOutboxCatalog(): Promise<{ success: boolean; catalog: any[]; total: number }> {
  const res = await fetch('/api/outbox/catalog');
  if (!res.ok) {
    throw new Error(`Failed to load outbox catalog: ${res.statusText}`);
  }
  return res.json();
}

export async function checkDuplicate(params: {
  ref?: string;
  issuer?: string;
  date?: string;
  amount?: string;
}): Promise<{ isDuplicate: boolean; match?: any }> {
  const query = new URLSearchParams();
  if (params.ref) query.set('ref', params.ref);
  if (params.issuer) query.set('issuer', params.issuer);
  if (params.date) query.set('date', params.date);
  if (params.amount) query.set('amount', params.amount);

  const res = await fetch(`/api/outbox/check-duplicate?${query.toString()}`);
  if (!res.ok) {
    return { isDuplicate: false };
  }
  return res.json();
}
