export type DocType = 
  | 'EOB (Explanation of Benefits)'
  | 'Medical Bill'
  | 'Prescription / Rx'
  | 'Lab / Diagnostic Result'
  | 'Tax Document (W-2, 1099, Notice)'
  | 'Receipt'
  | 'Insurance Policy'
  | 'Utility / Service Bill'
  | 'Legal / Government Notice'
  | 'Other Document';

export interface ExtractedDocData {
  documentType: DocType;
  issuer: string;
  statementDate: string; // YYYY-MM-DD
  patientOrAccount: string;
  amountDue: string;
  summary: string;
  suggestedFilename: string;
  targetFolder: string;
  tags: string[];
}

export interface ScannedDocument {
  id: string;
  createdAt: string;
  pages: string[]; // base64 / data URLs of captured pages
  pdfBlobUrl?: string;
  pdfBlob?: Blob;
  metadata: ExtractedDocData;
  status: 'captured' | 'analyzing' | 'ready' | 'uploading' | 'filed' | 'error';
  driveFileId?: string;
  driveLink?: string;
  errorMessage?: string;
}

export interface AppSettings {
  geminiApiKey: string;
  geminiModel: string;
  googleClientId: string;
  googleAccessToken?: string;
  googleUserEmail?: string;
  autoFile: boolean;
  rootDriveFolder: string;
  enhanceContrast: boolean;
  useDemoMode: boolean;
}

// Global declaration for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
              expires_in?: number;
            }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}
