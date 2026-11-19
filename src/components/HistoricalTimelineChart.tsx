import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
  ReferenceLine
} from "recharts";
import {
  TrendingUp,
  Calendar,
  Layers,
  History,
  Sparkles,
  Award,
  Filter,
  BarChart2,
  ChevronLeft
} from "lucide-react";
import { ArchivedDocument, LibyanEra } from "../types";

export interface HistoricalPeriodDrillDown {
  type: "decade" | "year" | "era";
  value: string | number;
  label: string;
  startYear?: number;
  endYear?: number;
}

interface HistoricalTimelineChartProps {
  documents: ArchivedDocument[];
  onSelectPeriod?: (period: HistoricalPeriodDrillDown) => void;
  selectedPeriodValue?: string | number | null;
}

type TimelineViewMode = "decades" | "years" | "eras";

interface DecadeStat {
  decadeKey: string;
  label: string;
  startYear: number;
  endYear: number;
  docCount: number;
  cumulativeCount: number;
  kingdomDocs: number;
  republicDocs: number;
  modernDocs: number;
  sampleRefs: string[];
}

interface YearStat {
  year: number;
  yearLabel: string;
  docCount: number;
  cumulativeCount: number;
  kingdomDocs: number;
  republicDocs: number;
  modernDocs: number;
  titles: string[];
}

