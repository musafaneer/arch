import React, { useState, useEffect } from "react";
import { 
  Clock, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Building2, 
  AlertTriangle, 
  X, 
  Shield, 
  Scale,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { ArchivedDocument, VaultUser } from "../types";
import { formatRetentionCountdown } from "../utils/retentionLifecycle";

interface RetentionActionModalProps {
  document: ArchivedDocument | null;
  isOpen: boolean;
  initialMode?: "extend" | "dispose";
  onClose: () => void;
  onConfirmExtend: (
    docId: string, 
    payload: { 
      extensionYears: number; 
      decisionNumber: string; 
      justification: string; 
    }
  ) => void;
  onConfirmDisposal: (
    docId: string, 
    payload: { 
      committeeRef: string; 
      headOfCommittee: string; 
      auditBureauRep: string; 
      destructionMethod: "إتلاف وتطهير رقمي مشفر (DoD 5220.22-M) وطحن مادي محكم" | "أرشفة صامتة مع إلغاء التداول المالي"; 
      notes: string; 
    }
  ) => void;
  currentUser: VaultUser;
}

export const RetentionActionModal: React.FC<RetentionActionModalProps> = ({
  document,
  isOpen,
  initialMode = "extend",
  onClose,
  onConfirmExtend,
  onConfirmDisposal,
  currentUser
}) => {
  const [activeMode, setActiveMode] = useState<"extend" | "dispose">(initialMode);

  // Extend form state
  const [extensionYears, setExtensionYears] = useState<number>(5);
  const [decisionNumber, setDecisionNumber] = useState<string>("");
  const [justification, setJustification] = useState<string>("");

  // Dispose form state
  const [committeeRef, setCommitteeRef] = useState<string>("");
  const [headOfCommittee, setHeadOfCommittee] = useState<string>("د. عبد السلام الورفلي (وكيل وزارة المالية)");
  const [auditBureauRep, setAuditBureauRep] = useState<string>("الأستاذ مصطفى الشريف (مستشار ديوان المحاسبة)");
  const [destructionMethod, setDestructionMethod] = useState<"إتلاف وتطهير رقمي مشفر (DoD 5220.22-M) وطحن مادي محكم" | "أرشفة صامتة مع إلغاء التداول المالي">(
    "إتلاف وتطهير رقمي مشفر (DoD 5220.22-M) وطحن مادي محكم"
  );
  const [disposalNotes, setDisposalNotes] = useState<string>("");
  const [checklistCompleted, setChecklistCompleted] = useState({
    auditCleared: false,
    noPendingLitigation: false,
    statutoryTimePassed: true
  });

  useEffect(() => {
    setActiveMode(initialMode);
    if (document) {
      // Default auto-generated reference codes
      const year = new Date().getFullYear();
      setDecisionNumber(`ق.و.م/${year}/${Math.floor(100 + Math.random() * 899)}`);
      setCommitteeRef(`م.ل.إ/${year}/${Math.floor(200 + Math.random() * 799)}`);
      setJustification("استكمال التدقيق الدوري وحاجة الخزانة العامة لمطابقة القيود المالية");
      setDisposalNotes("استوفت الوثيقة المدة القانونية وتمت رقمنتها بالكامل ولا توجد التزامات معلقة");
    }
  }, [document, initialMode, isOpen]);

  if (!isOpen || !document) return null;

  const lifecycle = document.retentionLifecycle;
  const isPermanent = lifecycle?.policyCategory.includes("سيادي") || false;
  const daysInfo = lifecycle ? formatRetentionCountdown(lifecycle.daysUntilExpiry) : null;

  const handleExtendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionNumber.trim() || !justification.trim()) return;

    onConfirmExtend(document.id, {
      extensionYears,
      decisionNumber: decisionNumber.trim(),
      justification: justification.trim()
    });
    onClose();
  };

  const handleDisposalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPermanent) return;
    if (!committeeRef.trim() || !headOfCommittee.trim() || !auditBureauRep.trim()) return;
    if (!checklistCompleted.auditCleared || !checklistCompleted.noPendingLitigation) return;

    onConfirmDisposal(document.id, {
      committeeRef: committeeRef.trim(),
      headOfCommittee: headOfCommittee.trim(),
      auditBureauRep: auditBureauRep.trim(),
      destructionMethod,
      notes: disposalNotes.trim()
    });
    onClose();
  };

  // Preview date for extension
  const calculateNewExpiryPreview = () => {
    if (extensionYears >= 100) return "حفظ دائم سيادي (لا ينتهي)";
    const baseDate = lifecycle?.expiryDate ? new Date(lifecycle.expiryDate) : new Date();
    const currentRef = new Date("2026-09-14");
    const d = baseDate.getTime() < currentRef.getTime() ? new Date(currentRef) : new Date(baseDate);
    d.setFullYear(d.getFullYear() + extensionYears);
    return d.toLocaleDateString("ar-LY", { year: "numeric", month: "long", day: "numeric" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0f2d1e] via-[#143d28] to-[#0c2418] text-white p-4 sm:p-5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              activeMode === "extend" 
                ? "bg-amber-500/20 text-amber-300 border-amber-400/40" 
                : "bg-red-500/20 text-red-300 border-red-400/40"
            }`}>
              {activeMode === "extend" ? <Clock className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-['Amiri',serif] text-amber-100">
                  {activeMode === "extend" ? "تمديد فترة الحفظ القانونية للوثيقة" : "محضر إحالة وترحيل للجنة الإتلاف النظامي"}
                </h3>
                <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700 text-emerald-300 font-mono">
                  ISAD(G)
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                إجراءات دورة حياة الوثائق استناداً لقانون الأرشيف الوطني الليبي رقم (24) ولائحة الخزانة
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

        {/* Document Quick Summary Card */}
        <div className="bg-slate-50 border-b border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                  {document.refNumber}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {document.department}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-1">
                {document.title}
              </h4>
            </div>

            {daysInfo && (
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${daysInfo.badgeClass}`}>
                  <Clock className="w-3.5 h-3.5" />
                  {daysInfo.text}
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
            <div>
              <span className="text-slate-400">فئة الحفظ: </span>
              <span className="font-semibold text-slate-800">{lifecycle?.policyCategory}</span>
            </div>
            <div>
              <span className="text-slate-400">تاريخ الانتهاء: </span>
              <span className="font-semibold text-slate-800 font-mono">{lifecycle?.expiryDate || "غير محدد"}</span>
            </div>
            <div>
              <span className="text-slate-400">المسؤول المنفذ: </span>
              <span className="font-semibold text-emerald-700">{currentUser.name}</span>
            </div>
          </div>
        </div>

        {/* Action Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMode("extend")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition ${
              activeMode === "extend"
                ? "bg-white border-amber-600 text-amber-900 font-black shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>تمديد فترة الحفظ (+ سنوات)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("dispose")}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition ${
              activeMode === "dispose"
                ? "bg-white border-red-600 text-red-900 font-black shadow-sm"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>ترحيل للجنة الإتلاف النظامي</span>
            {isPermanent && (
              <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded-full border border-red-200">
                محظور
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh]">
          {activeMode === "extend" ? (
            /* Extend Retention Form */
            <form id="extend-retention-form" onSubmit={handleExtendSubmit} className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                <Scale className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">السند القانوني للتمديد: </span>
                  يجوز بقرار من وزير المالية أو المفوض بتمديد فترة حفظ القيود المالية والسجلات النظامية إذا دعت الحاجة لمتطلبات ديوان المحاسبة أو تسوية الالتزامات العامة.
                </div>
              </div>

              {/* Extension Duration Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  اختر مدة التمديد الإضافية:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { years: 3, label: "+3 سنوات", desc: "تمديد دوري قصير" },
                    { years: 5, label: "+5 سنوات", desc: "تمديد مالي قياسي" },
                    { years: 10, label: "+10 سنوات", desc: "تمديد استراتيجي" },
                    { years: 999, label: "حفظ دائم", desc: "تحويل لحفظ سيادي" }
                  ].map((opt) => (
                    <button
                      key={opt.years}
                      type="button"
                      onClick={() => setExtensionYears(opt.years)}
                      className={`p-3 rounded-xl border text-right transition ${
                        extensionYears === opt.years
                          ? "bg-amber-500/10 border-amber-500 text-amber-950 font-bold ring-2 ring-amber-500/20"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-sm font-black">{opt.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* New Expiry Date Preview */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">موعد انتهاء دورة الحفظ الجديد بعد التمديد:</span>
                <span className="font-bold font-mono text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {calculateNewExpiryPreview()}
                </span>
              </div>

              {/* Ministerial Decision Number */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  رقم القرار الوزاري أو الإشاري المعتمد للتمديد: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={decisionNumber}
                  onChange={(e) => setDecisionNumber(e.target.value)}
                  placeholder="مثال: ق.و.م/2026/184"
                  className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white"
                />
              </div>

              {/* Justification Field */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  مبررات التمديد والملاحظات الرقابية: <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="بيان سبب تمديد فترة الحفظ (مثال: حاجة ديوان المحاسبة لمطابقة الحسابات الختامية)..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white"
                />
              </div>
            </form>
          ) : (
            /* Migrate for Disposal Form */
            <form id="dispose-retention-form" onSubmit={handleDisposalSubmit} className="space-y-4">
              {isPermanent ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm mb-1">محظور قانونياً: وثيقة حفظ دائم سيادي</h5>
                    <p className="leading-relaxed">
                      هذه الوثيقة مصنفة ضمن <span className="font-bold">التراث المالي والسيادي للدولة الليبية</span> وغير قابلة للإتلاف أو الشطب بموجب المادة (4) من قانون الأرشيف الوطني رقم (24) لسنة 1970.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold">إشعار إحالة قانوني: </span>
                      سيتم ترحيل السجل إلى قائمة انتظار لجنة الإتلاف المشتركة (وزارة المالية + ديوان المحاسبة). لن يتم الإتلاف الفعلي إلا بعد المصادقة النهائية وتوليد شهادة التطهير الرقمي المشفرة.
                    </div>
                  </div>

                  {/* Statutory Checklist */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>قائمة التحقق الإلزامية قبل الإحالة:</span>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklistCompleted.statutoryTimePassed}
                        onChange={(e) => setChecklistCompleted(prev => ({ ...prev, statutoryTimePassed: e.target.checked }))}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>استيفاء المدة النظامية المقررة للحفظ والتقادم المالي</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklistCompleted.auditCleared}
                        onChange={(e) => setChecklistCompleted(prev => ({ ...prev, auditCleared: e.target.checked }))}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>مطابقة الحساب الختامي وعدم وجود استيضاحات رقابية مفتوحة من ديوان المحاسبة</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklistCompleted.noPendingLitigation}
                        onChange={(e) => setChecklistCompleted(prev => ({ ...prev, noPendingLitigation: e.target.checked }))}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span>خلو السجل من أي منازعات قضائية أو مطالبات مالية معلقة أمام إدارة قضايا الدولة</span>
                    </label>
                  </div>

                  {/* Committee Reference */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        رقم محضر الإحالة للجنة الإتلاف: <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={committeeRef}
                        onChange={(e) => setCommitteeRef(e.target.value)}
                        placeholder="مثال: م.ل.إ/2026/412"
                        className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        طريقة الإتلاف المعتمدة:
                      </label>
                      <select
                        value={destructionMethod}
                        onChange={(e) => setDestructionMethod(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 bg-white"
                      >
                        <option value="إتلاف وتطهير رقمي مشفر (DoD 5220.22-M) وطحن مادي محكم">
                          طحن مادي محكم + تطهير رقمي معتمد (DoD 5220.22-M)
                        </option>
                        <option value="أرشفة صامتة مع إلغاء التداول المالي">
                          أرشفة صامتة مع إلغاء التداول وسحب الصلاحيات
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Committee Members */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        رئيس لجنة الإتلاف:
                      </label>
                      <input
                        type="text"
                        required
                        value={headOfCommittee}
                        onChange={(e) => setHeadOfCommittee(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        مندوب ديوان المحاسبة الليبي:
                      </label>
                      <input
                        type="text"
                        required
                        value={auditBureauRep}
                        onChange={(e) => setAuditBureauRep(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      ملاحظات المحضر وتوصيات اللجنة:
                    </label>
                    <textarea
                      rows={2}
                      value={disposalNotes}
                      onChange={(e) => setDisposalNotes(e.target.value)}
                      placeholder="أي اشتراطات خاصة أو مراجع للتدقيق النهائي..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 bg-white"
                    />
                  </div>
                </>
              )}
            </form>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            إلغاء التراجع
          </button>

          {activeMode === "extend" ? (
            <button
              type="submit"
              form="extend-retention-form"
              className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-xs transition"
            >
              <Clock className="w-4 h-4" />
              <span>اعتماد تمديد فترة الحفظ</span>
            </button>
          ) : (
            <button
              type="submit"
              form="dispose-retention-form"
              disabled={isPermanent || !checklistCompleted.auditCleared || !checklistCompleted.noPendingLitigation}
              className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl shadow-md text-xs transition ${
                isPermanent || !checklistCompleted.auditCleared || !checklistCompleted.noPendingLitigation
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                  : "bg-red-700 hover:bg-red-600 text-white shadow-red-700/30"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>ترحيل للجنة الإتلاف واعتماد المحضر</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
