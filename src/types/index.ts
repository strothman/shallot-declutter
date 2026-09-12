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
  | 'Social Security Statement'
  | 'Receipt'
  | 'Recipe'
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
  archivePath?: string;
  inboxCount: number;
  vaultCount?: number;
}

export interface ReceiptLineItem {
  name: string; // Clean item name e.g. "Kroger Pizza Sauce"
  rawText?: string; // Exact line from receipt e.g. "KRO PIZZA SAUCE 1.39 F"
  price: number; // Unit or base price e.g. 1.39
  quantity?: number; // Quantity purchased, default 1
  totalPrice: number; // Net total price after discounts e.g. 1.39
  discount?: number; // Coupon or promo discount amount e.g. 1.00
  discountDescription?: string; // e.g. "Mega Event Savings", "B2G1 Beverages"
  taxFlag?: string; // e.g. "F" (Food / non-taxable), "B" (Beverage / taxable), "T" (Taxable)
  category?: 'Pantry' | 'Produce' | 'Dairy' | 'Meat' | 'Beverages' | 'Snacks' | 'Bakery' | 'Frozen' | 'Household' | 'Personal Care' | 'Health' | 'Other' | string;
}

export interface ReceiptStoreInfo {
  name: string; // e.g. "Kroger"
  storeNumber?: string;
  address?: string; // e.g. "4915 Dixie Highway"
  phone?: string; // e.g. "(502)448-8215"
  registerNumber?: string; // e.g. "CHEC 502"
  cashier?: string;
}

export interface ReceiptTransactionInfo {
  time?: string; // e.g. "16:06" or "04:06PM"
  paymentMethod?: string; // e.g. "US DEBIT", "VISA", "CASH"
  cardLast4?: string; // e.g. "1874"
  authCode?: string; // e.g. "050704" (REF#)
  aid?: string; // Application Identifier e.g. "A0000000980840"
  tc?: string; // Transaction Certificate e.g. "CB67D5284B2408A1"
  itemsSold?: number; // Total item count e.g. 15
}

export interface ReceiptFinancials {
  subtotal?: number; // Pre-tax subtotal e.g. 29.96
  tax?: number; // Tax amount e.g. 0.42
  total: number; // Total balance paid e.g. 30.38
  totalSavings?: number; // Total discounts & coupons e.g. 9.49
  savingsPercentage?: string; // Savings rate e.g. "24%"
  coupons?: number; // Coupon total e.g. 9.49
  cashback?: number; // Cashback if debit e.g. 0.00
  annualSavingsYTD?: number; // Year-to-date card savings e.g. 1408.85
}

export interface ReceiptRewards {
  loyaltyCardLast4?: string; // e.g. "3756"
  fuelPointsEarned?: number; // Points earned this transaction e.g. 30
  fuelPointsMonthTotal?: number; // Total month points e.g. 877
  fuelPointsPriorRemaining?: number; // Rollover points e.g. 287
  communityPartner?: string; // e.g. "Eisenhower Elementary"
  surveyEntryId?: string; // Unique barcode / survey code e.g. "024-802-98-785-502-600"
  feedbackUrl?: string; // e.g. "www.kroger.com/feedback"
}

export interface ReceiptDetails {
  store: ReceiptStoreInfo;
  transaction: ReceiptTransactionInfo;
  financials: ReceiptFinancials;
  rewards?: ReceiptRewards;
  lineItems: ReceiptLineItem[];
}

export interface ExtractedDocData {
  documentType: DocType | string;
  category?: 'Medical' | 'Bills & Utilities' | 'Insurance' | 'Taxes' | 'Legal' | 'Personal' | 'Recipes & Cooking' | 'Social Security' | string;
  issuer: string;
  personOrPatient?: string; // Patient, account holder, customer, or taxpayer
  statementDate: string; // YYYY-MM-DD
  dueDate?: string;
  referenceNumber?: string; // MRN, Account #, Claim #, Invoice #, Accession #, Receipt Survey/Entry ID
  providerOrDoctor?: string; // Ordering doctor, physician, specialist
  topicOrProcedure?: string; // e.g. Lumbar Spine MRI, Q3 Water & Sewer
  amountDue: string;
  summary: string;
  keyFindings?: string[];
  suggestedFilename: string;
  targetFolder: string;
  tags: string[];
  patientOrAccount?: string; // compatibility alias
  receiptDetails?: ReceiptDetails; // Rich retail & grocery receipt metadata
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

export interface OutboxCatalogItem {
  id: string;
  filedAt: string;
  relativePdfPath: string;
  relativeJsonPath?: string;
  documentType: string;
  statementDate: string;
  personOrPatient?: string;
  issuer?: string;
  providerOrDoctor?: string;
  topicOrProcedure?: string;
  referenceNumber?: string;
  amountDue?: string;
  tags?: string[];
  metadata?: ExtractedDocData;
  receiptDetails?: ReceiptDetails;
}

export type ThemeMode =
  | 'shallot-plum'
  | 'high-contrast-slate'
  | 'crisp-light'
  | 'forest-pine'
  | 'deep-indigo';

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
  theme?: ThemeMode;
  customCategories?: string[];
  pinnedCategories?: string[];
  customDocTypes?: string[];
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