export const HistoricalTimelineChart: React.FC<HistoricalTimelineChartProps> = ({
  documents,
  onSelectPeriod,
  selectedPeriodValue
}) => {
  const [viewMode, setViewMode] = useState<TimelineViewMode>("decades");
  const [showCumulative, setShowCumulative] = useState<boolean>(false);
  const [activeDecade, setActiveDecade] = useState<string | null>(null);

  // Compute years range and summary metrics
  const { minYear, maxYear, peakDecade, peakYear, totalCount } = useMemo(() => {
    if (documents.length === 0) {
      return { minYear: 1951, maxYear: 2024, peakDecade: "الخمسينيات", peakYear: 1958, totalCount: 0 };
    }
    const years = documents.map(d => d.year).filter(y => !isNaN(y));
    const min = Math.min(...years);
    const max = Math.max(...years);

    // Year frequencies
    const yearCounts: Record<number, number> = {};
    documents.forEach(d => {
      yearCounts[d.year] = (yearCounts[d.year] || 0) + 1;
    });

    let topYear = min;
    let maxDoc = 0;
    Object.entries(yearCounts).forEach(([y, c]) => {
      if (c > maxDoc) {
        maxDoc = c;
        topYear = Number(y);
      }
    });

    return {
      minYear: min,
      maxYear: max,
      peakDecade: "الخمسينيات والستينيات",
      peakYear: topYear,
      totalCount: documents.length
    };
  }, [documents]);

  // Decades Data (1950s - 2020s)
  const decadesData = useMemo(() => {
    const DECADE_RANGES = [
      { key: "1950s", label: "الخمسينيات (1950 - 1959)", startYear: 1950, endYear: 1959 },
      { key: "1960s", label: "الستينيات (1960 - 1969)", startYear: 1960, endYear: 1969 },
      { key: "1970s", label: "السبعينيات (1970 - 1979)", startYear: 1970, endYear: 1979 },
      { key: "1980s", label: "الثمانينيات (1980 - 1989)", startYear: 1980, endYear: 1989 },
      { key: "1990s", label: "التسعينيات (1990 - 1999)", startYear: 1990, endYear: 1999 },
      { key: "2000s", label: "الألفينيات (2000 - 2009)", startYear: 2000, endYear: 2009 },
      { key: "2010s", label: "عقد 2010 (2010 - 2019)", startYear: 2010, endYear: 2019 },
      { key: "2020s", label: "عقد 2020 (2020 - 2029)", startYear: 2020, endYear: 2029 },
    ];

    let runningSum = 0;

    return DECADE_RANGES.map((dec) => {
      const decDocs = documents.filter(
        (d) => d.year >= dec.startYear && d.year <= dec.endYear
      );
      runningSum += decDocs.length;

      const kingdomDocs = decDocs.filter((d) => d.era.includes("المملكة")).length;
      const republicDocs = decDocs.filter((d) => d.era.includes("الجمهورية")).length;
      const modernDocs = decDocs.filter((d) => d.era.includes("الحديثة")).length;

      return {
        decadeKey: dec.key,
        label: dec.label,
        shortLabel: dec.label.split(" ")[0],
        startYear: dec.startYear,
        endYear: dec.endYear,
        docCount: decDocs.length,
        cumulativeCount: runningSum,
        kingdomDocs,
        republicDocs,
        modernDocs,
        sampleRefs: decDocs.map((d) => d.refNumber).slice(0, 3),
      };
    });
  }, [documents]);

  // Yearly Data
  const yearlyData = useMemo(() => {
    // Generate sorted timeline of years with data or intervals
    const yearMap = new Map<number, ArchivedDocument[]>();
    
    // Group all documents by year
    documents.forEach((d) => {
      const list = yearMap.get(d.year) || [];
      list.push(d);
      yearMap.set(d.year, list);
    });

    // Determine min/max range with margin
    const start = Math.floor(Math.min(1951, minYear) / 5) * 5;
    const end = Math.ceil(Math.max(2024, maxYear) / 5) * 5;

    const result: YearStat[] = [];
    let running = 0;

    // To prevent an overly crowded axis, we construct a sequential list of years where documents exist
    // and include key milestone years
    const uniqueYears = Array.from(new Set([
      ...Array.from(yearMap.keys()),
      1951, 1960, 1970, 1980, 1990, 2000, 2011, 2020, 2024
    ])).filter(y => y >= start && y <= end).sort((a, b) => a - b);

    uniqueYears.forEach((yr) => {
      const docs = yearMap.get(yr) || [];
      running += docs.length;

      const kingdomDocs = docs.filter((d) => d.era.includes("المملكة")).length;
      const republicDocs = docs.filter((d) => d.era.includes("الجمهورية")).length;
      const modernDocs = docs.filter((d) => d.era.includes("الحديثة")).length;

      result.push({
        year: yr,
        yearLabel: `${yr} م`,
        docCount: docs.length,
        cumulativeCount: running,
        kingdomDocs,
        republicDocs,
        modernDocs,
        titles: docs.map((d) => d.title).slice(0, 2),
      });
    });

    return result;
  }, [documents, minYear, maxYear]);

  // Custom RTL Tooltip for Line Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      return (
        <div className="bg-[#0f2d1e] text-white p-3.5 rounded-xl border border-amber-500/40 shadow-2xl text-xs space-y-2 max-w-xs font-['Cairo',sans-serif] text-right" dir="rtl">
          <div className="border-b border-emerald-700/60 pb-1.5 flex items-center justify-between gap-2">
            <span className="font-bold text-amber-300 font-['Amiri'] text-sm">
              {dataPoint?.label || dataPoint?.yearLabel || label}
            </span>
            <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700 text-emerald-300">
              {dataPoint?.docCount ?? 0} وثيقة
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            {showCumulative && (
              <div className="flex items-center justify-between text-amber-200">
                <span>الإجمالي التراكمي:</span>
                <span className="font-bold font-mono">{dataPoint?.cumulativeCount} وثيقة</span>
              </div>
            )}
            <div className="flex items-center justify-between text-emerald-200">
              <span>المملكة الليبية (1951-1969):</span>
              <span className="font-bold font-mono">{dataPoint?.kingdomDocs ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-teal-200">
              <span>الجمهورية والجماهيرية (1969-2011):</span>
              <span className="font-bold font-mono">{dataPoint?.republicDocs ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-blue-200">
              <span>دولة ليبيا الحديثة (2011-الآن):</span>
              <span className="font-bold font-mono">{dataPoint?.modernDocs ?? 0}</span>
            </div>
          </div>

          {dataPoint?.sampleRefs && dataPoint.sampleRefs.length > 0 && (
            <div className="pt-1.5 border-t border-emerald-800 text-[10px] text-slate-300">
              <span className="text-amber-300 font-semibold block mb-0.5">أرقام إشارية نموذجية:</span>
              <span className="font-mono text-emerald-200">{dataPoint.sampleRefs.join(" • ")}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {/* Header with Title & Granularity Switchers */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
            <span>التحليل الكرونولوجي التفاعلي • Recharts Engine</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Amiri',serif]">
            توزيع وتدفق الوثائق المالية عبر العقود والسنوات التاريخية
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            رسم بياني خطي مدعوم بمكتبة Recharts لتتبع كثافة القرارات والمراسيم والميزانيات من تأسيس الدولة حتى اليوم.
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* View Mode Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode("decades")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === "decades"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              عبر العقود (10 سنوات)
            </button>
            <button
              onClick={() => setViewMode("years")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === "years"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              عبر السنوات التفصيلية
            </button>
            <button
              onClick={() => setViewMode("eras")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                viewMode === "eras"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              مقارنة الحقب (Multi-Line)
            </button>
          </div>

          {/* Cumulative Toggle */}
          <button
            onClick={() => setShowCumulative(!showCumulative)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              showCumulative
                ? "bg-amber-50 text-amber-900 border-amber-300 font-bold"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
            title="عرض المنحنى التراكمي لنمو الأرشيف"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>عرض التراكمي</span>
          </button>
        </div>
      </div>

      {/* Drill-down prompt hint */}
      {onSelectPeriod && (
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-semibold font-['Cairo']">
              ميزة التفصيل التفاعلي (Drill-Down): انقر على أي نقطة بيانية أو عقد زمني بالأسفل لاستعراض كافة الوثائق المحفوظة فيه مباشرة.
            </span>
          </div>
          {selectedPeriodValue && (
            <span className="bg-emerald-800 text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-md font-mono">
              محدد حالياً: {selectedPeriodValue}
            </span>
          )}
        </div>
      )}

      {/* Snapshot KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-slate-400 block text-[10px]">المدى الزمني للأرشيف</span>
          <div className="mt-1 font-bold font-mono text-slate-800 text-sm">
            {minYear} م — {maxYear} م
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">
            تغطية أكثر من 73 عاماً
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-slate-400 block text-[10px]">العقد الأكثر نشاطاً في الفهرس</span>
          <div className="mt-1 font-bold text-emerald-900 text-sm">
            الخمسينيات والستينيات
          </div>
          <span className="text-[10px] text-slate-500">
            مراسيم النفط ومجلس الإعمار
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-slate-400 block text-[10px]">معدل الوثائق لكل عقد</span>
          <div className="mt-1 font-bold font-mono text-amber-800 text-sm">
            ~{(totalCount / 8).toFixed(1)} وثيقة/عقد
          </div>
          <span className="text-[10px] text-slate-500">
            توزيع متوازن عبر 8 عقود
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-slate-400 block text-[10px]">سنة الذروة الإرشادية</span>
          <div className="mt-1 font-bold font-mono text-slate-900 text-sm">
            {peakYear} م
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">
            إتاوات النفط والميزانية الملكية
          </span>
        </div>
      </div>

      {/* Recharts Line Chart Container */}
      <div className="h-80 sm:h-96 w-full pt-2" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === "decades" ? (
            <LineChart
              data={decadesData}
              margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
              onClick={(state: any) => {
                if (!onSelectPeriod || !state || !state.activePayload || state.activePayload.length === 0) return;
                const p = state.activePayload[0].payload as DecadeStat;
                if (p && p.decadeKey) {
                  onSelectPeriod({
                    type: "decade",
                    value: p.decadeKey,
                    label: p.label,
                    startYear: p.startYear,
                    endYear: p.endYear
                  });
                }
              }}
            >
              <defs>
                <linearGradient id="emeraldLineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f2d1e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0f2d1e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tick={{ fill: "#475569" }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#475569" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
                formatter={(value) => (
                  <span className="text-slate-700 font-semibold font-['Cairo'] mr-2">
                    {value === "docCount"
                      ? "عدد الوثائق المؤرشفة بالعقد"
                      : value === "cumulativeCount"
                      ? "النمو التراكمي للوثائق"
                      : value}
                  </span>
                )}
              />
              {/* Primary Decades Line */}
              <Line
                type="monotone"
                dataKey="docCount"
                name="docCount"
                stroke="#0f2d1e"
                strokeWidth={3.5}
                dot={{ r: 5, fill: "#f59e0b", stroke: "#0f2d1e", strokeWidth: 2 }}
                activeDot={{ r: 8, fill: "#0f2d1e", stroke: "#f59e0b", strokeWidth: 3 }}
                isAnimationActive={true}
              />
              {showCumulative && (
                <Line
                  type="monotone"
                  dataKey="cumulativeCount"
                  name="cumulativeCount"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: "#d97706" }}
                  isAnimationActive={true}
                />
              )}
            </LineChart>
          ) : viewMode === "years" ? (
            <LineChart
              data={yearlyData}
              margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
              onClick={(state: any) => {
                if (!onSelectPeriod || !state || !state.activePayload || state.activePayload.length === 0) return;
                const p = state.activePayload[0].payload as YearStat;
                if (p && p.year) {
                  onSelectPeriod({
                    type: "year",
                    value: p.year,
                    label: `${p.year} م`
                  });
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="year"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tick={{ fill: "#475569" }}
                tickFormatter={(val) => `${val}م`}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#475569" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
                formatter={(value) => (
                  <span className="text-slate-700 font-semibold font-['Cairo'] mr-2">
                    {value === "docCount"
                      ? "الوثائق السنوية المؤرشفة"
                      : value === "cumulativeCount"
                      ? "المسار التراكمي السنوي"
                      : value}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="docCount"
                name="docCount"
                stroke="#047857"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10b981", stroke: "#047857", strokeWidth: 1.5 }}
                activeDot={{ r: 7, fill: "#0f2d1e", stroke: "#34d399", strokeWidth: 2 }}
                isAnimationActive={true}
              />
              {showCumulative && (
                <Line
                  type="monotone"
                  dataKey="cumulativeCount"
                  name="cumulativeCount"
                  stroke="#b45309"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}
            </LineChart>
          ) : (
            /* Multi-Line Eras Comparison */
            <LineChart
              data={decadesData}
              margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="shortLabel"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                tick={{ fill: "#475569" }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#475569" }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
                formatter={(value) => (
                  <span className="text-slate-700 font-semibold font-['Cairo'] mr-2">
                    {value === "kingdomDocs"
                      ? "المملكة الليبية (1951 - 1969)"
                      : value === "republicDocs"
                      ? "الجمهورية والجماهيرية (1969 - 2011)"
                      : value === "modernDocs"
                      ? "دولة ليبيا الحديثة (2011 - الآن)"
                      : value}
                  </span>
                )}
              />
              {/* Kingdom Line */}
              <Line
                type="monotone"
                dataKey="kingdomDocs"
                name="kingdomDocs"
                stroke="#d97706"
                strokeWidth={3}
                dot={{ r: 4, fill: "#f59e0b" }}
                activeDot={{ r: 7 }}
              />
              {/* Republic Line */}
              <Line
                type="monotone"
                dataKey="republicDocs"
                name="republicDocs"
                stroke="#047857"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10b981" }}
                activeDot={{ r: 7 }}
              />
              {/* Modern Line */}
              <Line
                type="monotone"
                dataKey="modernDocs"
                name="modernDocs"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4, fill: "#3b82f6" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Historical Milestones Breakdown Footer & Interactive Drill-Down Bar */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        {onSelectPeriod && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-700 ml-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-emerald-800" />
              <span>تفصيل السجلات حسب العقد:</span>
            </span>
            {decadesData.map((d) => {
              const isSelected = selectedPeriodValue === d.decadeKey;
              return (
                <button
                  key={d.decadeKey}
                  type="button"
                  onClick={() =>
                    onSelectPeriod({
                      type: "decade",
                      value: d.decadeKey,
                      label: d.label,
                      startYear: d.startYear,
                      endYear: d.endYear
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg border text-xs transition flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-emerald-900 text-amber-300 border-emerald-950 shadow font-bold"
                      : d.docCount > 0
                      ? "bg-white text-slate-700 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50/60"
                      : "bg-slate-50 text-slate-400 border-slate-100"
                  }`}
                  title={`انقر لعرض ${d.docCount} وثيقة في ${d.label}`}
                >
                  <span>{d.shortLabel}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {d.docCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-800" />
            <span className="font-semibold text-slate-700">
              العقود المشمولة في المنظومة:
            </span>
            <span className="font-mono text-slate-600">
              1950s • 1960s • 1970s • 1980s • 1990s • 2000s • 2010s • 2020s
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            انقر على أي عقد أو سنة لمشاهدة السجلات المرتبطة بها مباشرة
          </div>
        </div>
      </div>
    </div>
  );
};
