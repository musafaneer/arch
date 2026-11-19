export type LibyanEra =
  | "المملكة الليبية (1951 - 1969)"
  | "حقبة الجمهورية والجماهيرية (1969 - 2011)"
  | "دولة ليبيا الحديثة (2011 - الآن)";

export type DepartmentType =
  | "إدارة الخزانة العامة"
  | "إدارة الميزانية العامة والتخطيط المالي"
  | "مصلحة الجمارك الليبية"
  | "مصلحة الضرائب"
  | "إدارة الحسابات والرقابة المالية"
  | "مصلحة أملاك الدولة"
  | "إدارة الدين العام والالتزامات المالية";

export type DocumentType =
  | "مرسوم ملكي مالي"
  | "قرار وزاري"
  | "إذن صرف خزانة عامة"
  | "إقرار وتخليص جمركي"
  | "قانون الميزانية التقديرية"
  | "سندات خزانة وقرض عام"
  | "كشف مرتبات وعلاوات ديوانية"
  | "عقد امتياز وإتاوات نفطية";

export type SecurityClassification =
  | "عام"
  | "محدود"
  | "سري"
  | "سري ومحدود"
  | "سري للغاية";

export type VaultRole = 
  | "CHIEF_CUSTODIAN"   // أمين الخزينة العامة والسيادية
  | "AUDIT_INSPECTOR"   // مراقب ديوان المحاسبة والامتثال
  | "SENIOR_ARCHIVIST"  // كبير أخصائيي الأرشفة والترميم
  | "RESEARCHER";       // باحث مالي معتمد

export interface VaultUser {
  id: string;
  name: string;
  title: string;
  role: VaultRole;
  clearanceLevel: SecurityClassification;
  nationalId: string;
  department: string;
  badgeNumber: string;
  keyFingerprint: string;
}

export interface CryptographicProof {
  sha256Hash: string;
  merkleRoot: string;
  encryptionAlgorithm: "AES-256-GCM";
  transitSecurity: "TLS 1.3 / Perfect Forward Secrecy";
  timestampAuthority: string;
  retentionPolicy: string;
  integrityVerified: boolean;
  lastVerifiedAt: string;
  digitalSealId: string;
  keyId: string;
}

export interface IntegrityAuditRecord {
  id: string;
  timestamp: string;
  docId: string;
  docRef: string;
  docTitle: string;
  storedHash: string;
  calculatedHash: string;
  merkleLeaf: string;
  status: "passed" | "warning" | "tampered";
  checkedBy: string;
  verificationLatencyMs: number;
}

export type ArabicSearchMode = "all-words" | "exact-phrase" | "any-word" | "boolean";

export interface SearchFilterOptions {
  query: string;
  searchMode: ArabicSearchMode;
  normalizeArabic: boolean;
  stemmingEnabled: boolean;
  era: LibyanEra | "ALL";
  department: DepartmentType | "ALL";
  docType: DocumentType | "ALL";
  classification: SecurityClassification | "ALL";
  currency: string | "ALL";
  yearRange: [number, number];
  financialRange: "ALL" | "under-100k" | "100k-1m" | "above-1m";
  physicalCondition: string | "ALL";
  vaultLockedOnly: boolean;
}

export interface SearchMatchResult {
  document: ArchivedDocument;
  matchScore: number;
  matchedFields: string[];
  snippet: string;
  matchedKeywords: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  note: string;
}

