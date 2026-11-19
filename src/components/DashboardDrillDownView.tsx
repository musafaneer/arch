import React, { useState, useMemo } from "react";
import { 
  FileText, 
  Calendar, 
  Building2, 
  Tag, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  ArrowUpDown, 
  X, 
  ShieldCheck, 
  Layers, 
  Filter, 
  Sparkles, 
  Eye,
  Lock,
  ArrowRight,
  Hash
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ArchivedDocument, LibyanEra } from "../types";
import { useToast } from "../context/ToastContext";

export interface DashboardDrillDownTarget {
  category: "era" | "department" | "decade" | "year" | "docType" | "classification" | "condition" | "all";
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeColor?: string;
  filterFn: (doc: ArchivedDocument) => boolean;
}

interface DashboardDrillDownViewProps {
  target: DashboardDrillDownTarget;
  allDocuments: ArchivedDocument[];
  onClose: () => void;
  onSelectDocument: (doc: ArchivedDocument) => void;
  onJumpToCatalogue?: (era?: LibyanEra) => void;
}

type SortOption = "year-desc" | "year-asc" | "ref" | "title";

export const DashboardDrillDownView: React.FC<DashboardDrillDownViewProps> = ({
  target,
  allDocuments,
  onClose,
  onSelectDocument,
  onJumpToCatalogue
}) => {
  const toast = useToast();
  const [localSearch, setLocalSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("year-desc");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Filter matching records
  const matchingDocs = useMemo(() => {
    return allDocuments.filter(target.filterFn);
  }, [allDocuments, target]);

  // Further refine by local search & sort
  const processedDocs = useMemo(() => {
    let list = matchingDocs;

    if (localSearch.trim()) {
      const q = localSearch.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.refNumber.toLowerCase().includes(q) ||
          d.department.toLowerCase().includes(q) ||
          d.docType.toLowerCase().includes(q) ||
          d.financialAmount.toLowerCase().includes(q) ||
          d.keywords.some((k) => k.toLowerCase().includes(q)) ||
          d.ocrText.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "year-desc") return b.year - a.year;
      if (sortBy === "year-asc") return a.year - b.year;
      if (sortBy === "ref") return a.refNumber.localeCompare(b.refNumber, "ar");
      if (sortBy === "title") return a.title.localeCompare(b.title, "ar");
      return 0;
    });
  }, [matchingDocs, localSearch, sortBy]);

  const handleCopyRef = (e: React.MouseEvent, refNumber: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(refNumber);
    setCopiedRef(refNumber);
    toast.success("تم نسخ الرقم الإشاري", `تم حفظ [${refNumber}] في الحافظة بنجاح.`, {
      badge: "نسخ رقم",
      duration: 3000
    });
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const getEraBadgeColor = (era: string) => {
    if (era.includes("المملكة")) return "bg-amber-100 text-amber-900 border-amber-300";
    if (era.includes("الجمهورية")) return "bg-emerald-100 text-emerald-900 border-emerald-300";
    return "bg-blue-100 text-blue-900 border-blue-300";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      id="dashboard-drill-down-panel"
      className="bg-white rounded-2xl border-2 border-emerald-800/30 shadow-xl overflow-hidden"
      dir="rtl"
    >
      {/* Panel Sovereign Header */}
      <div className="bg-gradient-to-r from-[#0f2d1e] via-[#153e2a] to-[#0f2d1e] text-white p-5 border-b border-amber-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Filter className="w-3 h-3" />
                <span>تفصيل إحصائي معمق (Drill-Down)</span>
              </span>

              {target.badgeLabel && (
                <span className="bg-white/10 text-slate-200 text-[11px] px-2.5 py-0.5 rounded-full border border-white/15 font-mono">
                  {target.badgeLabel}
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold font-['Cairo'] text-white flex items-center gap-2">
              <span>{target.title}</span>
            </h3>

            {target.subtitle && (
              <p className="text-xs text-emerald-200/80 leading-relaxed">
                {target.subtitle}
              </p>
            )}
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <div className="bg-emerald-900/60 border border-emerald-700/60 rounded-xl px-3 py-1.5 text-center">
              <div className="text-[10px] text-emerald-300 font-medium">عدد السجلات</div>
              <div className="text-base font-black text-amber-300 font-mono">
                {matchingDocs.length}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition flex items-center justify-center"
              title="إغلاق التفصيل والعودة للوحة الإحصاء"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search and Sort */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Inner search input */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="بحث في هذه السجلات المحددة..."
              className="w-full bg-black/25 text-white placeholder-slate-400 text-xs rounded-xl pl-8 pr-9 py-2 border border-white/15 focus:outline-none focus:border-amber-400 transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Sort Selector & Catalogue Jump */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
            <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-xl border border-white/10">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-slate-300">الترتيب:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="year-desc" className="bg-slate-900 text-white">الأحدث سنة (تنازلي)</option>
                <option value="year-asc" className="bg-slate-900 text-white">الأقدم سنة (تصاعدي)</option>
                <option value="ref" className="bg-slate-900 text-white">الرقم الإشاري</option>
                <option value="title" className="bg-slate-900 text-white">العنوان الأبجدي</option>
              </select>
            </div>

            {onJumpToCatalogue && (
              <button
                onClick={() => {
                  if (target.category === "era") {
                    const eraKey = allDocuments.find(target.filterFn)?.era;
                    onJumpToCatalogue(eraKey);
                  } else {
                    onJumpToCatalogue();
                  }
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition flex items-center gap-1.5 text-xs shadow"
              >
                <span>استعراض في الفهرس العام</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Matching Records List */}
      <div className="p-4 sm:p-6 space-y-3 max-h-[620px] overflow-y-auto bg-slate-50/60">
        {processedDocs.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-xl border border-dashed border-slate-300">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">لا توجد وثائق مطابقة لمعايير البحث الداخلي</p>
            <p className="text-xs text-slate-400 mt-1">جرّب تعديل نص البحث أو تصفير حقول التصفية</p>
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="mt-3 text-xs text-emerald-800 font-bold underline"
              >
                مسح كلمة البحث
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {processedDocs.map((doc) => {
              const isCopied = copiedRef === doc.refNumber;
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-600 hover:shadow-md transition-all cursor-pointer group relative flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Ref number & Era */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {doc.refNumber}
                        </span>
                        <button
                          onClick={(e) => handleCopyRef(e, doc.refNumber)}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                          title="نسخ الرقم الإشاري"
                        >
                          {isCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getEraBadgeColor(doc.era)}`}>
                        {doc.era.includes("المملكة")
                          ? "المملكة الليبية"
                          : doc.era.includes("الجمهورية")
                          ? "الجماهيرية"
                          : "دولة ليبيا"}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition font-['Cairo'] line-clamp-2 mb-2 leading-snug">
                      {doc.title}
                    </h4>

                    {/* Meta Highlights */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 mb-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                        <span className="truncate">{doc.department}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>{doc.gregorianDate} ({doc.year}م)</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{doc.docType}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-900 truncate">
                        <Hash className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">{doc.financialAmount}</span>
                      </div>
                    </div>

                    {/* Summary Excerpt */}
                    {doc.summary && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2 font-['Cairo']">
                        {doc.summary}
                      </p>
                    )}
                  </div>

                  {/* Footer of Card */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs mt-1">
                    <div className="flex items-center gap-1.5">
                      {doc.isVaultLocked && (
                        <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>خزينة WORM</span>
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {doc.scanQuality}
                      </span>
                    </div>

                    <div className="text-emerald-800 font-bold group-hover:translate-x-[-2px] transition flex items-center gap-1 text-[11px]">
                      <span>معاينة الإضبارة</span>
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-800" />
          <span>
            جميع السجلات مفهرسة وفق معيار ISAD(G) ومطابقة للبصمة الرقمية SHA-256
          </span>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold transition text-xs"
        >
          إغلاق التفصيل والعودة
        </button>
      </div>
    </motion.div>
  );
};
