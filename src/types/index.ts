export type DocType = 
  | 'EOB'
  | 'Medical Bill'
  | 'MRI Report'
  | 'Imaging & Diagnostic Report'
  | 'Medical Record'
  | 'Water Bill'
  | 'Electric Bill'
  | 'Utility Bill'
  | 'Tax Document'
  | 'Receipt'
  | 'Prescription'
  | 'Insurance Policy'
  | 'Lab Result'
  | 'Legal Notice'
  | 'Other';

export interface InboxItem {
  name: string;
  size: number;
  mtime: string;
  url: string;
  extension: string;
}

export interface InboxStatus {
  connected: boolean;
  inboxPath: string;
  outboxPath: string;
  inboxCount: number;
}

export interface ExtractedDocData {
  documentType: DocType | string;
  category?: 'Medical' | 'Bills & Utilities' | 'Insurance' | 'Taxes' | 'Legal' | 'Personal' | string;
  issuer: string;
  personOrPatient?: string; // Patient, account holder, customer, or taxpayer
  statementDate: string; // YYYY-MM-DD
  dueDate?: string;
  referenceNumber?: string; // MRN, Account #, Claim #, Invoice #, Accession #
  providerOrDoctor?: string; // Ordering doctor, physician, specialist
  topicOrProcedure?: string; // e.g. Lumbar Spine MRI, Q3 Water & Sewer
  amountDue: string;
  summary: string;
  keyFindings?: string[];
  suggestedFilename: string;
  targetFolder: string;
  tags: string[];
  patientOrAccount?: string; // compatibility alias
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
