import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  Sparkles,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  ChevronDown,
  Lightbulb,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Lock,
  Crown,
  ShieldAlert,
  KeyRound,
  HelpCircle,
  Sliders,
  FileText,
  Compass,
  ChevronRight,
  TrendingDown,
  Package,
  DollarSign,
  PhoneCall,
  Flame,
  CheckCircle2,
  ArrowRight,
  Bookmark,
  Calendar,
  Wrench,
  BookOpen,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getAllValidCodes, normalizeCode } from "./LockScreen";
import { BusinessDiagnosticStepper } from "./BusinessDiagnosticStepper";
import { StructuredDiagnosticCard } from "./StructuredDiagnosticCard";
import { AdvisorActionCard } from "./AdvisorActionCard";
import { AdvisorToast, ToastMessage } from "./AdvisorToast";
import {
  SavedRecommendation,
  PlanTaskItem,
  getSavedRecommendationsFromStorage,
  removeSavedRecommendationFromStorage,
  get7DayPlanStorageKey,
  trackAdvisorAction
} from "../utils/advisorActionMapper";
import { BusinessDiagnosticProfile, DiagnosticMetrics } from "../types";
import { constructDiagnosticPrompt } from "../utils/diagnosticCalculator";
import { trackEvent } from "../lib/analytics";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  suggestions?: string[];
  topicId?: string;
  requestId?: string;
  isDivider?: boolean;
  isError?: boolean;
  failedPrompt?: { text: string; presetSuggestions?: string[] };
}

interface VizionAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSection?: (sectionId: string) => void;
  onNavigateTool?: (toolId: string, category?: string) => void;
  isVip?: boolean;
  userCode?: string;
  onUpgradeSuccess?: (newVipCode: string) => void;
}

// Interactive Problem Diagnosis Tree
interface DiagnosticCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  options: {
    topicId: string;
    label: string;
    subtext: string;
    prompt: string;
    defaultSuggestions: string[];
  }[];
}

const DIAGNOSTIC_CATEGORIES: DiagnosticCategory[] = [
  {
    id: "ads",
    title: "ضعف الإعلانات وهدر الميزانية",
    icon: "🎯",
    description: "حلول مشاكل فيسبوك وتيك توك وانستغرام آدز بالسوق العراقي",
    options: [
      {
        topicId: "topic_ads_low_conversion",
        label: "رسائل كثيرة على الإعلان لكن لا أحد يشتري",
        subtext: "جودة الزبائن ضعيفة والرسائل غير جادة",
        prompt: "إعلاناتي تجلب عدداً كبيراً من الرسائل والاستفسارات بأسعار مناسبة، ولكن نسبة الإغلاق شبه معدومة (محد يشتري فعلياً). ما هو التشخيص العلمي وفق منظومة فيزيون وكيف أحل المشكلة فوراً؟",
        defaultSuggestions: [
          "كيف أعدل محتوى الإعلان وفلترة الزبائن؟",
          "اعطيني سكريبت لتحويل السائل إلى مشترٍ بالواتساب",
          "هل أرفع السعر أم أغير طريقة الاستهداف؟"
        ]
      },
      {
        topicId: "topic_ads_high_cpa",
        label: "كلفة الرسالة مرتفعة جداً (CPA/CPR عالي)",
        subtext: "صرف الميزانية بدون الحصول على عدد استفسارات كافٍ",
        prompt: "كلفة الرسالة في إعلانات الفيسبوك والانستغرام مرتفعة جداً وتستهلك كل هامش الربح. كيف أخفض كلفة الرسالة بالسوق العراقي وأحسن الـ CTR؟",
        defaultSuggestions: [
          "كيف أصيغ الهوك (Hook) البصري الأول للإعلان؟",
          "ما هي أفضل إعدادات استهداف للمحافظات؟",
          "كيف أعرف إذا كان المنتج نفسه هو المشكلة؟"
        ]
      },
      {
        topicId: "topic_ad_fatigue",
        label: "الحملة تنجح يومين ثم ينخفض الأداء فجأة (Ad Fatigue)",
        subtext: "تذبذب النتائج وتوقف الطلبات بعد البداية القوية",
        prompt: "الحملة الإعلانية تبدأ بنتائج قوية أول 48 ساعة ثم ينحدر الأداء وترتفع الكلفة فجأة. كيف أتعامل مع احتراق الإعلان وتوسيع الجمهور العراقي؟",
        defaultSuggestions: [
          "كيف أصنع زوايا إعلانية (Angles) جديدة لنفس المنتج؟",
          "متى يجب زيادة الميزانية (Scaling)؟",
          "كيف أختبر محتوى تيك توك مقابل انستغرام؟"
        ]
      }
    ]
  },
  {
    id: "whatsapp_sales",
    title: "اعتراضات المبيعات وإغلاق الصفقات",
    icon: "💬",
    description: "سكريبتات الردود وإقناع الزبون العراقي المتردد",
    options: [
      {
        topicId: "topic_sales_price_objection",
        label: "الزبون يقول: 'السعر غالي ومبالغ بيه'",
        subtext: "مقارنة السعر بصفحات أخرى أو شعور بعدم الاستحقاق",
        prompt: "الزبون بالواتساب يقول: 'السعر غالي ومبالغ بيه، شفته بغير مكان أرخص'. اعطيني سكريبت الرد الذهبي لإقناعه بالقيمة دون حرق السعر.",
        defaultSuggestions: [
          "كيف أضيف بونص أو عرض إضافي بدون كلفة عالية؟",
          "ماذا أفعل إذا أصر الزبون على الخصم؟",
          "سكريبت تثبيت الضمان وخدمة ما بعد البيع"
        ]
      },
      {
        topicId: "topic_sales_hesitation",
        label: "الزبون يقول: 'بعدين أردلك خبر / استشير'",
        subtext: "تسويف الزبون واختفائه بعد معرفة السعر والمواصفات",
        prompt: "الزبائن يقرأون التفاصيل ثم يكتبون: 'بعدين أردلك خبر' أو 'استشير الأهل' ثم يختفون. كيف أتعامل مع التسويف وأغلق الطلب في نفس اللحظة؟",
        defaultSuggestions: [
          "سكريبت إعادة المتابعة بعد 24 ساعة (Follow-up)",
          "كيف أخلق دافع استعجال (Urgency) حقيقي وأخلاقي؟",
          "طريقة السؤال الختامي البديل (Alternative Choice Close)"
        ]
      },
      {
        topicId: "topic_sales_discount",
        label: "الزبون يطلب خصم أو توصيل مجاني بإصرار",
        subtext: "المساومة على أجور التوصيل وهامش الربح",
        prompt: "الزبائن في العراق دائماً يطلبون 'توصيل مجاني' أو 'تخفيض السعر'. كيف أحافظ على أرباحي وفي نفس الوقت أرضي رغبة الزبون بالخصم؟",
        defaultSuggestions: [
          "كيف أصيغ عروض الحزم (Bundles 1+1 مجاناً)؟",
          "سكريبت الرد على طلب التوصيل المجاني",
          "كيف أدمج كلفة التوصيل بالسعر بطريقة ذكية؟"
        ]
      }
    ]
  },
  {
    id: "delivery_returns",
    title: "تقليل الراجع ومشاكل التوصيل",
    icon: "📦",
    description: "خفض نسبة الإرجاع إلى أقل من 10% وتأكيد الطلبات",
    options: [
      {
        topicId: "topic_delivery_returns",
        label: "الزبون يرفض الاستلام أو يكنسل عند اتصال المندوب",
        subtext: "ضياع أجور التوصيل والجهد وهدر المنتجات بالراجع",
        prompt: "نسبة الراجع عندي في المحافظات تتجاوز 25% والزبائن يرفضون الاستلام عند اتصال المندوب. ما هي الخطة العملية في منظومة فيزيون لتنزيل الراجع لأقل من 10%؟",
        defaultSuggestions: [
          "اعطيني سكريبت مكالمة تأكيد الطلب قبل الشحن",
          "كيف أتعامل مع تأخير شركات التوصيل؟",
          "كيف أمنع طلبات التجار الوهميين أو غير الجادين؟"
        ]
      },
      {
        topicId: "topic_delivery_driver",
        label: "المندوب يتأخر والزبون يفقد الحماس",
        subtext: "بطء التوصيل 4-6 أيام يؤدي لإلغاء الشحنة",
        prompt: "تأخر توصيل الطلبات في المحافظات إلى 4-6 أيام يجعل الزبون يشتري من السوق المحلي ويلغي الطلب. كيف أحافظ على حماس الزبون أثناء فترة الشحن؟",
        defaultSuggestions: [
          "سكريبت رسائل المتابعة أثناء الشحن عبر الواتساب",
          "كيف أختار شركة التوصيل الموثوقة بالعراق؟",
          "نظام الحوافز للمناديب والزبائن"
        ]
      }
    ]
  },
  {
    id: "pricing_finance",
    title: "التسعير وحساب الهيكل المالي",
    icon: "🧮",
    description: "معادلات حساب الكلف والأرباح الصافية بالدينار العراقي",
    options: [
      {
        topicId: "topic_pricing_profit",
        label: "كيف أسعر منتج كلفته 10,000 - 15,000 د.ع لضمان ربح صافي؟",
        subtext: "حساب كلفة الشراء + الإعلانات + التوصيل والراجع",
        prompt: "عندي منتج كلفة شرائه من الجملة 12,000 دينار عراقي، وتكلفة التوصيل 5,000 دينار. كيف أسعر المنتج بسعر جذاب ويضمن لي ربحاً صافياً بعد كلفة الإعلانات والراجع؟",
        defaultSuggestions: [
          "احسب لي نقطة التعادل (Break-Even ROAS)",
          "ما هو الهامش الموصى به للمنتجات الاستهلاكية؟",
          "كيف أسعر العرض الثاني والثالث (Upsell Stack)؟"
        ]
      },
      {
        topicId: "topic_budget_planning",
        label: "الأرباح تختفي في نهاية الشهر ولا أعرف أين تذهب",
        subtext: "إيرادات عالية بدون سيولة نقدية صافية",
        prompt: "صفحتي تحقق مبيعات جيدة وحجم إيرادات محترم، لكن نهاية الشهر لا أجد أرباحاً كاش في يدي. ما هي الثغرات المالية الخفية في التجارة الإلكترونية بالعراق؟",
        defaultSuggestions: [
          "قائمة التدقيق المالي للمصاريف الخفية (Leak Checklist)",
          "كيف أحسب كلفة الراجع على كل قطعة مباعة؟",
          "إدارة دورة رأس المال والتحصيل من شركات الشحن"
        ]
      }
    ]
  }
];

