import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Tag,
  Check,
  Plus,
  ShieldCheck,
  Building2,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  Sliders,
  CheckCheck,
  Lightbulb,
  AlertCircle,
  TrendingUp,
  Info
} from "lucide-react";
import {
  SmartTaggingAnalysisResult,
  SuggestedTagItem,
  analyzeDocumentOcrForSmartTagging
} from "../utils/smartTaggingEngine";
import { DepartmentType, DocumentType, LibyanEra, SecurityClassification } from "../types";

export interface SmartTagSuggestionCardProps {
  ocrText: string;
  documentTitle?: string;
  currentKeywords: string[];
  currentDepartment?: DepartmentType;
  currentDocType?: DocumentType;
  currentClassification?: SecurityClassification;
  currentEra?: LibyanEra;
  onApplyKeywords: (newKeywords: string[]) => void;
  onApplyDepartment?: (dept: DepartmentType) => void;
  onApplyDocType?: (docType: DocumentType) => void;
  onApplyClassification?: (classification: SecurityClassification) => void;
  onApplyEra?: (era: LibyanEra) => void;
  onApplyAllRecommendations?: (recommendations: {
    keywords: string[];
    department?: DepartmentType;
    docType?: DocumentType;
    classification?: SecurityClassification;
    era?: LibyanEra;
  }) => void;
  className?: string;
}

