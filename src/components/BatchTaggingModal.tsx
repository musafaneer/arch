import React, { useState, useMemo } from "react";
import {
  Tag,
  FolderSync,
  Layers,
  Check,
  X,
  Plus,
  Shield,
  Building2,
  FileText,
  AlertCircle,
  FileCheck2,
  Sparkles,
  Info,
  CheckCircle2
} from "lucide-react";
import {
  ArchivedDocument,
  DepartmentType,
  DocumentType,
  SecurityClassification,
  VaultUser
} from "../types";
import { analyzeDocumentOcrForSmartTagging } from "../utils/smartTaggingEngine";

export interface BatchUpdatePayload {
  tagAction: "add" | "remove" | "replace" | "none";
  tags: string[];
  department?: DepartmentType;
  updateDepartment: boolean;
  docType?: DocumentType;
  updateDocType: boolean;
  classification?: SecurityClassification;
  updateClassification: boolean;
  status?: "مؤرشفة ومعتمدة" | "قيد التدقيق الأرشيفي" | "معالجة جديدة";
  updateStatus: boolean;
  auditNote: string;
}

interface BatchTaggingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDocuments: ArchivedDocument[];
  currentUser: VaultUser;
  onApplyBatchUpdate: (docIds: string[], payload: BatchUpdatePayload) => void;
}

// Recommended Libyan financial archival tags
const RECOMMENDED_TAGS = [
  "إتاوات نفطية",
  "مجلس الإعمار",
  "سندات خزانة",
  "احتياطي الذهب",
  "مصلحة الجمارك",
  "موانئ وبنادر",
  "الرقم الوطني",
  "إذن صرف عاجل",
  "علاوات ديوانية",
  "رسوم نقد أجنبي",
  "تسوية حسابات",
  "مشاريع بنية تحتية",
  "تحصين سيادي WORM",
  "تدقيق ديوان المحاسبة",
  "قرض وطني عام",
  "أصول وممتلكات الدولة"
];

const DEPARTMENT_OPTIONS: DepartmentType[] = [
  "إدارة الخزانة العامة",
  "إدارة الميزانية العامة والتخطيط المالي",
  "مصلحة الجمارك الليبية",
  "مصلحة الضرائب",
  "إدارة الحسابات والرقابة المالية",
  "مصلحة أملاك الدولة",
  "إدارة الدين العام والالتزامات المالية"
];

const DOC_TYPE_OPTIONS: DocumentType[] = [
  "مرسوم ملكي مالي",
  "قرار وزاري",
  "إذن صرف خزانة عامة",
  "إقرار وتخليص جمركي",
  "قانون الميزانية التقديرية",
  "سندات خزانة وقرض عام",
  "كشف مرتبات وعلاوات ديوانية",
  "عقد امتياز وإتاوات نفطية"
];

const CLASSIFICATION_OPTIONS: SecurityClassification[] = [
  "عام",
  "محدود",
  "سري",
  "سري ومحدود",
  "سري للغاية"
];

