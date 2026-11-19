import React from "react";
import { 
  Eye, 
  Moon, 
  Sun, 
  Type, 
  AlignJustify, 
  Sliders, 
  RotateCcw, 
  Sparkles,
  Contrast,
  BookOpen,
  Check
} from "lucide-react";
import { 
  ReadingModeSettings, 
  ReadingContrastTheme, 
  ReadingFontSize, 
  ReadingLineSpacing, 
  ReadingFontFamily 
} from "../types";

interface ComfortableReadingToolbarProps {
  settings: ReadingModeSettings;
  onChangeSettings: (settings: ReadingModeSettings) => void;
  onReset: () => void;
}

export const THEME_PALETTES: Record<ReadingContrastTheme, {
  name: string;
  shortLabel: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  paperBg: string;
  paperText: string;
  paperBorder: string;
  badgeBg: string;
  badgeText: string;
  previewBg: string;
  previewBorder: string;
  description: string;
}> = {
  parchment: {
    name: "مخطوطة أصلية دافئة (Parchment)",
    shortLabel: "مخطوطة",
    bgClass: "bg-[#fcfaf2]",
    textClass: "text-[#2c2214]",
    borderClass: "border-[#dcd3bc]",
    paperBg: "#fcfaf2",
    paperText: "#2c2214",
    paperBorder: "#dcd3bc",
    badgeBg: "#f5edd8",
    badgeText: "#6d4c1b",
    previewBg: "bg-[#fcfaf2]",
    previewBorder: "border-[#dcd3bc]",
    description: "محاكاة الورق الأرشيفي الطبيعي بلون عاجي دافئ مهدئ للبصر"
  },
  sepia_eye_care: {
    name: "حماية العين - عنبري دافئ (Sepia Eye-Care)",
    shortLabel: "عنبري (حماية)",
    bgClass: "bg-[#f5edd8]",
    textClass: "text-[#3a2512]",
    borderClass: "border-[#dfcaa4]",
    paperBg: "#f5edd8",
    paperText: "#3a2512",
    paperBorder: "#dfcaa4",
    badgeBg: "#ebd7b6",
    badgeText: "#5c330f",
    previewBg: "bg-[#f5edd8]",
    previewBorder: "border-[#d8be92]",
    description: "فلترة متقدمة للضوء الأزرق بتقليل الوهج أثناء جلسات التدقيق المسائية"
  },
  night_velvet: {
    name: "الوضع الليلي المخملي (Night Velvet)",
    shortLabel: "ليلي هادئ",
    bgClass: "bg-[#111a14]",
    textClass: "text-[#e2e8f0]",
    borderClass: "border-[#25392d]",
    paperBg: "#111a14",
    paperText: "#e2e8f0",
    paperBorder: "#25392d",
    badgeBg: "#18261e",
    badgeText: "#fcd34d",
    previewBg: "bg-[#111a14]",
    previewBorder: "border-emerald-600",
    description: "خلفية زيتونية فاحمة مع خطوط ذهبية خافتة تمنع إجهاد العين في الغرف المظلمة"
  },
  high_contrast: {
    name: "تدقيق عالي التباين (High Contrast Forensic)",
    shortLabel: "عالي التباين",
    bgClass: "bg-white",
    textClass: "text-[#000000]",
    borderClass: "border-slate-800",
    paperBg: "#ffffff",
    paperText: "#000000",
    paperBorder: "#1e293b",
    badgeBg: "#0f172a",
    badgeText: "#ffffff",
    previewBg: "bg-white",
    previewBorder: "border-black",
    description: "تباين حاد 100% لإيضاح الأختام الباهتة والتوقيعات التاريخية الدقيقة"
  },
  yellow_on_black: {
    name: "أصفر على أسود (ضعاف البصر - Low Vision)",
    shortLabel: "أصفر/أسود",
    bgClass: "bg-black",
    textClass: "text-[#fef08a]",
    borderClass: "border-yellow-400",
    paperBg: "#050706",
    paperText: "#fef08a",
    paperBorder: "#eab308",
    badgeBg: "#1c1917",
    badgeText: "#fef08a",
    previewBg: "bg-black",
    previewBorder: "border-yellow-400",
    description: "أعلى تباين بصري معتمد طبياً لمساعدة الباحثين ذوي الحساسية البصرية وضعف النظر"
  },
  high_contrast_dark: {
    name: "عالي التباين داكن (White on Dark)",
    shortLabel: "أبيض/داكن",
    bgClass: "bg-[#090d0b]",
    textClass: "text-white",
    borderClass: "border-white",
    paperBg: "#090d0b",
    paperText: "#ffffff",
    paperBorder: "#ffffff",
    badgeBg: "#1f2937",
    badgeText: "#ffffff",
    previewBg: "bg-black",
    previewBorder: "border-white",
    description: "حبر أبيض فاقع على خلفية سوداء مانعة لتوهج الشاشة وإجهاد القرنية"
  },
  e_ink: {
    name: "ورق حبر إلكتروني غير لامع (Matte E-Ink)",
    shortLabel: "حبر إلكتروني",
    bgClass: "bg-[#eaeded]",
    textClass: "text-[#263238]",
    borderClass: "border-[#cfd8dc]",
    paperBg: "#eaeded",
    paperText: "#263238",
    paperBorder: "#cfd8dc",
    badgeBg: "#dde2e4",
    badgeText: "#37474f",
    previewBg: "bg-[#eaeded]",
    previewBorder: "border-slate-400",
    description: "محاكاة شاشات الورق الإلكتروني غير العاكسة لقراءة مريحة كأنها كتاب مطبوع"
  }
};