export interface ArchivedDocument {
  id: string;
  refNumber: string; // الرقم الإشاري
  title: string; // عنوان الوثيقة
  era: LibyanEra;
  department: DepartmentType;
  docType: DocumentType;
  classification: SecurityClassification;
  gregorianDate: string; // التاريخ الميلادي
  hijriDate: string; // التاريخ الهجري
  year: number;
  financialAmount: string; // المبلغ المالي المذكور
  currency: string; // العملة
  signatories: string[]; // الموقعون
  stampsDetected: string[]; // الأختام وطوابع الدمغة
  ocrText: string; // التفريغ النصي
  summary: string; // الملخص
  keywords: string[]; // الكلمات المفتاحية
  storageLocation: string; // الموقع الأرشيفي الورقي السابق (ISAD-G)
  barcode: string; // باركود الأرشيف
  qrCodeVerificationId: string; // كود التحقق الرقمي
  status: "مؤرشفة ومعتمدة" | "قيد التدقيق الأرشيفي" | "معالجة جديدة";
  scanQuality: "أصلي عالي الدقة" | "مرمم رقمياً" | "معالج بالتباين" | "أصلي عالي الدقة (OCR مُدقق)";
  pageCount: number;
  physicalCondition: "ممتازة" | "جيدة (ترميم رقمي)" | "أوراق تاريخية هشة";
  isRestricted: boolean;
  paperlessVerified: boolean;
  auditLog: AuditLogEntry[];
  sampleImagePlaceholder?: string;
  historicalSealType?: "royal" | "falcon" | "customs" | "treasury";
  // Secure Vault attributes:
  cryptographicProof?: CryptographicProof;
  isVaultLocked?: boolean;
  requiredClearance?: SecurityClassification;
  // National Retention Lifecycle attributes (دورة حياة الحفظ وفق اللوائح الوطنية)
  retentionLifecycle?: DocumentRetentionLifecycle;
  // Sub-Warehouse & Direct TWAIN/WIA Ingestion Metadata (بيانات المستودع الفرعي والماسح الضوئي المباشر)
  subWarehouseOrigin?: SubWarehouseOriginInfo;
  scannerHardwareInfo?: ScannerHardwareMetadata;
}

// ============================================================================
// Sub-Warehouse & TWAIN / WIA Direct Hardware Scanning Types
// (المستودعات الفرعية والماسح الضوئي المباشر عبر بروتوكول TWAIN و WIA)
// ============================================================================

export type ScannerProtocol = "TWAIN" | "WIA" | "eSCL";
export type ScannerFeederType = "ADF_SIMPLEX" | "ADF_DUPLEX" | "FLATBED";
export type ScannerColorMode = "COLOR_24BIT" | "GRAYSCALE_8BIT" | "BW_1BIT";
export type ScannerResolutionDpi = 150 | 200 | 300 | 600 | 1200;
export type ScannerPageSize = "A4" | "Legal" | "A3" | "Letter" | "Custom";

export interface HardwareScannerDevice {
  id: string;
  name: string;
  model: string;
  vendor: string;
  protocol: ScannerProtocol;
  connectionType: "USB 3.0" | "Network LAN" | "Wi-Fi Direct";
  status: "online" | "busy" | "offline";
  driverVersion: string;
  driverFile: string; // e.g. "twain_32.dll", "wiaservc.dll", "libtwain.so"
  ipAddress?: string;
  isDefault: boolean;
  supportsDuplex: boolean;
  supportsAdf: boolean;
  supportsFlatbed: boolean;
  maxDpi: number;
  adfCapacity: number; // e.g. 50, 100 pages
  subWarehouseId: string;
  opticalSensor: string; // e.g. "Color CIS x2", "CCD 3-line sensor"
}

export interface SubWarehouseLocation {
  id: string;
  code: string; // e.g. "WH-TIP-01", "WH-BEN-02"
  name: string;
  city: string;
  region: "المنطقة الغربية" | "المنطقة الشرقية" | "المنطقة الجنوبية" | "المنطقة الوسطى";
  address: string;
  managerName: string;
  managerTitle: string;
  contactPhone: string;
  capacityBoxes: number;
  storedCount: number;
  activeScannersCount: number;
  ipSubnet: string;
  defaultScannerId?: string;
  halls: string[];
  notes?: string;
}