export const BatchTaggingModal: React.FC<BatchTaggingModalProps> = ({
  isOpen,
  onClose,
  selectedDocuments,
  currentUser,
  onApplyBatchUpdate
}) => {
  // Tag state
  const [tagAction, setTagAction] = useState<"add" | "remove" | "replace" | "none">("add");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Category state
  const [updateDepartment, setUpdateDepartment] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentType>("إدارة الخزانة العامة");

  const [updateDocType, setUpdateDocType] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>("قرار وزاري");

  const [updateClassification, setUpdateClassification] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState<SecurityClassification>("عام");

  const [updateStatus, setUpdateStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"مؤرشفة ومعتمدة" | "قيد التدقيق الأرشيفي" | "معالجة جديدة">("مؤرشفة ومعتمدة");

  // Audit note
  const [auditNote, setAuditNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Aggregate OCR Smart Tagging Analysis across selected documents
  const batchSmartAnalysis = useMemo(() => {
    if (!selectedDocuments || selectedDocuments.length === 0) {
      return { tagCounts: new Map<string, number>(), topTags: [] as string[] };
    }

    const tagCounts = new Map<string, number>();
    selectedDocuments.forEach((doc) => {
      const result = analyzeDocumentOcrForSmartTagging(doc.ocrText, {
        title: doc.title,
        department: doc.department,
        era: doc.era,
        docType: doc.docType,
        classification: doc.classification,
        existingKeywords: doc.keywords
      });

      result.suggestedKeywords.forEach((item) => {
        tagCounts.set(item.tag, (tagCounts.get(item.tag) || 0) + 1);
      });
    });

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    return { tagCounts, topTags };
  }, [selectedDocuments]);

  if (!isOpen || selectedDocuments.length === 0) return null;

  // Add tag handler
  const handleAddTag = (newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  // Submit batch update
  const handleSubmit = () => {
    setIsSubmitting(true);

    const payload: BatchUpdatePayload = {
      tagAction,
      tags,
      department: updateDepartment ? selectedDepartment : undefined,
      updateDepartment,
      docType: updateDocType ? selectedDocType : undefined,
      updateDocType,
      classification: updateClassification ? selectedClassification : undefined,
      updateClassification,
      status: updateStatus ? selectedStatus : undefined,
      updateStatus,
      auditNote: auditNote.trim() || `تحديث جماعي للوسوم والتصنيفات لعدد (${selectedDocuments.length}) وثيقة بواسطة ${currentUser.name}`
    };

    setTimeout(() => {
      onApplyBatchUpdate(
        selectedDocuments.map((d) => d.id),
        payload
      );
      setIsSubmitting(false);
      onClose();
    }, 250);
  };

  // Determine whether any actual change is selected
  const hasChanges =
    (tagAction !== "none" && tags.length > 0) ||
    updateDepartment ||
    updateDocType ||
    updateClassification ||
    updateStatus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f2d1e] via-[#143a27] to-[#0f2d1e] text-white p-5 sm:p-6 border-b border-amber-500/30">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-900/80 border border-emerald-600/50 text-amber-300 text-xs font-semibold">
                <FolderSync className="w-3.5 h-3.5" />
                <span>إدارة الأرشيف الجماعي • Batch Processing</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-['Amiri'] text-amber-100">
                التحديث الجماعي للوسوم والتصنيفات الأرشيفية
              </h2>
              <p className="text-xs text-emerald-200/90">
                تحديث الكلمات المفتاحية، جهات الاختصاص، ودرجات السرية لعدد{" "}
                <span className="font-bold text-amber-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                  {selectedDocuments.length}
                </span>{" "}
                وثيقة بالتزامن مع توثيق الأثر في سجل الرقابة والتدقيق.
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition text-xs flex-shrink-0"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Selected documents preview pills */}
          <div className="mt-3.5 pt-3 border-t border-emerald-800/60 flex items-center gap-2 overflow-x-auto text-[11px] pb-1 scrollbar-none">
            <span className="text-emerald-300 font-semibold whitespace-nowrap">الوثائق المستهدفة:</span>
            {selectedDocuments.slice(0, 5).map((doc) => (
              <span
                key={doc.id}
                className="bg-emerald-950/90 border border-emerald-700/60 text-amber-200 px-2 py-0.5 rounded-lg whitespace-nowrap font-mono"
              >
                {doc.refNumber}
              </span>
            ))}
            {selectedDocuments.length > 5 && (
              <span className="bg-emerald-950/90 border border-emerald-700/60 text-emerald-300 px-2 py-0.5 rounded-lg whitespace-nowrap font-mono font-bold">
                +{selectedDocuments.length - 5} أخرى
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Section 1: Tagging & Labels */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-800" />
                <h3 className="font-bold text-slate-900 text-sm">
                  1. الوسوم والكلمات المفتاحية الدلالية (Batch Tags)
                </h3>
              </div>

              {/* Tag Action Mode */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTagAction("add")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    tagAction === "add"
                      ? "bg-emerald-800 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  إضافة وسوم (+ضم)
                </button>
                <button
                  type="button"
                  onClick={() => setTagAction("remove")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    tagAction === "remove"
                      ? "bg-red-700 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  إزالة وسوم (-حذف)
                </button>
                <button
                  type="button"
                  onClick={() => setTagAction("replace")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    tagAction === "replace"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  استبدال شامل
                </button>
                <button
                  type="button"
                  onClick={() => setTagAction("none")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    tagAction === "none"
                      ? "bg-slate-700 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  لا تغيير
                </button>
              </div>
            </div>

            {tagAction !== "none" ? (
              <div className="space-y-3">
                <div className="text-[11px] text-slate-600 leading-relaxed">
                  {tagAction === "add" && (
                    <span className="text-emerald-800 font-semibold">
                      سيتم إضافة الوسوم أدناه إلى الوسوم الموجودة مسبقاً في الوثائق المحددة دون مسح القديم.
                    </span>
                  )}
                  {tagAction === "remove" && (
                    <span className="text-red-700 font-semibold">
                      سيتم فحص الوثائق المحددة وحذف أي وسوم تطابق الوسوم المدخلة أدناه.
                    </span>
                  )}
                  {tagAction === "replace" && (
                    <span className="text-amber-800 font-semibold">
                      تنبيه: سيتم مسح كافة الكلمات المفتاحية الحالية في الوثائق المحددة واستبدالها حصراً بالوسوم التالية.
                    </span>
                  )}
                </div>

                {/* Input with Add button */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDownTag}
                      placeholder="اكتب الوسم أو الكلمة المفتاحية ثم اضغط Enter (مثال: إتاوات نفطية، مجلس الإعمار)..."
                      className="w-full pl-3 pr-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    disabled={!tagInput.trim()}
                    className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center gap-1 transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة وسم</span>
                  </button>
                </div>

                {/* Selected Tags Chips */}
                {tags.length > 0 ? (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center gap-1.5 min-h-[44px]">
                    <span className="text-slate-400 text-[10px] ml-1">الوسوم المحددة للعملية:</span>
                    {tags.map((t, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          tagAction === "remove"
                            ? "bg-red-50 text-red-800 border border-red-200"
                            : "bg-emerald-50 text-emerald-900 border border-emerald-200"
                        }`}
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="text-slate-400 hover:text-red-700 mr-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTags([])}
                      className="text-[10px] text-red-600 hover:underline mr-auto font-semibold"
                    >
                      مسح الكل
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>أدخل وسماً مخصصاً أعلاه، أو اختر من الوسوم المقترحة بالأسفل لتطبيقه على الوثائق.</span>
                  </div>
                )}

                {/* Smart OCR Tagging Suggestions (Calculated from selected documents) */}
                {batchSmartAnalysis.topTags.length > 0 && (
                  <div className="p-3 bg-gradient-to-r from-emerald-950 via-[#0a2318] to-emerald-900 rounded-xl border border-emerald-700/60 space-y-2 text-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>اقتراحات ذكية من محتوى الـ OCR للوثائق المختارة ({batchSmartAnalysis.topTags.length} وسم):</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newUnique = batchSmartAnalysis.topTags.filter(t => !tags.includes(t));
                          setTags([...tags, ...newUnique]);
                        }}
                        className="text-[10px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-2 py-0.5 rounded transition shadow-xs"
                      >
                        + تطبيق كل المقترحات الذكية
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {batchSmartAnalysis.topTags.map((sugTag, idx) => {
                        const count = batchSmartAnalysis.tagCounts.get(sugTag) || 1;
                        const isAdded = tags.includes(sugTag);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddTag(sugTag)}
                            disabled={isAdded}
                            className={`px-2 py-1 rounded-lg border text-[11px] font-medium transition flex items-center gap-1 ${
                              isAdded
                                ? "bg-white/10 text-emerald-300 border-emerald-500/40 cursor-default"
                                : "bg-emerald-900/60 hover:bg-emerald-800 text-amber-200 border-amber-400/40 hover:border-amber-300"
                            }`}
                          >
                            <span>+{sugTag}</span>
                            <span className="text-[9px] px-1 py-0.2 bg-black/40 rounded text-emerald-300 font-mono font-bold">
                              {count} وثائق
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quick Recommended Tags */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-slate-500 font-semibold block text-[11px]">
                    وسوم مالية وتاريخية مقترحة (انقر للإضافة):
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {RECOMMENDED_TAGS.map((recTag, idx) => {
                      const isAlreadyAdded = tags.includes(recTag);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddTag(recTag)}
                          disabled={isAlreadyAdded}
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-medium transition ${
                            isAlreadyAdded
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : "bg-white text-slate-700 border-slate-200 hover:border-emerald-600 hover:text-emerald-900 hover:bg-emerald-50"
                          }`}
                        >
                          +{recTag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 py-1 italic text-[11px]">
                لن يتم إدخال أي تعديل على وسوم الوثائق المحددة في هذا الإجراء.
              </div>
            )}
          </div>

          {/* Section 2: Institutional Categories & Metadata */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
              <Layers className="w-4 h-4 text-emerald-800" />
              <h3 className="font-bold text-slate-900 text-sm">
                2. تعديل التصنيفات المؤسسية والبيانات المرجعية (Categories & Metadata)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Department */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={updateDepartment}
                    onChange={(e) => setUpdateDepartment(e.target.checked)}
                    className="rounded text-emerald-800 w-4 h-4 focus:ring-0"
                  />
                  <Building2 className="w-3.5 h-3.5 text-emerald-800" />
                  <span>تحديث الإدارة أو المصلحة التابعة</span>
                </label>
                {updateDepartment && (
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value as DepartmentType)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    {DEPARTMENT_OPTIONS.map((dep, i) => (
                      <option key={i} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Document Type */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={updateDocType}
                    onChange={(e) => setUpdateDocType(e.target.checked)}
                    className="rounded text-emerald-800 w-4 h-4 focus:ring-0"
                  />
                  <FileText className="w-3.5 h-3.5 text-emerald-800" />
                  <span>تحديث نوع الوثيقة المالية</span>
                </label>
                {updateDocType && (
                  <select
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value as DocumentType)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    {DOC_TYPE_OPTIONS.map((dt, i) => (
                      <option key={i} value={dt}>
                        {dt}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Security Classification */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={updateClassification}
                    onChange={(e) => setUpdateClassification(e.target.checked)}
                    className="rounded text-emerald-800 w-4 h-4 focus:ring-0"
                  />
                  <Shield className="w-3.5 h-3.5 text-emerald-800" />
                  <span>تحديث درجة السرية والحصانة</span>
                </label>
                {updateClassification && (
                  <select
                    value={selectedClassification}
                    onChange={(e) => setSelectedClassification(e.target.value as SecurityClassification)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    {CLASSIFICATION_OPTIONS.map((cl, i) => (
                      <option key={i} value={cl}>
                        {cl}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Archival Status */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={updateStatus}
                    onChange={(e) => setUpdateStatus(e.target.checked)}
                    className="rounded text-emerald-800 w-4 h-4 focus:ring-0"
                  />
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-800" />
                  <span>تحديث الحالة الأرشيفية</span>
                </label>
                {updateStatus && (
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="مؤرشفة ومعتمدة">مؤرشفة ومعتمدة</option>
                    <option value="قيد التدقيق الأرشيفي">قيد التدقيق الأرشيفي</option>
                    <option value="معالجة جديدة">معالجة جديدة</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Audit Attribution & Provenance */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-800" />
                <h3 className="font-bold text-slate-900 text-sm">
                  3. سجل العهدة والتوثيق الرقابي (Audit Log)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-mono">
                {currentUser.name} ({currentUser.clearanceLevel})
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block text-[11px]">
                سبب التعديل أو القرار الإداري المرجعي (اختياري، يوثق في سجل الوثائق):
              </label>
              <input
                type="text"
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                placeholder="مثال: تصنيف وإعادة فهرسة الوثائق الجمركية استناداً لمنشور مصلحة الضرائب رقم 24 لسنة 2024..."
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            {hasChanges ? (
              <span className="text-emerald-800 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                جاهز للتطبيق على {selectedDocuments.length} وثيقة بالتزامن.
              </span>
            ) : (
              <span className="text-slate-400">
                الرجاء تحديد وسوم للإضافة/الحذف، أو تفعيل أحد التصنيفات لتنفيذ التحديث.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold transition text-xs"
            >
              إلغاء الأمر
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!hasChanges || isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-[#0f2d1e] hover:bg-[#16422c] disabled:bg-slate-300 disabled:text-slate-500 text-amber-200 rounded-xl font-bold transition text-xs flex items-center justify-center gap-2 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin"></div>
                  <span>جارٍ المعالجة...</span>
                </>
              ) : (
                <>
                  <FolderSync className="w-4 h-4 text-amber-400" />
                  <span>تطبيق التحديث الجماعي ({selectedDocuments.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
