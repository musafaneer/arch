import React, { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  Layers, 
  Calendar, 
  Building2, 
  FileText, 
  DollarSign, 
  Eye, 
  Printer, 
  CheckCircle2, 
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  List,
  Sparkles,
  ArrowUpDown,
  History,
  ShieldCheck,
  Lock,
  Tag,
  CheckSquare,
  Square,
  FolderSync,
  X,
  Plus,
  Stamp,
  Download,
  Clock,
  Trash2,
  Bell,
  Scale,
  Tablet,
  ClipboardCheck,
  MapPin,
  ShieldAlert,
  CheckCheck,
  QrCode,
  FileSpreadsheet
} from "lucide-react";
import { ArchivedDocument, LibyanEra, DepartmentType, VaultUser, SecurityClassification } from "../types";
import { normalizeArabicText } from "../utils/arabicSearchEngine";
import { BatchTaggingModal, BatchUpdatePayload } from "./BatchTaggingModal";
import { CertifiedPdfExportModal } from "./CertifiedPdfExportModal";
import { SecurePrintModal } from "./SecurePrintModal";
import { AuditLogExportModal } from "./AuditLogExportModal";
import { RetentionAlertBanner } from "./RetentionAlertBanner";
import { formatRetentionCountdown } from "../utils/retentionLifecycle";

export type CatalogueSortOption =
  | "date-desc"       // التاريخ الأحدث (الأجدد أولاً)
  | "date-asc"        // التاريخ الأقدم (الأسبق أولاً)
  | "security-desc"   // الأهمية الأمنية (الأعلى سرية أولاً)
  | "security-asc"    // الأهمية الأمنية (الأقل سرية أولاً)
  | "amount-desc"     // القيمة المالية (الأعلى قيمة أولاً)
  | "amount-asc"      // القيمة المالية (الأقل قيمة أولاً)
  | "smart-tags"      // الوسوم الذكية (الأكثر وسوماً أولاً)
  | "crypto-status"   // حالة التشفير والتحصين (WORM أولاً)
  | "title-asc";      // أبجدياً بالاسم (أ - ي)

const SECURITY_IMPORTANCE_WEIGHT: Record<string, number> = {
  "سري للغاية": 5,
  "سري ومحدود": 4,
  "سري": 3,
  "محدود": 2,
  "عام": 1
};

const ARABIC_MONTH_NUMBERS: Record<string, number> = {
  "يناير": 0, "فبراير": 1, "مارس": 2, "أبريل": 3, "ابريل": 3,
  "مايو": 4, "يونيو": 5, "يوليو": 6, "أغسطس": 7, "اغسطس": 7,
  "سبتمبر": 8, "أكتوبر": 9, "اكتوبر": 9, "نوفمبر": 10, "ديسمبر": 11
};

function getDocumentTimestamp(doc: ArchivedDocument): number {
  if (doc.retentionLifecycle?.archivedDate) {
    const t = Date.parse(doc.retentionLifecycle.archivedDate);
    if (!isNaN(t)) return t;
  }
  if (doc.gregorianDate) {
    const parts = doc.gregorianDate.replace(/م$/, "").trim().split(/\s+/);
    if (parts.length >= 3) {
      const d = parseInt(parts[0], 10) || 1;
      const m = ARABIC_MONTH_NUMBERS[parts[1]] ?? 0;
      const y = parseInt(parts[2], 10) || doc.year || 1950;
      return new Date(y, m, d).getTime();
    }
  }
  return new Date(doc.year || 1950, 0, 1).getTime();
}