export interface SubWarehouseOriginInfo {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  city: string;
  hallName: string; // e.g. "قاعة المحفوظات رقم 2"
  rackNumber: string; // e.g. "رف 04-B"
  boxNumber: string; // e.g. "صندوق 118"
  operatorName: string;
  operatorBadge: string;
  archivedAtSubWarehouseTime: string;
}

export interface ScannerHardwareMetadata {
  scannerId: string;
  scannerName: string;
  vendor: string;
  protocol: ScannerProtocol;
  driverVersion: string;
  feederType: ScannerFeederType;
  resolutionDpi: ScannerResolutionDpi;
  colorMode: ScannerColorMode;
  pageSize: ScannerPageSize;
  autoDeskewApplied: boolean;
  ultrasonicDoubleFeedChecked: boolean;
  blankPageSkippedCount: number;
  holePunchRemoved: boolean;
  hardwareSessionId: string;
  scanDurationMs: number;
}

export interface TwainScanJobRequest {
  scannerId: string;
  protocol: ScannerProtocol;
  feederType: ScannerFeederType;
  dpi: ScannerResolutionDpi;
  colorMode: ScannerColorMode;
  pageSize: ScannerPageSize;
  pageCountToScan: number;
  autoDeskew: boolean;
  blankPageSkip: boolean;
  holePunchRemoval: boolean;
  ultrasonicMultiFeed: boolean;
  subWarehouseId: string;
  hallName: string;
  rackNumber: string;
  boxNumber: string;
}

export interface TwainScanJobResponse {
  success: boolean;
  jobId: string;
  scanner: HardwareScannerDevice;
  timestamp: string;
  pagesAcquired: number;
  pages: Array<{
    pageIndex: number;
    id: string;
    name: string;
    base64: string;
    dpi: number;
    width: number;
    height: number;
    sizeKb: number;
  }>;
  hardwareTelemetry: {
    protocol: ScannerProtocol;
    driverHandshakeLog: string[];
    ultrasonicSensorStatus: "normal" | "multi_feed_prevented" | "clear";
    deskewCorrectionAngle: number;
    scanDurationMs: number;
    blankPagesFiltered: number;
  };
  subWarehouse: SubWarehouseLocation;
  error?: string;
}

export type RetentionPolicyType =
  | "حفظ دائم سيادي (غير قابل للإتلاف)"
  | "حفظ مالي طويل الأجل (25 سنة)"
  | "حفظ مالي نظامي (10 سنوات)"
  | "حفظ دوري مؤقت (5 سنوات)";

export type RetentionLifecycleStatus =
  | "active" // سارية الحفظ
  | "expiring_soon" // تقترب من انتهاء دورة الحفظ (أقل من 90 يوماً)
  | "expired" // منتهية دورة الحفظ النظامية وتتطلب قراراً عاجلاً
  | "extended" // تم تمديد فترة الحفظ بقرار معتمد
  | "flagged_for_disposal" // مرحلة للجنة الإتلاف النظامي
  | "destroyed"; // تم إتلافها رسمياً بمحضر قانوني

export interface RetentionExtensionRecord {
  id: string;
  extensionYears: number; // 3, 5, 10, or 999 for permanent
  decisionNumber: string; // e.g. "ق.و.م/2026/88"
  justification: string;
  extendedBy: string;
  extendedAt: string;
  previousExpiryDate: string;
  newExpiryDate: string;
}

export interface RetentionDisposalRecord {
  id: string;
  committeeReference: string; // e.g. "م.ل.إ/2026/412"
  protocolDate: string;
  headOfCommittee: string;
  auditBureauRepresentative: string;
  destructionMethod: "إتلاف وتطهير رقمي مشفر (DoD 5220.22-M) وطحن مادي محكم" | "أرشفة صامتة مع إلغاء التداول المالي";
  legalAuthority: string;
  notes: string;
  certificateSha256: string;
}