export const ComfortableReadingToolbar: React.FC<ComfortableReadingToolbarProps> = ({
  settings,
  onChangeSettings,
  onReset
}) => {
  const updateSetting = <K extends keyof ReadingModeSettings>(
    key: K,
    val: ReadingModeSettings[K]
  ) => {
    onChangeSettings({
      ...settings,
      [key]: val
    });
  };

  return (
    <div className="bg-white/95 backdrop-blur border border-amber-200/90 rounded-xl p-3 shadow-md space-y-3 text-xs">
      {/* Top Header & Activation Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-700">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900 font-['Amiri',serif] text-sm">
              <span>وضع القراءة المريح للوثائق الأرشيفية</span>
              {settings.isEnabled && (
                <span className="bg-emerald-100 text-emerald-900 text-[10px] font-sans px-2 py-0.2 rounded-full font-bold">
                  مُفعّل
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              تكييف التباين وإضاءة الخلفية لحماية البصر أثناء مراجعة النصوص التاريخية المطولة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateSetting("isEnabled", !settings.isEnabled)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-sm ${
              settings.isEnabled
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{settings.isEnabled ? "تعطيل وضع الراحة" : "تفعيل وضع الراحة"}</span>
          </button>

          {settings.isEnabled && (
            <button
              type="button"
              onClick={onReset}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="إعادة ضبط إعدادات القراءة"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* When enabled, show all ergonomic tuning controls */}
      {settings.isEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Palette theme selector */}
          <div className="md:col-span-6 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Contrast className="w-3 h-3 text-amber-600" />
              <span>نمط الإضاءة والتباين (Lighting & Palette):</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {(Object.keys(THEME_PALETTES) as ReadingContrastTheme[]).map((themeKey) => {
                const item = THEME_PALETTES[themeKey];
                const isSelected = settings.theme === themeKey;
                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => updateSetting("theme", themeKey)}
                    className={`relative p-1.5 rounded-lg border text-center transition flex flex-col items-center justify-between h-14 ${
                      isSelected
                        ? "border-amber-600 ring-2 ring-amber-400/40 shadow-sm bg-amber-50/50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                    title={`${item.name} - ${item.description}`}
                  >
                    <div
                      className={`w-5 h-3.5 rounded border shadow-inner ${item.previewBg} ${item.previewBorder}`}
                    />
                    <span className="text-[9px] font-semibold text-slate-800 line-clamp-1">
                      {item.shortLabel}
                    </span>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-500 italic">
              {THEME_PALETTES[settings.theme].description}
            </div>
          </div>

          {/* Typography Scale Controls */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Type className="w-3 h-3 text-amber-600" />
                <span>حجم الخط الأرشيفي:</span>
              </span>
              <button
                type="button"
                onClick={() => updateSetting("boldText", !settings.boldText)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold border transition ${
                  settings.boldText
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                }`}
                title="تغليظ الخط لتسهيل القراءة للباحثين"
              >
                {settings.boldText ? "خط سميك ✓" : "خط سميك B"}
              </button>
            </label>
            <div className="grid grid-cols-6 gap-1">
              {(
                [
                  { id: "small", label: "A-", size: "85%" },
                  { id: "normal", label: "A", size: "100%" },
                  { id: "medium", label: "A+", size: "120%" },
                  { id: "large", label: "A++", size: "140%" },
                  { id: "extra-large", label: "A+++", size: "170%" },
                  { id: "huge", label: "A★★", size: "210%" }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => updateSetting("fontSize", f.id as ReadingFontSize)}
                  className={`py-1.5 px-0.5 rounded-lg border text-center font-bold transition text-xs ${
                    settings.fontSize === f.id
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  title={`حجم الخط: ${f.size}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">نوع الخط:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => updateSetting("fontFamily", "amiri")}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    settings.fontFamily === "amiri"
                      ? "bg-white text-emerald-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  نسخي (أميري)
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting("fontFamily", "cairo")}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    settings.fontFamily === "cairo"
                      ? "bg-white text-emerald-900 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  حديث (القاهرة)
                </button>
              </div>
            </div>
          </div>

          {/* Line Spacing & Ambient Dimming */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <AlignJustify className="w-3 h-3 text-amber-600" />
              <span>تباعد الأسطر والمحيط:</span>
            </label>
            <div className="grid grid-cols-3 gap-1">
              {(
                [
                  { id: "compact", label: "عادي" },
                  { id: "relaxed", label: "مريح" },
                  { id: "spacious", label: "فسيح" }
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateSetting("lineSpacing", s.id as ReadingLineSpacing)}
                  className={`py-1.5 rounded-lg border text-center font-bold text-[11px] transition ${
                    settings.lineSpacing === s.id
                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={settings.dimSurroundings}
                  onChange={(e) => updateSetting("dimSurroundings", e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span className="font-medium">عزل الإضاءة المحيطة (وضع التركيز)</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
