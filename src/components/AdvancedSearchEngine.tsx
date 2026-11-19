import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Sparkles,
  Layers,
  Building2,
  Calendar,
  DollarSign,
  Shield,
  FileText,
  Clock,
  Download,
  Eye,
  Check,
  RotateCcw,
  Tag,
  Hash,
  BookOpen,
  ArrowUpDown,
  FileCheck,
  FileSpreadsheet
} from "lucide-react";
import {
  ArchivedDocument,
  ArabicSearchMode,
  DepartmentType,
  DocumentType,
  LibyanEra,
  SearchFilterOptions,
  SecurityClassification,
  VaultUser
} from "../types";
import { executeArabicSearch, normalizeArabicText } from "../utils/arabicSearchEngine";
import { AuditLogExportModal } from "./AuditLogExportModal";
import { VAULT_SYSTEM_USERS } from "../utils/vaultCrypto";

interface AdvancedSearchEngineProps {
  documents: ArchivedDocument[];
  onSelectDocument: (doc: ArchivedDocument) => void;
  currentUser?: VaultUser;
}

export const AdvancedSearchEngine: React.FC<AdvancedSearchEngineProps> = ({
  documents,
  onSelectDocument,
  currentUser = VAULT_SYSTEM_USERS[0]
}) => {
  // Search state
  const [query, setQuery] = useState("");
  const [isAuditExportModalOpen, setIsAuditExportModalOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<ArabicSearchMode>("all-words");
  const [normalizeArabic, setNormalizeArabic] = useState(true);
  const [stemmingEnabled, setStemmingEnabled] = useState(true);

  // Facet filters
  const [selectedEra, setSelectedEra] = useState<LibyanEra | "ALL">("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentType | "ALL">("ALL");
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | "ALL">("ALL");
  const [selectedClassification, setSelectedClassification] = useState<SecurityClassification | "ALL">("ALL");
  const [selectedCurrency, setSelectedCurrency] = useState<string | "ALL">("ALL");
  const [yearRange, setYearRange] = useState<[number, number]>([1951, 2026]);
  const [financialRange, setFinancialRange] = useState<"ALL" | "under-100k" | "100k-1m" | "above-1m">("ALL");
  const [vaultLockedOnly, setVaultLockedOnly] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);

  // Quick preset queries
  const quickQueryPresets = [
    { label: "إتاوات النفط ومجلس الإعمار", q: "إتاوات النفط و مجلس الإعمار", mode: "boolean" as ArabicSearchMode },
    { label: "جمارك طرابلس وبنغازي 1964", q: "جمارك طرابلس بنغازي", mode: "all-words" as ArabicSearchMode },
    { label: "محضر جرد احتياطي الذهب", q: "احتياطي الذهب 1971", mode: "all-words" as ArabicSearchMode },
    { label: "طريق طرابلس - سبها 1974", q: "طريق سبها", mode: "all-words" as ArabicSearchMode },
    { label: "منظومة الرقم الوطني والمرتبات", q: "الرقم الوطني المرتبات", mode: "all-words" as ArabicSearchMode },
    { label: "رسوم النقد الأجنبي والدين العام", q: "النقد الأجنبي الدين العام", mode: "all-words" as ArabicSearchMode }
  ];

  // Execute Search
  const searchFilterOptions: SearchFilterOptions = useMemo(() => ({
    query,
    searchMode,
    normalizeArabic,
    stemmingEnabled,
    era: selectedEra,
    department: selectedDepartment,
    docType: selectedDocType,
    classification: selectedClassification,
    currency: selectedCurrency,
    yearRange,
    financialRange,
    physicalCondition: "ALL",
    vaultLockedOnly
  }), [
    query,
    searchMode,
    normalizeArabic,
    stemmingEnabled,
    selectedEra,
    selectedDepartment,
    selectedDocType,
    selectedClassification,
    selectedCurrency,
    yearRange,
    financialRange,
    vaultLockedOnly
  ]);

  const { searchResults, searchLatencyMs } = useMemo(() => {
    const t0 = performance.now();
    const results = executeArabicSearch(documents, searchFilterOptions);
    const latency = Math.max(1, Math.round((performance.now() - t0) * 10) / 10);
    return { searchResults: results, searchLatencyMs: latency };
  }, [documents, searchFilterOptions]);

  // Reset filters
  const handleResetFilters = () => {
    setQuery("");
    setSearchMode("all-words");
    setNormalizeArabic(true);
    setStemmingEnabled(true);
    setSelectedEra("ALL");
    setSelectedDepartment("ALL");
    setSelectedDocType("ALL");
    setSelectedClassification("ALL");
    setSelectedCurrency("ALL");
    setYearRange([1951, 2026]);
    setFinancialRange("ALL");
    setVaultLockedOnly(false);
  };

  // Highlight helper for Arabic text
  const renderHighlightedText = (text: string, matchedWords: string[]) => {
    if (!text) return null;
    if (!matchedWords || matchedWords.length === 0 || !query.trim()) {
      return <span>{text}</span>;
    }

    // Split text into tokens and highlight matches
    const words = text.split(/(\s+|[،.؛:\-\(\)])/);
    const normalizedKeywords = matchedWords.map(w => normalizeArabicText(w)).filter(Boolean);

    return (
      <span>
        {words.map((chunk, idx) => {
          const normChunk = normalizeArabicText(chunk);
          const isMatch = normChunk && normalizedKeywords.some(kw => normChunk.includes(kw) || kw.includes(normChunk));

          if (isMatch) {
            return (
              <mark
                key={idx}
                className="bg-amber-200 text-amber-950 font-bold px-1 rounded mx-0.5 border-b-2 border-amber-500 selection:bg-amber-400"
              >
                {chunk}
              </mark>
            );
          }
          return <span key={idx}>{chunk}</span>;
        })}
      </span>
    );
  };

  // Export search report
  const handleExportSearchReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      query: query || "جميع الوثائق",
      searchMode,
      totalMatches: searchResults.length,
      filtersApplied: {
        era: selectedEra,
        department: selectedDepartment,
        classification: selectedClassification,
        yearRange,
        financialRange
      },
      results: searchResults.map(r => ({
        refNumber: r.document.refNumber,
        title: r.document.title,
        year: r.document.year,
        department: r.document.department,
        amount: r.document.financialAmount,
        matchScore: `${r.matchScore}%`,
        barcode: r.document.barcode,
        sha256: r.document.cryptographicProof?.sha256Hash
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير_بحث_الأرشيف_المالي_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="advanced-search-engine" className="space-y-6">
      {/* Top Search Hero */}
      <div className="bg-gradient-to-r from-[#0f2d1e] via-[#143a27] to-[#0f2d1e] text-white rounded-2xl p-6 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-600/60 text-emerald-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>محرك الفهرسة والبحث العربي الدلالي المتقدم • RTL Arabic NLP</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold font-['Amiri'] text-amber-100">
                البحث الشامل في السجلات والمراسيم المالية التاريخية
              </h2>
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-4 py-2 bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-600/60 text-amber-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all self-start sm:self-auto"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              <span>{showAdvancedFilters ? "إخفاء الفلاتر المتقدمة" : "إظهار الفلاتر المتقدمة"}</span>
            </button>
          </div>

          {/* Main Search Input */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالنص الحر، الأرقام الإشارية، أسماء الوزراء، أو التعابير البوليانية (مثال: إتاوات النفط و مجلس الإعمار)..."
              className="w-full pr-12 pl-36 py-4 bg-white text-slate-900 placeholder:text-slate-400 rounded-2xl shadow-inner text-sm md:text-base font-medium focus:outline-none focus:ring-4 focus:ring-amber-400/40 border-2 border-transparent transition-all"
            />
            <Search className="w-6 h-6 text-emerald-800 absolute right-4 top-4 pointer-events-none" />

            <div className="absolute left-3 top-3 flex items-center gap-2">
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  مسح
                </button>
              )}
              <span className="text-xs font-mono font-bold text-emerald-900 bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-300">
                {searchResults.length} نتيجة
              </span>
            </div>
          </div>

          {/* Search Modes and Arabic Linguistic Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-emerald-800/50">
            {/* Mode Radios */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-emerald-300 font-medium ml-1">نمط المطابقة:</span>
              {[
                { id: "all-words", label: "كافة الكلمات (AND)" },
                { id: "exact-phrase", label: "عبارة دقيقة (\"...\")" },
                { id: "any-word", label: "أي كلمة (OR)" },
                { id: "boolean", label: "تعبير مركب (و / أو / بدون)" }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSearchMode(m.id as ArabicSearchMode)}
                  className={`px-3 py-2 min-h-[38px] md:min-h-[42px] rounded-xl font-medium transition-all ${
                    searchMode === m.id
                      ? "bg-amber-400 text-slate-950 font-bold shadow"
                      : "bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900 border border-emerald-800/60"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Arabic NLP Toggles */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-emerald-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={normalizeArabic}
                  onChange={(e) => setNormalizeArabic(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 w-4 h-4 bg-slate-900 border-emerald-700"
                />
                <span>تطبيع الأحرف (أ، إ، آ، ة، ي)</span>
              </label>

              <label className="flex items-center gap-1.5 text-emerald-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stemmingEnabled}
                  onChange={(e) => setStemmingEnabled(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 w-4 h-4 bg-slate-900 border-emerald-700"
                />
                <span>التجذير المالي (جمارك/جمركي، خزانة...)</span>
              </label>
            </div>
          </div>

          {/* Quick Query Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-amber-300/80 font-medium">استعلامات شائعة:</span>
            {quickQueryPresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(preset.q);
                  setSearchMode(preset.mode);
                }}
                className="px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-200 transition-all hover:text-amber-200 flex items-center"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Multi-Facet Filter Panel */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-800" />
              تخصيص الفلاتر المرجعية المتعددة (Multi-Facet Filters)
            </h3>
            <button
              onClick={handleResetFilters}
              className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Era Filter */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-800" />
                الحقبة التاريخية
              </label>
              <select
                value={selectedEra}
                onChange={(e) => setSelectedEra(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="ALL">كافة الحقب التاريخية</option>
                <option value="المملكة الليبية (1951 - 1969)">المملكة الليبية (1951 - 1969)</option>
                <option value="حقبة الجمهورية والجماهيرية (1969 - 2011)">حقبة الجمهورية والجماهيرية (1969 - 2011)</option>
                <option value="دولة ليبيا الحديثة (2011 - الآن)">دولة ليبيا الحديثة (2011 - الآن)</option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-800" />
                الإدارة أو المصلحة
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="ALL">كافة الإدارات والمصالح</option>
                <option value="إدارة الخزانة العامة">إدارة الخزانة العامة</option>
                <option value="مصلحة الجمارك الليبية">مصلحة الجمارك الليبية</option>
                <option value="إدارة الميزانية العامة والتخطيط المالي">إدارة الميزانية العامة والتخطيط المالي</option>
                <option value="مصلحة الضرائب">مصلحة الضرائب</option>
                <option value="إدارة الدين العام والالتزامات المالية">إدارة الدين العام والالتزامات المالية</option>
              </select>
            </div>

            {/* Document Type Filter */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-800" />
                نوع الوثيقة المالية
              </label>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="ALL">كافة أنواع الوثائق</option>
                <option value="مرسوم ملكي مالي">مرسوم ملكي مالي</option>
                <option value="قرار وزاري">قرار وزاري</option>
                <option value="إذن صرف خزانة عامة">إذن صرف خزانة عامة</option>
                <option value="إقرار وتخليص جمركي">إقرار وتخليص جمركي</option>
                <option value="سندات خزانة وقرض عام">سندات خزانة وقرض عام</option>
                <option value="كشف مرتبات وعلاوات ديوانية">كشف مرتبات وعلاوات ديوانية</option>
              </select>
            </div>

            {/* Security Classification */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-800" />
                درجة السرية والتصنيف
              </label>
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="ALL">كافة درجات التصنيف</option>
                <option value="عام">عام</option>
                <option value="محدود">محدود</option>
                <option value="سري">سري</option>
                <option value="سري ومحدود">سري ومحدود</option>
                <option value="سري للغاية">سري للغاية (الخزينة السيادية)</option>
              </select>
            </div>

            {/* Financial Amount Bracket */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-800" />
                نطاق المبالغ المالية
              </label>
              <select
                value={financialRange}
                onChange={(e) => setFinancialRange(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="ALL">كافة المبالغ المالية</option>
                <option value="under-100k">أقل من 100 ألف</option>
                <option value="100k-1m">بين 100 ألف و 1 مليون</option>
                <option value="above-1m">أكثر من 1 مليون (مشاريع كبرى)</option>
              </select>
            </div>

            {/* Currency Filter */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-800" />
                العملة التاريخية
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none focus:ring-1 focus:ring-emerald-700"
              >
                <option value="ALL">كافة العملات التاريخية</option>
                <option value="جنيه ليبي">الجنيه الليبي والمليمات (1951 - 1971)</option>
                <option value="دينار ليبي">الدينار الليبي والدرهم (1971 - الآن)</option>
              </select>
            </div>

            {/* Year Range Slider Display */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                  النطاق الزمني:
                </span>
                <span className="text-emerald-800 font-mono text-[11px]">{yearRange[0]} - {yearRange[1]} م</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min="1951"
                  max={yearRange[1]}
                  value={yearRange[0]}
                  onChange={(e) => setYearRange([parseInt(e.target.value) || 1951, yearRange[1]])}
                  className="w-1/2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono text-xs"
                />
                <span className="text-slate-400">إلى</span>
                <input
                  type="number"
                  min={yearRange[0]}
                  max="2026"
                  value={yearRange[1]}
                  onChange={(e) => setYearRange([yearRange[0], parseInt(e.target.value) || 2026])}
                  className="w-1/2 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-mono text-xs"
                />
              </div>
            </div>

            {/* Sovereign Vault Only Toggle */}
            <div className="flex items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 select-none">
                <input
                  type="checkbox"
                  checked={vaultLockedOnly}
                  onChange={(e) => setVaultLockedOnly(e.target.checked)}
                  className="rounded text-emerald-800 w-4 h-4 focus:ring-0"
                />
                <span>سجلات الخزينة السيادية فقط</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Results Header with Latency & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900 text-sm">
            تم استرجاع {searchResults.length} وثيقة مطابقة
          </span>
          <span className="text-slate-400">•</span>
          <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            زمن الفهرسة: {searchLatencyMs} ms
          </span>
          {query && (
            <span className="bg-amber-50 text-amber-900 px-2.5 py-0.5 rounded-full font-medium border border-amber-200">
              بحث: "{query}"
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsAuditExportModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg flex items-center gap-2 transition-all shadow cursor-pointer text-xs"
            title="تصدير سجلات التدقيق والعمليات للوثائق المسترجعة بصيغة Excel أو PDF"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-200" />
            <span>تصدير سجلات التدقيق (Excel/PDF)</span>
          </button>

          <button
            onClick={handleExportSearchReport}
            className="px-3.5 py-1.5 bg-[#0f2d1e] hover:bg-[#16422c] text-amber-200 font-bold rounded-lg flex items-center gap-2 transition-all shadow text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير تقرير النتائج المعتمد</span>
          </button>
        </div>
      </div>

      {/* Results List */}
      {searchResults.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-slate-200 space-y-3">
          <Search className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">لا توجد سجلات مالية مطابقة لمعايير البحث</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            جرب تخفيف شروط الفلاتر، أو تفعيل تطبيع الأحرف، أو كتابة كلمات مفتاحية عامة مثل "خزانة"، "جمارك"، "مرسوم"، "نفط".
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-2 px-4 py-2 bg-[#0f2d1e] text-amber-200 rounded-xl text-xs font-bold shadow"
          >
            إعادة تعيين كافة الفلاتر
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {searchResults.map(({ document: doc, matchScore, matchedFields, snippet, matchedKeywords }) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-emerald-700/50 shadow-sm hover:shadow-md transition-all space-y-3 relative group"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  {/* Meta Bar */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {doc.refNumber}
                    </span>
                    <span className="text-slate-500 font-semibold">{doc.era.split("(")[0]}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-700 font-medium">{doc.department}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600">{doc.gregorianDate}</span>
                  </div>

                  {/* Title with Highlight */}
                  <h3
                    onClick={() => onSelectDocument(doc)}
                    className="text-lg font-bold font-['Amiri'] text-slate-900 group-hover:text-emerald-900 cursor-pointer transition-colors leading-snug"
                  >
                    {renderHighlightedText(doc.title, matchedKeywords)}
                  </h3>
                </div>

                {/* Match Score & Badges */}
                <div className="flex items-center gap-2 self-start shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                      تطابق {matchScore}%
                    </span>
                    <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full font-bold ${
                      doc.classification === "سري للغاية"
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {doc.classification}
                    </span>
                  </div>
                </div>
              </div>

              {/* Matched Fields Tags */}
              {matchedFields.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">حقول التطابق:</span>
                  {matchedFields.map((f, i) => (
                    <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {f}
                    </span>
                  ))}
                </div>
              )}

              {/* Snippet with contextual highlight */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-['Amiri'] text-base">
                {renderHighlightedText(snippet, matchedKeywords)}
              </div>

              {/* Bottom Details Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-4 text-slate-600 font-mono">
                  <span>المبلغ: <strong className="text-emerald-900 font-bold">{doc.financialAmount}</strong></span>
                  <span className="hidden sm:inline text-slate-300">|</span>
                  <span className="hidden sm:inline">الباركود: <strong>{doc.barcode}</strong></span>
                  {doc.cryptographicProof && (
                    <>
                      <span className="hidden sm:inline text-slate-300">|</span>
                      <span className="hidden md:inline text-slate-500">
                        SHA-256: {doc.cryptographicProof.sha256Hash.slice(0, 8)}...
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                    الموقع: <strong className="text-slate-700">{doc.storageLocation}</strong>
                  </span>
                  <button
                    onClick={() => onSelectDocument(doc)}
                    className="px-4 py-2.5 min-h-[44px] bg-[#0f2d1e] hover:bg-[#16422c] text-amber-200 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow"
                  >
                    <Eye className="w-4 h-4" />
                    <span>معاينة المخطوطة والملف الكامل</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Log Export Modal */}
      <AuditLogExportModal
        isOpen={isAuditExportModalOpen}
        onClose={() => setIsAuditExportModalOpen(false)}
        documents={searchResults.map((r) => r.document)}
        currentUser={currentUser}
      />
    </div>
  );
};
