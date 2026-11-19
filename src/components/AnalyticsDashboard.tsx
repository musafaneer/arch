import React, { useState, useRef } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Layers, 
  FileCheck2, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  HardDrive, 
  Leaf, 
  Award,
  Building,
  History,
  Lock,
  Tag,
  ArrowRight,
  Shield,
  FileSpreadsheet,
  ChevronLeft,
  Search
} from "lucide-react";
import { ArchivedDocument, LibyanEra, SecurityClassification, DocumentType, VaultUser } from "../types";
import { HistoricalTimelineChart, HistoricalPeriodDrillDown } from "./HistoricalTimelineChart";
import { DashboardDrillDownView, DashboardDrillDownTarget } from "./DashboardDrillDownView";
import { RetentionAnalyticsCard } from "./RetentionAnalyticsCard";
import { DepartmentArchivalStatusChart } from "./DepartmentArchivalStatusChart";
import { AuditLogExportModal } from "./AuditLogExportModal";
import { VAULT_SYSTEM_USERS } from "../utils/vaultCrypto";

interface AnalyticsDashboardProps {
  documents: ArchivedDocument[];
  onOpenScanner: () => void;
  onSelectDocument?: (doc: ArchivedDocument) => void;
  onOpenCatalogueWithEra?: (era: LibyanEra | "ALL") => void;
  onOpenExtendModal?: (doc: ArchivedDocument) => void;
  onOpenDisposalModal?: (doc: ArchivedDocument) => void;
  currentUser?: VaultUser;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  documents,
  onOpenScanner,
  onSelectDocument,
  onOpenCatalogueWithEra,
  onOpenExtendModal,
  onOpenDisposalModal,
  currentUser = VAULT_SYSTEM_USERS[0]
}) => {
  const [drillDownTarget, setDrillDownTarget] = useState<DashboardDrillDownTarget | null>(null);
  const [isAuditExportModalOpen, setIsAuditExportModalOpen] = useState(false);
  const drillDownRef = useRef<HTMLDivElement>(null);

  const activateDrillDown = (target: DashboardDrillDownTarget) => {
    setDrillDownTarget(target);
    // Smooth scroll to drill-down section
    setTimeout(() => {
      drillDownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // Compute Era breakdown
  const kingdomCount = documents.filter(d => d.era.includes("المملكة")).length;
  const republicCount = documents.filter(d => d.era.includes("الجمهورية")).length;
  const modernCount = documents.filter(d => d.era.includes("الحديثة")).length;
  const totalDocs = documents.length;

  // Departmental breakdown
  const departmentCounts: Record<string, number> = {};
  documents.forEach(d => {
    departmentCounts[d.department] = (departmentCounts[d.department] || 0) + 1;
  });

  // Security Classifications breakdown
  const classificationCounts: Record<SecurityClassification, number> = {
    "عام": 0,
    "محدود": 0,
    "سري": 0,
    "سري ومحدود": 0,
    "سري للغاية": 0
  };
  documents.forEach(d => {
    if (classificationCounts[d.classification] !== undefined) {
      classificationCounts[d.classification]++;
    }
  });

  // Document Types breakdown
  const docTypeCounts: Record<string, number> = {};
  documents.forEach(d => {
    docTypeCounts[d.docType] = (docTypeCounts[d.docType] || 0) + 1;
  });

  // Handler for chart period click
  const handleChartPeriodSelect = (period: HistoricalPeriodDrillDown) => {
    if (period.type === "decade") {
      activateDrillDown({
        category: "decade",
        title: `سجلات ${period.label}`,
        subtitle: `الوثائق والمستندات المالية الصادرة بين عامي ${period.startYear} م و ${period.endYear} م`,
        badgeLabel: `${period.startYear} - ${period.endYear} م`,
        filterFn: (d) => d.year >= (period.startYear || 1950) && d.year <= (period.endYear || 2029)
      });
    } else if (period.type === "year") {
      activateDrillDown({
        category: "year",
        title: `سجلات سنة ${period.value} ميلادي`,
        subtitle: `كافة المعاملات والقرارات والمستندات المالية المعتمدة لسنة ${period.value} م`,
        badgeLabel: `${period.value} م`,
        filterFn: (d) => d.year === Number(period.value)
      });
    } else {
      activateDrillDown({
        category: "era",
        title: `سجلات ${period.label}`,
        subtitle: `الوثائق والمستندات المالية المؤرشفة ضمن هذه الحقبة السيادية`,
        filterFn: (d) => d.era.includes(String(period.value))
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Anchor for auto-scroll */}
      <div ref={drillDownRef} />

      {/* Drill-Down Active View Panel */}
      {drillDownTarget && (
        <DashboardDrillDownView
          target={drillDownTarget}
          allDocuments={documents}
          onClose={() => setDrillDownTarget(null)}
          onSelectDocument={(doc) => onSelectDocument?.(doc)}
          onJumpToCatalogue={(era) => onOpenCatalogueWithEra?.(era || "ALL")}
        />
      )}

      {/* Sovereign Audit & Compliance Action Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white p-4 sm:p-5 rounded-2xl border border-amber-500/30 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white font-['Amiri',serif]">
                سجلات التدقيق وسلسلة العهدة الرقمية (Audit Logs & Chain of Custody)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-800 text-emerald-200 border border-emerald-600">
                WORM غير قابل للتعديل
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              تصدير كافة حركات الفحص، التعديلات الأرشيفية، ومطابقات المستودعات الفرعية بصيغة Excel أو تقرير PDF معتمد للمدققين.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAuditExportModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition shadow-md cursor-pointer self-start sm:self-auto shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-100" />
          <span>تصدير سجلات التدقيق (Excel / PDF)</span>
        </button>
      </div>

      {/* Top Metrics Cards with interactive drill-down */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div 
          onClick={() => activateDrillDown({
            category: "all",
            title: "كافة السجلات والوثائق المؤرشفة في المنظومة",
            subtitle: `استعراض كامل المستودع الرقمي لوزارة المالية الليبية (${totalDocs} وثيقة مفهرسة)`,
            badgeLabel: `${totalDocs} وثيقة`,
            filterFn: () => true
          })}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer hover:border-emerald-600 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الوثائق المحفوظة</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 font-mono">
            {totalDocs} <span className="text-xs font-normal text-slate-500">سجل مفهرس</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>معتمدة بنظام ISAD(G)</span>
            </span>
            <span className="text-[10px] text-slate-400 group-hover:text-emerald-800 font-bold flex items-center gap-0.5">
              <span>تفصيل</span>
              <ChevronLeft className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Paperless Ratio */}
        <div 
          onClick={() => activateDrillDown({
            category: "condition",
            title: "السجلات المعتمدة بالأرشيف اللاورقي (100% Digital)",
            subtitle: "الوثائق التي تم إيداعها وتأمينها رقمياً بنجاح بدون التعامل بالدفاتر التقليدية",
            badgeLabel: "تحول لاورقي",
            filterFn: (d) => Boolean(d.paperlessVerified)
          })}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer hover:border-emerald-600 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">نسبة التحول اللاورقي</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition">
              <Leaf className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-800 font-mono">
            100% <span className="text-xs font-normal text-slate-500">مؤتمت بالكامل</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>إلغاء التعامل بالدفاتر الورقية</span>
            <span className="text-[10px] text-slate-400 group-hover:text-emerald-800 font-bold flex items-center gap-0.5">
              <span>تفصيل</span>
              <ChevronLeft className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Vault Locked & Sovereign Status */}
        <div 
          onClick={() => activateDrillDown({
            category: "classification",
            title: "السجلات المحصنة في الخزينة السيادية (WORM Protection)",
            subtitle: "سجلات مالية تخضع لقيد الكتابة لمرة واحدة مع حماية تشفير AES-256 ودرجة سرية مرتفعة",
            badgeLabel: "خزينة سيادية",
            filterFn: (d) => Boolean(d.isVaultLocked || d.classification === "سري للغاية" || d.classification === "سري")
          })}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer hover:border-amber-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">الحفظ السيادي المشفر (WORM)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-110 transition">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-900 font-mono">
            {documents.filter(d => d.isVaultLocked || d.classification === "سري للغاية").length}
            <span className="text-xs font-normal text-slate-500"> سجل سري للغاية</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span>تحصين ضد الحذف والتعديل</span>
            <span className="text-[10px] text-slate-400 group-hover:text-amber-800 font-bold flex items-center gap-0.5">
              <span>تفصيل</span>
              <ChevronLeft className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* AI OCR Accuracy */}
        <div 
          onClick={() => activateDrillDown({
            category: "condition",
            title: "الوثائق المستخرجة بنظام القراءة الضوئية والفهرسة الذكية (ISAD-G)",
            subtitle: "سجلات تم استخراج بياناتها ونصوصها التاريخية بدقة فائقة عبر القراءة الضوئية الذكية",
            badgeLabel: "OCR ذكي",
            filterFn: (d) => Boolean(d.ocrText && d.ocrText.length > 20)
          })}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer hover:border-purple-500 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">دقة القراءة بالذكاء الاصطناعي</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center group-hover:scale-110 transition">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-purple-900 font-mono">
            96.4%
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-purple-700 font-semibold">
            <span>تفريغ رقمي فوري للنصوص</span>
            <span className="text-[10px] text-slate-400 group-hover:text-purple-800 font-bold flex items-center gap-0.5">
              <span>تفصيل</span>
              <ChevronLeft className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Historical Timeline with Drill-Down Clicks */}
      <HistoricalTimelineChart 
        documents={documents} 
        onSelectPeriod={handleChartPeriodSelect}
        selectedPeriodValue={
          drillDownTarget?.category === "decade"
            ? String(drillDownTarget.badgeLabel).split(" ")[0]
            : drillDownTarget?.category === "year"
            ? String(drillDownTarget.badgeLabel)
            : null
        }
      />

      {/* Recharts Department & Archival Status Distribution Chart with Interactive Time Filtering */}
      <DepartmentArchivalStatusChart
        documents={documents}
        onSelectDocument={onSelectDocument}
      />

      {/* Retention Lifecycle & Disposals / Extensions Statistical Report Card with Recharts Pie Chart */}
      <RetentionAnalyticsCard
        documents={documents}
        onSelectDocument={onSelectDocument}
        onOpenExtendModal={onOpenExtendModal}
        onOpenDisposalModal={onOpenDisposalModal}
      />

      {/* Era & Department Distribution with Direct Drill-Down */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Era Distribution Card */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <span>توزيع الوثائق عبر الحقب التاريخية لليبيا</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                انقر على أي حقبة تاريخية لاستعراض كافة وثائقها وسجلاتها فوراً
              </p>
            </div>
            <span className="text-[11px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
              تفاعلي
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Kingdom Clickable Card */}
            <div
              onClick={() => activateDrillDown({
                category: "era",
                title: "سجلات حقبة المملكة الليبية المتحدة (1951 - 1969 م)",
                subtitle: "مراسيم ديوان الملك إدريس السنوسي ومجلس الإعمار الوطني وميزانيات الجنيه الليبي",
                badgeLabel: "1951 - 1969 م",
                filterFn: (d) => d.era.includes("المملكة")
              })}
              className="p-3 rounded-xl border border-amber-100 hover:border-amber-400 hover:bg-amber-50/40 transition cursor-pointer group"
            >
              <div className="flex justify-between font-semibold mb-1.5">
                <span className="text-amber-950 font-bold group-hover:text-amber-700 transition flex items-center gap-1.5">
                  <span>المملكة الليبية (1951 - 1969)</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-[-2px] transition" />
                </span>
                <span className="font-mono text-slate-700 font-bold">
                  {kingdomCount} وثائق ({Math.round((kingdomCount / totalDocs) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-1.5">
                <div 
                  className="bg-amber-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(kingdomCount / totalDocs) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>العملة: الجنيه الليبي (L.£)، القروش، المليمات - مراسيم الملك ومجلس الإعمار</span>
                <span className="text-amber-700 font-bold group-hover:underline">عرض السجلات ➔</span>
              </div>
            </div>

            {/* Republic Clickable Card */}
            <div
              onClick={() => activateDrillDown({
                category: "era",
                title: "سجلات حقبة الجمهورية والجماهيرية (1969 - 2011 م)",
                subtitle: "قرارات ميزانيات التحول والنهر الصناعي وسندات التنمية والدينار الليبي والدرهم",
                badgeLabel: "1969 - 2011 م",
                filterFn: (d) => d.era.includes("الجمهورية")
              })}
              className="p-3 rounded-xl border border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50/40 transition cursor-pointer group"
            >
              <div className="flex justify-between font-semibold mb-1.5">
                <span className="text-emerald-950 font-bold group-hover:text-emerald-800 transition flex items-center gap-1.5">
                  <span>حقبة الجمهورية والجماهيرية (1969 - 2011)</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-emerald-700 group-hover:translate-x-[-2px] transition" />
                </span>
                <span className="font-mono text-slate-700 font-bold">
                  {republicCount} وثائق ({Math.round((republicCount / totalDocs) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-1.5">
                <div 
                  className="bg-emerald-700 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(republicCount / totalDocs) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>العملة: الدينار الليبي (د.ل)، الدرهم - ميزانيات التحول والنهر وسندات التنمية</span>
                <span className="text-emerald-800 font-bold group-hover:underline">عرض السجلات ➔</span>
              </div>
            </div>

            {/* Modern State Clickable Card */}
            <div
              onClick={() => activateDrillDown({
                category: "era",
                title: "سجلات دولة ليبيا الحديثة (2011 - الآن)",
                subtitle: "منظومة المرتبات بالرقم الوطني وضريبة مبيعات النقد الأجنبي والأرشيف اللاورقي",
                badgeLabel: "2011 - الآن",
                filterFn: (d) => d.era.includes("الحديثة")
              })}
              className="p-3 rounded-xl border border-blue-100 hover:border-blue-500 hover:bg-blue-50/40 transition cursor-pointer group"
            >
              <div className="flex justify-between font-semibold mb-1.5">
                <span className="text-blue-950 font-bold group-hover:text-blue-700 transition flex items-center gap-1.5">
                  <span>دولة ليبيا الحديثة (2011 - الآن)</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-[-2px] transition" />
                </span>
                <span className="font-mono text-slate-700 font-bold">
                  {modernCount} وثائق ({Math.round((modernCount / totalDocs) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-1.5">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(modernCount / totalDocs) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>العملة: الدينار الليبي - منظومة المرتبات، رسوم النقد الأجنبي، والتحول اللاورقي</span>
                <span className="text-blue-700 font-bold group-hover:underline">عرض السجلات ➔</span>
              </div>
            </div>
          </div>
        </div>

        {/* Department Distribution Clickable Section */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-800" />
                <span>المصالح والإدارات الأكثر أرشفة بوزارة المالية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                انقر على أي مصلحة أو إدارة لتفصيل وعرض ملفاتها المؤرشفة
              </p>
            </div>
            <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
              تفاعلي
            </span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(departmentCounts).map(([dep, count], idx) => (
              <div 
                key={idx}
                onClick={() => activateDrillDown({
                  category: "department",
                  title: `سجلات: ${dep}`,
                  subtitle: `جميع السجلات والقرارات والمستندات المالية المحفوظة لإدارة [${dep}] في الأرشيف الوطني`,
                  badgeLabel: `${count} ملف`,
                  filterFn: (d) => d.department === dep
                })}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs hover:border-emerald-500 hover:bg-emerald-50/50 transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-[11px] group-hover:bg-emerald-800 group-hover:text-white transition">
                    {idx + 1}
                  </div>
                  <span className="font-bold text-slate-800 group-hover:text-emerald-950 transition">
                    {dep}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-emerald-800 font-bold group-hover:underline">
                    {count} ملف
                  </span>
                  <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-800 group-hover:translate-x-[-2px] transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Section: Security Classifications & Document Types Drill-Down */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Classification Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-700" />
              <span>تفصيل السجلات حسب درجة السرية السيادية</span>
            </h4>
            <span className="text-[10px] text-slate-400">انقر للتصفية</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {Object.entries(classificationCounts).map(([cls, count]) => {
              if (count === 0) return null;
              const isTopSecret = cls === "سري للغاية";
              const isSecret = cls === "سري";
              return (
                <button
                  key={cls}
                  onClick={() => activateDrillDown({
                    category: "classification",
                    title: `السجلات المصنفة بدرجة: [${cls}]`,
                    subtitle: `الوثائق الخاضعة لبروتوكول السرية السيادية لدرجة ${cls}`,
                    badgeLabel: cls,
                    filterFn: (d) => d.classification === cls
                  })}
                  className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 group ${
                    isTopSecret
                      ? "bg-red-50/60 border-red-200 hover:border-red-500 hover:bg-red-50"
                      : isSecret
                      ? "bg-amber-50/60 border-amber-200 hover:border-amber-500 hover:bg-amber-50"
                      : "bg-slate-50 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40"
                  }`}
                >
                  <span className={`text-[11px] font-bold ${
                    isTopSecret ? "text-red-900" : isSecret ? "text-amber-900" : "text-slate-800"
                  }`}>
                    {cls}
                  </span>
                  <span className="font-mono text-xs font-black text-slate-900 group-hover:scale-110 transition">
                    {count} وثائق
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Document Types Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
              <span>تفصيل السجلات حسب نوع الوثيقة الأرشيفية</span>
            </h4>
            <span className="text-[10px] text-slate-400">انقر للتصفية</span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(docTypeCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => activateDrillDown({
                  category: "docType",
                  title: `الوثائق من نوع: ${type}`,
                  subtitle: `جميع السجلات والملفات الأرشيفية المندرجة تحت تصنيف [${type}]`,
                  badgeLabel: `${count} وثيقة`,
                  filterFn: (d) => d.docType === type
                })}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-400 transition flex items-center gap-2 group"
              >
                <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-950">
                  {type}
                </span>
                <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-slate-200 text-emerald-900">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Paperless Transition Impact Card */}
      <div className="bg-gradient-to-r from-[#0f2d1e] to-[#17432b] text-white rounded-2xl p-6 shadow-xl border border-amber-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold mb-1">
              <Award className="w-4 h-4" />
              <span>الاستراتيجية الوطنية للأرشفة الرقمية والتحول اللاورقي</span>
            </div>
            <h3 className="text-lg font-bold font-['Amiri',serif] text-amber-100">
              حماية التراث المالي والسيادي الليبي من التلف والضياع
            </h3>
            <p className="text-xs text-emerald-200/80 mt-1 max-w-2xl leading-relaxed">
              إن التحول الكامل للأرشيف الرقمي لوزارة المالية يضمن حفظ قرارات الميزانية، والتعرفة الجمركية، وعقود النفط التاريخية في سحابة مؤمنة ضد الحرائق والرطوبة مع إتاحة البحث الفوري والتفصيل الإحصائي المعمق.
            </p>
          </div>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg text-xs whitespace-nowrap"
          >
            <span>مسح وثيقة جديدة</span>
          </button>
        </div>
      </div>

      {/* Audit Log Export Modal */}
      <AuditLogExportModal
        isOpen={isAuditExportModalOpen}
        onClose={() => setIsAuditExportModalOpen(false)}
        documents={documents}
        currentUser={currentUser}
      />
    </div>
  );
};