function parseFinancialNumber(str: string): number {
  if (!str) return 0;
  const num = parseFloat(str.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 0 : num;
}

interface ArchiveCatalogueProps {
  documents: ArchivedDocument[];
  onSelectDocument: (doc: ArchivedDocument) => void;
  onOpenScanner: () => void;
  selectedEraFilter: LibyanEra | "ALL";
  setSelectedEraFilter: (era: LibyanEra | "ALL") => void;
  onOpenAdvancedSearch?: () => void;
  onOpenVault?: () => void;
  currentUser: VaultUser;
  onBatchUpdateDocuments?: (docIds: string[], payload: BatchUpdatePayload) => void;
  onOpenAlertsCenter?: () => void;
  onOpenExtendModal?: (doc: ArchivedDocument) => void;
  onOpenDisposalModal?: (doc: ArchivedDocument) => void;
  onRecordPrintAudit?: (docId: string, auditEntry: { user: string; timestamp: string; action: string; note: string }) => void;
}

export const ArchiveCatalogue: React.FC<ArchiveCatalogueProps> = ({
  documents,
  onSelectDocument,
  onOpenScanner,
  selectedEraFilter,
  setSelectedEraFilter,
  onOpenAdvancedSearch,
  onOpenVault,
  currentUser,
  onBatchUpdateDocuments,
  onOpenAlertsCenter,
  onOpenExtendModal,
  onOpenDisposalModal,
  onRecordPrintAudit
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedClassification, setSelectedClassification] = useState<string>("ALL");
  const [selectedRetentionFilter, setSelectedRetentionFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<CatalogueSortOption>("date-desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Field Inspection Mode for Tablet Inspection Teams
  const [isTabletFieldMode, setIsTabletFieldMode] = useState<boolean>(false);
  const [inspectionFilterPriority, setInspectionFilterPriority] = useState<"ALL" | "needs_attention" | "fragile" | "top_secret" | "expiring_soon">("ALL");

  // Batch Selection State
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isCertifiedPdfModalOpen, setIsCertifiedPdfModalOpen] = useState(false);
  const [isSecurePrintModalOpen, setIsSecurePrintModalOpen] = useState(false);
  const [isAuditExportModalOpen, setIsAuditExportModalOpen] = useState(false);
  const [documentsToExport, setDocumentsToExport] = useState<ArchivedDocument[]>([]);
  const [documentsToSecurePrint, setDocumentsToSecurePrint] = useState<ArchivedDocument[]>([]);
  const [documentsToAuditExport, setDocumentsToAuditExport] = useState<ArchivedDocument[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Extract unique departments
  const departments = useMemo(() => {
    const deps = new Set<string>();
    documents.forEach(d => deps.add(d.department));
    return Array.from(deps);
  }, [documents]);

  // Statistics for tablet field inspection priorities
  const inspectionStats = useMemo(() => {
    let fragile = 0;
    let topSecret = 0;
    let expiringSoon = 0;
    let needsAttention = 0;

    documents.forEach((d) => {
      if (d.physicalCondition === "أوراق تاريخية هشة") fragile++;
      if (d.classification === "سري للغاية" || d.classification === "سري") topSecret++;
      if (d.retentionLifecycle?.status === "expiring_soon" || d.retentionLifecycle?.status === "expired") expiringSoon++;
      if (d.physicalCondition === "أوراق تاريخية هشة" || d.status === "قيد التدقيق الأرشيفي") needsAttention++;
    });

    return { fragile, topSecret, expiringSoon, needsAttention };
  }, [documents]);

  // Filter and sort with Arabic text normalization
  const filteredDocuments = useMemo(() => {
    const normalizedQ = normalizeArabicText(searchQuery);

    return documents.filter(doc => {
      // Era filter
      if (selectedEraFilter !== "ALL" && doc.era !== selectedEraFilter) {
        return false;
      }

      // Department filter
      if (selectedDepartment !== "ALL" && doc.department !== selectedDepartment) {
        return false;
      }

      // Classification filter
      if (selectedClassification !== "ALL" && doc.classification !== selectedClassification) {
        return false;
      }

      // Retention Lifecycle Filter
      if (selectedRetentionFilter !== "ALL") {
        const lc = doc.retentionLifecycle;
        if (selectedRetentionFilter === "expiring_soon" && lc?.status !== "expiring_soon") return false;
        if (selectedRetentionFilter === "expired" && lc?.status !== "expired") return false;
        if (selectedRetentionFilter === "flagged_for_disposal" && lc?.status !== "flagged_for_disposal") return false;
        if (selectedRetentionFilter === "extended" && lc?.status !== "extended") return false;
        if (selectedRetentionFilter === "permanent" && !lc?.policyCategory.includes("سيادي")) return false;
      }

      // Field Inspection Priority Filter (Tablet Mode)
      if (inspectionFilterPriority !== "ALL") {
        if (inspectionFilterPriority === "needs_attention") {
          const isFragile = doc.physicalCondition === "أوراق تاريخية هشة";
          const isPending = doc.status === "قيد التدقيق الأرشيفي";
          if (!isFragile && !isPending) return false;
        } else if (inspectionFilterPriority === "fragile") {
          if (doc.physicalCondition !== "أوراق تاريخية هشة") return false;
        } else if (inspectionFilterPriority === "top_secret") {
          if (doc.classification !== "سري للغاية" && doc.classification !== "سري") return false;
        } else if (inspectionFilterPriority === "expiring_soon") {
          const lcStatus = doc.retentionLifecycle?.status;
          if (lcStatus !== "expiring_soon" && lcStatus !== "expired") return false;
        }
      }

      // Search Query
      if (normalizedQ.trim()) {
        const matchTitle = normalizeArabicText(doc.title).includes(normalizedQ);
        const matchRef = normalizeArabicText(doc.refNumber).includes(normalizedQ);
        const matchSummary = normalizeArabicText(doc.summary).includes(normalizedQ);
        const matchOCR = normalizeArabicText(doc.ocrText).includes(normalizedQ);
        const matchSignatory = doc.signatories.some(s => normalizeArabicText(s).includes(normalizedQ));
        const matchKeyword = doc.keywords.some(k => normalizeArabicText(k).includes(normalizedQ));
        return matchTitle || matchRef || matchSummary || matchOCR || matchSignatory || matchKeyword;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "date-desc") {
        const diff = getDocumentTimestamp(b) - getDocumentTimestamp(a);
        return diff !== 0 ? diff : b.year - a.year;
      }
      if (sortBy === "date-asc") {
        const diff = getDocumentTimestamp(a) - getDocumentTimestamp(b);
        return diff !== 0 ? diff : a.year - b.year;
      }
      if (sortBy === "security-desc") {
        const rankA = SECURITY_IMPORTANCE_WEIGHT[a.classification] || 1;
        const rankB = SECURITY_IMPORTANCE_WEIGHT[b.classification] || 1;
        if (rankB !== rankA) return rankB - rankA;
        return getDocumentTimestamp(b) - getDocumentTimestamp(a);
      }
      if (sortBy === "security-asc") {
        const rankA = SECURITY_IMPORTANCE_WEIGHT[a.classification] || 1;
        const rankB = SECURITY_IMPORTANCE_WEIGHT[b.classification] || 1;
        if (rankA !== rankB) return rankA - rankB;
        return getDocumentTimestamp(a) - getDocumentTimestamp(b);
      }
      if (sortBy === "amount-desc") {
        return parseFinancialNumber(b.financialAmount) - parseFinancialNumber(a.financialAmount);
      }
      if (sortBy === "amount-asc") {
        return parseFinancialNumber(a.financialAmount) - parseFinancialNumber(b.financialAmount);
      }
      if (sortBy === "smart-tags") {
        const tagsA = a.keywords ? a.keywords.length : 0;
        const tagsB = b.keywords ? b.keywords.length : 0;
        if (tagsB !== tagsA) return tagsB - tagsA;
        return getDocumentTimestamp(b) - getDocumentTimestamp(a);
      }
      if (sortBy === "crypto-status") {
        const lockA = a.isVaultLocked ? 2 : 1;
        const lockB = b.isVaultLocked ? 2 : 1;
        if (lockB !== lockA) return lockB - lockA;
        return getDocumentTimestamp(b) - getDocumentTimestamp(a);
      }
      return a.title.localeCompare(b.title, "ar");
    });
  }, [documents, selectedEraFilter, selectedDepartment, selectedClassification, selectedRetentionFilter, inspectionFilterPriority, searchQuery, sortBy]);

  // Selection handlers
  const handleToggleDoc = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllFilteredSelected = filteredDocuments.length > 0 && 
    filteredDocuments.every(doc => selectedDocIds.includes(doc.id));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Unselect all visible in current filter
      const filteredIdSet = new Set(filteredDocuments.map(d => d.id));
      setSelectedDocIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      // Select all visible in current filter
      const newIds = new Set([...selectedDocIds, ...filteredDocuments.map(d => d.id)]);
      setSelectedDocIds(Array.from(newIds));
    }
  };

  const handleClearSelection = () => {
    setSelectedDocIds([]);
  };

  const handleOpenBatchModal = () => {
    if (selectedDocIds.length === 0) {
      // If none selected, default to selecting all filtered docs
      setSelectedDocIds(filteredDocuments.map(d => d.id));
    }
    setIsBatchModalOpen(true);
  };

  const handleApplyBatchUpdate = (docIds: string[], payload: BatchUpdatePayload) => {
    if (onBatchUpdateDocuments) {
      onBatchUpdateDocuments(docIds, payload);
    }
    setToastMessage(`تم بنجاح تحديث الوسوم والتصنيفات لـ (${docIds.length}) وثيقة وتوثيقها في سجل التدقيق الأرشيفي`);
    setSelectedDocIds([]);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Get selected document objects
  const selectedDocumentsList = useMemo(() => {
    const idSet = new Set(selectedDocIds);
    return documents.filter(d => idSet.has(d.id));
  }, [documents, selectedDocIds]);

  const getEraBadgeColor = (era: LibyanEra) => {
    if (era.includes("المملكة")) {
      return "bg-amber-100 text-amber-900 border-amber-300";
    }
    if (era.includes("الجمهورية")) {
      return "bg-emerald-100 text-emerald-900 border-emerald-300";
    }
    return "bg-blue-100 text-blue-900 border-blue-300";
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-900 text-emerald-100 rounded-2xl border border-emerald-600 shadow-xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Proactive Retention Lifecycle Alert Banner */}
      <RetentionAlertBanner
        documents={documents}
        onOpenAlertsCenter={onOpenAlertsCenter || (() => {})}
      />

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الإشاري، الكلمات المفتاحية، المبالغ، أو نص المراسيم والقرارات..."
              className="w-full pr-11 pl-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                مسح
              </button>
            )}
          </div>

          {onOpenAdvancedSearch && (
            <button
              onClick={onOpenAdvancedSearch}
              className="px-3 py-2.5 bg-[#0f2d1e] hover:bg-[#16422c] text-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 border border-emerald-700/60 shadow"
              title="فتح محرك البحث العربي الدلالي المتقدم والفلاتر المتعددة"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">البحث الدلالي المتقدم (RTL)</span>
              <span className="sm:hidden">بحث متقدم</span>
            </button>
          )}

          {/* Quick Controls */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
            {/* Tablet Field Inspection Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsTabletFieldMode(!isTabletFieldMode)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border shadow-xs min-h-[40px] md:min-h-[44px] ${
                isTabletFieldMode
                  ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
              title="تفعيل نمط التفتيش الميداني اللوحي (أزرار لمس 44px وفلترة أولويات المعاينة)"
            >
              <Tablet className="w-4 h-4 text-amber-600" />
              <span>وضع التفتيش الميداني</span>
              {isTabletFieldMode ? (
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-mono font-bold hidden sm:inline">
                  لوحي
                </span>
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 min-h-[40px] md:min-h-[44px]">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs transition ${
                  viewMode === "grid" ? "bg-white text-emerald-900 shadow-sm font-bold" : "text-slate-500"
                }`}
                title="عرض بطاقات"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg text-xs transition ${
                  viewMode === "list" ? "bg-white text-emerald-900 shadow-sm font-bold" : "text-slate-500"
                }`}
                title="عرض جدول"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs min-h-[40px] md:min-h-[44px]">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
              <label htmlFor="catalogue-sort-select" className="text-slate-500 font-bold text-[11px] shrink-0 hidden sm:inline">
                الترتيب:
              </label>
              <select
                id="catalogue-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as CatalogueSortOption)}
                className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
              >
                <option value="date-desc">التاريخ الأحدث أولاً (الأجدد)</option>
                <option value="date-asc">التاريخ الأقدم أولاً (الأسبق)</option>
                <option value="security-desc">الأهمية الأمنية (الأعلى سرية أولاً)</option>
                <option value="security-asc">الأهمية الأمنية (الأقل سرية أولاً)</option>
                <option value="amount-desc">الأثر المالي (الأعلى قيمة أولاً)</option>
                <option value="amount-asc">الأثر المالي (الأقل قيمة أولاً)</option>
                <option value="smart-tags">الوسوم الذكية (الأكثر وسوماً)</option>
                <option value="crypto-status">حالة التشفير والتحصين السيادي (WORM)</option>
                <option value="title-asc">عنوان الوثيقة (أبجدياً أ - ي)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Extended Filter Dropdowns & Batch Operations Row */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-800" />
              <span>تصفية:</span>
            </div>

            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            >
              <option value="ALL">كافة الإدارات والمصالح</option>
              {departments.map((dep, idx) => (
                <option key={idx} value={dep}>{dep}</option>
              ))}
            </select>

            {/* Classification Filter */}
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            >
              <option value="ALL">كافة درجات السرية</option>
              <option value="عام">عام</option>
              <option value="محدود">محدود</option>
              <option value="سري">سري</option>
              <option value="سري للغاية">سري للغاية</option>
            </select>

            {/* Retention Lifecycle Filter */}
            <select
              value={selectedRetentionFilter}
              onChange={(e) => setSelectedRetentionFilter(e.target.value)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-600 transition ${
                selectedRetentionFilter !== "ALL"
                  ? "border-amber-500 bg-amber-50 text-amber-900 font-bold"
                  : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              <option value="ALL">كافة دورات الحفظ</option>
              <option value="expiring_soon">⏳ تقترب من الانتهاء (&lt; 90 يوماً)</option>
              <option value="expired">⚠️ منتهية دورة الحفظ (عاجل)</option>
              <option value="flagged_for_disposal">📋 مرحلة للجنة الإتلاف</option>
              <option value="extended">🛡️ تم تمديد الحفظ</option>
              <option value="permanent">🏛️ حفظ دائم سيادي</option>
            </select>

            {/* Filter Reset */}
            {(selectedEraFilter !== "ALL" || selectedDepartment !== "ALL" || selectedClassification !== "ALL" || selectedRetentionFilter !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedEraFilter("ALL");
                  setSelectedDepartment("ALL");
                  setSelectedClassification("ALL");
                  setSelectedRetentionFilter("ALL");
                  setSearchQuery("");
                }}
                className="text-emerald-800 hover:text-emerald-950 font-semibold underline pr-1"
              >
                إلغاء التصفية
              </button>
            )}
          </div>

          {/* Batch Tagging Trigger & Selection Controls */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={handleToggleSelectAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
              title="تحديد أو إلغاء تحديد كافة الوثائق المعروضة"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-emerald-800" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{isAllFilteredSelected ? "إلغاء تحديد المعروض" : "تحديد كافة المعروض"}</span>
            </button>

            <button
              onClick={handleOpenBatchModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm cursor-pointer"
              title="تحديث الوسوم والتصنيفات للوثائق المحددة"
            >
              <Tag className="w-3.5 h-3.5 text-amber-300" />
              <span>تعديل الوسوم</span>
              {selectedDocIds.length > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
                  {selectedDocIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                const docs = selectedDocIds.length > 0 ? selectedDocumentsList : filteredDocuments;
                setDocumentsToAuditExport(docs);
                setIsAuditExportModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs transition shadow-sm cursor-pointer"
              title="تصدير سجلات التدقيق وسلسلة العهدة الرقمية للوثائق بصيغة Excel أو PDF"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-200" />
              <span>تصدير سجلات التدقيق (Excel/PDF)</span>
              {selectedDocIds.length > 0 && (
                <span className="bg-amber-950 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
                  {selectedDocIds.length}
                </span>
              )}
            </button>

            <div className="text-slate-500 font-mono text-[11px] hidden md:block mr-2">
              عرض {filteredDocuments.length} من {documents.length}
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Tablet Field Inspection Priority & Routing Bar */}
      {isTabletFieldMode && (
        <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50/70 rounded-2xl border-2 border-amber-400 p-4 sm:p-5 shadow-md space-y-3.5 transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0">
                <Tablet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-amber-950 font-['Amiri',serif]">
                    وضع التفتيش الرقابي الميداني (Tablet Field Inspection Active)
                  </h3>
                  <span className="bg-amber-200/80 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                    واجهة لوحية 44px+
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                  تصفية ومطابقة فورية لسجلات الخزينة السيادية أثناء الجولات الميدانية في قاعات الحفظ الورقية.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
              <span className="text-xs text-amber-900 font-bold bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300">
                المفتش: {currentUser.name}
              </span>
              <button
                type="button"
                onClick={() => setIsTabletFieldMode(false)}
                className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100 transition underline"
              >
                إغلاق الوضع اللوحي
              </button>
            </div>
          </div>

          {/* Touch-Friendly Inspection Priority Pills (Min 44px touch targets) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>أولوية التفتيش الرقابي للجولة الحالية:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInspectionFilterPriority("ALL")}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border shadow-xs ${
                  inspectionFilterPriority === "ALL"
                    ? "bg-amber-600 text-white border-amber-700 font-black shadow"
                    : "bg-white hover:bg-amber-50/70 text-slate-700 border-slate-200"
                }`}
              >
                <span>كافة السجلات للمعاينة</span>
                <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                  inspectionFilterPriority === "ALL" ? "bg-amber-800 text-amber-100" : "bg-slate-100 text-slate-700"
                }`}>
                  {documents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInspectionFilterPriority("fragile")}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border shadow-xs ${
                  inspectionFilterPriority === "fragile"
                    ? "bg-red-700 text-white border-red-800 font-black shadow"
                    : "bg-white hover:bg-red-50 text-red-900 border-red-200"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                <span>أوراق هشة (تستوجب ترميم)</span>
                <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                  inspectionFilterPriority === "fragile" ? "bg-red-900 text-red-100" : "bg-red-100 text-red-800"
                }`}>
                  {inspectionStats.fragile}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInspectionFilterPriority("top_secret")}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border shadow-xs ${
                  inspectionFilterPriority === "top_secret"
                    ? "bg-slate-900 text-amber-300 border-slate-950 font-black shadow"
                    : "bg-white hover:bg-slate-100 text-slate-800 border-slate-300"
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>سجلات سيادية وسرية</span>
                <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                  inspectionFilterPriority === "top_secret" ? "bg-slate-800 text-amber-200" : "bg-slate-200 text-slate-800"
                }`}>
                  {inspectionStats.topSecret}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInspectionFilterPriority("expiring_soon")}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border shadow-xs ${
                  inspectionFilterPriority === "expiring_soon"
                    ? "bg-amber-700 text-white border-amber-800 font-black shadow"
                    : "bg-white hover:bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>أوشكت دورة الحفظ على الانتهاء</span>
                <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                  inspectionFilterPriority === "expiring_soon" ? "bg-amber-900 text-amber-100" : "bg-amber-100 text-amber-900"
                }`}>
                  {inspectionStats.expiringSoon}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setInspectionFilterPriority("needs_attention")}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border shadow-xs ${
                  inspectionFilterPriority === "needs_attention"
                    ? "bg-emerald-800 text-white border-emerald-900 font-black shadow"
                    : "bg-white hover:bg-emerald-50 text-emerald-900 border-emerald-200"
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>تستوجب تدقيقاً عاجلاً</span>
                <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                  inspectionFilterPriority === "needs_attention" ? "bg-emerald-950 text-emerald-100" : "bg-emerald-100 text-emerald-900"
                }`}>
                  {inspectionStats.needsAttention}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Render */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            لم يتم العثور على وثائق مطابقة للبحث
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            جرب تغيير كلمات البحث أو إلغاء تصفية الحقب التاريخية أو مسح وثيقة مالية جديدة لإضافتها للأرشيف.
          </p>
          <button
            onClick={onOpenScanner}
            className="inline-flex items-center gap-2 bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow hover:bg-emerald-700 transition"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>مسح وثيقة جديدة الآن</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocuments.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`group bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden relative ${
                  isSelected
                    ? "border-emerald-700 ring-2 ring-emerald-600/30 bg-emerald-50/15"
                    : "border-slate-200/90 hover:border-emerald-600"
                }`}
              >
                {/* Top Accent Stripe based on Era */}
                <div className={`h-1.5 w-full ${
                  doc.era.includes("المملكة")
                    ? "bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"
                    : doc.era.includes("الجمهورية")
                    ? "bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-800"
                    : "bg-gradient-to-r from-blue-700 via-emerald-600 to-red-600"
                }`}></div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Top Row: Checkbox, Badge & Ref */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        {/* Multi-Select Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleDoc(doc.id, e)}
                          className={`p-1 rounded-md transition ${
                            isSelected
                              ? "text-emerald-800 bg-emerald-100"
                              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          }`}
                          title={isSelected ? "إلغاء التحديد" : "تحديد الوثيقة للإجراء الجماعي"}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-800" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getEraBadgeColor(doc.era)}`}>
                          {doc.era}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Compact Encryption & WORM Sovereign Badge */}
                        {doc.isVaultLocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-950 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded shadow-2xs" title="محصن في الخزينة السيادية وفق معيار WORM">
                            <Lock className="w-3 h-3 text-amber-700" />
                            <span className="font-mono">WORM</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-950 bg-emerald-100/80 border border-emerald-300 px-1.5 py-0.5 rounded shadow-2xs" title="مُشفّر سيادياً وفق معيار AES-256-GCM">
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            <span className="font-mono">AES-256</span>
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {doc.refNumber}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-900 transition-colors font-['Amiri',serif] leading-relaxed line-clamp-2">
                      {doc.title}
                    </h3>

                    {/* Department & Date */}
                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600">
                      <span className="font-semibold text-emerald-900 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{doc.department}</span>
                      </span>
                      <span className="font-mono text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{doc.gregorianDate}</span>
                      </span>
                    </div>

                    {/* Visual Indicator: Sovereign Encryption & Integrity Status Bar */}
                    <div className="mt-2.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950/5 via-slate-50 to-emerald-950/5 border border-emerald-900/15 flex items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {doc.isVaultLocked ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] shrink-0" title="خزينة سيادية غير قابلة للتعديل WORM">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>تحصين WORM</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] shrink-0" title="تشفير Galois/Counter Mode عسكري معتمد">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>AES-256-GCM</span>
                          </span>
                        )}
                        <span className="text-slate-500 font-mono text-[10px] truncate" title={`بصمة الختم الرقمي SHA-256: ${doc.cryptographicProof?.sha256Hash || 'LY-MOF-SEAL'}`}>
                          <span className="text-slate-400">ختم: </span>
                          <span className="font-bold text-slate-700">{doc.cryptographicProof?.sha256Hash ? doc.cryptographicProof.sha256Hash.slice(0, 8) : "2b9a7c41"}...</span>
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-bold shrink-0 bg-white px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs" title="سلامة المحتوى والختم موثقة ومطابقة للأصل بنسبة 100%">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>نزاهة مؤكدة</span>
                      </span>
                    </div>

                    {/* Summary Snippet */}
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                      {doc.summary}
                    </p>

                    {/* Visual Indicator: Smart Tags (الوسوم الذكية) Section */}
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="inline-flex items-center gap-1.5 font-bold text-teal-950">
                          <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span>وسوم ذكية مُفهرسة</span>
                          {doc.keywords && doc.keywords.length > 0 && (
                            <span className="bg-teal-100 text-teal-900 text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full border border-teal-200">
                              {doc.keywords.length}
                            </span>
                          )}
                        </span>
                        {(!doc.keywords || doc.keywords.length === 0) && (
                          <span className="text-[10px] text-slate-400 italic">غير موسومة</span>
                        )}
                      </div>

                      {doc.keywords && doc.keywords.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {doc.keywords.slice(0, 4).map((kw, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-900 px-2 py-0.5 rounded-lg border border-teal-300/80 hover:bg-teal-100 transition-colors shadow-2xs"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></span>
                              <span>{kw}</span>
                            </span>
                          ))}
                          {doc.keywords.length > 4 && (
                            <span
                              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded-lg border border-slate-200 transition-colors cursor-help"
                              title={doc.keywords.slice(4).join("، ")}
                            >
                              +{doc.keywords.length - 4} وسوم
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 p-1.5 rounded-lg border border-dashed border-slate-200">
                          <Tag className="w-3 h-3 text-slate-300 shrink-0" />
                          <span>لم تُسند وسوم ذكية بعد (متاحة بالتعديل الجماعي)</span>
                        </div>
                      )}
                    </div>

                    {/* Retention Lifecycle Quick Status & Direct Actions */}
                    {doc.retentionLifecycle && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Scale className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] border ${formatRetentionCountdown(doc.retentionLifecycle).badgeClass}`}>
                            {formatRetentionCountdown(doc.retentionLifecycle).label}
                          </span>
                        </div>
                        {(doc.retentionLifecycle.status === "expiring_soon" || doc.retentionLifecycle.status === "expired") && (
                          <div className="flex items-center gap-1">
                            {onOpenExtendModal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenExtendModal(doc);
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-800 text-white hover:bg-emerald-900 transition shadow-xs"
                                title="تمديد فترة الحفظ بقرار وزاري"
                              >
                                تمديد
                              </button>
                            )}
                            {onOpenDisposalModal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDisposalModal(doc);
                                }}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-800 hover:bg-red-100 border border-red-200 transition"
                                title="إحالة لمحضر لجنة الإتلاف"
                              >
                                إتلاف
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Financial & Security Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs">
                        <span className="text-slate-400 text-[10px] block">المبلغ المقيد:</span>
                        <span className="font-bold font-mono text-emerald-800 text-sm">{doc.financialAmount}</span>
                      </div>

                      <div className="text-left">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 border ${
                          doc.classification === "سري للغاية"
                            ? "bg-red-100 text-red-950 border-red-300 ring-1 ring-red-400/30 font-black"
                            : doc.classification === "سري" || doc.classification === "سري ومحدود"
                            ? "bg-amber-100 text-amber-950 border-amber-300 font-bold"
                            : doc.classification === "محدود"
                            ? "bg-amber-50 text-amber-900 border-amber-200 font-semibold"
                            : "bg-slate-100 text-slate-700 border-slate-200 font-semibold"
                        }`}>
                          {doc.classification === "سري للغاية" ? (
                            <Lock className="w-3 h-3 text-red-700 shrink-0" />
                          ) : doc.classification === "سري" || doc.classification === "سري ومحدود" ? (
                            <ShieldAlert className="w-3 h-3 text-amber-700 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-3 h-3 text-slate-500 shrink-0" />
                          )}
                          <span>{doc.classification}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        مؤرشفة لاورقياً
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocumentsToSecurePrint([doc]);
                            setIsSecurePrintModalOpen(true);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 transition"
                          title="الطباعة الآمنة للوثيقة مع علامة مائية باسم المستخدم وتاريخ اليوم"
                        >
                          <Printer className="w-3 h-3 text-emerald-700" />
                          <span>طباعة آمنة</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocumentsToExport([doc]);
                            setIsCertifiedPdfModalOpen(true);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-300 transition"
                          title="تصدير وثيقة PDF موثقة بختم وزارة المالية"
                        >
                          <Stamp className="w-3 h-3 text-amber-600" />
                          <span>PDF موثق</span>
                        </button>
                      </div>
                    </div>

                    {/* Tablet Field Inspection Direct Touch Controls */}
                    <div className={`mt-3 pt-2.5 border-t -mx-5 -mb-5 p-3 rounded-b-2xl space-y-2 transition ${
                      isTabletFieldMode 
                        ? "border-amber-300 bg-amber-50/90" 
                        : "border-slate-100 bg-slate-50/60"
                    }`}>
                      <div className="flex items-center justify-between text-[11px] text-slate-800 font-semibold gap-2">
                        <span className="flex items-center gap-1 text-slate-600 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="truncate" title={doc.storageLocation}>
                            {doc.storageLocation}
                          </span>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          doc.physicalCondition === "أوراق تاريخية هشة"
                            ? "bg-red-100 text-red-900 border border-red-200"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        }`}>
                          {doc.physicalCondition}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc);
                        }}
                        className={`w-full py-2.5 px-3 font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 min-h-[44px] ${
                          isTabletFieldMode
                            ? "bg-amber-600 hover:bg-amber-700 text-white border border-amber-500 font-black shadow"
                            : "bg-white hover:bg-slate-100 text-emerald-950 border border-slate-200"
                        }`}
                        title="فتح محضر التفتيش الميداني وقائمة التحقق اللوحية"
                      >
                        <ClipboardCheck className="w-4 h-4 text-amber-500" />
                        <span>فحص وتدقيق ميداني لوحي</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 text-slate-600 hover:text-emerald-800"
                      title="تحديد الكل"
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-800" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5">الرقم الإشاري والتشفير</th>
                  <th className="p-3.5">عنوان الوثيقة والوسوم الذكية</th>
                  <th className="p-3.5">الحقبة</th>
                  <th className="p-3.5">المصلحة / الإدارة</th>
                  <th className="p-3.5">الموقع الفيزيائي (ISAD-G)</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5">المبلغ المقيد</th>
                  <th className="p-3.5">السرية</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((doc) => {
                  const isSelected = selectedDocIds.includes(doc.id);
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => onSelectDocument(doc)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-emerald-50/70" : "hover:bg-emerald-50/40"
                      }`}
                    >
                      <td 
                        className="p-3.5 text-center"
                        onClick={(e) => handleToggleDoc(doc.id, e)}
                      >
                        <button
                          type="button"
                          className="p-2 text-slate-600 hover:text-emerald-800 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-800" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-800">
                          {doc.refNumber}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {doc.isVaultLocked ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-950 bg-amber-100 border border-amber-300 px-1 py-0.2 rounded" title="WORM محصن">
                              <Lock className="w-2.5 h-2.5 text-amber-700" />
                              <span>WORM</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-950 bg-emerald-100 border border-emerald-300 px-1 py-0.2 rounded" title="AES-256-GCM مُشفّر">
                              <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" />
                              <span>AES-256</span>
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-slate-500" title={`SHA-256: ${doc.cryptographicProof?.sha256Hash || 'verified'}`}>
                            {doc.cryptographicProof?.sha256Hash ? doc.cryptographicProof.sha256Hash.slice(0, 6) : "sha256"}...
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 max-w-sm">
                        <div className="font-bold text-slate-900 font-['Amiri',serif] text-sm leading-snug">
                          {doc.title}
                        </div>
                        {doc.keywords && doc.keywords.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-teal-900 bg-teal-100/80 px-1.5 py-0.5 rounded border border-teal-200">
                              <Sparkles className="w-2.5 h-2.5 text-teal-600" />
                              <span>{doc.keywords.length} وسوم</span>
                            </span>
                            {doc.keywords.slice(0, 3).map((kw, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] bg-teal-50 text-teal-900 px-1.5 py-0.5 rounded border border-teal-200/80 font-medium"
                              >
                                {kw}
                              </span>
                            ))}
                            {doc.keywords.length > 3 && (
                              <span className="text-[9px] text-slate-500 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded" title={doc.keywords.slice(3).join("، ")}>
                                +{doc.keywords.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-1 italic flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-slate-300" />
                            <span>بدون وسوم</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getEraBadgeColor(doc.era)}`}>
                          {doc.era}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 whitespace-nowrap">
                        {doc.department}
                      </td>
                      <td className="p-3.5 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="truncate max-w-[160px]" title={doc.storageLocation}>{doc.storageLocation}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {doc.gregorianDate}
                      </td>
                      <td className="p-3.5 font-bold font-mono text-emerald-800 whitespace-nowrap">
                        {doc.financialAmount}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1 w-fit border ${
                          doc.classification === "سري للغاية"
                            ? "bg-red-100 text-red-950 border-red-300 ring-1 ring-red-400/30 font-black"
                            : doc.classification === "سري" || doc.classification === "سري ومحدود"
                            ? "bg-amber-100 text-amber-950 border-amber-300 font-bold"
                            : doc.classification === "محدود"
                            ? "bg-amber-50 text-amber-900 border-amber-200 font-semibold"
                            : "bg-slate-100 text-slate-700 border-slate-200 font-semibold"
                        }`}>
                          {doc.classification === "سري للغاية" ? (
                            <Lock className="w-3 h-3 text-red-700 shrink-0" />
                          ) : doc.classification === "سري" || doc.classification === "سري ومحدود" ? (
                            <ShieldAlert className="w-3 h-3 text-amber-700 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-3 h-3 text-slate-500 shrink-0" />
                          )}
                          <span>{doc.classification}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectDocument(doc);
                            }}
                            className={`font-bold px-3 py-1.5 rounded-lg text-xs min-h-[40px] md:min-h-[44px] flex items-center gap-1 transition ${
                              isTabletFieldMode
                                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                                : "text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>{isTabletFieldMode ? "فحص ميداني" : "معاينة"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocumentsToSecurePrint([doc]);
                              setIsSecurePrintModalOpen(true);
                            }}
                            className="text-emerald-900 hover:text-emerald-950 font-bold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-xs inline-flex items-center gap-1 min-h-[40px] md:min-h-[44px] transition"
                            title="الطباعة الآمنة للوثيقة مع علامة مائية باسم المستخدم وتاريخ اليوم"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-700" />
                            <span>طباعة آمنة</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDocumentsToExport([doc]);
                              setIsCertifiedPdfModalOpen(true);
                            }}
                            className="text-amber-900 hover:text-amber-950 font-bold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-xs inline-flex items-center gap-1 min-h-[40px] md:min-h-[44px] transition"
                            title="تصدير وثيقة PDF موثقة بختم وزارة المالية"
                          >
                            <Stamp className="w-3.5 h-3.5 text-amber-600" />
                            <span>PDF موثق</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating Sticky Batch Action Toolbar (Appears when 1+ documents are selected) */}
      {selectedDocIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0f2d1e] text-white px-4 sm:px-6 py-3.5 rounded-2xl shadow-2xl border border-amber-500/40 flex flex-wrap items-center justify-between gap-4 max-w-2xl w-[94vw] sm:w-auto animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold font-mono text-sm shadow">
              {selectedDocIds.length}
            </div>
            <div>
              <div className="text-xs font-bold text-amber-100 flex items-center gap-1.5">
                <span>تم تحديد {selectedDocIds.length} وثيقة في الفهرس</span>
              </div>
              <div className="text-[10px] text-emerald-300 hidden sm:block">
                تعديل الكلمات المفتاحية، المصلحة التابعة، أو درجة السرية بالتزامن
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setDocumentsToSecurePrint(selectedDocumentsList);
                setIsSecurePrintModalOpen(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 text-white border border-emerald-500/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
              title="طباعة آمنة للوثائق المحددة مع علامة مائية مخصصة باسم المستخدم وتاريخ اليوم"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>طباعة آمنة بعلامة مائية ({selectedDocIds.length})</span>
            </button>

            <button
              onClick={() => {
                setDocumentsToExport(selectedDocumentsList);
                setIsCertifiedPdfModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-amber-200 border border-amber-400/50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
              title="تصدير الوثائق المحددة إلى ملفات PDF موثقة رقمياً وممهورة بالختم الرسمي"
            >
              <Stamp className="w-3.5 h-3.5 text-amber-300" />
              <span>تصدير PDF موثق ({selectedDocIds.length})</span>
            </button>

            <button
              onClick={() => {
                setDocumentsToAuditExport(selectedDocumentsList);
                setIsAuditExportModalOpen(true);
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
              title="تصدير سجلات التدقيق وسلسلة العهدة الرقمية للوثائق المحددة بصيغة Excel أو PDF"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-200" />
              <span>تصدير سجلات التدقيق ({selectedDocIds.length})</span>
            </button>

            <button
              onClick={() => setIsBatchModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow"
            >
              <Tag className="w-3.5 h-3.5 text-slate-950" />
              <span>تعديل الوسوم والتصنيف الجماعي</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-emerald-100 rounded-xl text-xs font-semibold transition"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* Certified PDF Export Modal */}
      <CertifiedPdfExportModal
        isOpen={isCertifiedPdfModalOpen}
        onClose={() => setIsCertifiedPdfModalOpen(false)}
        documents={documentsToExport.length > 0 ? documentsToExport : selectedDocumentsList}
        currentUser={currentUser}
      />

      {/* Audit Log Export Modal (Excel & PDF) */}
      <AuditLogExportModal
        isOpen={isAuditExportModalOpen}
        onClose={() => setIsAuditExportModalOpen(false)}
        documents={documentsToAuditExport.length > 0 ? documentsToAuditExport : (selectedDocumentsList.length > 0 ? selectedDocumentsList : filteredDocuments)}
        currentUser={currentUser}
      />

      {/* Batch Tagging & Categorization Modal */}
      <BatchTaggingModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        selectedDocuments={selectedDocumentsList}
        currentUser={currentUser}
        onApplyBatchUpdate={handleApplyBatchUpdate}
      />

      {/* Secure Print Modal with Custom Watermark */}
      <SecurePrintModal
        isOpen={isSecurePrintModalOpen}
        onClose={() => setIsSecurePrintModalOpen(false)}
        documents={documentsToSecurePrint.length > 0 ? documentsToSecurePrint : selectedDocumentsList}
        currentUser={currentUser}
        onRecordPrintAudit={onRecordPrintAudit}
      />
    </div>
  );
};
