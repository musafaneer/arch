import React from "react";
import { 
  Building2, 
  FileText, 
  Layers, 
  Sparkles, 
  BarChart3, 
  Scan, 
  ShieldCheck, 
  CheckCircle2, 
  History, 
  Printer, 
  Search, 
  Lock, 
  Key, 
  Shield,
  Bell,
  Tablet,
  Users,
  Database
} from "lucide-react";
import { LibyanEra, VaultUser } from "../types";
import { useAuth } from "../context/AuthContext";

export type AppTabType = "catalogue" | "search-engine" | "vault" | "scanner" | "ai-query" | "analytics";

interface HeaderProps {
  activeTab: AppTabType;
  setActiveTab: (tab: AppTabType) => void;
  documentCount: number;
  onOpenScanner: () => void;
  selectedEraFilter: LibyanEra | "ALL";
  setSelectedEraFilter: (era: LibyanEra | "ALL") => void;
  currentUser: VaultUser;
  retentionAlertsCount: number;
  onOpenRetentionAlerts: () => void;
  onOpenUserManagement?: () => void;
  onOpenLoginModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  documentCount,
  onOpenScanner,
  selectedEraFilter,
  setSelectedEraFilter,
  currentUser,
  retentionAlertsCount,
  onOpenRetentionAlerts,
  onOpenUserManagement,
  onOpenLoginModal
}) => {
  const { databaseStats } = useAuth();
  return (
    <header className="bg-gradient-to-b from-[#0f2d1e] via-[#143d28] to-[#0c2418] text-white border-b border-amber-500/30 shadow-xl sticky top-0 z-40">
      {/* Top Ministerial Bar */}
      <div className="border-b border-emerald-800/60 bg-[#081810]/70 py-1.5 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-emerald-200/90 font-medium">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50 text-amber-300 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              دولة ليبيا - وزارة المالية
            </span>
            <span className="hidden sm:inline text-emerald-300/70">|</span>
            <span className="hidden sm:inline">الخزينة الرقمية والأرشيف المالي السيادي الموحد</span>

            {/* Database Engine Indicator */}
            <button
              onClick={onOpenUserManagement}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/40 transition cursor-pointer"
              title="انقر لإدارة قاعدة البيانات والتبديل بين SQLite و PostgreSQL"
            >
              <Database className="w-3 h-3 text-amber-400" />
              <span>المحرك: {databaseStats?.currentEngine?.toUpperCase() || "SQLITE"}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* User Management & RBAC Console Trigger */}
            {onOpenUserManagement && (
              <button
                onClick={onOpenUserManagement}
                className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded-full border border-amber-400/50 text-amber-200 font-semibold transition"
                title="إدارة المستخدمين والصلاحيات والتحكم في قاعدة البيانات"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>إدارة المستخدمين والصلاحيات</span>
              </button>
            )}

            {/* Tablet Field Inspection Indicator */}
            <div className="hidden md:flex items-center gap-1.5 bg-emerald-900/90 px-3 py-1 rounded-full border border-emerald-600/70 text-amber-300 font-semibold shadow-xs">
              <Tablet className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px]">واجهة لوحية للتفتيش الرقابي</span>
            </div>

            {/* Active User Clearance Indicator / Login Modal Trigger */}
            <div
              onClick={onOpenLoginModal}
              className="cursor-pointer flex items-center gap-1.5 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-700 text-amber-200 hover:border-amber-400 hover:bg-emerald-900/80 transition min-h-[36px]"
              title="انقر لتسجيل الدخول أو تبديل الحساب المؤسسي"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">{currentUser.name}</span>
              <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded text-emerald-300 font-bold">
                {currentUser.clearanceLevel}
              </span>
            </div>

            <span className="hidden lg:flex items-center gap-1 text-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              تشفير AES-256 (WORM)
            </span>
          </div>
        </div>
      </div>

      {/* Main Brand & Action Area */}
      <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Logo & Emblem */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-0.5 shadow-lg shadow-black/40">
              <div className="w-full h-full rounded-[10px] bg-[#0c2418] flex flex-col items-center justify-center p-1 text-center border border-amber-400/40">
                <div className="text-amber-400 font-bold text-base leading-none font-['Amiri',serif]">
                  ليبيا
                </div>
                <div className="text-[8px] text-amber-200/80 mt-0.5 font-medium">
                  وزارة المالية
                </div>
                <div className="w-5 h-0.5 bg-amber-400/60 rounded-full mt-1"></div>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-600 border border-white/40"></div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-black font-['Amiri',serif] tracking-wide text-amber-100 flex items-center gap-2">
                  الأرشيف الرقمي لوزارة المالية الليبية
                </h1>
                <span className="hidden md:inline-block bg-amber-500/20 text-amber-300 text-[11px] px-2.5 py-0.5 rounded-full border border-amber-500/40 font-semibold">
                  الخزينة الرقمية السيادية
                </span>
              </div>
              <p className="text-xs sm:text-xs text-emerald-200/80 mt-0.5 max-w-2xl leading-relaxed">
                منظومة التحول اللاورقي المؤتمتة، الحفظ المشفر الدائم، ومحرك الفهرسة والبحث العربي المتقدم
              </p>
            </div>
          </div>

          {/* Quick Actions with 44px touch height on tablets */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 self-stretch lg:self-auto justify-between lg:justify-end">
            <button
              onClick={onOpenRetentionAlerts}
              className={`relative flex items-center gap-1.5 px-3.5 py-2.5 md:min-h-[44px] rounded-xl text-xs font-bold transition shadow ${
                retentionAlertsCount > 0
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/60 hover:bg-amber-500/30"
                  : "bg-emerald-950/70 text-emerald-200 border border-emerald-700/60 hover:bg-emerald-900/90"
              }`}
              title="التنبيهات الاستباقية لدورة حياة الوثائق وفق اللوائح الوطنية للحفظ"
            >
              <Bell className={`w-4 h-4 ${retentionAlertsCount > 0 ? "text-amber-400 animate-pulse" : "text-emerald-300"}`} />
              <span>تنبيهات الحفظ</span>
              {retentionAlertsCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full font-black animate-pulse">
                  {retentionAlertsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("vault")}
              className="flex items-center gap-1.5 bg-emerald-950/70 hover:bg-emerald-900/90 text-amber-200 border border-emerald-700/60 font-semibold px-3.5 py-2.5 md:min-h-[44px] rounded-xl text-xs transition shadow"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>الخزينة المشفرة</span>
            </button>

            <button
              id="btn-scan-document-main"
              onClick={onOpenScanner}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 md:min-h-[44px] rounded-xl shadow-lg shadow-amber-600/30 transition-all text-xs"
            >
              <Scan className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span>رقمنة وثيقة جديدة</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar with Tablet Touch Optimization */}
        <div className="mt-4 pt-2.5 border-t border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <nav className="flex items-center gap-1 sm:gap-1.5 md:gap-2 overflow-x-auto pb-1.5 md:pb-0 scrollbar-none text-xs touch-pan-x">
            <button
              id="tab-catalogue"
              onClick={() => setActiveTab("catalogue")}
              className={`flex items-center gap-1.5 px-3.5 py-2 md:min-h-[44px] rounded-xl font-semibold transition-all whitespace-nowrap ${
                activeTab === "catalogue"
                  ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                  : "text-emerald-100/80 hover:bg-emerald-800/50 hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>فهرس السجلات</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === "catalogue" ? "bg-black/20 text-slate-950 font-mono font-bold" : "bg-emerald-900 text-emerald-200 font-mono"
              }`}>
                {documentCount}
              </span>
            </button>

            <button
              id="tab-search-engine"
              onClick={() => setActiveTab("search-engine")}
              className={`flex items-center gap-1.5 px-3.5 py-2 md:min-h-[44px] rounded-xl font-semibold transition-all whitespace-nowrap ${
                activeTab === "search-engine"
                  ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                  : "text-emerald-100/80 hover:bg-emerald-800/50 hover:text-white"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>محرك البحث المتقدم</span>
            </button>

            <button
              id="tab-vault"
              onClick={() => setActiveTab("vault")}
              className={`flex items-center gap-1.5 px-3.5 py-2 md:min-h-[44px] rounded-xl font-semibold transition-all whitespace-nowrap ${
                activeTab === "vault"
                  ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                  : "text-emerald-100/80 hover:bg-emerald-800/50 hover:text-white"
              }`}
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>الخزينة الرقمية</span>
            </button>

            <button
              id="tab-scanner"
              onClick={() => setActiveTab("scanner")}
              className={`flex items-center gap-1.5 px-3.5 py-2 md:min-h-[44px] rounded-xl font-semibold transition-all whitespace-nowrap ${
                activeTab === "scanner"
                  ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                  : "text-emerald-100/80 hover:bg-emerald-800/50 hover:text-white"
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>محطة المسح</span>
            </button>

            <button
              id="tab-ai-query"
              onClick={() => setActiveTab("ai-query")}
              className={`flex items-center gap-1.5 px-3.5 py-2 md:min-h-[44px] rounded-xl font-semibold transition-all whitespace-nowrap ${
                activeTab === "ai-query"
                  ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                  : "text-emerald-100/80 hover:bg-emerald-800/50 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>المساعد الذكي</span>
            </button>

            <button
              id="tab-analytics"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3.5 py-2 md:min-h-[44px] rounded-xl font-semibold transition-all whitespace-nowrap ${
                activeTab === "analytics"
                  ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                  : "text-emerald-100/80 hover:bg-emerald-800/50 hover:text-white"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>مؤشرات التحول</span>
            </button>
          </nav>

          {/* Era Quick Selector with 40-44px touch targets on tablet */}
          <div className="flex items-center gap-1 text-xs text-emerald-200/90 bg-emerald-950/80 p-1 rounded-xl border border-emerald-800/60 overflow-x-auto">
            <span className="text-[11px] text-emerald-400/90 px-2 font-medium hidden sm:inline shrink-0">الحقبة:</span>
            <button
              onClick={() => setSelectedEraFilter("ALL")}
              className={`px-3 py-1.5 md:min-h-[38px] rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                selectedEraFilter === "ALL"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "hover:bg-emerald-800/50 text-emerald-200"
              }`}
            >
              كافة الحقب
            </button>
            <button
              onClick={() => setSelectedEraFilter("المملكة الليبية (1951 - 1969)")}
              className={`px-3 py-1.5 md:min-h-[38px] rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                selectedEraFilter === "المملكة الليبية (1951 - 1969)"
                  ? "bg-amber-600 text-white shadow-sm font-bold"
                  : "hover:bg-emerald-800/50 text-emerald-200"
              }`}
            >
              المملكة (1951-1969)
            </button>
            <button
              onClick={() => setSelectedEraFilter("حقبة الجمهورية والجماهيرية (1969 - 2011)")}
              className={`px-3 py-1.5 md:min-h-[38px] rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                selectedEraFilter === "حقبة الجمهورية والجماهيرية (1969 - 2011)"
                  ? "bg-emerald-600 text-white shadow-sm font-bold"
                  : "hover:bg-emerald-800/50 text-emerald-200"
              }`}
            >
              1969-2011
            </button>
            <button
              onClick={() => setSelectedEraFilter("دولة ليبيا الحديثة (2011 - الآن)")}
              className={`px-3 py-1.5 md:min-h-[38px] rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                selectedEraFilter === "دولة ليبيا الحديثة (2011 - الآن)"
                  ? "bg-blue-600 text-white shadow-sm font-bold"
                  : "hover:bg-emerald-800/50 text-emerald-200"
              }`}
            >
              دولة ليبيا (2011-الآن)
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
