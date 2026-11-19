import React, { useState, useMemo } from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  PieChart as PieChartIcon,
  Calendar,
  Trash2,
  Clock,
  ShieldCheck,
  Scale,
  FileText,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  Download,
  Printer,
  Building2,
  Sparkles,
  Info,
  X
} from "lucide-react";
import { ArchivedDocument } from "../types";
import {
  getRetentionAnnualReport,
  AnnualArchivalActionItem,
  ArchivalPieSlice
} from "../utils/retentionLifecycle";

interface RetentionAnalyticsCardProps {
  documents: ArchivedDocument[];
  onSelectDocument?: (doc: ArchivedDocument) => void;
  onOpenExtendModal?: (doc: ArchivedDocument) => void;
  onOpenDisposalModal?: (doc: ArchivedDocument) => void;
}

export const RetentionAnalyticsCard: React.FC<RetentionAnalyticsCardProps> = ({
  documents,
  onSelectDocument,
  onOpenExtendModal,
  onOpenDisposalModal
}) => {
  const [selectedYear, setSelectedYear] = useState<number | "ALL">(2026);
  const [chartViewMode, setChartViewMode] = useState<"actions" | "lifecycle">("actions");
  const [activeSliceKey, setActiveSliceKey] = useState<string | null>(null);
  const [actionFilterTab, setActionFilterTab] = useState<"all" | "extended" | "disposed">("all");
  const [selectedProtocolItem, setSelectedProtocolItem] = useState<AnnualArchivalActionItem | null>(null);

  // Compute the analytical retention report based on the selected year and documents
  const report = useMemo(() => {
    return getRetentionAnnualReport(documents, selectedYear);
  }, [documents, selectedYear]);

  // Current pie data based on view mode
  const activePieData: ArchivalPieSlice[] = useMemo(() => {
    return chartViewMode === "actions" ? report.actionsPieData : report.lifecyclePieData;
  }, [chartViewMode, report]);

  // Filter the actions list based on the active slice or action filter tab
  const filteredActions = useMemo(() => {
    let list = report.actionsList;

    if (actionFilterTab === "extended") {
      list = list.filter((a) => a.actionType === "extended");
    } else if (actionFilterTab === "disposed") {
      list = list.filter((a) => a.actionType === "disposed");
    }

    if (activeSliceKey) {
      if (activeSliceKey === "extended") {
        list = list.filter((a) => a.actionType === "extended");
      } else if (activeSliceKey === "disposed") {
        list = list.filter((a) => a.actionType === "disposed");
      }
    }

    return list;
  }, [report.actionsList, actionFilterTab, activeSliceKey]);

  // Handle clicking a pie slice
  const handlePieSliceClick = (entry: ArchivalPieSlice) => {
    if (activeSliceKey === entry.key) {
      setActiveSliceKey(null); // toggle off
    } else {
      setActiveSliceKey(entry.key);
      if (entry.key === "extended") {
        setActionFilterTab("extended");
      } else if (entry.key === "disposed") {
        setActionFilterTab("disposed");
      }
    }
  };

  // Printable report preview / trigger
  const handlePrintReport = () => {
    window.print();
  };

  // Export report data as JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `تقرير_الإجراءات_الأرشيفية_${selectedYear}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <section 
      id="retention-annual-report-card"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
    >
      {/* Official Header Strip */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#103322] to-slate-900 text-white p-5 sm:p-6 border-b border-emerald-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Scale className="w-3.5 h-3.5" />
                <span>ديوان المحاسبة & قانون الأرشيف الوطني رقم 24 لسنة 1970</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                <span>الامتثال الرقابي 100%</span>
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold font-['Amiri',serif] text-emerald-50 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-amber-400" />
              <span>لوحة الإجراءات الأرشيفية وتقارير الحفظ والإتلاف السنوية</span>
            </h3>

            <p className="text-xs text-emerald-200/80 max-w-3xl leading-relaxed">
              تقرير إحصائي بياني يرصد القرارات الوزارية لتمديد الصلاحية ومحاضر لجان الإتلاف النظامي والتطهير الرقمي المعتمدة خلال العام المالي، مدعوماً بالمخطط الدائري التفاعلي لتوزيع الإجراءات.
            </p>
          </div>

          {/* Controls: Year Selector & Export Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start lg:self-auto">
            {/* Year Selector */}
            <div className="flex items-center bg-emerald-900/60 rounded-xl p-1 border border-emerald-700/50">
              <span className="text-[11px] font-bold text-emerald-200 px-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>السنة:</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="year-btn-2026"
                  onClick={() => setSelectedYear(2026)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    selectedYear === 2026
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "text-emerald-100 hover:bg-emerald-800/60"
                  }`}
                >
                  2026 (الحالي)
                </button>
                <button
                  type="button"
                  id="year-btn-2025"
                  onClick={() => setSelectedYear(2025)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    selectedYear === 2025
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "text-emerald-100 hover:bg-emerald-800/60"
                  }`}
                >
                  2025
                </button>
                <button
                  type="button"
                  id="year-btn-all"
                  onClick={() => setSelectedYear("ALL")}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                    selectedYear === "ALL"
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "text-emerald-100 hover:bg-emerald-800/60"
                  }`}
                >
                  كافة الأعوام
                </button>
              </div>
            </div>

            {/* Print & Export Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportJSON}
                title="تصدير بيانات التقرير بتنسيق JSON"
                className="p-2 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50 text-xs flex items-center gap-1 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تصدير</span>
              </button>
              <button
                type="button"
                onClick={handlePrintReport}
                title="طباعة التقرير السنوي المعتمد"
                className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs flex items-center gap-1 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">طباعة</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200/80">
        {/* KPI 1: Extended Documents */}
        <div 
          onClick={() => {
            setActionFilterTab("extended");
            setActiveSliceKey("extended");
          }}
          className={`p-4 rounded-xl border transition cursor-pointer relative group ${
            actionFilterTab === "extended" || activeSliceKey === "extended"
              ? "bg-emerald-50/90 border-emerald-500 shadow-sm"
              : "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">وثائق تم تمديد صلاحيتها</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-900 font-mono">
              {report.extendedCount}
            </span>
            <span className="text-xs font-semibold text-emerald-700">سجلات ممددة</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>بقرارات وزارية معتمدة</span>
            <span className="text-emerald-800 font-bold group-hover:translate-x-[-2px] transition flex items-center gap-0.5">
              <span>تصفية</span>
              <ChevronLeft className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 2: Disposed Documents */}
        <div 
          onClick={() => {
            setActionFilterTab("disposed");
            setActiveSliceKey("disposed");
          }}
          className={`p-4 rounded-xl border transition cursor-pointer relative group ${
            actionFilterTab === "disposed" || activeSliceKey === "disposed"
              ? "bg-red-50/90 border-red-500 shadow-sm"
              : "bg-white border-slate-200 hover:border-red-400 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">وثائق تم إتلافها نظامياً</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-800 flex items-center justify-center group-hover:scale-110 transition">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-900 font-mono">
              {report.disposedCount}
            </span>
            <span className="text-xs font-semibold text-red-700">محاضر لجان</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>بمشاركة ديوان المحاسبة</span>
            <span className="text-red-800 font-bold group-hover:translate-x-[-2px] transition flex items-center gap-0.5">
              <span>تصفية</span>
              <ChevronLeft className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 3: Total Actions In Period */}
        <div 
          onClick={() => {
            setActionFilterTab("all");
            setActiveSliceKey(null);
          }}
          className={`p-4 rounded-xl border transition cursor-pointer relative group ${
            actionFilterTab === "all" && !activeSliceKey
              ? "bg-indigo-50/90 border-indigo-500 shadow-sm"
              : "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">إجمالي الإجراءات الأرشيفية</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center group-hover:scale-110 transition">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-950 font-mono">
              {report.totalActionsCount}
            </span>
            <span className="text-xs font-semibold text-indigo-700">إجراء نافذ</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>خلال {selectedYear === "ALL" ? "كافة الأعوام" : `سنة ${selectedYear} م`}</span>
            <span className="text-indigo-800 font-bold group-hover:translate-x-[-2px] transition flex items-center gap-0.5">
              <span>عرض الكل</span>
              <ChevronLeft className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 4: Compliance & Digital Custody */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">نسبة الامتثال والتوثيق الرقابي</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-mono">
              100%
            </span>
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مطابق وموثق</span>
            </span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">
            <span>شهادات SHA-256 وأرقام المحاضر</span>
          </div>
        </div>
      </div>

      {/* Main Analysis Body: Pie Chart on Left/Right + Analysis & Actions */}
      <div className="p-5 sm:p-6 space-y-6">
        {/* Pie Chart Header with Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-800" />
              <span>
                {chartViewMode === "actions"
                  ? "توزيع نسب الإجراءات الأرشيفية (تمديد الصلاحية ومحاضر الإتلاف)"
                  : "دورة حياة الحفظ الشاملة للرصيد الأرشيفي الوطني"}
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              انقر على أي شريحة من المخطط الدائري لتصفية الوثائق والمحاضر المرتبطة بها فوراً
            </p>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs">
            <button
              type="button"
              id="chart-mode-actions"
              onClick={() => setChartViewMode("actions")}
              className={`px-3 py-1.5 font-bold rounded-lg transition ${
                chartViewMode === "actions"
                  ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              نسب الإجراءات الأرشيفية
            </button>
            <button
              type="button"
              id="chart-mode-lifecycle"
              onClick={() => setChartViewMode("lifecycle")}
              className={`px-3 py-1.5 font-bold rounded-lg transition ${
                chartViewMode === "lifecycle"
                  ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              دورة الحفظ الكاملة
            </button>
          </div>
        </div>

        {/* The Visual Grid: Pie Chart Container + Interactive Slice Legend Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Recharts Pie Chart Interactive Stage */}
          <div className="lg:col-span-6 bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center relative min-h-[320px]">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={activePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    onClick={(_entry, index) => {
                      if (activePieData[index]) {
                        handlePieSliceClick(activePieData[index]);
                      }
                    }}
                    cursor="pointer"
                  >
                    {activePieData.map((entry, index) => {
                      const isSelected = activeSliceKey === entry.key;
                      return (
                        <Cell
                          key={`slice-${index}`}
                          fill={isSelected ? entry.hoverColor : entry.color}
                          stroke={isSelected ? "#000000" : "#ffffff"}
                          strokeWidth={isSelected ? 3 : 2}
                          className="transition-all duration-300"
                        />
                      );
                    })}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as ArchivalPieSlice;
                        return (
                          <div className="bg-slate-950/95 text-white p-3 rounded-xl shadow-xl border border-emerald-500/30 text-xs space-y-1.5 max-w-xs backdrop-blur-md">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                              <span className="font-bold text-amber-300">{data.name}</span>
                              <span className="font-mono font-bold bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 text-[10px]">
                                {data.percentage}%
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300">
                              {data.countLabel}
                            </div>
                            <div className="text-[10px] text-amber-200/90 font-medium">
                              السند: {data.legalBasis}
                            </div>
                            <div className="text-[10px] text-slate-400 leading-normal">
                              {data.description}
                            </div>
                            <div className="text-[9px] text-emerald-400 font-bold pt-1">
                              انقر للتصفية في جدول السجلات ➔
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-[11px] font-bold text-slate-700 px-1">
                        {value}
                      </span>
                    )}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Centered Donut Badge */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[70px] pointer-events-none text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {selectedYear === "ALL" ? "كافة الأعوام" : `عام ${selectedYear}`}
              </span>
              <span className="text-xl font-black text-slate-900 font-mono block">
                {chartViewMode === "actions" ? report.totalActionsCount : report.totalArchiveCount}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 block">
                {chartViewMode === "actions" ? "إجراء أرشيفي" : "وثيقة محفوظة"}
              </span>
            </div>
          </div>

          {/* Slices Breakdown & Legal Reference Cards */}
          <div className="lg:col-span-6 space-y-2.5">
            {activePieData.map((slice) => {
              const isSelected = activeSliceKey === slice.key;
              return (
                <div
                  key={slice.key}
                  onClick={() => handlePieSliceClick(slice)}
                  className={`p-3 rounded-xl border text-xs transition cursor-pointer group ${
                    isSelected
                      ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-200"
                      : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="font-bold text-slate-900 group-hover:text-emerald-950">
                        {slice.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-slate-800">{slice.countLabel}</span>
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-700">
                        {slice.percentage}%
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed pr-5">
                    {slice.description}
                  </p>

                  <div className="mt-1 pr-5 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span className="text-amber-800">
                      السند القانوني: {slice.legalBasis}
                    </span>
                    <span className="text-emerald-800 font-bold group-hover:underline">
                      {isSelected ? "إلغاء التصفية" : "تصفية السجلات ➔"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Archival Action Dossier (تمديد وإتلاف خلال العام) */}
        <div className="pt-4 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-800" />
                <span>سجل القرارات والمحاضر الأرشيفية المعتمدة ({filteredActions.length} إجراء)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                قائمة تفصيلية بالوثائق التي خضعت للتمديد الوزاري أو الإتلاف النظامي بموجب محاضر ديوان المحاسبة
              </p>
            </div>

            {/* Filter Tabs for the table */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs self-start sm:self-auto">
              <button
                type="button"
                id="filter-all-actions"
                onClick={() => {
                  setActionFilterTab("all");
                  setActiveSliceKey(null);
                }}
                className={`px-3 py-1 font-bold rounded-lg transition ${
                  actionFilterTab === "all" && !activeSliceKey
                    ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                الكل ({report.totalActionsCount})
              </button>
              <button
                type="button"
                id="filter-extended-actions"
                onClick={() => {
                  setActionFilterTab("extended");
                  setActiveSliceKey("extended");
                }}
                className={`px-3 py-1 font-bold rounded-lg transition ${
                  actionFilterTab === "extended"
                    ? "bg-white text-emerald-950 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                تمديد الحفظ ({report.extendedCount})
              </button>
              <button
                type="button"
                id="filter-disposed-actions"
                onClick={() => {
                  setActionFilterTab("disposed");
                  setActiveSliceKey("disposed");
                }}
                className={`px-3 py-1 font-bold rounded-lg transition ${
                  actionFilterTab === "disposed"
                    ? "bg-white text-red-950 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                محاضر الإتلاف ({report.disposedCount})
              </button>
            </div>
          </div>

          {/* Action List Table / Cards */}
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500">
              <Info className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-sm text-slate-700">لا توجد إجراءات مسجلة مطابقة لمعيار التصفية المحدد</p>
              <p className="text-xs text-slate-400 mt-1">
                يمكنك تغيير سنة العرض أو اختيار تصفية أخرى من المخطط الدائري أعلاه.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActions.map((action) => {
                const isExtended = action.actionType === "extended";
                return (
                  <div
                    key={action.id}
                    className={`p-4 rounded-xl border text-xs transition ${
                      isExtended
                        ? "bg-white border-emerald-200 hover:border-emerald-400 hover:shadow-sm"
                        : "bg-white border-red-200 hover:border-red-400 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      {/* Right info block */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1 ${
                              isExtended
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                            }`}
                          >
                            {isExtended ? (
                              <>
                                <Clock className="w-3 h-3" />
                                <span>تمديد حفظ ({action.extensionDuration})</span>
                              </>
                            ) : (
                              <>
                                <Trash2 className="w-3 h-3" />
                                <span>إتلاف نظامي معتمد</span>
                              </>
                            )}
                          </span>

                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {action.docRef}
                          </span>

                          <span className="text-[11px] text-slate-500 font-medium">
                            {action.department}
                          </span>

                          <span className="text-[10px] text-slate-400">
                            {action.era}
                          </span>
                        </div>

                        <h5 className="text-sm font-bold text-slate-950 font-['Amiri',serif]">
                          {action.docTitle}
                        </h5>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          <span className="font-bold text-slate-800">مبرر الإجراء: </span>
                          {action.justification}
                        </p>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                          <div>
                            <span className="font-semibold text-slate-700">رقم القرار / المحضر: </span>
                            <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              {action.decisionOrReference}
                            </span>
                          </div>

                          <div>
                            <span className="font-semibold text-slate-700">تاريخ النفاذ: </span>
                            <span className="font-mono text-slate-800">{action.actionDate}</span>
                          </div>

                          <div>
                            <span className="font-semibold text-slate-700">المسؤول / الوزير: </span>
                            <span className="text-slate-800">{action.responsibleOfficial}</span>
                          </div>

                          {action.auditBureauRepresentative && (
                            <div>
                              <span className="font-semibold text-slate-700">مندوب ديوان المحاسبة: </span>
                              <span className="text-slate-800">{action.auditBureauRepresentative}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Left action buttons */}
                      <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0">
                        {onSelectDocument && (
                          <button
                            type="button"
                            onClick={() => onSelectDocument(action.document)}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-950 border border-slate-200 hover:border-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>معاينة الوثيقة</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedProtocolItem(action)}
                          className={`w-full px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                            isExtended
                              ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100"
                              : "bg-red-50 text-red-900 border-red-300 hover:bg-red-100"
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{isExtended ? "عرض نص القرار" : "شهادة ومحضر الإتلاف"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Protocol & Certificate Modal Dialog */}
      {selectedProtocolItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-300 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 border-b border-emerald-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-base font-['Amiri',serif]">
                  {selectedProtocolItem.actionType === "extended"
                    ? "القرار الوزاري المعتمد لتمديد فترة الحفظ"
                    : "محضر لجنة الإتلاف النظامي وشهادة التطهير الرقمي"}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProtocolItem(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-amber-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-xs block">توثيق رقابي رسمي معتمد</span>
                  <p className="text-[11px] leading-relaxed text-amber-900">
                    هذا المحضر صادر بموجب أحكام المادة (18) من قانون الأرشيف الوطني رقم 24 لسنة 1970 ولائحة ديوان المحاسبة لمراقبة الحسابات العامة.
                  </p>
                </div>
              </div>

              {/* Document Overview */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-slate-500">
                  <span>الوثيقة المعنية:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedProtocolItem.docRef}</span>
                </div>
                <div className="font-bold text-slate-900 text-sm font-['Amiri',serif]">
                  {selectedProtocolItem.docTitle}
                </div>
                <div className="text-slate-500 flex items-center gap-3">
                  <span>الإدارة: {selectedProtocolItem.department}</span>
                  <span>•</span>
                  <span>الحقبة: {selectedProtocolItem.era}</span>
                </div>
              </div>

              {/* Protocol Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">رقم المرجع الرسمي:</span>
                  <span className="font-bold font-mono text-emerald-900 text-sm">
                    {selectedProtocolItem.decisionOrReference}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">تاريخ الإصدار والنفاذ:</span>
                  <span className="font-bold font-mono text-slate-800 text-sm">
                    {selectedProtocolItem.actionDate}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">السلطة المصدرة:</span>
                  <span className="font-bold text-slate-800">
                    {selectedProtocolItem.responsibleOfficial}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-1">ممثل ديوان المحاسبة:</span>
                  <span className="font-bold text-slate-800">
                    {selectedProtocolItem.auditBureauRepresentative || "معتمد في السجل العام"}
                  </span>
                </div>
              </div>

              {/* Justification & Legal Citation */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block">السند القانوني والمبرر:</span>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {selectedProtocolItem.justification}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  {selectedProtocolItem.legalAuthority}
                </div>
              </div>

              {/* SHA-256 Proof & Destruction Method if disposal */}
              {selectedProtocolItem.actionType === "disposed" && (
                <div className="space-y-2 p-3.5 bg-red-50/60 rounded-xl border border-red-200">
                  <div className="flex items-center gap-1.5 text-red-900 font-bold">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>طريقة التطهير والإتلاف:</span>
                  </div>
                  <p className="text-red-950 font-medium">
                    {selectedProtocolItem.destructionMethod || "إتلاف وتطهير رقمي مشفر (DoD 5220.22-M) وطحن مادي محكم"}
                  </p>
                  {selectedProtocolItem.certificateSha256 && (
                    <div className="pt-2 border-t border-red-200">
                      <span className="text-[10px] text-red-800 block mb-0.5">بصمة شهادة الإتلاف الرقمية SHA-256:</span>
                      <code className="font-mono text-[10px] text-red-900 bg-red-100/80 px-2 py-1 rounded block select-all break-all border border-red-200">
                        {selectedProtocolItem.certificateSha256}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {/* Extension details if extended */}
              {selectedProtocolItem.actionType === "extended" && (
                <div className="space-y-2 p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                    <Clock className="w-4 h-4 text-emerald-700" />
                    <span>مدة التمديد وتاريخ الانتهاء الجديد:</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-950 font-bold">
                      فترة التمديد المقررة: {selectedProtocolItem.extensionDuration}
                    </span>
                    <span className="font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      تاريخ الانتهاء الجديد: {selectedProtocolItem.newExpiryDate}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>محضر مسجل وموثق بالسجل الوطني الموحد</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedProtocolItem(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
              >
                إغلاق المحضر
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
