import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";
import {
  BarChart3,
  Calendar,
  Layers,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Building2,
  ChevronDown,
  Info,
  SlidersHorizontal,
  ArrowUpDown,
  Eye,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  PieChart as PieIcon,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { ArchivedDocument, DepartmentType, LibyanEra } from "../types";

export type ArchivalStatusKey = "archived" | "in_circulation" | "disposed";

export interface ArchivalStatusInfo {
  key: ArchivalStatusKey;
  label: string;
  shortLabel: string;
  color: string;
  hoverColor: string;
  bgBadge: string;
  textBadge: string;
  borderBadge: string;
  description: string;
}

export const ARCHIVAL_STATUS_CONFIG: Record<ArchivalStatusKey, ArchivalStatusInfo> = {
  archived: {
    key: "archived",
    label: "مؤرشف ومعتمد (حفظ دائم ونظامي)",
    shortLabel: "مؤرشف",
    color: "#059669", // Emerald 600
    hoverColor: "#047857",
    bgBadge: "bg-emerald-50",
    textBadge: "text-emerald-800",
    borderBadge: "border-emerald-200",
    description: "وثائق مستقرة ومؤرشفة رقمياً ومحصنة في المستودع السيادي (WORM/Active)"
  },
  in_circulation: {
    key: "in_circulation",
    label: "قيد التداول والتدقيق الأرشيفي",
    shortLabel: "قيد التداول",
    color: "#d97706", // Amber 600
    hoverColor: "#b45309",
    bgBadge: "bg-amber-50",
    textBadge: "text-amber-800",
    borderBadge: "border-amber-200",
    description: "معاملات جارية تحت المراجعة الأرشيفية أو تقترب من موعد اتخاذ قرار نظامي"
  },
  disposed: {
    key: "disposed",
    label: "مُتلف / مرحّل للجنة الإتلاف القانوني",
    shortLabel: "مُتلف",
    color: "#e11d48", // Rose 600
    hoverColor: "#be123c",
    bgBadge: "bg-rose-50",
    textBadge: "text-rose-800",
    borderBadge: "border-rose-200",
    description: "سجلات منتهية الصلاحية النظامية أو مرحلة ومُتلفة بمحاضر لجان الجرد القانونية"
  }
};

/**
 * Determines the 3-category archival status for an ArchivedDocument
 */
export function getDocumentArchivalStatus(doc: ArchivedDocument): ArchivalStatusKey {
  // 1. Disposed / Flagged for statutory disposal / Destroyed
  const lcStatus = doc.retentionLifecycle?.status;
  if (
    lcStatus === "destroyed" ||
    lcStatus === "flagged_for_disposal" ||
    lcStatus === "expired" ||
    Boolean(doc.retentionLifecycle?.disposalRecord)
  ) {
    return "disposed";
  }

  // 2. In circulation / Under review / Expiring soon / Fresh processing
  if (
    doc.status === "قيد التدقيق الأرشيفي" ||
    doc.status === "معالجة جديدة" ||
    lcStatus === "expiring_soon"
  ) {
    return "in_circulation";
  }

  // 3. Officially Archived / Permanent / Active Sovereign Custody
  return "archived";
}

// Canonical departments list in Ministry of Finance
export const MOF_DEPARTMENTS: DepartmentType[] = [
  "إدارة الخزانة العامة",
  "إدارة الميزانية العامة والتخطيط المالي",
  "مصلحة الجمارك الليبية",
  "مصلحة الضرائب",
  "إدارة الحسابات والرقابة المالية",
  "مصلحة أملاك الدولة",
  "إدارة الدين العام والالتزامات المالية"
];

// Short labels for neat chart X-Axis presentation
export const DEPARTMENT_SHORT_LABELS: Record<string, string> = {
  "إدارة الخزانة العامة": "الخزانة العامة",
  "إدارة الميزانية العامة والتخطيط المالي": "الميزانية والتخطيط",
  "مصلحة الجمارك الليبية": "الجمارك الليبية",
  "مصلحة الضرائب": "الضرائب",
  "إدارة الحسابات والرقابة المالية": "الحسابات والرقابة",
  "مصلحة أملاك الدولة": "أملاك الدولة",
  "إدارة الدين العام والالتزامات المالية": "الدين العام"
};

type TimeFilterPreset = "ALL" | "KINGDOM" | "REPUBLIC" | "MODERN" | "LAST_10_YEARS" | "CUSTOM";
type ChartDisplayMode = "stacked" | "grouped" | "percent";

interface DepartmentArchivalStatusChartProps {
  documents: ArchivedDocument[];
  onSelectDocument?: (doc: ArchivedDocument) => void;
}

export const DepartmentArchivalStatusChart: React.FC<DepartmentArchivalStatusChartProps> = ({
  documents,
  onSelectDocument
}) => {
  // Time Filtering State
  const [timePreset, setTimePreset] = useState<TimeFilterPreset>("ALL");
  const [minYear, setMinYear] = useState<number>(1951);
  const [maxYear, setMaxYear] = useState<number>(2026);
  const [chartMode, setChartMode] = useState<ChartDisplayMode>("stacked");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<ArchivalStatusKey | "ALL">("ALL");
  const [activeDepartmentDrillDown, setActiveDepartmentDrillDown] = useState<string | null>(null);

  // Derive global min and max years from the documents collection
  const { docMinYear, docMaxYear } = useMemo(() => {
    let min = 1951;
    let max = 2026;
    if (documents.length > 0) {
      const years = documents.map((d) => d.year).filter((y) => Boolean(y) && !isNaN(y));
      if (years.length > 0) {
        min = Math.min(...years);
        max = Math.max(...years);
      }
    }
    return { docMinYear: min, docMaxYear: max };
  }, [documents]);

  // Handle Preset Time Selection
  const handleSelectTimePreset = (preset: TimeFilterPreset) => {
    setTimePreset(preset);
    if (preset === "ALL") {
      setMinYear(docMinYear);
      setMaxYear(docMaxYear);
    } else if (preset === "KINGDOM") {
      setMinYear(1951);
      setMaxYear(1969);
    } else if (preset === "REPUBLIC") {
      setMinYear(1969);
      setMaxYear(2011);
    } else if (preset === "MODERN") {
      setMinYear(2011);
      setMaxYear(docMaxYear);
    } else if (preset === "LAST_10_YEARS") {
      setMinYear(Math.max(1951, docMaxYear - 10));
      setMaxYear(docMaxYear);
    }
  };

  // Filter documents by time range and optional single status filter
  const timeFilteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const y = doc.year || 1951;
      const inTime = y >= minYear && y <= maxYear;
      if (!inTime) return false;

      if (timePreset === "KINGDOM" && !doc.era.includes("المملكة")) return false;
      if (timePreset === "REPUBLIC" && !doc.era.includes("الجمهورية")) return false;
      if (timePreset === "MODERN" && !doc.era.includes("الحديثة")) return false;

      return true;
    });
  }, [documents, minYear, maxYear, timePreset]);

  // Compute aggregated data per department for Recharts BarChart
  const chartData = useMemo(() => {
    // Collect all departments present or canonical
    const deptMap: Record<
      string,
      {
        department: string;
        shortName: string;
        archived: number;
        in_circulation: number;
        disposed: number;
        total: number;
        pctArchived: number;
        pctInCirculation: number;
        pctDisposed: number;
      }
    > = {};

    // Initialize canonical departments
    MOF_DEPARTMENTS.forEach((dept) => {
      deptMap[dept] = {
        department: dept,
        shortName: DEPARTMENT_SHORT_LABELS[dept] || dept,
        archived: 0,
        in_circulation: 0,
        disposed: 0,
        total: 0,
        pctArchived: 0,
        pctInCirculation: 0,
        pctDisposed: 0
      };
    });

    // Populate counts from timeFilteredDocuments
    timeFilteredDocuments.forEach((doc) => {
      const dept = doc.department || "إدارة الخزانة العامة";
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          shortName: DEPARTMENT_SHORT_LABELS[dept] || dept,
          archived: 0,
          in_circulation: 0,
          disposed: 0,
          total: 0,
          pctArchived: 0,
          pctInCirculation: 0,
          pctDisposed: 0
        };
      }

      const status = getDocumentArchivalStatus(doc);
      deptMap[dept][status]++;
      deptMap[dept].total++;
    });

    // Convert to array and calculate percentage distributions
    const result = Object.values(deptMap).map((entry) => {
      const tot = entry.total > 0 ? entry.total : 1;
      return {
        ...entry,
        pctArchived: Math.round((entry.archived / tot) * 100),
        pctInCirculation: Math.round((entry.in_circulation / tot) * 100),
        pctDisposed: Math.round((entry.disposed / tot) * 100)
      };
    });

    // Sort by total descending so largest departments appear first
    return result.sort((a, b) => b.total - a.total);
  }, [timeFilteredDocuments]);

  // Overall KPIs for the active filtered timeframe
  const kpiStats = useMemo(() => {
    let archived = 0;
    let inCirculation = 0;
    let disposed = 0;
    const total = timeFilteredDocuments.length;

    timeFilteredDocuments.forEach((doc) => {
      const st = getDocumentArchivalStatus(doc);
      if (st === "archived") archived++;
      else if (st === "in_circulation") inCirculation++;
      else if (st === "disposed") disposed++;
    });

    const topDept = chartData.length > 0 && chartData[0].total > 0 ? chartData[0] : null;

    return {
      total,
      archived,
      inCirculation,
      disposed,
      pctArchived: total > 0 ? Math.round((archived / total) * 100) : 0,
      pctInCirculation: total > 0 ? Math.round((inCirculation / total) * 100) : 0,
      pctDisposed: total > 0 ? Math.round((disposed / total) * 100) : 0,
      topDept
    };
  }, [timeFilteredDocuments, chartData]);

  // Documents for the currently active department drill-down
  const drillDownDocuments = useMemo(() => {
    if (!activeDepartmentDrillDown) return [];
    return timeFilteredDocuments.filter((d) => {
      const matchDept = d.department === activeDepartmentDrillDown;
      if (!matchDept) return false;
      if (selectedStatusFilter !== "ALL") {
        return getDocumentArchivalStatus(d) === selectedStatusFilter;
      }
      return true;
    });
  }, [timeFilteredDocuments, activeDepartmentDrillDown, selectedStatusFilter]);

  // Custom Tooltip for Recharts
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-950/95 text-white p-3.5 rounded-xl border border-slate-700 shadow-2xl text-xs space-y-2 min-w-[220px] text-right font-['Cairo',sans-serif]">
          <div className="border-b border-slate-700 pb-2">
            <span className="font-bold text-amber-300 block text-sm font-['Amiri',serif]">
              {data.department}
            </span>
            <span className="text-[11px] text-slate-400">
              إجمالي وثائق الفترة: <strong className="text-white font-mono">{data.total}</strong> وثيقة
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>مؤرشف ومعتمد:</span>
              </span>
              <span className="font-mono font-bold">
                {data.archived} ({data.pctArchived}%)
              </span>
            </div>

            <div className="flex items-center justify-between text-amber-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>قيد التداول:</span>
              </span>
              <span className="font-mono font-bold">
                {data.in_circulation} ({data.pctInCirculation}%)
              </span>
            </div>

            <div className="flex items-center justify-between text-rose-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>مُتلف / مرحل:</span>
              </span>
              <span className="font-mono font-bold">
                {data.disposed} ({data.pctDisposed}%)
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800 text-center">
            انقر على العمود لاستعراض تفاصيل السجلات
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6 text-right">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
            <span>لوحة المؤشرات البيانية التفاعلية • Recharts Engine</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-['Amiri',serif] text-slate-900 flex items-center gap-2">
            <span>توزيع الوثائق حسب الإدارة والحالة الأرشيفية</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              مؤرشف • قيد التداول • مُتلف
            </span>
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            استعراض الحالة التشغيلية والقانونية للأرشيف المالي لوزارة المالية موزعة على الإدارات والمصالح
            التابعة مع إمكانية الفلترة الزمنية والتحليل المعمق.
          </p>
        </div>

        {/* Chart View Mode Controls (Stacked vs Grouped vs Percent) */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setChartMode("stacked")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartMode === "stacked"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="عرض متراكم يعكس الحجم الكلي للإدارة مع نسب الحالات"
            >
              أعمدة متراكمة (Stacked)
            </button>
            <button
              type="button"
              onClick={() => setChartMode("grouped")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartMode === "grouped"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="مقارنة متجاورة مباشرة بين الحالات الثلاث"
            >
              أعمدة مجمعة (Grouped)
            </button>
            <button
              type="button"
              onClick={() => setChartMode("percent")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                chartMode === "percent"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="عرض النسب المئوية 100% لتحديد كفاءة الأرشفة"
            >
              نسب مئوية (100%)
            </button>
          </div>
        </div>
      </div>

      {/* INTERACTIVE TIME FILTERING BAR (الفلترة الزمنية التفاعلية) */}
      <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>الفلترة الزمنية التفاعلية (Interactive Temporal Filter):</span>
            <span className="font-mono text-emerald-900 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-300 font-bold">
              {minYear} - {maxYear} م
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>تحديث فوري للرسوم البيانية والمؤشرات الإحصائية</span>
            {(minYear !== docMinYear || maxYear !== docMaxYear || timePreset !== "ALL") && (
              <button
                type="button"
                onClick={() => handleSelectTimePreset("ALL")}
                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer mr-2"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة ضبط النطاق</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Time Presets Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 ml-1">الحقب والمحطات:</span>
          {[
            { id: "ALL", label: `كافة الفترات (${docMinYear} - ${docMaxYear})` },
            { id: "KINGDOM", label: "المملكة الليبية (1951 - 1969)" },
            { id: "REPUBLIC", label: "الجمهورية (1969 - 2011)" },
            { id: "MODERN", label: "ليبيا الحديثة (2011 - الآن)" },
            { id: "LAST_10_YEARS", label: "العقد الأخير (2016 - 2026)" }
          ].map((preset) => {
            const isActive = timePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectTimePreset(preset.id as TimeFilterPreset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  isActive
                    ? "bg-emerald-800 text-white border-emerald-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/50"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Fine-Tuning Year Range Slider & Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2">
          <div className="sm:col-span-3 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">من سنة:</span>
            <input
              type="number"
              min={docMinYear}
              max={maxYear}
              value={minYear}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setMinYear(Math.min(val, maxYear));
                  setTimePreset("CUSTOM");
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-6 px-2 flex flex-col justify-center">
            <div className="relative flex items-center">
              <input
                type="range"
                min={docMinYear}
                max={docMaxYear}
                value={maxYear}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setMaxYear(Math.max(val, minYear));
                  setTimePreset("CUSTOM");
                }}
                className="w-full accent-emerald-700 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>{docMinYear} م</span>
              <span>منتصف الفترة: {Math.round((docMinYear + docMaxYear) / 2)} م</span>
              <span>{docMaxYear} م</span>
            </div>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">إلى سنة:</span>
            <input
              type="number"
              min={minYear}
              max={docMaxYear}
              value={maxYear}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) {
                  setMaxYear(Math.max(val, minYear));
                  setTimePreset("CUSTOM");
                }
              }}
              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* DYNAMIC KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Documents in Timeframe */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>إجمالي وثائق الفترة</span>
            <Layers className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {kpiStats.total} <span className="text-xs font-normal text-slate-500">وثيقة</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            تغطي {chartData.filter((c) => c.total > 0).length} إدارات في وزارة المالية
          </div>
        </div>

        {/* Archived KPI */}
        <div
          onClick={() =>
            setSelectedStatusFilter((prev) => (prev === "archived" ? "ALL" : "archived"))
          }
          className={`p-4 rounded-xl border transition cursor-pointer space-y-1 ${
            selectedStatusFilter === "archived"
              ? "bg-emerald-100/80 border-emerald-500 ring-2 ring-emerald-300"
              : "bg-emerald-50/50 border-emerald-200 hover:border-emerald-400"
          }`}
          title="انقر لتصفية العرض على الوثائق المؤرشفة فقط"
        >
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>مؤرشف ومعتمد</span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-950">
            {kpiStats.archived}{" "}
            <span className="text-xs font-bold font-sans text-emerald-700">
              ({kpiStats.pctArchived}%)
            </span>
          </div>
          <div className="text-[11px] text-emerald-800 font-medium">
            حفظ سيادي دائم ونظامي مستقر
          </div>
        </div>

        {/* In Circulation KPI */}
        <div
          onClick={() =>
            setSelectedStatusFilter((prev) => (prev === "in_circulation" ? "ALL" : "in_circulation"))
          }
          className={`p-4 rounded-xl border transition cursor-pointer space-y-1 ${
            selectedStatusFilter === "in_circulation"
              ? "bg-amber-100/80 border-amber-500 ring-2 ring-amber-300"
              : "bg-amber-50/50 border-amber-200 hover:border-amber-400"
          }`}
          title="انقر لتصفية العرض على الوثائق قيد التداول فقط"
        >
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              <span>قيد التداول والتدقيق</span>
            </span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-950">
            {kpiStats.inCirculation}{" "}
            <span className="text-xs font-bold font-sans text-amber-700">
              ({kpiStats.pctInCirculation}%)
            </span>
          </div>
          <div className="text-[11px] text-amber-800 font-medium">
            معاملات نشطة وفحص أرشيفي جاري
          </div>
        </div>

        {/* Disposed KPI */}
        <div
          onClick={() =>
            setSelectedStatusFilter((prev) => (prev === "disposed" ? "ALL" : "disposed"))
          }
          className={`p-4 rounded-xl border transition cursor-pointer space-y-1 ${
            selectedStatusFilter === "disposed"
              ? "bg-rose-100/80 border-rose-500 ring-2 ring-rose-300"
              : "bg-rose-50/50 border-rose-200 hover:border-rose-400"
          }`}
          title="انقر لتصفية العرض على الوثائق المنتهية أو المتلفة"
        >
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span>مُتلف / مرحل للإتلاف</span>
            </span>
            <Trash2 className="w-4 h-4 text-rose-700" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-950">
            {kpiStats.disposed}{" "}
            <span className="text-xs font-bold font-sans text-rose-700">
              ({kpiStats.pctDisposed}%)
            </span>
          </div>
          <div className="text-[11px] text-rose-800 font-medium">
            انتهاء مدة الحفظ وقرارات لجان الفرز
          </div>
        </div>
      </div>

      {/* MAIN RECHARTS BAR CHART */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-emerald-800" />
            <span>رسم بياني توزيعي حسب الإدارات (انقر على أي شريط للاستعراض التفصيلي):</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#059669]" />
              <span>مؤرشف ({kpiStats.archived})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#d97706]" />
              <span>قيد التداول ({kpiStats.inCirculation})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#e11d48]" />
              <span>مُتلف ({kpiStats.disposed})</span>
            </span>
          </div>
        </div>

        <div className="h-80 sm:h-96 w-full pt-4 pb-2 bg-gradient-to-b from-white to-slate-50/50 rounded-2xl border border-slate-200">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 10, bottom: 40 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  const dept = state.activePayload[0].payload.department;
                  setActiveDepartmentDrillDown((prev) => (prev === dept ? null : dept));
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 11, fill: "#334155", fontWeight: 600 }}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b", fontFamily: "monospace" }}
                unit={chartMode === "percent" ? "%" : ""}
                allowDecimals={false}
              />
              <Tooltip content={renderCustomTooltip} />

              {chartMode === "percent" ? (
                <>
                  <Bar
                    dataKey="pctArchived"
                    name="مؤرشف (%)"
                    stackId="statusStack"
                    fill="#059669"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="pctInCirculation"
                    name="قيد التداول (%)"
                    stackId="statusStack"
                    fill="#d97706"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="pctDisposed"
                    name="مُتلف (%)"
                    stackId="statusStack"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                  />
                </>
              ) : chartMode === "stacked" ? (
                <>
                  <Bar
                    dataKey="archived"
                    name="مؤرشف"
                    stackId="statusStack"
                    fill="#059669"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="in_circulation"
                    name="قيد التداول"
                    stackId="statusStack"
                    fill="#d97706"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="disposed"
                    name="مُتلف"
                    stackId="statusStack"
                    fill="#e11d48"
                    radius={[4, 4, 0, 0]}
                  />
                </>
              ) : (
                <>
                  <Bar dataKey="archived" name="مؤرشف" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="in_circulation"
                    name="قيد التداول"
                    fill="#d97706"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="disposed" name="مُتلف" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DEPARTMENT DRILL-DOWN PANEL */}
      {activeDepartmentDrillDown && (
        <div className="bg-slate-50 border-2 border-emerald-600/60 rounded-2xl p-5 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 font-['Amiri',serif]">
                  تفاصيل وثائق: {activeDepartmentDrillDown}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  عرض الوثائق المطابقة للفترة الزمنية المختارة ({minYear} - {maxYear} م)
                  {selectedStatusFilter !== "ALL" && (
                    <span className="font-bold text-emerald-800 mr-1">
                      [حالة: {ARCHIVAL_STATUS_CONFIG[selectedStatusFilter].shortLabel}]
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
                {drillDownDocuments.length} وثائق
              </span>
              <button
                type="button"
                onClick={() => setActiveDepartmentDrillDown(null)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50 cursor-pointer"
              >
                إغلاق التفاصيل
              </button>
            </div>
          </div>

          {drillDownDocuments.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
              لا توجد وثائق لهذه الإدارة تطابق الفلترة المحددة.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
              {drillDownDocuments.map((doc) => {
                const st = getDocumentArchivalStatus(doc);
                const conf = ARCHIVAL_STATUS_CONFIG[st];
                return (
                  <div
                    key={doc.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                        {doc.refNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${conf.bgBadge} ${conf.textBadge} ${conf.borderBadge}`}
                      >
                        {conf.shortLabel}
                      </span>
                    </div>

                    <h5 className="font-bold text-slate-900 font-['Amiri',serif] line-clamp-1">
                      {doc.title}
                    </h5>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>السنة: <strong className="font-mono text-slate-700">{doc.year} م</strong></span>
                      <button
                        type="button"
                        onClick={() => onSelectDocument?.(doc)}
                        className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>معاينة الوثيقة</span>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
