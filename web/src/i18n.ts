import type { Idea } from "./types/idea";

export type Language = "en" | "ar";

export const labels = {
  en: {
    discover: "Discover",
    history: "History",
    preferences: "Preferences",
    languageToggle: "العربية",
    live: "Live",
    reconnecting: "Reconnecting...",
    offline: "Offline",
    noMoreIdeas: "No more ideas",
    noMoreIdeasHelp: "Check back later or adjust your preferences.",
    refresh: "Refresh",
    loadingIdeas: "Loading ideas...",
    skipIdea: "Skip this idea",
    starIdea: "Star this idea",
    likeIdea: "Like this idea",
    all: "All",
    starred: "Starred",
    liked: "Liked",
    disliked: "Disliked",
    delete: "Delete",
    noSwipes: "No swipes yet. Start exploring ideas!",
    detailsUnavailable: "Idea details unavailable",
    previous: "Previous",
    next: "Next",
    totalSwipes: "Total swipes",
    likeRate: "Like rate",
    summary: "Summary",
    categories: "Categories",
    categoriesHelp: "Toggle categories to exclude them from your feed.",
    topKeywords: "Top Keywords",
    backToHistory: "Back to history",
    unknownUniversity: "Unknown university",
    criticalAnalysis: "Critical Analysis",
    moreDetails: "More details",
    ideaNotFound: "Idea not found",
    failedToLoadIdea: "Failed to load idea",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  },
  ar: {
    discover: "اكتشف",
    history: "السجل",
    preferences: "التفضيلات",
    languageToggle: "English",
    live: "متصل",
    reconnecting: "إعادة اتصال...",
    offline: "غير متصل",
    noMoreIdeas: "لا توجد أفكار أخرى",
    noMoreIdeasHelp: "جرّب تعديل التفضيلات أو تحديث الصفحة.",
    refresh: "تحديث",
    loadingIdeas: "جاري تحميل الأفكار...",
    skipIdea: "تخطي الفكرة",
    starIdea: "تمييز الفكرة بنجمة",
    likeIdea: "إعجاب بالفكرة",
    all: "الكل",
    starred: "النجوم",
    liked: "الإعجابات",
    disliked: "المرفوضة",
    delete: "حذف",
    noSwipes: "لا توجد اختيارات بعد. ابدأ باكتشاف الأفكار!",
    detailsUnavailable: "تفاصيل الفكرة غير متاحة",
    previous: "السابق",
    next: "التالي",
    totalSwipes: "إجمالي السوايب",
    likeRate: "نسبة الإعجاب",
    summary: "الملخص",
    categories: "التصنيفات",
    categoriesHelp: "اختار التصنيفات التي لا تريد ظهورها في الاقتراحات.",
    topKeywords: "أهم الكلمات",
    backToHistory: "رجوع للسجل",
    unknownUniversity: "جامعة غير معروفة",
    criticalAnalysis: "تحليل نقدي",
    moreDetails: "تفاصيل أكثر",
    ideaNotFound: "الفكرة غير موجودة",
    failedToLoadIdea: "فشل تحميل الفكرة",
    beginner: "مبتدئ",
    intermediate: "متوسط",
    advanced: "متقدم",
  },
} as const;

const categoryLabels: Record<string, string> = {
  "AI/ML": "ذكاء اصطناعي وتعلم آلي",
  "Web Applications": "تطبيقات ويب",
  "Mobile Apps": "تطبيقات موبايل",
  Cybersecurity: "أمن سيبراني",
  "Data Science": "علم البيانات",
  "Cloud/DevOps": "سحابة وDevOps",
  Blockchain: "بلوك تشين",
  "Game Development": "تطوير ألعاب",
  IoT: "إنترنت الأشياء",
};

export function t(language: Language, key: keyof typeof labels.en): string {
  return labels[language][key];
}

export function categoryLabel(category: string, language: Language): string {
  return language === "ar" ? categoryLabels[category] ?? category : category;
}

export function ideaTitle(idea: Idea, language: Language): string {
  return language === "ar"
    ? idea.title_ar || idea.title
    : idea.title_en || idea.title;
}

export function ideaDescription(idea: Idea, language: Language): string {
  return language === "ar"
    ? idea.description_ar || idea.description
    : idea.description_en || idea.description;
}

export function difficultyLabel(
  difficulty: Idea["difficulty"],
  language: Language,
): string {
  return t(language, difficulty);
}
