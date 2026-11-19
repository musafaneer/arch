import React, { useState } from "react";
import { AlertTriangle, Clock, Trash2, ArrowLeft, X, Sparkles, ShieldAlert } from "lucide-react";
import { ArchivedDocument } from "../types";
import { getProactiveRetentionAlerts } from "../utils/retentionLifecycle";

interface RetentionAlertBannerProps {
  documents: ArchivedDocument[];
  onOpenAlertsCenter: () => void;
  onOpenExtendForFirstUrgent?: (doc: ArchivedDocument) => void;
}

export const RetentionAlertBanner: React.FC<RetentionAlertBannerProps> = ({
  documents,
  onOpenAlertsCenter,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const {
    expiringSoonDocs,
    expiredDocs,
    urgentAlerts,
    totalUrgentCount
  } = getProactiveRetentionAlerts(documents);

  if (isDismissed || totalUrgentCount === 0) return null;

  return (
    <div 
      className="mb-6 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 shadow-sm relative overflow-hidden text-right"
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-800 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-amber-950 font-['Amiri',serif]">
                تنبيه استباقي: اقتراب موعد انتهاء دورة حياة ({totalUrgentCount}) من السجلات المالية
              </h4>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold border border-amber-300">
                لوائح الحفظ الوطنية
              </span>
            </div>
            <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
              وفقاً لقانون الأرشيف الوطني الليبي، توجد{" "}
              {expiredDocs.length > 0 && (
                <strong className="text-red-700 underline underline-offset-2">
                  ({expiredDocs.length}) وثيقة منتهية الصلاحية تتطلب قراراً عاجلاً
                </strong>
              )}
              {expiredDocs.length > 0 && expiringSoonDocs.length > 0 && " و"}
              {expiringSoonDocs.length > 0 && (
                <strong className="text-amber-800">
                  ({expiringSoonDocs.length}) وثيقة تقترب من موعد الانتهاء
                </strong>
              )}
              . يرجى مراجعتها لتمديد فترة الحفظ أو إحالتها للجنة الإتلاف النظامي.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
          <button
            onClick={onOpenAlertsCenter}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition"
          >
            <span>مراجعة وإجراء التمديد أو الإتلاف</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-2 text-amber-700/60 hover:text-amber-900 rounded-xl hover:bg-amber-200/40 transition"
            title="إخفاء التنبيه مؤقتاً"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
