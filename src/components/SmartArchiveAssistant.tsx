import React, { useState } from "react";
import { 
  Sparkles, 
  Send, 
  BookOpen, 
  HelpCircle, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  ShieldCheck,
  RefreshCw,
  Quote
} from "lucide-react";
import { ArchivedDocument } from "../types";

interface SmartArchiveAssistantProps {
  documents: ArchivedDocument[];
  onOpenDocument: (doc: ArchivedDocument) => void;
}

interface QAMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  sources?: string[];
}

export const SmartArchiveAssistant: React.FC<SmartArchiveAssistantProps> = ({
  documents,
  onOpenDocument
}) => {
  const [queryInput, setQueryInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<QAMessage[]>([
    {
      id: "welcome-1",
      sender: "ai",
      text: "مرحباً بكم في محرك الاستعلام الذكي للأرشيف التاريخي لوزارة المالية الليبية. يمكنك سؤالي عن القرارات المالية، المراسيم الملكية، التعرفة الجمركية لموانئ طرابلس وبنغازي، مخصصات ميزانية التحول، أو منظومة المرتبات الموحدة.",
      timestamp: new Date().toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" }),
      sources: ["الأرشيف الوطني المالي الموحد - طرابلس"]
    }
  ]);

  const sampleQueries = [
    "ما هي إتاوات النفط الأولى الموردة للخزانة العامة بمرسوم الملك إدريس 1958؟",
    "كيف تم توحيد الرسوم الجمركية بين ميناء طرابلس وميناء بنغازي عام 1964؟",
    "ما تفاصيل إذن صرف ميزانية التحول لطريق طرابلس - سبها 1974؟",
    "ما هي عوائد سندات الخزانة العامة الصادرة لمشروعات الجبل الأخضر 1982؟",
    "ما هو أثر ربط منظومة المرتبات بالرقم الوطني وإلغاء التعاملات الورقية 2023؟"
  ];

  const handleSendQuery = async (customText?: string) => {
    const textToSend = customText || queryInput;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: QAMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setQueryInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/archive/ai-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          documentsContext: documents.map(d => ({
            title: d.title,
            refNumber: d.refNumber,
            gregorianDate: d.gregorianDate,
            era: d.era,
            department: d.department,
            financialAmount: d.financialAmount,
            summary: d.summary,
            ocrText: d.ocrText
          }))
        })
      });

      const data = await response.json();

      const aiMsg: QAMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.answer || "لم يتم التوصل لإجابة دقيقة في السجلات الحالية.",
        timestamp: new Date().toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" }),
        sources: data.sources || ["سجلات وزارة المالية الليبية"]
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: "تعذر الاتصال بالمحرك الأرشيفي حالياً. يرجى المحاولة مرة أخرى.",
          timestamp: new Date().toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[78vh]">
      {/* Header of Assistant */}
      <div className="bg-gradient-to-r from-[#0f2d1e] via-[#143d28] to-[#0c2418] text-white p-4 sm:p-5 border-b border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-['Amiri',serif] text-amber-100 flex items-center gap-2">
              <span>اسأل الأرشيف المالي الذكي</span>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30 font-sans">
                استعلام أرشيفي ذكي
              </span>
            </h2>
            <p className="text-xs text-emerald-200/80">
              باحث تاريخي مالي يجيب بالاستناد على الوثائق والمراسيم والقيود الدفترية المؤرشفة
            </p>
          </div>
        </div>

        <button
          onClick={() => setChatMessages([chatMessages[0]])}
          className="flex items-center gap-1 text-xs text-emerald-200 hover:text-white bg-emerald-900/60 px-3 py-1.5 rounded-lg border border-emerald-700/40 transition"
          title="بدء استعلام جديد"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">جلسة جديدة</span>
        </button>
      </div>

      {/* Suggested Questions Bar */}
      <div className="bg-emerald-50/70 border-b border-emerald-100 p-3 overflow-x-auto">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-emerald-900 font-bold whitespace-nowrap flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            استفسارات مقترحة:
          </span>
          <div className="flex items-center gap-2 whitespace-nowrap">
            {sampleQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuery(q)}
                className="bg-white hover:bg-emerald-100 text-slate-700 hover:text-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-200/80 text-[11px] font-medium transition shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-2xl rounded-2xl p-4 shadow-sm text-xs sm:text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-emerald-800 text-white rounded-bl-sm"
                  : "bg-white text-slate-900 border border-slate-200/90 rounded-br-sm font-['Amiri',serif] text-base leading-[2]"
              }`}
            >
              {msg.sender === "ai" && (
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-100 text-xs text-amber-800 font-sans font-bold">
                  <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>إفادة الأرشيف المالي الرسمي</span>
                </div>
              )}

              <div className="whitespace-pre-line">
                {msg.text}
              </div>

              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1 text-[11px] font-sans text-slate-500">
                  <span className="font-semibold">المراجع المؤرشفة:</span>
                  {msg.sources.map((s, idx) => (
                    <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <span className="text-[10px] text-slate-400 font-mono mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-br-sm p-4 shadow-sm flex items-center gap-3 text-xs text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
              <span>جاري استرجاع السجلات المالية وتحليل المراسيم التاريخية...</span>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Input Form */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="اكتب استفسارك حول وثائق وزارة المالية، الميزانيات، المراسيم، أو الرسوم..."
            className="flex-1 px-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-slate-50"
          />

          <button
            type="submit"
            disabled={!queryInput.trim() || isLoading}
            className="bg-gradient-to-r from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-xl shadow transition flex items-center gap-2 text-xs sm:text-sm"
          >
            <span>استعلام</span>
            <Send className="w-4 h-4 rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
