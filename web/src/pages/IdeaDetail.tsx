import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchIdeaById } from "../services/api";
import type { Idea } from "../types/idea";
import { categoryLabel, ideaDescription, ideaTitle, t, type Language } from "../i18n";
import { useStore } from "../store";

function buildCriticalAnalysis(idea: Idea, language: Language): string[] {
  const title = ideaTitle(idea, language);
  const category = categoryLabel(idea.category, language);
  const risks =
    language === "ar"
      ? [
          `خطر اتساع النطاق: ${title} يحتاج MVP واضح حتى لا يتحول لمشروع أكبر من وقت التخرج.`,
          `خطر التحقق: حدد مؤشرات نجاح قابلة للقياس مبكرًا، خصوصًا في مجال ${category}.`,
        ]
      : [
          `Scope risk: ${title} needs a tight MVP so it does not become too broad for a graduation project.`,
          `Validation risk: define measurable success criteria before implementation, especially for ${category}.`,
        ];

  if (idea.keywords.length > 4) {
    risks.push(
      language === "ar"
        ? "التقنيات المقترحة كثيرة. قللها لأصغر مجموعة تكفي لعمل نموذج عملي."
        : "The technology stack is broad. Reduce it to the smallest set needed for a working demo.",
    );
  }
  if (idea.category.toLowerCase().includes("data") || idea.category.toLowerCase().includes("ai")) {
    risks.push(
      language === "ar"
        ? "جودة البيانات ستحدد قوة النتيجة. استخدم dataset حقيقية مبكرًا ووثق حدودها."
        : "Data quality will decide the result. Use a real dataset early and document its limits.",
    );
  }

  return risks;
}

export function IdeaDetail() {
  const { id } = useParams();
  const language = useStore((s) => s.language);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchIdeaById(id)
      .then((nextIdea) => {
        setIdea(nextIdea);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t(language, "failedToLoadIdea"));
      })
      .finally(() => setLoading(false));
  }, [id, language]);

  const analysis = useMemo(() => (idea ? buildCriticalAnalysis(idea, language) : []), [idea, language]);

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (error || !idea) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Link to="/history" className="text-sm text-blue-500 dark:text-blue-400">
          {t(language, "backToHistory")}
        </Link>
        <p className="mt-6 text-red-500 dark:text-red-400">{error ?? t(language, "ideaNotFound")}</p>
      </main>
    );
  }

  return (
    <motion.main
      className="max-w-2xl mx-auto px-4 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
    >
      <Link to="/history" className="text-sm text-blue-500 dark:text-blue-400">
        {t(language, "backToHistory")}
      </Link>

      <section className="mt-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        {idea.image_url && (
          <img
            src={idea.image_url}
            alt={ideaTitle(idea, language)}
            className="w-full h-56 object-cover rounded-xl mb-5"
            loading="lazy"
          />
        )}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-semibold">
            {categoryLabel(idea.category, language)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {idea.source_university ?? t(language, "unknownUniversity")}
          </span>
          {idea.country && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {idea.country}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{ideaTitle(idea, language)}</h1>
        <p className="mt-4 text-gray-600 dark:text-gray-300 leading-relaxed">{ideaDescription(idea, language)}</p>
        <div className="flex flex-wrap gap-2 mt-5">
          {idea.keywords.map((keyword) => (
            <span
              key={keyword}
              className="px-2.5 py-1 rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400"
            >
              {keyword}
            </span>
          ))}
        </div>
        {idea.source_url && (
          <a
            href={idea.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex mt-6 px-4 py-2 rounded-lg bg-blue-500 dark:bg-blue-400 text-white text-sm font-medium hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
          >
            {t(language, "moreDetails")}
          </a>
        )}
      </section>

      <section className="mt-6 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6">
        <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200">
          {t(language, "criticalAnalysis")}
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-amber-900 dark:text-amber-100">
          {analysis.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </motion.main>
  );
}
