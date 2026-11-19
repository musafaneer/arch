import React, { useState } from "react";
import { 
  Bell, 
  Clock, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  FileText, 
  Eye, 
  X, 
  Sparkles, 
  ExternalLink,
  Filter,
  Calendar,
  Building2,
  Scale,
  ShieldCheck,
  ChevronLeft
} from "lucide-react";
import { ArchivedDocument, VaultUser } from "../types";
import { 
  getProactiveRetentionAlerts, 
  formatRetentionCountdown 
} from "../utils/retentionLifecycle";

interface RetentionAlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documents: ArchivedDocument[];
  onOpenExtendModal: (doc: ArchivedDocument) => void;
  onOpenDisposalModal: (doc: ArchivedDocument) => void;
  onSelectDocument: (doc: ArchivedDocument) => void;
  currentUser: VaultUser;
}

export const RetentionAlertsDrawer: React.FC<RetentionAlertsDrawerProps> = ({
  isOpen,
  onClose,
  documents,
  onOpenExtendModal,
  onOpenDisposalModal,
  onSelectDocument,
  currentUser
}) => {
  const [filterType, setFilterType] = useState<"urgent" | "expiring_soon" | "expired" | "flagged" | "extended" | "all">("urgent");

  if (!isOpen) return null;

  const {
    expiringSoonDocs,
    expiredDocs,
    flaggedForDisposalDocs,
    extendedDocs,
    urgentAlerts,
    totalUrgentCount
  } = getProactiveRetentionAlerts(documents);

  // Filter documents based on active tab
  let displayedDocs: ArchivedDocument[] = [];
  if (filterType === "urgent") displayedDocs = urgentAlerts;
  else if (filterType === "expiring_soon") displayedDocs = expiringSoonDocs;
  else if (filterType === "expired") displayedDocs = expiredDocs;
  else if (filterType === "flagged") displayedDocs = flaggedForDisposalDocs;
  else if (filterType === "extended") displayedDocs = extendedDocs;
  else displayedDocs = documents;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f2d1e] via-[#143d28] to-[#0c2418] text-white p-4 sm:p-5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Bell className="w-5 h-5" />
              {totalUrgentCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-[#0c2418] animate-bounce">
                  {totalUrgentCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-['Amiri',serif] text-amber-100">
                  لوحة التنبيهات الاستباقية لدورة حياة الوثائق
                </h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 font-medium">
                  اللوائح الوطنية للحفظ
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                متابعة استباقية لمواعيد انتهاء دورات الحفظ القانونية، مع خيارات فورية للتمديد أو الترحيل للجنة الإتلاف
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-emerald-300 hover:text-white p-1.5 rounded-lg hover:bg-emerald-900/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div 
            onClick={() => setFilterType("expiring_soon")}
            className={`p-2.5 rounded-xl border cursor-pointer transition ${
              filterType === "expiring_soon"
                ? "bg-amber-50 border-amber-400 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-900 font-bold">تقترب من الانتهاء</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-700 mt-1 font-mono">
              {expiringSoonDocs.length}
            </div>
            <div className="text-[10px] text-amber-800/80 mt-0.5">أقل من 90 يوماً</div>
          </div>

          <div 
            onClick={() => setFilterType("expired")}
            className={`p-2.5 rounded-xl border cursor-pointer transition ${
              filterType === "expired"
                ? "bg-red-50 border-red-400 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-900 font-bold">منتهية دورة الحفظ</span>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-xl font-black text-red-700 mt-1 font-mono">
              {expiredDocs.length}
            </div>
            <div className="text-[10px] text-red-800/80 mt-0.5">تتطلب قراراً عاجلاً</div>
          </div>

          <div 
            onClick={() => setFilterType("flagged")}
            className={`p-2.5 rounded-xl border cursor-pointer transition ${
              filterType === "flagged"
                ? "bg-purple-50 border-purple-400 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-900 font-bold">مرحلة للإتلاف</span>
              <Trash2 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black text-purple-700 mt-1 font-mono">
              {flaggedForDisposalDocs.length}
            </div>
            <div className="text-[10px] text-purple-800/80 mt-0.5">قيد محضر اللجنة</div>
          </div>

          <div 
            onClick={() => setFilterType("extended")}
            className={`p-2.5 rounded-xl border cursor-pointer transition ${
              filterType === "extended"
                ? "bg-emerald-50 border-emerald-400 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-900 font-bold">تم تمديدها</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700 mt-1 font-mono">
              {extendedDocs.length}
            </div>
            <div className="text-[10px] text-emerald-800/80 mt-0.5">بقرارات وزارية</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100/80 border-b border-slate-200 text-xs overflow-x-auto scrollbar-none">
          <span className="text-slate-500 font-bold text-[11px] ml-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            تصفية:
          </span>

          <button
            onClick={() => setFilterType("urgent")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterType === "urgent"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>التنبيهات المستعجلة</span>
            <span className="bg-black/20 text-[10px] px-1.5 py-0.2 rounded-full">
              {totalUrgentCount}
            </span>
          </button>

          <button
            onClick={() => setFilterType("expiring_soon")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterType === "expiring_soon"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>تقترب من الانتهاء</span>
            <span className="bg-black/10 text-[10px] px-1.5 py-0.2 rounded-full">
              {expiringSoonDocs.length}
            </span>
          </button>

          <button
            onClick={() => setFilterType("expired")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterType === "expired"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>منتهية</span>
            <span className="bg-black/10 text-[10px] px-1.5 py-0.2 rounded-full">
              {expiredDocs.length}
            </span>
          </button>

          <button
            onClick={() => setFilterType("flagged")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterType === "flagged"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>المرحلة للإتلاف</span>
            <span className="bg-black/10 text-[10px] px-1.5 py-0.2 rounded-full">
              {flaggedForDisposalDocs.length}
            </span>
          </button>

          <button
            onClick={() => setFilterType("extended")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterType === "extended"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>الممددة</span>
            <span className="bg-black/10 text-[10px] px-1.5 py-0.2 rounded-full">
              {extendedDocs.length}
            </span>
          </button>

          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              filterType === "all"
                ? "bg-slate-800 text-white shadow-sm"
                : "bg-white text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>كافة السجلات</span>
            <span className="bg-black/10 text-[10px] px-1.5 py-0.2 rounded-full">
              {documents.length}
            </span>
          </button>
        </div>

        {/* Content List */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[55vh] space-y-3">
          {displayedDocs.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">لا توجد وثائق ضمن هذا التصنيف حالياً</h4>
              <p className="text-xs text-slate-500 mt-1">
                كافة السجلات المالية مطابقة للمدد النظامية المقررة بقانون الأرشيف الوطني
              </p>
            </div>
          ) : (
            displayedDocs.map((doc) => {
              const lc = doc.retentionLifecycle;
              const daysInfo = lc ? formatRetentionCountdown(lc.daysUntilExpiry) : null;
              const isSovereign = lc?.policyCategory.includes("سيادي") || false;

              return (
                <div
                  key={doc.id}
                  className={`bg-white rounded-xl border transition-all p-4 ${
                    lc?.status === "expired"
                      ? "border-red-300 shadow-sm hover:border-red-400 bg-red-50/20"
                      : lc?.status === "expiring_soon"
                      ? "border-amber-300 shadow-sm hover:border-amber-400 bg-amber-50/20"
                      : lc?.status === "flagged_for_disposal"
                      ? "border-purple-300 bg-purple-50/20"
                      : lc?.status === "extended"
                      ? "border-emerald-300 bg-emerald-50/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Doc Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {doc.refNumber}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Building2 className="w-3 h-3 text-emerald-700" />
                          {doc.department}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          ({doc.era})
                        </span>
                      </div>

                      <h4 
                        onClick={() => {
                          onSelectDocument(doc);
                          onClose();
                        }}
                        className="text-sm font-bold text-slate-900 hover:text-emerald-800 cursor-pointer transition line-clamp-1"
                        title={doc.title}
                      >
                        {doc.title}
                      </h4>

                      {/* Legal citation & countdown */}
                      <div className="mt-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1 text-slate-700">
                          <Scale className="w-3.5 h-3.5 text-amber-600" />
                          <span>الفئة: <strong className="text-slate-900">{lc?.policyCategory}</strong></span>
                        </span>

                        <span className="flex items-center gap-1 text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>موعد الانتهاء: <strong className="font-mono text-slate-900">{lc?.expiryDate}</strong></span>
                        </span>

                        {lc?.extensions && lc.extensions.length > 0 && (
                          <span className="text-emerald-700 font-medium text-[11px] bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                            تم تمديدها سابقاً (+{lc.extensions[0].extensionYears} سنوات بموجب {lc.extensions[0].decisionNumber})
                          </span>
                        )}

                        {lc?.disposalRecord && (
                          <span className="text-purple-700 font-medium text-[11px] bg-purple-100 px-2 py-0.5 rounded border border-purple-200">
                            رقم محضر الإتلاف: {lc.disposalRecord.committeeReference}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">
                        {lc?.legalBasis}
                      </p>
                    </div>

                    {/* Countdown Badge & DIRECT ACTION BUTTONS */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {daysInfo && (
                        <span className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${daysInfo.badgeClass}`}>
                          {daysInfo.text}
                        </span>
                      )}

                      {/* Direct Links / Action Buttons */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        {/* 1. Direct Link to Extend Retention Period */}
                        <button
                          onClick={() => {
                            onOpenExtendModal(doc);
                          }}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm"
                          title="تمديد فترة الحفظ القانونية"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          <span>تمديد الحفظ</span>
                        </button>

                        {/* 2. Direct Link to Migrate for Disposal */}
                        {!isSovereign ? (
                          <button
                            onClick={() => {
                              onOpenDisposalModal(doc);
                            }}
                            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm"
                            title="ترحيل للجنة الإتلاف النظامي"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-700" />
                            <span>ترحيل للإتلاف</span>
                          </button>
                        ) : (
                          <span 
                            className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200"
                            title="وثيقة سيادية لا يجوز إتلافها قانوناً"
                          >
                            حفظ سيادي
                          </span>
                        )}

                        {/* 3. Direct Link to Inspect Document */}
                        <button
                          onClick={() => {
                            onSelectDocument(doc);
                            onClose();
                          }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="معاينة إضبارة الوثيقة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-700" />
            <span>نظام الحفظ والأرشفة متوافق مع معيار الحفظ الوطني الليبي رقم (24) لسنة 1970 ولائحة ديوان المحاسبة.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            إغلاق اللوحة
          </button>
        </div>
      </div>
    </div>
  );
};
