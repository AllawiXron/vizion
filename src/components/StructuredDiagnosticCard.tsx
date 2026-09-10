import React, { useState } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  Clock,
  MessageSquare,
  BarChart3,
  BookOpen,
  Copy,
  Check,
  Calendar,
  Calculator,
  ArrowLeft,
  HelpCircle,
} from "lucide-react";
import { StructuredDiagnosticSection } from "../types";
import { parseStructuredAdvisorResponse } from "../utils/diagnosticCalculator";
import { AdvisorActionCard } from "./AdvisorActionCard";

interface StructuredDiagnosticCardProps {
  rawText: string;
  topicId?: string;
  userCode?: string;
  onActionClick: (promptText: string) => void;
  onNavigateChapter?: (chapterId: string) => void;
  onNavigateTool?: (toolId: string, category?: string) => void;
  onShowToast?: (type: "copy" | "saved" | "plan" | "navigate", title: string, description?: string) => void;
}

export const StructuredDiagnosticCard: React.FC<StructuredDiagnosticCardProps> = ({
  rawText,
  topicId,
  userCode,
  onActionClick,
  onNavigateChapter,
  onNavigateTool,
  onShowToast,
}) => {
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const data: StructuredDiagnosticSection = parseStructuredAdvisorResponse(rawText);

  const handleCopyScript = (script: string) => {
    if (!script) return;
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    if (onShowToast) {
      onShowToast("copy", "تم نسخ السكربت بنجاح! 📋", "يمكنك الآن إرساله للزبون مباشرة.");
    }
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-4 my-2 text-slate-100 text-sm">
      {/* 0. Primary Action Recommendation Card */}
      <AdvisorActionCard
        topicId={topicId}
        responseText={rawText}
        scriptText={data.readyScriptOrSOP}
        userCode={userCode}
        onNavigateChapter={onNavigateChapter}
        onNavigateTool={onNavigateTool}
        onShowToast={onShowToast}
      />

      {/* 1. Diagnosis Overview */}
      {data.diagnosis && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/15 via-slate-900/90 to-slate-900 border border-amber-500/30 shadow-md">
          <div className="flex items-center gap-2 mb-2 text-amber-300 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>1. التشخيص الشامل لواقع المشروع:</span>
          </div>
          <p className="text-slate-200 leading-relaxed text-xs sm:text-sm whitespace-pre-line">
            {data.diagnosis}
          </p>
        </div>
      )}

      {/* 2. Key Metrics Analysis */}
      {data.keyMetrics && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-sky-400 font-bold text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span>2. قراءة الأرقام والمؤشرات الحيوية:</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-xs whitespace-pre-line">
            {data.keyMetrics}
          </p>
        </div>
      )}

      {/* 3. Probable Causes */}
      {data.probableCauses.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>3. الأسباب الجذرية المحتملة:</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {data.probableCauses.map((cause, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{cause}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. First 3 Steps within 48 Hours */}
      {data.next48HoursSteps.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 bg-emerald-950/10">
          <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-xs sm:text-sm">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>4. أول 3 خطوات للبدء خلال 48 ساعة:</span>
          </div>
          <div className="space-y-2">
            {data.next48HoursSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/60 border border-emerald-500/20 text-xs text-slate-200"
              >
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Ready-to-use Script / SOP */}
      {data.readyScriptOrSOP && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs sm:text-sm">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>5. سكربت المحادثة / الإجراء الجاهز للنسخ:</span>
            </div>
            <button
              onClick={() => handleCopyScript(data.readyScriptOrSOP)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold transition"
            >
              {copiedScript ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ السكربت</span>
                </>
              )}
            </button>
          </div>
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line select-all">
            {data.readyScriptOrSOP}
          </div>
        </div>
      )}

      {/* 6. Metric to Track & 7. Recommended Chapter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.metricToTrack && (
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs mb-1.5">
              <BarChart3 className="w-4 h-4" />
              <span>6. المقياس الواجب متابعته:</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {data.metricToTrack}
            </p>
          </div>
        )}

        {data.recommendedChapterOrTool && data.recommendedChapterOrTool.chapterTitle && (
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-1.5">
                <BookOpen className="w-4 h-4" />
                <span>7. الفصل والأداة المقترحة:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {data.recommendedChapterOrTool.chapterTitle}
              </p>
            </div>
            {onNavigateChapter && data.recommendedChapterOrTool.chapterId && (
              <button
                onClick={() => onNavigateChapter(data.recommendedChapterOrTool.chapterId!)}
                className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold border border-amber-500/30 transition"
              >
                <span>افتح الفصل في المنصة</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Optional Clarification Prompt */}
      {data.clarificationQuestion && (
        <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-start gap-2.5 text-xs text-blue-200">
          <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">سؤال توضيحي من المستشار:</span>
            <span>{data.clarificationQuestion}</span>
          </div>
        </div>
      )}

      {/* 11. Interactive Action Buttons */}
      <div className="pt-2 border-t border-slate-800/80">
        <span className="text-[11px] text-slate-400 block mb-2 font-medium">
          إجراءات سريعة لتطبيق هذا التشخيص:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              onActionClick("حوّل هذا التشخيص إلى خطة تنفيذية يومية مفصلة لمدة 7 أيام بالتسلسل.")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 hover:border-amber-400/50 transition"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>📅 حوّلها إلى خطة 7 أيام</span>
          </button>

          <button
            onClick={() =>
              onActionClick("اكتبلي سكريبت محادثة واتساب كامل وموسع للرد على الزبون العراقي لهذه الحالة بالتحديد.")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 hover:border-amber-400/50 transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span>💬 اكتبلي السكربت العراقي</span>
          </button>

          <button
            onClick={() =>
              onActionClick("احسبلي صافي الأرباح بالتفصيل بعد خصم كلفة التوصيل 5000 بغداد و7000 محافظات وكلفة الإعلانات ونسبة راجع 15%.")
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 hover:border-amber-400/50 transition"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>🧮 احسب صافي الربح</span>
          </button>
        </div>
      </div>
    </div>
  );
};