export interface LegalOfficerContact {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  isPrimary: boolean;
  phone?: string;
  roleBadge: "legal_advisor" | "audit_bureau" | "disposal_committee_chair" | "field_inspector";
}

export interface LegalEmailAlertRecord {
  id: string;
  docId: string;
  docRef: string;
  docTitle: string;
  department: string;
  classification: SecurityClassification;
  urgencyLevel: "warning" | "urgent" | "critical";
  scheduledDisposalDate: string;
  daysRemaining: number;
  sentAt: string;
  recipients: string[];
  recipientDetails?: { name: string; email: string; title: string }[];
  subject: string;
  bodyHtml?: string;
  summaryText: string;
  legalBasis: string;
  deliveryStatus: "delivered" | "queued" | "failed";
  trackingCode: string;
  triggeredBy: string;
  legalReviewDeadline: string;
  reviewStatus: "pending_review" | "reviewed_extended" | "reviewed_approved_disposal" | "objected_stopped";
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface DocumentRetentionLifecycle {
  policyCategory: RetentionPolicyType;
  retentionYears: number; // 0 for permanent
  archivedDate: string; // ISO date e.g. "2016-04-10"
  expiryDate: string; // ISO date e.g. "2026-10-15"
  status: RetentionLifecycleStatus;
  daysUntilExpiry: number; // positive = days left, negative = days past expiry, Infinity = permanent
  legalBasis: string;
  extensions: RetentionExtensionRecord[];
  disposalRecord?: RetentionDisposalRecord;
  legalAlertsHistory?: LegalEmailAlertRecord[];
}

export interface IngestionStepStatus {
  step: number;
  name: string;
  desc: string;
  status: "pending" | "processing" | "completed" | "error";
  details?: string;
}

// Comfortable Reading Mode & Visual Accessibility (وضع القراءة المريح وإمكانية الوصول البصري)
export type ReadingContrastTheme = 
  | "parchment"          // مخطوطة أرشيفية دافئة (الافتراضي)
  | "sepia_eye_care"     // حماية العين - عنبري دافئ (مضاد للضوء الأزرق)
  | "night_velvet"       // الوضع الليلي المخملي (إضاءة منخفضة ومريحة)
  | "high_contrast"      // تدقيق عالي التباين (أبيض ناصع وحبر فاحم للأختام الباهتة)
  | "e_ink"              // ورق حبر إلكتروني غير لامع (رمادي مريح)
  | "yellow_on_black"    // أصفر فاقع على أسود فاحم (أعلى معايير الإتاحة البصرية للرؤية الضعيفة)
  | "high_contrast_dark"; // أبيض فاقع على أسود داكن

export type ReadingFontSize = "small" | "normal" | "medium" | "large" | "extra-large" | "huge";
export type ReadingLineSpacing = "compact" | "relaxed" | "spacious";
export type ReadingFontFamily = "amiri" | "cairo";

export interface ReadingModeSettings {
  isEnabled: boolean;
  theme: ReadingContrastTheme;
  fontSize: ReadingFontSize;
  lineSpacing: ReadingLineSpacing;
  fontFamily: ReadingFontFamily;
  dimSurroundings: boolean;
  // Visual Accessibility Options for Researchers
  highContrast?: boolean;
  highContrastType?: "black_on_white" | "yellow_on_black" | "white_on_black";
  boldText?: boolean;
  savedForUserId?: string;
  savedForUserName?: string;
  lastSavedAt?: string;
}

export interface OcrProcessingMetrics {
  wordCount: number;
  charCount: number;
  lineCount: number;
  confidence: number;
  detectedLanguage: string;
  engine: string;
}

export interface OcrImageFilters {
  filter: "normal" | "greyscale" | "high_contrast" | "binarized" | "sepia_parchment";
  brightness: number;
  contrast: number;
  rotation: number;
  zoom: number;
}

// ============================================================================
// Enterprise RBAC & User Management Types (نظام إدارة المستخدمين والصلاحيات)
// ============================================================================

export type PermissionId =
  // الوثائق والأرشفة
  | "documents:read"
  | "documents:create"
  | "documents:edit"
  | "documents:delete"
  | "documents:export_certified"
  | "documents:print_secure"
  // الخزينة الرقمية والتحصين السيادي
  | "vault:access"
  | "vault:lock_worm"
  | "vault:verify_integrity"
  | "vault:manage_keys"
  // التحقق الضوئي والفهرسة الذكية
  | "ocr:scan"
  | "ocr:verify"
  | "ocr:batch_tag"
  // دورة حياة الحفظ والإتلاف النظامي
  | "retention:view"
  | "retention:extend"
  | "retention:flag_disposal"
  | "retention:execute_disposal"
  // إدارة المستخدمين والصلاحيات
  | "users:read"
  | "users:create"
  | "users:edit"
  | "users:delete"
  | "users:reset_pwd"
  | "roles:manage"
  // سجلات التدقيق والامتثال
  | "audit:read"
  | "audit:export"
  // الهيكل التنظيمي لوزارة المالية
  | "org:read"
  | "org:manage"
  // محرك قاعدة البيانات
  | "database:view_status"
  | "database:switch_provider"
  | "database:export_sql";

export interface AppPermission {
  id: PermissionId;
  category: "الوثائق والأرشيف" | "الخزينة السيادية" | "الفهرسة والـ OCR" | "دورة حياة الحفظ" | "إدارة المستخدمين" | "الهيكل التنظيمي" | "الرقابة والتدقيق" | "قواعد البيانات";
  nameAr: string;
  description: string;
}

export type OrgUnitType = 
  | "ministry_hq"          // ديوان الوزارة والقيادة
  | "authority"            // مصلحة سيادية
  | "general_directorate"  // إدارة عامة
  | "department"           // إدارة فرعية / ديوان
  | "office"               // مكتب تخصصي
  | "section"              // قسم فني تنفيذي
  | "unit";                // وحدة تشغيلية

export interface OrgUnit {
  id: string;
  code: string;
  name: string;
  type: OrgUnitType;
  parentId?: string | null;
  parentName?: string;
  managerName: string;
  managerTitle: string;
  email?: string;
  phone?: string;
  location: string;
  description: string;
  classificationLevel: SecurityClassification;
  status: "active" | "inactive";
  orderIndex: number;
  usersCount?: number;
  documentsCount?: number;
  createdAt?: string;
  updatedAt?: string;
  children?: OrgUnit[];
}

export interface RoleDefinition {
  id: VaultRole;
  nameAr: string;
  nameEn: string;
  description: string;
  isSystem: boolean;
  badgeColor: string;
  permissions: PermissionId[];
}

export type UserAccountStatus = "active" | "suspended" | "pending_review";

export interface UserAccount extends VaultUser {
  username: string;
  email: string;
  fullName?: string;
  status: UserAccountStatus;
  permissions: PermissionId[];
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  phone?: string;
}

export interface SecurityAuditLogEntry {
  id: string;
  userId: string;
  username: string;
  action: string;
  targetType: string;
  targetId?: string;
  ipAddress: string;
  status: "SUCCESS" | "DENIED" | "FAILED";
  details: string;
  createdAt: string;
}

export interface DatabaseConfigInfo {
  currentEngine: "sqlite" | "postgresql";
  status: "connected" | "disconnected" | "error";
  sqlitePath: string;
  postgresConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
    ssl: boolean;
  };
  tableStats: {
    usersCount: number;
    rolesCount: number;
    permissionsCount: number;
    auditLogsCount: number;
    sessionsCount: number;
    orgUnitsCount?: number;
  };
  lastSwitchedAt?: string;
  errorMessage?: string;
}

export interface AuthSessionResponse {
  user: UserAccount;
  token: string;
  expiresIn: string;
  engine: "sqlite" | "postgresql";
}