// Presets for Script Generator
const SCRIPT_OBJECTIONS = [
  {
    id: "expensive",
    label: "السعر غالي",
    icon: "💸",
    promptContext: "الزبون يرى أن السعر مرتفع ومبالغ فيه"
  },
  {
    id: "think_later",
    label: "بعدين أردلك خبر",
    icon: "⏳",
    promptContext: "الزبون يسوف ويقول استشير أو أردلك خبر لاحقاً"
  },
  {
    id: "cheaper_elsewhere",
    label: "شفته أرخص بصفحة ثانية",
    icon: "🔍",
    promptContext: "الزبون يقارن بصفحة أخرى تبيع منتجاً مشابهاً أو مقلداً بسعر أقل"
  },
  {
    id: "quality_fear",
    label: "خايف من الجودة والتوصيل",
    icon: "🛡️",
    promptContext: "الزبون يخاف أن تكون البضاعة غير مطابقة للصورة أو رديئة"
  },
  {
    id: "confirm_call",
    label: "مكالمة تأكيد قبل الشحن",
    icon: "📞",
    promptContext: "مكالمة سريعة لتأكيد العنوان والجدية قبل تسليم الشحنة لشركة التوصيل"
  }
];

const SCRIPT_NICHES = [
  { id: "general", label: "عام / استهلاكي", icon: "🛍️" },
  { id: "fashion", label: "أزياء وملابس", icon: "👗" },
  { id: "beauty", label: "تجميل وعناية", icon: "💄" },
  { id: "electronics", label: "إلكترونيات وأجهزة", icon: "📱" },
  { id: "home", label: "منزل ومطبخ", icon: "🏠" }
];