export const SmartTagSuggestionCard: React.FC<SmartTagSuggestionCardProps> = ({
  ocrText,
  documentTitle,
  currentKeywords,
  currentDepartment,
  currentDocType,
  currentClassification,
  currentEra,
  onApplyKeywords,
  onApplyDepartment,
  onApplyDocType,
  onApplyClassification,
  onApplyEra,
  onApplyAllRecommendations,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "financial" | "institutional" | "topic">("all");

  // Run deterministic smart analysis
  const analysis: SmartTaggingAnalysisResult = useMemo(() => {
    return analyzeDocumentOcrForSmartTagging(ocrText, {
      title: documentTitle,
      department: currentDepartment,
      era: currentEra,
      docType: currentDocType,
      classification: currentClassification,
      existingKeywords: currentKeywords
    });
  }, [ocrText, documentTitle, currentDepartment, currentEra, currentDocType, currentClassification, currentKeywords]);

  // Filter suggested tags that are not yet added
  const unassignedSuggestions = useMemo(() => {
    return analysis.suggestedKeywords.filter((item) => !currentKeywords.includes(item.tag));
  }, [analysis.suggestedKeywords, currentKeywords]);

  const filteredTags = useMemo(() => {
    if (activeFilter === "all") return unassignedSuggestions;
    return unassignedSuggestions.filter((item) => {
      if (activeFilter === "financial") return item.category === "financial";
      if (activeFilter === "institutional") return item.category === "institutional";
      if (activeFilter === "topic") return item.category === "topic" || item.category === "legal_era";
      return true;
    });
  }, [unassignedSuggestions, activeFilter]);

  // Handle adding a single suggested tag
  const handleAddSingleTag = (tag: string) => {
    if (!currentKeywords.includes(tag)) {
      onApplyKeywords([...currentKeywords, tag]);
    }
  };

  // Handle adding all high-confidence suggested tags
  const handleAddAllSuggestions = () => {
    const newTags = Array.from(
      new Set([...currentKeywords, ...unassignedSuggestions.map((t) => t.tag)])
    );
    onApplyKeywords(newTags);
  };

  // One-click apply all AI metadata recommendations (Tags + Classifications)
  const handleApplyFullPackage = () => {
    const newTags = Array.from(
      new Set([...currentKeywords, ...unassignedSuggestions.map((t) => t.tag)])
    );

    if (onApplyAllRecommendations) {
      onApplyAllRecommendations({
        keywords: newTags,
        department: analysis.suggestedDepartment?.value,
        docType: analysis.suggestedDocType?.value,
        classification: analysis.suggestedClassification?.value,
        era: analysis.suggestedEra?.value
      });
    } else {
      onApplyKeywords(newTags);
      if (onApplyDepartment && analysis.suggestedDepartment) {
        onApplyDepartment(analysis.suggestedDepartment.value);
      }
      if (onApplyDocType && analysis.suggestedDocType) {
        onApplyDocType(analysis.suggestedDocType.value);
      }
      if (onApplyClassification && analysis.suggestedClassification) {
        onApplyClassification(analysis.suggestedClassification.value);
      }
      if (onApplyEra && analysis.suggestedEra) {
        onApplyEra(analysis.suggestedEra.value);
      }
    }
  };

  const hasNewMetadataSuggestions =
    (analysis.suggestedDepartment && analysis.suggestedDepartment.value !== currentDepartment) ||
    (analysis.suggestedDocType && analysis.suggestedDocType.value !== currentDocType) ||
    (analysis.suggestedClassification && analysis.suggestedClassification.value !== currentClassification) ||
    (analysis.suggestedEra && analysis.suggestedEra.value !== currentEra);

  return (
    <div
      className={`rounded-2xl border border-teal-300/80 bg-gradient-to-b from-teal-50/70 via-white to-emerald-50/50 shadow-sm overflow-hidden transition-all ${className}`}
    >
      {/* Header Banner */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-teal-900 via-emerald-900 to-teal-950 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-teal-950 flex items-center justify-center font-bold shadow-sm">
            <Sparkles className="w-4 h-4 text-teal-950 fill-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base font-['Amiri',serif] text-amber-200">
                الاقتراح التلقائي للوسوم والتصنيفات (Smart Tagging Suggestion)
              </h4>
              <span className="bg-teal-700/80 border border-teal-400/40 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                دقة {analysis.summaryConfidenceScore}%
              </span>
            </div>
            <p className="text-xs text-teal-100/90 leading-snug">
              تحليل دلالي لنصوص التعرف الضوئي (OCR) لتقليل الأخطاء البشرية وتسريع الفهرسة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unassignedSuggestions.length > 0 && (
            <button
              type="button"
              onClick={handleAddAllSuggestions}
              className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-teal-950 text-xs font-bold rounded-lg shadow-xs transition hidden sm:flex items-center gap-1"
              title="إضافة جميع الوسوم المقترحة غير المضافة"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>إضافة كل الوسوم ({unassignedSuggestions.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-teal-800/80 hover:bg-teal-700 text-teal-100 transition"
            title={isExpanded ? "طي نافذة الاقتراحات" : "توسيع نافذة الاقتراحات"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Section 1: Suggested Tags Pill Clouds */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <Tag className="w-3.5 h-3.5 text-teal-700" />
                <span>الوسوم المفتاحية المكتشفة بنص الوثيقة:</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  ({unassignedSuggestions.length} وسم جديد مقترح)
                </span>
              </div>

              {/* Tag Categories Filters */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    activeFilter === "all" ? "bg-white text-teal-900 shadow-2xs font-bold" : "text-slate-600"
                  }`}
                >
                  الكل ({unassignedSuggestions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("financial")}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    activeFilter === "financial" ? "bg-white text-teal-900 shadow-2xs font-bold" : "text-slate-600"
                  }`}
                >
                  مالية وميزانيات
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("institutional")}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    activeFilter === "institutional" ? "bg-white text-teal-900 shadow-2xs font-bold" : "text-slate-600"
                  }`}
                >
                  جهات وهيئات
                </button>
              </div>
            </div>

            {/* List of tags */}
            {filteredTags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {filteredTags.map((item, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-teal-50/80 border border-teal-300 rounded-xl px-2.5 py-1.5 transition-all shadow-2xs group"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 font-bold text-slate-900 text-xs">
                        <span>{item.tag}</span>
                        <span className="text-[10px] font-mono text-teal-700 font-black bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                          {item.confidence}%
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 max-w-[220px] truncate" title={item.matchedRule}>
                        {item.matchedRule}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddSingleTag(item.tag)}
                      className="p-1 rounded-lg bg-teal-100 hover:bg-teal-700 hover:text-white text-teal-900 transition mr-1 shrink-0"
                      title="اعتماد وإضافة هذا الوسم"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : unassignedSuggestions.length > 0 ? (
              <div className="p-3 bg-slate-50 text-slate-500 rounded-xl text-center border border-slate-200">
                لا توجد وسوم تطابق هذا التصنيف حالياً.
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl text-center border border-emerald-200 flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-emerald-700" />
                <span className="font-semibold">
                  رائع! جميع الوسوم المستخرجة من التعرف الضوئي معتمدة بالفعل ضمن بيانات الوثيقة.
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Metadata and Category Corrections/Predictions */}
          <div className="pt-3 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>اقتراحات التصنيف المؤسسي ودرجة السرية والحقبة:</span>
              </span>
              {hasNewMetadataSuggestions && (
                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  توصيات تدقيق متاحة
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Department */}
              {analysis.suggestedDepartment && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-1.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>المصلحة المقترحة:</span>
                      </span>
                      <span className="font-mono text-teal-700 font-bold text-[10px]">
                        {analysis.suggestedDepartment.confidence}%
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs">
                      {analysis.suggestedDepartment.value}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1" title={analysis.suggestedDepartment.reason}>
                      {analysis.suggestedDepartment.reason}
                    </div>
                  </div>

                  {onApplyDepartment && currentDepartment !== analysis.suggestedDepartment.value ? (
                    <button
                      type="button"
                      onClick={() => onApplyDepartment(analysis.suggestedDepartment!.value)}
                      className="w-full py-1 px-2 bg-teal-50 hover:bg-teal-700 hover:text-white text-teal-900 font-bold text-[11px] rounded-lg border border-teal-200 transition text-center"
                    >
                      اعتماد المصلحة
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 justify-center py-0.5 bg-emerald-50 rounded">
                      <Check className="w-3 h-3" /> مطابقة
                    </span>
                  )}
                </div>
              )}

              {/* Document Type */}
              {analysis.suggestedDocType && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-1.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>نوع المعاملة:</span>
                      </span>
                      <span className="font-mono text-teal-700 font-bold text-[10px]">
                        {analysis.suggestedDocType.confidence}%
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs">
                      {analysis.suggestedDocType.value}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1" title={analysis.suggestedDocType.reason}>
                      {analysis.suggestedDocType.reason}
                    </div>
                  </div>

                  {onApplyDocType && currentDocType !== analysis.suggestedDocType.value ? (
                    <button
                      type="button"
                      onClick={() => onApplyDocType(analysis.suggestedDocType!.value)}
                      className="w-full py-1 px-2 bg-teal-50 hover:bg-teal-700 hover:text-white text-teal-900 font-bold text-[11px] rounded-lg border border-teal-200 transition text-center"
                    >
                      اعتماد النوع
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 justify-center py-0.5 bg-emerald-50 rounded">
                      <Check className="w-3 h-3" /> مطابقة
                    </span>
                  )}
                </div>
              )}

              {/* Security Classification */}
              {analysis.suggestedClassification && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-1.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-slate-400" />
                        <span>درجة السرية:</span>
                      </span>
                      <span className="font-mono text-teal-700 font-bold text-[10px]">
                        {analysis.suggestedClassification.confidence}%
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                      <span>{analysis.suggestedClassification.value}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1" title={analysis.suggestedClassification.reason}>
                      {analysis.suggestedClassification.reason}
                    </div>
                  </div>

                  {onApplyClassification && currentClassification !== analysis.suggestedClassification.value ? (
                    <button
                      type="button"
                      onClick={() => onApplyClassification(analysis.suggestedClassification!.value)}
                      className="w-full py-1 px-2 bg-teal-50 hover:bg-teal-700 hover:text-white text-teal-900 font-bold text-[11px] rounded-lg border border-teal-200 transition text-center"
                    >
                      اعتماد السرية
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 justify-center py-0.5 bg-emerald-50 rounded">
                      <Check className="w-3 h-3" /> مطابقة
                    </span>
                  )}
                </div>
              )}

              {/* Era */}
              {analysis.suggestedEra && (
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-1.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>الحقبة التاريخية:</span>
                      </span>
                      <span className="font-mono text-teal-700 font-bold text-[10px]">
                        {analysis.suggestedEra.confidence}%
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs truncate" title={analysis.suggestedEra.value}>
                      {analysis.suggestedEra.value}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1" title={analysis.suggestedEra.reason}>
                      {analysis.suggestedEra.reason}
                    </div>
                  </div>

                  {onApplyEra && currentEra !== analysis.suggestedEra.value ? (
                    <button
                      type="button"
                      onClick={() => onApplyEra(analysis.suggestedEra!.value)}
                      className="w-full py-1 px-2 bg-teal-50 hover:bg-teal-700 hover:text-white text-teal-900 font-bold text-[11px] rounded-lg border border-teal-200 transition text-center"
                    >
                      اعتماد الحقبة
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 justify-center py-0.5 bg-emerald-50 rounded">
                      <Check className="w-3 h-3" /> مطابقة
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Extracted Named Entities Pill Badges */}
          {analysis.extractedEntities.signatories.length > 0 && (
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-teal-700" />
                <span>شخصيات ومسؤولون رُصدوا بالنص:</span>
              </span>
              {analysis.extractedEntities.signatories.map((sig, i) => (
                <span key={i} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium">
                  {sig}
                </span>
              ))}
            </div>
          )}

          {/* Master Action: Apply Full Package */}
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-slate-500 italic">
              * يساعد هذا الاقتراح الآلي في تقليص التباين في إدخال البيانات البشرية وضمان سرعة البحث الدلالي.
            </span>

            <button
              type="button"
              onClick={handleApplyFullPackage}
              className="px-3.5 py-1.5 bg-gradient-to-r from-teal-800 to-emerald-800 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4 text-amber-300" />
              <span>اعتماد حزمة الاقتراحات الذكية بالكامل</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
