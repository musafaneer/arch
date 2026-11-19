import React, { useState, useEffect } from "react";
import { 
  Zap, 
  Keyboard, 
  Bell, 
  FileText, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  Scale, 
  Eye, 
  X,
  Clock,
  CheckCircle2,
  ScanLine
} from "lucide-react";
import { AppTabType } from "./Header";
import { LibyanEra } from "../types";

interface WorkflowSpeedBarProps {
  activeTab: AppTabType;
  setActiveTab: (tab: AppTabType) => void;
  retentionAlertsCount: number;
  onOpenRetentionAlerts: () => void;
  onQuickFilterExpiring?: () => void;
  onQuickFilterEra?: (era: LibyanEra | "ALL") => void;
  onOpenScanner: () => void;
}

export const WorkflowSpeedBar: React.FC<WorkflowSpeedBarProps> = ({
  activeTab,
  setActiveTab,
  retentionAlertsCount,
  onOpenRetentionAlerts,
  onQuickFilterExpiring,
  onQuickFilterEra,
  onOpenScanner
}) => {
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if (e.altKey) {
        if (e.key === "1") {
          e.preventDefault();
          setActiveTab("catalogue");
        } else if (e.key === "2") {
          e.preventDefault();
          setActiveTab("search-engine");
        } else if (e.key === "3") {
          e.preventDefault();
          setActiveTab("vault");
        } else if (e.key === "4") {
          e.preventDefault();
          onOpenScanner();
        } else if (e.key === "5") {
          e.preventDefault();
          setActiveTab("ai-query");
        } else if (e.key === "6") {
          e.preventDefault();
          setActiveTab("analytics");
        } else if (e.key === "a" || e.key === "A" || e.key === "ش") {
          e.preventDefault();
          onOpenRetentionAlerts();
        }
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowHotkeysModal((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [setActiveTab, onOpenScanner, onOpenRetentionAlerts]);

  return (
    <>
      {/* Sleek Workflow & Fast Navigation Speed Bar */}
      <div className="bg-white/80 backdrop-blur-xs border-b border-slate-200/80 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Left / Start: Quick Action Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            <div className="flex items-center gap-1 text-slate-500 font-bold text-[11px] shrink-0 pl-1">
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>تسريع الإجراءات:</span>
            </div>

            {/* Alert Center Trigger */}
            <button
              type="button"
              onClick={onOpenRetentionAlerts}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition shrink-0 border ${
                retentionAlertsCount > 0
                  ? "bg-amber-500 text-slate-950 border-amber-600 hover:bg-amber-400 shadow-xs animate-pulse"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
              title="مركز تنبيهات انتهاء دورة الحفظ (Alt + A)"
            >
              <Bell className="w-3 h-3" />
              <span>تنبيهات اللائحة</span>
              {retentionAlertsCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {retentionAlertsCount}
                </span>
              )}
              <kbd className="hidden sm:inline-block font-mono text-[9px] bg-black/10 px-1 rounded opacity-75">
                Alt+A
              </kbd>
            </button>

            {/* Quick Scanner */}
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 transition shrink-0"
              title="مسح ضوئي وأرشفة جديدة (Alt + 4)"
            >
              <ScanLine className="w-3 h-3 text-emerald-700" />
              <span>مسح ضوئي فوري</span>
              <kbd className="hidden sm:inline-block font-mono text-[9px] bg-emerald-200/60 px-1 rounded">
                Alt+4
              </kbd>
            </button>

            {/* Quick Filter: Expiring soon */}
            {onQuickFilterExpiring && (
              <button
                type="button"
                onClick={onQuickFilterExpiring}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 transition shrink-0"
                title="تصفية الوثائق التي تقترب من انتهاء فترة الحفظ القانونية"
              >
                <Clock className="w-3 h-3 text-amber-700" />
                <span>عاجل: تنتهي قريباً</span>
              </button>
            )}

            {/* Quick Filter: Kingdom Era */}
            {onQuickFilterEra && (
              <button
                type="button"
                onClick={() => onQuickFilterEra("المملكة الليبية (1951 - 1969)")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition shrink-0"
              >
                <span>المملكة الليبية</span>
              </button>
            )}

            {/* Quick Reading Mode Hint */}
            <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-500 bg-slate-50 border border-slate-100 shrink-0">
              <Eye className="w-3 h-3 text-amber-600" />
              <span>وضع القراءة المريح: <strong className="text-slate-700">Alt+R</strong> داخل المعاينة</span>
            </div>
          </div>

          {/* Right / End: Performance status & Hotkey Guide */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>استجابة فائقة السرعة: كاش الذاكرة النشط</span>
            </div>

            <button
              type="button"
              onClick={() => setShowHotkeysModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
              title="دليل اختصارات لوحة المفاتيح (?)"
            >
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              <span>الاختصارات</span>
              <kbd className="font-mono text-[9px] bg-slate-200 px-1 rounded">?</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showHotkeysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700">
                  <Keyboard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-['Amiri',serif]">
                    اختصارات لوحة المفاتيح لسرعة تدفق العمل
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    استخدم المفاتيح السريعة لإنجاز عمليات الأرشفة والتدقيق بدون استخدام الفأرة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHotkeysModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                التنقل السريع بين الأقسام (Navigation):
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span>سجل الوثائق التاريخية</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-xs font-mono font-bold">Alt + 1</kbd>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span>محرك البحث المالي</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-xs font-mono font-bold">Alt + 2</kbd>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span>الخزينة الرقمية المشفرة</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-xs font-mono font-bold">Alt + 3</kbd>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span>المسح الضوئي اللاورقي</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-xs font-mono font-bold">Alt + 4</kbd>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span>المساعد الذكي للأرشيف</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-xs font-mono font-bold">Alt + 5</kbd>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span>مؤشرات وإحصاءات الأرشيف</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-xs font-mono font-bold">Alt + 6</kbd>
                </div>
              </div>

              <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider pt-2">
                أدوات القراءة واللوائح (Reading & Retention):
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                  <span className="font-semibold text-amber-950">فتح مركز تنبيهات دورة الحفظ</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border border-amber-300 shadow-xs font-mono font-bold text-amber-900">Alt + A</kbd>
                </div>
                <div className="flex items-center justify-between bg-amber-50/70 p-2 rounded-lg border border-amber-200">
                  <span className="font-semibold text-amber-950">تفعيل / تعطيل وضع القراءة المريح للعين</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border border-amber-300 shadow-xs font-mono font-bold text-amber-900">Alt + R</kbd>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span>إغلاق أي نافذة أو معاينة</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-xs font-mono font-bold">Esc</kbd>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span>طباعة الإفادة الأرشيفية المعتمدة</span>
                  <kbd className="bg-white px-1.5 py-0.5 rounded border shadow-xs font-mono font-bold">Ctrl + P</kbd>
                </div>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowHotkeysModal(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs transition shadow-sm"
              >
                فهمت ذلك، إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
