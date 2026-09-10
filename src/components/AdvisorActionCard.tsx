import React, { useState } from "react";
import {
  Sparkles,
  BookOpen,
  Wrench,
  Copy,
  Check,
  Bookmark,
  Calendar,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import {
  AdvisorActionConfig,
  getAdvisorActionForTopic,
  resolveAdvisorActionFromContent,
  isValidChapterId,
  isValidToolId,
  saveRecommendationToStorage,
  addRecommendationTo7DayPlanStorage,
  trackAdvisorAction,
} from "../utils/advisorActionMapper";

export interface AdvisorActionCardProps {
  topicId?: string;
  responseText?: string;
  scriptText?: string;
  customRelevanceReason?: string;
  userCode?: string;
  onNavigateChapter?: (chapterId: string) => void;
  onNavigateTool?: (toolId: string, category?: string) => void;
  onShowToast?: (type: "copy" | "saved" | "plan" | "navigate", title: string, description?: string) => void;
  className?: string;
  compact?: boolean;
}

export const AdvisorActionCard: React.FC<AdvisorActionCardProps> = ({
  topicId,
  responseText = "",
  scriptText,
  customRelevanceReason,
  userCode,
  onNavigateChapter,
  onNavigateTool,
  onShowToast,
  className = "",
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addedToPlan, setAddedToPlan] = useState(false);

  // Resolve typed action config
  const actionConfig: AdvisorActionConfig = topicId
    ? getAdvisorActionForTopic(topicId)
    : resolveAdvisorActionFromContent(responseText || scriptText || "");

  const hasValidChapter = isValidChapterId(actionConfig.chapterId);
  const hasValidTool = isValidToolId(actionConfig.toolId);

  // Fallback label if custom is not passed
  const relevanceLabel = customRelevanceReason || actionConfig.relevanceReasonAr;

  // 1. Copy script handler
  const handleCopyScript = () => {
    const textToCopy = scriptText || responseText;
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    trackAdvisorAction("copy_script", actionConfig.topicId);

    if (onShowToast) {
      onShowToast(
        "copy",
        "تم نسخ السكربت بنجاح! 📋",
        "يمكنك الآن لصقه وإرساله للزبون عبر الواتساب أو الخاص مباشرة."
      );
    }

    setTimeout(() => setCopied(false), 2500);
  };

  // 2. Save recommendation handler
  const handleSaveRecommendation = () => {
    const title = actionConfig.topicNameAr || "توصية من مستشار فيزيون";
    const res = saveRecommendationToStorage(
      {
        title,
        reason: relevanceLabel,
        text: responseText || scriptText || "",
        topicId: actionConfig.topicId,
        chapterId: hasValidChapter ? actionConfig.chapterId : undefined,
        chapterTitle: actionConfig.chapterTitleAr,
        toolId: hasValidTool ? actionConfig.toolId : undefined,
        toolTitle: actionConfig.toolTitleAr,
        script: scriptText,
      },
      userCode
    );

    if (res.success) {
      setSaved(true);
      trackAdvisorAction("save_recommendation", actionConfig.topicId);

      if (onShowToast) {
        onShowToast(
          "saved",
          "تم حفظ التوصية بنجاح 💾",
          "تمت إضافة هذه التوصية إلى سجل توصياتك المحفوظة للرجوع إليها بأي وقت."
        );
      }
    }
  };

  // 3. Add to 7-Day Plan handler
  const handleAddToPlan = () => {
    const title = actionConfig.topicNameAr;
    const details =
      actionConfig.defaultTaskForPlan ||
      (responseText ? responseText.slice(0, 140) + "..." : "تطبيق توصية مستشار فيزيون الذكي.");

    const res = addRecommendationTo7DayPlanStorage(
      {
        title,
        details,
        topicId: actionConfig.topicId,
        toolId: hasValidTool ? actionConfig.toolId : undefined,
        chapterId: hasValidChapter ? actionConfig.chapterId : undefined,
      },
      userCode
    );

    if (res.success) {
      setAddedToPlan(true);
      trackAdvisorAction("add_to_plan", actionConfig.topicId);

      if (onShowToast) {
        onShowToast(
          "plan",
          "تمت الإضافة لخطة الـ 7 أيام 📅",
          "ستظهر هذه المهمة ضمن خطتك التنفيذية الأسبوعية لمتابعة إنجازها."
        );
      }
    }
  };

  // 4. Open Tool handler
  const handleOpenTool = () => {
    if (!hasValidTool || !actionConfig.toolId) return;
    trackAdvisorAction("open_tool", actionConfig.toolId);

    if (onShowToast) {
      onShowToast(
        "navigate",
        `جاري فتح ${actionConfig.toolTitleAr} 🛠️`,
        "تم حفظ جلسة المستشار الذكي ويمكنك العودة إليها في أي وقت."
      );
    }

    if (onNavigateTool) {
      onNavigateTool(actionConfig.toolId, actionConfig.toolCategory);
    }
  };

  // 5. Open Chapter handler
  const handleOpenChapter = () => {
    if (!hasValidChapter || !actionConfig.chapterId) return;
    trackAdvisorAction("open_chapter", actionConfig.chapterId);

    if (onShowToast) {
      onShowToast(
        "navigate",
        `جاري فتح ${actionConfig.chapterTitleAr} 📖`,
        "تم حفظ محادثتك مع المستشار الذكي تلقائياً."
      );
    }

    if (onNavigateChapter) {
      onNavigateChapter(actionConfig.chapterId);
    }
  };

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-[#0F1735]/95 via-[#0A122E] to-[#040B24] border border-[#D4A017]/40 p-3 sm:p-4 shadow-xl text-white dir-rtl space-y-3 ${className}`}
      data-testid="advisor-action-card"
    >
      {/* Arabic Badge & Relevance Label */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-black text-[#F0C040]">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>الخطوة الأنسب إلك الآن:</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
          {relevanceLabel}
        </p>
      </div>

      {/* Interactive Action Buttons */}
      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
        {/* 1. Open Related Tool Button */}
        {hasValidTool && (
          <button
            onClick={handleOpenTool}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#D4A017] to-amber-500 hover:from-amber-400 hover:to-[#D4A017] text-[#040B24] text-xs font-black shadow-md shadow-[#D4A017]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title={`افتح ${actionConfig.toolTitleAr}`}
          >
            <Wrench className="w-3.5 h-3.5 text-[#040B24]" />
            <span>افتح {actionConfig.toolTitleAr}</span>
            <ArrowLeft className="w-3 h-3 text-[#040B24]" />
          </button>
        )}

        {/* 2. Open Related Chapter Button */}
        {hasValidChapter && (
          <button
            onClick={handleOpenChapter}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#162252] hover:bg-[#1f2f70] text-white hover:text-[#F0C040] border border-[#D4A017]/40 hover:border-[#D4A017] text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95"
            title={`افتح ${actionConfig.chapterTitleAr}`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>افتح {actionConfig.chapterNumberAr || "الفصل المقترح"}</span>
          </button>
        )}

        {/* 3. Copy Script Button (if script exists) */}
        {(scriptText || responseText.includes("💬") || responseText.includes("📞") || responseText.includes("السكربت")) && (
          <button
            onClick={handleCopyScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white border border-white/15 text-xs font-semibold transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">تم النسخ!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-sky-400" />
                <span>نسخ السكربت</span>
              </>
            )}
          </button>
        )}

        {/* 4. Add to 7-Day Plan Button */}
        <button
          onClick={handleAddToPlan}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
            addedToPlan
              ? "bg-emerald-950/60 border border-emerald-500/50 text-emerald-300"
              : "bg-white/5 hover:bg-emerald-950/40 border border-white/15 hover:border-emerald-500/40 text-white/90 hover:text-emerald-300"
          }`}
          title="إضافة التوصية كخطوة عملية في خطتك الأسبوعية"
        >
          {addedToPlan ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>مضافة لخطة 7 أيام ✓</span>
            </>
          ) : (
            <>
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>أضفها لخطة 7 أيام</span>
            </>
          )}
        </button>

        {/* 5. Save Recommendation Button */}
        <button
          onClick={handleSaveRecommendation}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 whitespace-nowrap ${
            saved
              ? "bg-amber-950/60 border border-amber-500/50 text-[#F0C040]"
              : "bg-white/5 hover:bg-amber-950/40 border border-white/15 hover:border-amber-500/40 text-white/80 hover:text-[#F0C040]"
          }`}
          title="حفظ التوصية في سجل توصياتك"
        >
          {saved ? (
            <>
              <Bookmark className="w-3.5 h-3.5 text-[#F0C040] fill-[#F0C040]" />
              <span>محفوظة ✓</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5 text-[#F0C040]" />
              <span>حفظ التوصية</span>
            </>
          )}
        </button>
      </div>

      {/* Safe Fallback Note when no specific chapter or tool applies */}
      {!hasValidTool && !hasValidChapter && (
        <p className="text-[11px] text-white/50 pt-1">
          💡 يمكنك تطبيق هذه التوصية فوراً واستشارة فيزيون بوت بأي وقت للحصول على سكريبتات إضافية.
        </p>
      )}
    </div>
  );
};