// Helper to get or create a unique device ID
const getOrCreateDeviceId = (): string => {
  if (typeof window === "undefined") return "server_device";
  let devId = localStorage.getItem("vizion_device_uid");
  if (!devId) {
    devId = `dev_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem("vizion_device_uid", devId);
  }
  return devId;
};

// Helper to compute storage key for the current device and user
const getChatStorageKey = (code?: string): string => {
  const activeCode = code || (typeof window !== "undefined" ? localStorage.getItem("sales_guide_user_code") : "") || "";
  const normalized = normalizeCode(activeCode);
  if (normalized) {
    return `vizion_chat_history_user_${normalized}`;
  }
  const deviceId = getOrCreateDeviceId();
  return `vizion_chat_history_device_${deviceId}`;
};

// Helper to compute profile storage key for diagnostic workflow
const getProfileStorageKey = (code?: string): string => {
  const activeCode = code || (typeof window !== "undefined" ? localStorage.getItem("sales_guide_user_code") : "") || "";
  const normalized = normalizeCode(activeCode);
  if (normalized) {
    return `vizion_user_profile_${normalized}`;
  }
  const deviceId = getOrCreateDeviceId();
  return `vizion_user_profile_${deviceId}`;
};

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: "welcome-1",
  role: "assistant",
  text: "أهلاً بك عزيزي التاجر في **فيزيون بوت (Vizion AI Advisor)**! 🤖✨\n\nأنا مستشارك الرقمي المدرب على منظومة **فيزيون للتجارة الإلكترونية بالسوق العراقي**.\n\nسجل محادثاتك واستشاراتك **محفوظ على هاتفك تلقائياً** حتى تتمكن من الرجوع للسكريبتات والحلول بأي وقت.\n\nيمكنك الآن **تشخيص مشروعك بالكامل ⚡** أو كتابة استفسارك المباشر:",
  timestamp: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }),
  suggestions: [
    "⚡ ابدأ تشخيص مشروعي الشامل (4 خطوات)",
    "📦 كيف أسطر على نسبة الراجع بالمحافظات؟",
    "💬 اعطيني سكريبت رد على اعتراض 'السعر غالي'",
    "🎯 الإعلان يجيب رسائل بس ماكو مبيعات، ما الحل؟",
    "🧮 كيف أسعر منتجي لحساب صافي الأرباح؟"
  ]
};

export const VizionAdvisorModal: React.FC<VizionAdvisorModalProps> = ({
  isOpen,
  onClose,
  onNavigateToSection,
  onNavigateTool,
  isVip = true,
  userCode = "",
  onUpgradeSuccess
}) => {
  // Tabs: 'chat' | 'business_diagnostic' | 'diagnostic' | 'script_gen' | 'saved_plan'
  const [activeTab, setActiveTab] = useState<"chat" | "business_diagnostic" | "diagnostic" | "script_gen" | "saved_plan">("chat");
  const [selectedDiagCat, setSelectedDiagCat] = useState<string>("ads");
  
  // Toast Notification System
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const showToast = (type: "success" | "copy" | "saved" | "plan" | "navigate", title: string, description?: string) => {
    setToast({
      id: Date.now().toString(),
      type,
      title,
      description
    });
  };

  // Saved Recommendations & 7-Day Plan State
  const [savedRecommendations, setSavedRecommendations] = useState<SavedRecommendation[]>([]);
  const [planTasks, setPlanTasks] = useState<PlanTaskItem[]>([]);

  const refreshSavedData = () => {
    if (typeof window === "undefined") return;
    try {
      const recs = getSavedRecommendationsFromStorage(userCode);
      setSavedRecommendations(recs);

      const planKey = get7DayPlanStorageKey(userCode);
      const savedPlan = localStorage.getItem(planKey);
      if (savedPlan) {
        const parsed = JSON.parse(savedPlan);
        if (Array.isArray(parsed)) {
          setPlanTasks(parsed);
        }
      } else {
        setPlanTasks([]);
      }
    } catch (e) {
      console.warn("Failed to load saved recommendations/plan:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshSavedData();
    }
  }, [isOpen, userCode, activeTab]);

  const handleToggleTaskCompleted = (taskId: string) => {
    if (typeof window === "undefined") return;
    try {
      const updated = planTasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
      setPlanTasks(updated);
      const planKey = get7DayPlanStorageKey(userCode);
      localStorage.setItem(planKey, JSON.stringify(updated));
      const target = updated.find((t) => t.id === taskId);
      if (target?.completed) {
        showToast("success", "أحسنت! أتممت هذه المهمة 🎯", target.task);
      }
    } catch (e) {
      console.warn("Failed to update plan task:", e);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (typeof window === "undefined") return;
    try {
      const updated = planTasks.filter((t) => t.id !== taskId);
      setPlanTasks(updated);
      const planKey = get7DayPlanStorageKey(userCode);
      localStorage.setItem(planKey, JSON.stringify(updated));
      showToast("success", "تم حذف المهمة من الخطة");
    } catch (e) {
      console.warn("Failed to delete task:", e);
    }
  };

  const handleDeleteRecommendation = (recId: string) => {
    removeSavedRecommendationFromStorage(recId, userCode);
    refreshSavedData();
    showToast("success", "تم حذف التوصية من المحفوظات");
  };
  
  // Script Generator States
  const [selectedObjection, setSelectedObjection] = useState<string>("expensive");
  const [selectedNiche, setSelectedNiche] = useState<string>("general");
  const [customProductNote, setCustomProductNote] = useState<string>("");

  // Load initial messages from localStorage specific to this device & user
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const storageKey = getChatStorageKey(userCode);
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn("Failed to load saved chat history:", e);
      }
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });

  // Re-sync messages when userCode changes or modal opens
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storageKey = getChatStorageKey(userCode);
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch (e) {
        console.warn("Failed to sync chat history for code:", e);
      }
    }
  }, [userCode, isOpen]);

  // Persist messages whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      try {
        const storageKey = getChatStorageKey(userCode);
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (e) {
        console.warn("Failed to save chat history to localStorage:", e);
      }
    }
  }, [messages, userCode]);

  // State for active topic isolation
  const [currentTopicId, setCurrentTopicId] = useState<string>(() => `topic_${Date.now()}`);
  const currentTopicRef = useRef<string>(currentTopicId);
  useEffect(() => {
    currentTopicRef.current = currentTopicId;
  }, [currentTopicId]);

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messageFeedback, setMessageFeedback] = useState<
    Record<
      string,
      {
        rating: "helpful" | "unhelpful";
        reason?: string;
        showReasonPicker?: boolean;
      }
    >
  >({});

  const FEEDBACK_REASONS = [
    "عام جداً",
    "مو مرتبط بسؤالي",
    "الحساب غير واضح",
    "أريد تفاصيل أكثر",
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    trackEvent("advisor_answer_copied", {
      topicId: currentTopicRef.current,
      messageId: id,
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleFeedback = (
    messageId: string,
    rating: "helpful" | "unhelpful",
    reason?: string
  ) => {
    setMessageFeedback((prev) => ({
      ...prev,
      [messageId]: {
        rating,
        reason: reason || prev[messageId]?.reason,
        showReasonPicker: rating === "unhelpful" && !reason,
      },
    }));

    trackEvent("advisor_feedback_submitted", {
      rating,
      reason: reason || (rating === "helpful" ? "مفيد ودقيق" : undefined),
      messageId,
      topicId: currentTopicRef.current,
    });

    if (rating === "helpful" || reason) {
      showToast(
        "success",
        rating === "helpful"
          ? "شكراً لتقييمك! ساعدتنا في تحسين المستشار 👍"
          : "شكراً لملاحظتك! سنعمل على تطوير الإجابات ✍️"
      );
    }
  };

  const [vipUpgradeInput, setVipUpgradeInput] = useState("");
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccessMsg, setUpgradeSuccessMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && isVip && activeTab === "chat") {
      scrollToBottom();
    }
  }, [messages, isOpen, isVip, activeTab]);

  // Clean up any ongoing request when unmounting or closing
  useEffect(() => {
    if (!isOpen && abortControllerRef.current) {
      abortControllerRef.current.abort();
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [isOpen]);

  // Parse AI message to extract suggestions
  const parseResponseSuggestions = (rawText: string): { cleanText: string; suggestions: string[] } => {
    const suggestionMatch = rawText.match(/\[SUGGESTIONS:\s*(.*?)\]/i);
    if (suggestionMatch && suggestionMatch[1]) {
      const suggestions = suggestionMatch[1]
        .split("|")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const cleanText = rawText.replace(/\[SUGGESTIONS:\s*(.*?)\]/gi, "").trim();
      return { cleanText, suggestions };
    }

    // Default fallback suggestions if not returned in tags
    return {
      cleanText: rawText,
      suggestions: [
        "اعطيني سكريبت عملي قابل للنسخ",
        "كيف أطبق هذا في حملتي الإعلانية؟",
        "ما هو الخطأ الشائع الذي يجب تجنبه؟"
      ]
    };
  };

  const handleVipUpgrade = (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeError(null);
    setUpgradeSuccessMsg(null);

    const trimmed = vipUpgradeInput.trim();
    if (!trimmed) {
      setUpgradeError("الرجاء إدخال رمز VIP للمتابعة.");
      return;
    }

    const normalizedInput = normalizeCode(trimmed);
    if (!normalizedInput.includes("#vip")) {
      setUpgradeError("الرمز المدخل لا يتضمن صلاحية VIP (يجب أن يحتوي على #vip).");
      return;
    }

    const validCodes = getAllValidCodes();
    const isValid = validCodes.includes(normalizedInput);

    if (isValid) {
      setUpgradeSuccessMsg("تم تفعيل حساب VIP بنجاح! جاري فتح المستشار الذكي...");
      localStorage.setItem("sales_guide_user_code", trimmed);
      setTimeout(() => {
        if (onUpgradeSuccess) {
          onUpgradeSuccess(trimmed);
        }
      }, 1000);
    } else {
      setUpgradeError("رمز VIP المدخل غير موجود في قائمة كلمات المرور المعتمدة.");
    }
  };

  // Start clean topic while preserving past visual history
  const handleStartNewTopic = () => {
    const newTopicId = `topic_${Date.now()}`;
    setCurrentTopicId(newTopicId);
    currentTopicRef.current = newTopicId;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      isLoadingRef.current = false;
      setIsLoading(false);
    }

    const dividerMessage: Message = {
      id: `divider_${Date.now()}`,
      role: "assistant",
      text: "✨ **تم بدء موضوع استشارة جديد بنظافة تامة**\n\nتم عزل سياق المحادثة السابقة. يمكنك الآن طرح أي سؤال جديد عن الإعلانات، التسعير، التوصيل، أو سكريبتات المبيعات وسيجيب المستشار بتركيز كامل على سؤالك الجديد:",
      timestamp: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }),
      isDivider: true,
      topicId: newTopicId,
      suggestions: [
        "🎯 تشخيص ضعف نتائج الإعلانات",
        "💬 سكريبت الرد على 'السعر غالي'",
        "📦 خطة تقليل نسبة الراجع للمحافظات",
        "🧮 معادلة تسعير المنتج لضمان الأرباح"
      ]
    };

    setMessages((prev) => [...prev, dividerMessage]);
    setActiveTab("chat");
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isLoadingRef.current = false;
    setIsLoading(false);
  };

  const handleCompleteDiagnostic = (profile: BusinessDiagnosticProfile, metrics: DiagnosticMetrics) => {
    setActiveTab("chat");
    const prompt = constructDiagnosticPrompt(profile, metrics);
    handleSendMessage(
      prompt,
      [
        "📅 حوّلها إلى خطة 7 أيام",
        "💬 اكتبلي السكربت العراقي",
        "🧮 احسب صافي الربح",
        "📖 افتح الفصل المرتبط"
      ],
      {
        topicContext: `تشخيص مشروع: ${profile.productOrService || profile.businessType}`,
        diagnosticProfile: profile
      }
    );
  };

  const handleSendMessage = async (
    textToSend?: string,
    presetSuggestions?: string[],
    optionsOrTopicId?: string | {
      overrideTopicId?: string;
      isNewTopic?: boolean;
      topicContext?: string;
      diagnosticProfile?: BusinessDiagnosticProfile;
    }
  ) => {
    const text = (textToSend || inputText).trim();
    
    // Prevent duplicate submissions
    if (!text || isLoadingRef.current) return;

    // Support quick trigger from suggestions: "⚡ ابدأ تشخيص مشروعي الشامل"
    if (text.includes("ابدأ تشخيص مشروعي") || text.includes("شخّص مشروعي")) {
      setActiveTab("business_diagnostic");
      return;
    }

    const options = typeof optionsOrTopicId === "object" ? optionsOrTopicId : { overrideTopicId: optionsOrTopicId };
    const topicId = options.overrideTopicId || currentTopicRef.current;
    const clientRequestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    isLoadingRef.current = true;
    setIsLoading(true);

    trackEvent("advisor_prompt_submitted", { topicId });

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }),
      topicId: topicId,
      requestId: clientRequestId
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputText("");
    setActiveTab("chat"); // Auto switch to chat to see the answer

    // Setup AbortController with 90s timeout (ample time for deep diagnostics & high load)
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 90000);

    try {
      // Build past history strictly filtered to current topic to avoid cross-contamination
      const topicMessages = messages
        .filter((m) => !m.isDivider && (!m.topicId || m.topicId === topicId))
        .slice(-6); // Sliding window of max 6 recent turns

      const historyPayload = topicMessages.map((m) => ({
        role: m.role,
        text: m.text.replace(/\[SUGGESTIONS:\s*.*?\]/gi, "").trim(),
        topicId: m.topicId
      }));

      // Append current user message
      historyPayload.push({ role: "user", text: text, topicId });

      const response = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": clientRequestId
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: historyPayload,
          requestId: clientRequestId,
          topicContext: options.topicContext || topicId,
          isNewTopic: options.isNewTopic,
          diagnosticProfile: options.diagnosticProfile,
          userContext: {
            isVip,
            platform: "Vizion Iraq E-Commerce Suite"
          }
        })
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        const cleanText = responseText.replace(/<[^>]*>?/gm, "").trim();
        throw new Error(`خطأ في استجابة السيرفر (كود ${response.status}): ${cleanText.slice(0, 150) || "لا توجد تفاصيل"}`);
      }

      if (!response.ok) {
        const errorDetails = data.details ? ` (${data.details})` : "";
        throw new Error((data.error || "Failed to fetch response") + errorDetails);
      }

      const rawReply = data.reply || "عذراً، حدث خطأ أثناء معالجة الطلب.";
      const { cleanText, suggestions } = parseResponseSuggestions(rawReply);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: cleanText,
        timestamp: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }),
        topicId: topicId,
        requestId: data.requestId || clientRequestId,
        suggestions: presetSuggestions || (suggestions.length > 0 ? suggestions : undefined)
      };

      setMessages((prev) => [...prev, botMessage]);
      trackEvent("advisor_answer_completed", {
        topicId,
        requestId: data.requestId || clientRequestId
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("AI Advisor error:", err);

      const isAborted = err.name === "AbortError" || controller.signal.aborted;
      const errorText = isAborted
        ? "⏱️ استغرق استجابة النموذج وقتاً أطول من المتوقع أو تم قطع الاتصال. يمكنك النقر على زر 'إعادة المحاولة الآن' أدناه:"
        : `⚠️ ${err.message || "عذراً، تعذر الاتصال بالمستشار الذكي في هذه اللحظة. يرجى التأكد من تشغيل السيرفر وإضافة GEMINI_API_KEY."}`;

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: errorText,
        timestamp: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }),
        topicId: topicId,
        requestId: clientRequestId,
        isError: true,
        failedPrompt: { text, presetSuggestions },
        suggestions: [
          "🎯 تشخيص ضعف إعلاناتي",
          "📦 خطة تقليل الراجع بالمحافظات",
          "💬 سكريبت مبيعات الواتساب"
        ]
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleGenerateScript = () => {
    const objObj = SCRIPT_OBJECTIONS.find((o) => o.id === selectedObjection);
    const nicheObj = SCRIPT_NICHES.find((n) => n.id === selectedNiche);

    let topicId = "topic_sales_price_objection";
    if (selectedObjection === "expensive") topicId = "topic_sales_price_objection";
    else if (selectedObjection === "think_later") topicId = "topic_sales_hesitation";
    else if (selectedObjection === "cheaper_elsewhere") topicId = "topic_competitors";
    else if (selectedObjection === "quality_fear") topicId = "topic_sales_price_objection";
    else if (selectedObjection === "confirm_call") topicId = "topic_delivery_confirmation";

    const prompt = `اعطيني سكريبت رد احترافي مكتوب باللهجة العراقية المفهومة والودية للتعامل مع اعتراض: "${objObj?.label}" (${objObj?.promptContext}) لمتجر يعمل في مجال: "${nicheObj?.label}".
${customProductNote.trim() ? `ملاحظات إضافية عن المنتج: ${customProductNote.trim()}` : ""}
المطلوب:
1. صياغة سكريبت محادثة واتساب مباشر جاهز للنسخ والإرسال.
2. نصيحة ذهبية لمنع خسارة الزبون وإغلاق البيعة فوراً.`;

    handleSendMessage(
      prompt,
      [
        "اعطني خيار رد بديل لنفس الاعتراض",
        "كيف أضيف عرض حزمة (Bundle) مقنع؟",
        "سكريبت المتابعة في حال لم يرد الزبون"
      ],
      topicId
    );
  };

  const handleClearHistory = () => {
    if (confirm("هل أنت متأكد من مسح محادثة المستشار الذكي المحفوظة على هذا الجهاز؟")) {
      const resetMessages = [
        {
          id: "welcome-reset",
          role: "assistant" as const,
          text: "تم مسح المحادثة بنجاح من هاتفك 💡 يمكنك اختيار أحد المواضيع المقترحة أو كتابة سؤالك الآن:",
          timestamp: new Date().toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }),
          suggestions: [
            "🎯 تشخيص ضعف إعلاناتي",
            "📦 خطة تقليل الراجع للمحافظات",
            "💬 سكريبت مبيعات الواتساب",
            "🧮 معادلة تسعير المنتجات"
          ]
        }
      ];
      setMessages(resetMessages);
      if (typeof window !== "undefined") {
        try {
          const storageKey = getChatStorageKey(userCode);
          localStorage.setItem(storageKey, JSON.stringify(resetMessages));
        } catch (e) {
          console.warn("Failed to clear local chat history:", e);
        }
      }
    }
  };

  if (!isOpen) return null;

  const currentDiag = DIAGNOSTIC_CATEGORIES.find((c) => c.id === selectedDiagCat) || DIAGNOSTIC_CATEGORIES[0];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 450) {
                onClose();
              }
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="advisor-modal-title"
            className="relative w-full max-w-4xl h-[100dvh] sm:h-[88vh] bg-[#040B24] border-0 sm:border border-[#D4A017]/40 rounded-none sm:rounded-3xl shadow-[0_25px_80px_rgba(212,160,23,0.3)] flex flex-col overflow-hidden text-white dir-rtl touch-pan-y"
          >
            {/* Mobile Drag Down Bar Indicator */}
            <div className="w-12 h-1 bg-white/30 rounded-full mx-auto my-1 sm:hidden shrink-0 cursor-grab active:cursor-grabbing" />

            {/* In-Modal Toast Alerts */}
            <AdvisorToast toast={toast} onDismiss={() => setToast(null)} />

            {/* Top Metallic Gold Header */}
            <div className="px-2.5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#0F1735] via-[#0A122E] to-[#040B24] border-b border-[#D4A017]/30 flex items-center justify-between relative shrink-0">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#D4A017] to-amber-600 p-[1px] shadow-lg shadow-[#D4A017]/20 flex items-center justify-center">
                    <div className="w-full h-full bg-[#040B24] rounded-[10px] sm:rounded-[15px] flex items-center justify-center text-[#F0C040]">
                      <Bot className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                  </div>
                  {isVip ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 sm:w-3.5 h-2 sm:h-3.5 bg-emerald-500 border-2 border-[#040B24] rounded-full animate-ping" />
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 sm:w-3.5 h-2 sm:h-3.5 bg-amber-500 border-2 border-[#040B24] rounded-full flex items-center justify-center text-[7px] sm:text-[8px]">🔒</span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <h3 id="advisor-modal-title" className="text-xs sm:text-lg font-black text-white tracking-wide truncate">
                      فيزيون بوت <span className="text-[#F0C040] text-[10px] sm:text-xs font-mono font-normal hidden sm:inline">| Vizion AI Advisor</span>
                    </h3>
                    {isVip ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black bg-[#D4A017]/20 text-[#F0C040] border border-[#D4A017]/40 flex items-center gap-0.5 shrink-0">
                        <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> VIP نشط
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-0.5 shrink-0">
                        <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" /> حصري لـ VIP
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] sm:text-xs text-white/60 font-light mt-0.5 truncate">
                    {isVip ? "اختر مشكلتك وسيقوم الذكاء الاصطناعي بتحليلها واقتراح الحلول الفورية" : "ميزة مساعد الذكاء الاصطناعي تتطلب حساب VIP"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {isVip && (
                  <>
                    <button
                      onClick={handleStartNewTopic}
                      title="بدء موضوع استشارة جديد ونظيف"
                      aria-label="بدء موضوع استشارة جديد"
                      className="px-2 py-1 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-r from-[#D4A017]/20 via-amber-500/20 to-[#D4A017]/10 hover:from-[#D4A017]/30 hover:to-amber-500/30 text-[#F0C040] hover:text-white transition-all border border-[#D4A017]/40 text-[10px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 shrink-0"
                    >
                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#F0C040]" />
                      <span className="hidden sm:inline">موضوع جديد</span>
                    </button>

                    <button
                      onClick={handleClearHistory}
                      title="مسح سجل المحادثة من هذا الجهاز"
                      aria-label="مسح سجل المحادثات بالكامل"
                      className="p-1 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-rose-400 transition-colors border border-white/10 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </>
                )}

                <button
                  onClick={onClose}
                  aria-label="إغلاق نافذة المستشار"
                  className="p-1 sm:p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/70 hover:text-rose-400 transition-colors border border-white/10 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* IF NOT VIP: Render VIP Restricted Screen */}
            {!isVip ? (
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#040B24] via-[#081030] to-[#040B24] space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-[#D4A017] via-amber-500 to-amber-700 p-[2px] shadow-[0_0_40px_rgba(212,160,23,0.35)] flex items-center justify-center">
                    <div className="w-full h-full bg-[#040B24] rounded-[22px] flex items-center justify-center text-[#F0C040]">
                      <Crown className="w-10 h-10 sm:w-12 sm:h-12 text-[#F0C040] animate-pulse" />
                    </div>
                  </div>
                  <span className="absolute -bottom-2 -right-2 p-2 bg-[#040B24] border border-[#D4A017] rounded-full text-[#F0C040]">
                    <Lock className="w-4 h-4" />
                  </span>
                </div>

                <div className="space-y-3 max-w-lg">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A017]/10 border border-[#D4A017]/30 text-xs font-bold text-[#F0C040]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ميزة خاصة بأعضاء VIP فقط</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    مستشار الذكاء الاصطناعي (فيزيون بوت) غير متاح لحسابك
                  </h3>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                    احصل على استشارات فورية، تشخيص ميزانيات الإعلانات، توليد سكريبتات إغلاق صفقات الواتساب، وتقليل الراجع بالسوق العراقي.
                  </p>
                </div>

                {/* VIP Code Entry / Upgrade Form */}
                <form onSubmit={handleVipUpgrade} className="w-full max-w-md bg-[#0F1735] p-5 sm:p-6 rounded-2xl border border-[#D4A017]/30 space-y-4 shadow-xl">
                  <div className="text-right space-y-1">
                    <label className="text-xs font-bold text-[#F0C040] flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#F0C040]" />
                      <span>هل تمتلك رمز دخول VIP؟ أدخله للترقية الفورية:</span>
                    </label>
                    <p className="text-[10px] text-white/50">أدخل رمز المرور الخاص بك الذي ينتهي بـ #vip للوصول للذكاء الاصطناعي.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={vipUpgradeInput}
                      onChange={(e) => setVipUpgradeInput(e.target.value)}
                      placeholder="VIZION-VIP-XXXX#vip"
                      className="flex-1 px-4 py-3 bg-[#040B24] border border-white/15 rounded-xl text-white text-sm placeholder-white/30 font-mono focus:border-[#D4A017] outline-none text-center sm:text-right"
                    />

                    <button
                      type="submit"
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#D4A017] to-amber-600 text-[#040B24] font-black text-xs sm:text-sm shadow-lg shadow-[#D4A017]/20 hover:scale-105 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    >
                      تفعيل VIP ⚡
                    </button>
                  </div>

                  {upgradeError && (
                    <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-200 flex items-center gap-2 text-right">
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{upgradeError}</span>
                    </div>
                  )}

                  {upgradeSuccessMsg && (
                    <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 text-right">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{upgradeSuccessMsg}</span>
                    </div>
                  )}
                </form>
              </div>
            ) : (
              <>
                {/* Mode Selector Tabs (Chat / Business Diagnostic / Diagnostic Wizard / Script Generator / Saved & Plan) */}
                <div className="px-3 sm:px-6 py-2 bg-[#081030] border-b border-white/10 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={() => setActiveTab("business_diagnostic")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        activeTab === "business_diagnostic"
                          ? "bg-gradient-to-r from-[#D4A017] to-amber-600 text-[#040B24] shadow-md shadow-[#D4A017]/20 font-black"
                          : "bg-[#D4A017]/10 hover:bg-[#D4A017]/20 text-[#F0C040] border border-[#D4A017]/30"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>شخّص مشروعك ⚡ (جديد)</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("chat")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        activeTab === "chat"
                          ? "bg-gradient-to-r from-[#D4A017] to-amber-600 text-[#040B24] shadow-md shadow-[#D4A017]/20"
                          : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>المحادثة الحرة</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("diagnostic")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        activeTab === "diagnostic"
                          ? "bg-gradient-to-r from-[#D4A017] to-amber-600 text-[#040B24] shadow-md shadow-[#D4A017]/20"
                          : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>مشخّص المشاكل بالخيارات</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("script_gen")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        activeTab === "script_gen"
                          ? "bg-gradient-to-r from-[#D4A017] to-amber-600 text-[#040B24] shadow-md shadow-[#D4A017]/20"
                          : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>مولّد السكريبتات 📝</span>
                    </button>

                    <button
                      onClick={() => setActiveTab("saved_plan")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        activeTab === "saved_plan"
                          ? "bg-gradient-to-r from-[#D4A017] to-amber-600 text-[#040B24] shadow-md shadow-[#D4A017]/20 font-black"
                          : "bg-[#0A122E]/80 hover:bg-[#D4A017]/10 text-white/80 hover:text-[#F0C040] border border-white/10 hover:border-[#D4A017]/40"
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5 text-[#F0C040]" />
                      <span>التوصيات وخطة الـ 7 أيام 📌</span>
                      {(savedRecommendations.length > 0 || planTasks.length > 0) && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[#D4A017] text-[#040B24] shadow-sm">
                          {savedRecommendations.length + planTasks.filter(t => !t.completed).length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* TAB: GUIDED BUSINESS DIAGNOSTIC STEPPER */}
                {activeTab === "business_diagnostic" && (
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-[#040B24] via-[#081030] to-[#040B24]">
                    <BusinessDiagnosticStepper
                      storageKey={getProfileStorageKey(userCode)}
                      onCancel={() => setActiveTab("chat")}
                      onComplete={handleCompleteDiagnostic}
                    />
                  </div>
                )}

                {/* TAB 1: DIAGNOSTIC WIZARD (Choose your problem & get instant AI diagnosis) */}
                {activeTab === "diagnostic" && (
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-[#040B24] via-[#081030] to-[#040B24] space-y-5">
                    <div className="bg-[#0F1735]/80 border border-[#D4A017]/30 rounded-2xl p-4 sm:p-5 shadow-lg">
                      <div className="flex items-center gap-2 mb-2 text-[#F0C040]">
                        <Compass className="w-5 h-5" />
                        <h4 className="text-sm sm:text-base font-black text-white">
                          اختر التحدي الذي يواجه مشروعك حالياً:
                        </h4>
                      </div>
                      <p className="text-xs text-white/70">
                        حدد القسم والمشكلة المحددة وسيقوم فيزيون بوت بتحليل السبب وتقديم الحلول والسكريبتات فوراً.
                      </p>
                    </div>

                    {/* Categories Tabs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DIAGNOSTIC_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedDiagCat(cat.id)}
                          className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                            selectedDiagCat === cat.id
                              ? "bg-gradient-to-b from-[#162252] to-[#0D1638] border-[#D4A017] shadow-lg shadow-[#D4A017]/15 ring-1 ring-[#D4A017]"
                              : "bg-[#0A122E]/70 border-white/10 hover:border-white/25 text-white/80"
                          }`}
                        >
                          <span className="text-xl">{cat.icon}</span>
                          <span className="text-xs font-bold text-white line-clamp-1">{cat.title}</span>
                        </button>
                      ))}
                    </div>

                    {/* Specific Options for Selected Category */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F0C040] flex items-center gap-1">
                          <span>{currentDiag.icon}</span>
                          <span>اختر الحالة الدقيقة لمشروعك:</span>
                        </span>
                        <span className="text-[11px] text-white/50 font-mono">
                          {currentDiag.options.length} خيارات متاحة
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        {currentDiag.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(opt.prompt, opt.defaultSuggestions, opt.topicId)}
                            disabled={isLoading}
                            className="w-full text-right p-3.5 sm:p-4 rounded-xl bg-[#0F1735]/90 hover:bg-[#162252] border border-white/10 hover:border-[#D4A017]/60 transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50 shadow-md"
                          >
                            <div className="space-y-1 pr-1">
                              <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F0C040] transition-colors flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#D4A017]" />
                                <span>{opt.label}</span>
                              </h5>
                              <p className="text-[11px] sm:text-xs text-white/60">
                                {opt.subtext}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 pr-3">
                              <span className="text-[11px] font-bold text-[#D4A017] group-hover:underline hidden sm:inline">
                                تحليل فوري
                              </span>
                              <div className="w-7 h-7 rounded-lg bg-[#D4A017]/20 border border-[#D4A017]/40 flex items-center justify-center text-[#F0C040] group-hover:scale-110 transition-transform">
                                <ArrowLeft className="w-4 h-4" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: INSTANT SCRIPT GENERATOR (Choose objection & generate copy-paste script) */}
                {activeTab === "script_gen" && (
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-[#040B24] via-[#081030] to-[#040B24] space-y-5">
                    <div className="bg-[#0F1735]/80 border border-[#D4A017]/30 rounded-2xl p-4 sm:p-5 shadow-lg">
                      <div className="flex items-center gap-2 mb-2 text-[#F0C040]">
                        <FileText className="w-5 h-5" />
                        <h4 className="text-sm sm:text-base font-black text-white">
                          مولّد سكريبتات إغلاق الصفقات بالسوق العراقي 💬
                        </h4>
                      </div>
                      <p className="text-xs text-white/70">
                        اختر نوع الاعتراض ومجال المنتج، وسيكتب لك فيزيون بوت سكريبت محادثة جاهز للنسخ والإرسال للزبون على الواتساب أو عبر الاتصال.
                      </p>
                    </div>

                    {/* 1. Choose Objection */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#F0C040] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#D4A017]/20 border border-[#D4A017]/40 flex items-center justify-center text-[10px] text-[#F0C040]">1</span>
                        <span>ما هو اعتراض الزبون الذي تريد تجاوزه؟</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SCRIPT_OBJECTIONS.map((obj) => (
                          <button
                            key={obj.id}
                            onClick={() => setSelectedObjection(obj.id)}
                            className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center gap-2.5 ${
                              selectedObjection === obj.id
                                ? "bg-[#162252] border-[#D4A017] shadow-lg shadow-[#D4A017]/20 text-white font-bold"
                                : "bg-[#0A122E]/70 border-white/10 hover:border-white/25 text-white/70"
                            }`}
                          >
                            <span className="text-lg">{obj.icon}</span>
                            <span className="text-xs">{obj.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2. Choose Niche */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#F0C040] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#D4A017]/20 border border-[#D4A017]/40 flex items-center justify-center text-[10px] text-[#F0C040]">2</span>
                        <span>ما هو مجال أو تخصص متجرك؟</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {SCRIPT_NICHES.map((niche) => (
                          <button
                            key={niche.id}
                            onClick={() => setSelectedNiche(niche.id)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                              selectedNiche === niche.id
                                ? "bg-[#162252] border-[#D4A017] shadow-lg shadow-[#D4A017]/20 text-white font-bold"
                                : "bg-[#0A122E]/70 border-white/10 hover:border-white/25 text-white/70"
                            }`}
                          >
                            <span className="text-base">{niche.icon}</span>
                            <span className="text-[11px]">{niche.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Custom Product Note (Optional) */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/80 flex items-center justify-between">
                        <span>ملاحظات إضافية أو اسم المنتج (اختياري):</span>
                        <span className="text-[10px] text-white/40">مثال: ساعة ذكية ضد الماء بسعر 25 ألف</span>
                      </label>
                      <input
                        type="text"
                        value={customProductNote}
                        onChange={(e) => setCustomProductNote(e.target.value)}
                        placeholder="اكتب اسم المنتج أو السعر إذا أردت تخصيص السكريبت بدقة..."
                        className="w-full px-4 py-2.5 rounded-xl bg-[#040B24] border border-white/15 focus:border-[#D4A017] text-white text-xs placeholder-white/30 outline-none"
                      />
                    </div>

                    {/* Generate Button */}
                    <button
                      onClick={handleGenerateScript}
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4A017] via-amber-500 to-amber-600 hover:from-amber-400 hover:to-[#D4A017] text-[#040B24] font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#D4A017]/25 hover:scale-[1.01] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>توليد السكريبت العراقي الآن ⚡</span>
                    </button>
                  </div>
                )}

                {/* TAB: SAVED RECOMMENDATIONS & 7-DAY ACTION PLAN */}
                {activeTab === "saved_plan" && (
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-[#040B24] via-[#081030] to-[#040B24] space-y-6">
                    {/* Top Stat Banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 rounded-2xl bg-[#0F1735]/90 border border-[#D4A017]/30 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-xs text-white/60">التوصيات والسكريبتات المحفوظة</span>
                          <h4 className="text-xl font-black text-[#F0C040]">{savedRecommendations.length} توصية</h4>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#D4A017]/20 border border-[#D4A017]/40 flex items-center justify-center text-[#F0C040]">
                          <Bookmark className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-[#0F1735]/90 border border-[#D4A017]/30 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-xs text-white/60">مهام خطة الـ 7 أيام المنجزة</span>
                          <h4 className="text-xl font-black text-emerald-400">
                            {planTasks.filter((t) => t.completed).length} / {planTasks.length} مكتملة
                          </h4>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Section 1: 7-Day Plan Tasks */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-[#F0C040]" />
                          <h3 className="text-sm sm:text-base font-black text-white">
                            📅 خطة الـ 7 أيام التنفيذية
                          </h3>
                        </div>
                        <span className="text-xs text-white/50 font-mono">
                          {planTasks.length} مهام مضافة
                        </span>
                      </div>

                      {planTasks.length === 0 ? (
                        <div className="p-6 rounded-2xl bg-[#0A122E]/60 border border-white/10 text-center space-y-2">
                          <Calendar className="w-8 h-8 text-white/30 mx-auto" />
                          <p className="text-xs text-white/70 font-semibold">لم تضف أي توصيات لخطة الـ 7 أيام بعد</p>
                          <p className="text-[11px] text-white/40">
                            عند استشارة فيزيون بوت، اضغط على زر <strong className="text-[#F0C040]">"إضافة للخطة 7 أيام"</strong> في بطاقة الإجراءات لتنظيم خطواتك هنا.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {planTasks.map((task) => (
                            <div
                              key={task.id}
                              className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                                task.completed
                                  ? "bg-[#0A122E]/40 border-emerald-500/30 opacity-70"
                                  : "bg-[#0F1735]/90 border-white/10 hover:border-[#D4A017]/40"
                              }`}
                            >
                              <div className="flex items-start gap-3 flex-1">
                                <button
                                  onClick={() => handleToggleTaskCompleted(task.id)}
                                  className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                    task.completed
                                      ? "bg-emerald-500 border-emerald-400 text-[#040B24]"
                                      : "border-white/30 hover:border-[#D4A017] bg-black/20"
                                  }`}
                                >
                                  {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </button>

                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded-md bg-[#D4A017]/20 border border-[#D4A017]/40 text-[#F0C040] text-[10px] font-black">
                                      {task.day}
                                    </span>
                                    <h4 className={`text-xs sm:text-sm font-bold ${task.completed ? "line-through text-white/50" : "text-white"}`}>
                                      {task.task}
                                    </h4>
                                  </div>
                                  {task.description && (
                                    <p className="text-[11px] text-white/60 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}

                                  {/* Direct Actions in Plan item */}
                                  <div className="pt-2 flex flex-wrap gap-2">
                                    {task.toolId && (
                                      <button
                                        onClick={() => onNavigateTool?.(task.toolId)}
                                        className="px-2.5 py-1 rounded-lg bg-[#D4A017]/15 hover:bg-[#D4A017] text-[#F0C040] hover:text-[#040B24] border border-[#D4A017]/30 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <Wrench className="w-3 h-3" />
                                        <span>فتح الأداة المرتبطة</span>
                                      </button>
                                    )}
                                    {task.chapterId && (
                                      <button
                                        onClick={() => onNavigateToSection?.(task.chapterId)}
                                        className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <BookOpen className="w-3 h-3" />
                                        <span>مراجعة الفصل</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                title="حذف المهمة"
                                className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 2: Saved Recommendations & Scripts */}
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-5 h-5 text-[#F0C040]" />
                          <h3 className="text-sm sm:text-base font-black text-white">
                            📌 التوصيات والسكريبتات المحفوظة
                          </h3>
                        </div>
                        <span className="text-xs text-white/50 font-mono">
                          {savedRecommendations.length} عناصر
                        </span>
                      </div>

                      {savedRecommendations.length === 0 ? (
                        <div className="p-6 rounded-2xl bg-[#0A122E]/60 border border-white/10 text-center space-y-2">
                          <Bookmark className="w-8 h-8 text-white/30 mx-auto" />
                          <p className="text-xs text-white/70 font-semibold">لا توجد توصيات محفوظة حتى الآن</p>
                          <p className="text-[11px] text-white/40">
                            اضغط على زر <strong className="text-[#F0C040]">"حفظ التوصية"</strong> في أي رد أو سكريبت لتجده محفوظاً هنا للرجوع إليه دائماً.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {savedRecommendations.map((rec) => (
                            <div
                              key={rec.id}
                              className="p-4 rounded-xl bg-[#0F1735]/90 border border-white/10 hover:border-[#D4A017]/30 transition-all space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-[#F0C040]" />
                                    <span>{rec.title}</span>
                                  </h4>
                                  {rec.relevanceReason && (
                                    <p className="text-[11px] text-[#F0C040]/90 font-medium">
                                      💡 {rec.relevanceReason}
                                    </p>
                                  )}
                                  <span className="text-[9px] text-white/40 font-mono">
                                    حُفظت بتاريخ: {new Date(rec.savedAt).toLocaleDateString("ar-IQ")}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleDeleteRecommendation(rec.id)}
                                  title="حذف التوصية"
                                  className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* Script Preview if available */}
                              {rec.scriptText && (
                                <div className="p-3 rounded-lg bg-[#040B24] border border-[#D4A017]/30 text-white/90 text-xs space-y-2">
                                  <div className="flex items-center justify-between text-[10px] text-[#F0C040] font-bold">
                                    <span>💬 نص السكريبت الجاهز للزبون:</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(rec.scriptText || "");
                                        showToast("copy", "تم نسخ السكريبت بنجاح 📋", "يمكنك لصقه مباشرة في محادثة الواتساب");
                                      }}
                                      className="px-2 py-0.5 rounded bg-[#D4A017]/20 hover:bg-[#D4A017] text-[#F0C040] hover:text-[#040B24] transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Copy className="w-3 h-3" />
                                      <span>نسخ السكريبت</span>
                                    </button>
                                  </div>
                                  <p className="whitespace-pre-wrap font-sans text-white/80 text-[11px] leading-relaxed">
                                    {rec.scriptText}
                                  </p>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex flex-wrap gap-2 pt-1">
                                {rec.toolId && (
                                  <button
                                    onClick={() => onNavigateTool?.(rec.toolId)}
                                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4A017] to-amber-600 hover:from-amber-400 hover:to-[#D4A017] text-[#040B24] text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                                  >
                                    <Wrench className="w-3.5 h-3.5" />
                                    <span>فتح الأداة المرتبطة</span>
                                  </button>
                                )}
                                {rec.chapterId && (
                                  <button
                                    onClick={() => onNavigateToSection?.(rec.chapterId)}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>مراجعة الفصل</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: INTERACTIVE CHAT (Default Chat view with Dynamic Suggestions) */}
                {activeTab === "chat" && (
                  <>
                    {/* Quick Suggestions Carousel */}
                    <div className="px-2.5 py-2 sm:px-4 sm:py-2.5 bg-[#081030] border-b border-white/5 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-bold text-[#F0C040] whitespace-nowrap flex items-center gap-1 pl-1.5 border-l border-white/10 shrink-0">
                        <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#F0C040]" /> اختر سؤالاً:
                      </span>
                      {DIAGNOSTIC_CATEGORIES.flatMap((c) => c.options.slice(0, 1)).map((qp, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(qp.prompt, qp.defaultSuggestions, qp.topicId)}
                          disabled={isLoading}
                          className="px-2.5 py-1 rounded-lg sm:rounded-xl bg-white/5 hover:bg-[#D4A017]/20 border border-white/10 hover:border-[#D4A017]/40 text-[11px] text-white/80 hover:text-white transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <span>{qp.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Messages Scroll Area */}
                    <div 
                      aria-live="polite"
                      aria-atomic="false"
                      className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-gradient-to-b from-[#040B24] via-[#081030] to-[#040B24]"
                    >
                      {messages.map((msg) => {
                        // 1. Topic Divider Display
                        if (msg.isDivider) {
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="my-3 sm:my-4"
                            >
                              <div className="relative flex items-center justify-center mb-3">
                                <div className="absolute inset-0 flex items-center">
                                  <div className="w-full border-t border-[#D4A017]/30 border-dashed" />
                                </div>
                                <div className="relative px-3 py-1 bg-[#0F1735] border border-[#D4A017]/50 rounded-full text-[10px] sm:text-xs font-black text-[#F0C040] flex items-center gap-1.5 shadow-md">
                                  <Sparkles className="w-3 h-3 text-[#F0C040]" />
                                  <span>موضوع جديد (سياق نظيف)</span>
                                </div>
                              </div>

                              <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0F1735]/90 border border-[#D4A017]/30 text-white/90 text-xs sm:text-sm space-y-2">
                                <p className="font-semibold text-[#F0C040]">{msg.text}</p>
                                {msg.suggestions && msg.suggestions.length > 0 && (
                                  <div className="pt-2 flex flex-wrap gap-1.5">
                                    {msg.suggestions.map((sug, sIdx) => (
                                      <button
                                        key={sIdx}
                                        onClick={() => handleSendMessage(sug)}
                                        disabled={isLoading}
                                        className="px-2.5 py-1 rounded-lg bg-[#040B24] hover:bg-[#D4A017] text-white/80 hover:text-[#040B24] border border-[#D4A017]/30 hover:border-[#D4A017] text-[10px] sm:text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                                      >
                                        <span>⚡ {sug}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        }

                        // 2. Standard Chat Message Display
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex gap-2.5 sm:gap-3 max-w-[96%] sm:max-w-[85%] ${
                              msg.role === "user" ? "mr-auto flex-row-reverse" : "ml-auto"
                            }`}
                          >
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                              {msg.role === "user" ? (
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500 to-[#D4A017] flex items-center justify-center text-[#040B24] font-black text-[10px] sm:text-xs shadow-md">
                                  أنت
                                </div>
                              ) : (
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${msg.isError ? "bg-rose-950/80 border border-rose-500/50 text-rose-400" : "bg-[#0F1735] border border-[#D4A017]/50 text-[#F0C040]"} flex items-center justify-center shadow-md`}>
                                  <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                              )}
                            </div>

                            {/* Message Box */}
                            <div className="group relative flex-1">
                              <div
                                className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm leading-relaxed ${
                                  msg.role === "user"
                                    ? "bg-gradient-to-r from-[#D4A017] to-amber-600 text-[#040B24] font-semibold shadow-lg shadow-[#D4A017]/10 rounded-tl-none"
                                    : msg.isError
                                    ? "bg-rose-950/40 border border-rose-500/40 text-rose-200 shadow-xl rounded-tr-none backdrop-blur-sm"
                                    : "bg-[#0F1735]/95 border border-white/10 text-white/90 shadow-xl rounded-tr-none backdrop-blur-sm"
                                }`}
                              >
                                {/* Render message text with formatted blocks & bold or StructuredDiagnosticCard */}
                                {msg.role === "assistant" && !msg.isError && (msg.text.includes("التشخيص") || msg.text.includes("أول 3 خطوات") || msg.text.includes("الأسباب المحتملة")) ? (
                                  <StructuredDiagnosticCard
                                    rawText={msg.text}
                                    topicId={msg.topicId}
                                    userCode={userCode}
                                    onActionClick={(prompt) => handleSendMessage(prompt)}
                                    onNavigateChapter={(chId) => onNavigateToSection?.(chId)}
                                    onNavigateTool={(tId, cat) => onNavigateTool?.(tId, cat)}
                                    onShowToast={showToast}
                                  />
                                ) : (
                                  <>
                                    <div className="whitespace-pre-wrap font-sans space-y-1">
                                      {msg.text.split("\n").map((line, lIdx) => {
                                        // Highlight script blocks or quotes
                                        const isScriptLine = line.includes("📞") || line.includes("💬") || line.includes("السكريبت:");
                                        const parts = line.split(/(\*\*.*?\*\*)/g);

                                        return (
                                          <div
                                            key={lIdx}
                                            className={`${
                                              line.startsWith("- ") || line.startsWith("• ")
                                                ? "my-0.5 pl-1.5"
                                                : line.startsWith("1.") || line.startsWith("2.") || line.startsWith("3.") || line.startsWith("4.")
                                                ? "my-1 font-semibold text-white/95"
                                                : isScriptLine
                                                ? "my-1.5 p-2 bg-[#040B24]/70 border-r-2 border-[#D4A017] rounded-l-lg text-[#F0C040]"
                                                : "my-0.5"
                                            }`}
                                          >
                                            {parts.map((part, pIdx) => {
                                              if (part.startsWith("**") && part.endsWith("**")) {
                                                return (
                                                  <strong
                                                    key={pIdx}
                                                    className={msg.role === "user" ? "font-black text-[#040B24]" : "text-[#F0C040] font-black"}
                                                  >
                                                    {part.slice(2, -2)}
                                                  </strong>
                                                );
                                              }
                                              return part;
                                            })}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Action Recommendations Card for Standard Assistant Responses */}
                                    {msg.role === "assistant" && !msg.isError && (
                                      <div className="mt-3">
                                        <AdvisorActionCard
                                          topicId={msg.topicId}
                                          responseText={msg.text}
                                          userCode={userCode}
                                          onNavigateChapter={(chId) => onNavigateToSection?.(chId)}
                                          onNavigateTool={(tId, cat) => onNavigateTool?.(tId, cat)}
                                          onShowToast={showToast}
                                        />
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Retry Action for Error Messages */}
                                {msg.isError && msg.failedPrompt && (
                                  <div className="mt-3 pt-2.5 border-t border-rose-500/30 flex items-center justify-between">
                                    <button
                                      onClick={() => handleSendMessage(msg.failedPrompt?.text, msg.failedPrompt?.presetSuggestions)}
                                      disabled={isLoading}
                                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      <span>إعادة المحاولة الآن 🔄</span>
                                    </button>
                                    <span className="text-[10px] text-rose-300/60 font-mono">
                                      {msg.requestId || ""}
                                    </span>
                                  </div>
                                )}

                                 {/* Message Footer Actions */}
                                {!msg.isError && (
                                  <div className={`mt-2.5 pt-2 border-t ${msg.role === "user" ? "border-black/10 text-[#040B24]/70 font-mono" : "border-white/10 text-white/50"} text-[10px] flex flex-col gap-2`}>
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-[9px] sm:text-[10px] opacity-70">{msg.timestamp}</span>
                                      
                                      {msg.role === "assistant" && (
                                        <div className="flex items-center gap-2">
                                          {/* Feedback Controls */}
                                          <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5" role="group" aria-label="تقييم إجابة المستشار">
                                            <button
                                              onClick={() => handleFeedback(msg.id, "helpful")}
                                              className={`p-1 rounded flex items-center gap-1 transition-all cursor-pointer ${
                                                messageFeedback[msg.id]?.rating === "helpful"
                                                  ? "text-emerald-400 font-bold bg-emerald-500/20"
                                                  : "text-white/60 hover:text-emerald-300"
                                              }`}
                                              title="مفيد"
                                              aria-label="مفيد"
                                            >
                                              <ThumbsUp className="w-3 h-3" />
                                              <span className="text-[10px]">مفيد</span>
                                            </button>
                                            <span className="text-white/20">|</span>
                                            <button
                                              onClick={() => handleFeedback(msg.id, "unhelpful")}
                                              className={`p-1 rounded flex items-center gap-1 transition-all cursor-pointer ${
                                                messageFeedback[msg.id]?.rating === "unhelpful"
                                                  ? "text-rose-400 font-bold bg-rose-500/20"
                                                  : "text-white/60 hover:text-rose-300"
                                              }`}
                                              title="مو مفيد"
                                              aria-label="مو مفيد"
                                            >
                                              <ThumbsDown className="w-3 h-3" />
                                              <span className="text-[10px]">مو مفيد</span>
                                            </button>
                                          </div>

                                          {/* Copy Button */}
                                          <button
                                            onClick={() => {
                                              handleCopy(msg.id, msg.text);
                                              showToast("copy", "تم نسخ الرد بالكامل بنجاح 📋");
                                            }}
                                            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:text-[#F0C040] flex items-center gap-1 cursor-pointer transition-colors text-white/70"
                                            aria-label="نسخ المحتوى"
                                          >
                                            {copiedId === msg.id ? (
                                              <>
                                                <Check className="w-3 h-3 text-emerald-400" />
                                                <span className="text-emerald-400 font-bold text-[10px]">تم النسخ</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" />
                                                <span className="text-[10px]">نسخ</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Unhelpful Reason Picker Chips */}
                                    {msg.role === "assistant" && messageFeedback[msg.id]?.rating === "unhelpful" && (
                                      <div className="p-2 bg-rose-950/30 border border-rose-500/20 rounded-xl space-y-1.5 animate-in fade-in">
                                        <span className="text-[10px] text-rose-300 font-bold block">
                                          {messageFeedback[msg.id]?.reason
                                            ? `السبب المسجل: ${messageFeedback[msg.id]?.reason}`
                                            : "شنو السبب حتى نطور الجواب؟ (اختياري):"}
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                          {FEEDBACK_REASONS.map((reason) => (
                                            <button
                                              key={reason}
                                              onClick={() => handleFeedback(msg.id, "unhelpful", reason)}
                                              className={`px-2 py-0.5 rounded text-[9px] font-semibold transition-all cursor-pointer ${
                                                messageFeedback[msg.id]?.reason === reason
                                                  ? "bg-rose-500 text-white shadow-sm"
                                                  : "bg-white/10 hover:bg-white/20 text-white/80"
                                              }`}
                                            >
                                              {reason}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* DYNAMIC FOLLOW-UP SUGGESTIONS CHIPS */}
                              {msg.role === "assistant" && !msg.isError && msg.suggestions && msg.suggestions.length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-2.5 space-y-1.5"
                                >
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#F0C040]">
                                    <Sparkles className="w-3 h-3 text-[#F0C040]" />
                                    <span>اقتراحات المتابعة (اضغط للمواصلة):</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {msg.suggestions.map((sug, sIdx) => (
                                      <button
                                        key={sIdx}
                                        onClick={() => handleSendMessage(sug)}
                                        disabled={isLoading}
                                        className="px-2.5 py-1 rounded-lg bg-[#0F1735] hover:bg-[#D4A017] text-white/80 hover:text-[#040B24] border border-[#D4A017]/30 hover:border-[#D4A017] text-[10px] sm:text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                                      >
                                        <span>⚡ {sug}</span>
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* Typing Loader with Cancel Button */}
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col gap-2 max-w-[92%] sm:max-w-[80%] ml-auto"
                        >
                          <div className="flex gap-2.5 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#0F1735] border border-[#D4A017]/50 flex items-center justify-center text-[#F0C040] shrink-0">
                              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-bounce" />
                            </div>
                            <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0F1735]/90 border border-[#D4A017]/30 text-white/80 rounded-tr-none flex flex-wrap items-center justify-between gap-3 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#F0C040] font-bold">فيزيون بوت يحلل ويصيغ الرد...</span>
                                <div className="flex gap-1 items-center mr-1">
                                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D4A017] animate-ping" />
                                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D4A017] animate-pulse delay-100" />
                                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#D4A017] animate-pulse delay-200" />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleCancelRequest}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                <span>إلغاء الطلب</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>

                    {/* Footer Input */}
                    <div className="p-2 sm:p-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] bg-[#081030] border-t border-[#D4A017]/20 relative shrink-0">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendMessage();
                        }}
                        className="flex items-center gap-1.5 sm:gap-2"
                      >
                        <input
                          type="text"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="اكتب استفسارك أو اختر من الاقتراحات..."
                          aria-label="اكتب استفسارك أو سؤالك التسويقي هنا"
                          disabled={isLoading}
                          className="flex-1 px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl bg-[#040B24] border border-white/10 focus:border-[#D4A017] text-white text-xs sm:text-sm placeholder-white/40 outline-none transition-all dir-rtl disabled:opacity-50 min-w-0"
                        />

                        <button
                          type="button"
                          onClick={() => setActiveTab("diagnostic")}
                          title="مشخّص المشاكل بالخيارات"
                          aria-label="مشخص المشاكل السريع"
                          className="px-2 py-2 sm:px-3 sm:py-3 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#F0C040] text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        >
                          <Compass className="w-4 h-4" />
                          <span className="hidden sm:inline">اقتراحات</span>
                        </button>

                        <button
                          type="submit"
                          disabled={!inputText.trim() || isLoading}
                          aria-label="إرسال السؤال إلى فيزيون بوت"
                          className="px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#D4A017] to-amber-500 hover:from-amber-400 hover:to-[#D4A017] text-[#040B24] font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-lg shadow-[#D4A017]/20 active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
                        >
                          {isLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <span className="hidden xs:inline sm:inline">إرسال</span>
                              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 transform rotate-180" />
                            </>
                          )}
                        </button>
                      </form>

                      <div className="mt-1.5 flex flex-wrap justify-between items-center px-1 text-[9px] sm:text-[10px] text-white/40 gap-1">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-[#D4A017]" /> مخصص ومبرمج للتجارة الإلكترونية بالسوق العراقي
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400/80 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20 font-sans">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> محفوظ على هاتفك تلقائياً
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
