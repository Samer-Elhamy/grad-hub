/* ════════════════════════════════════════
   Header — App header with title and navigation links
   ════════════════════════════════════════ */

import { NavLink } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useStore } from "../../store";
import { t } from "../../i18n";
import logoUrl from "../../assets/grad-hub-logo.png";

export function Header() {
  const language = useStore((s) => s.language);
  const toggleLanguage = useStore((s) => s.toggleLanguage);
  const linkBase =
    "text-sm font-medium transition-colors px-3 py-1.5 rounded-lg";

  return (
    <header className="sticky top-0 z-50 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-3xl mx-auto flex items-center justify-between h-14 px-6">
        {/* Brand */}
        <NavLink to="/" className="flex items-center gap-2">
          <img
            src={logoUrl}
            alt="Grad Hub logo"
            className="w-8 h-8 rounded-xl object-cover shadow-sm"
          />
          <span className="font-sans font-semibold text-base text-gray-900 dark:text-gray-50 hidden sm:inline">
            {language === "ar" ? "جراد هب" : "Grad Hub"}
          </span>
        </NavLink>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive
                ? `${linkBase} bg-blue-500 dark:bg-blue-400 text-white`
                : `${linkBase} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800`
            }
          >
            {t(language, "discover")}
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              isActive
                ? `${linkBase} bg-blue-500 dark:bg-blue-400 text-white`
                : `${linkBase} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800`
            }
          >
            {t(language, "history")}
          </NavLink>
          <NavLink
            to="/preferences"
            className={({ isActive }) =>
              isActive
                ? `${linkBase} bg-blue-500 dark:bg-blue-400 text-white`
                : `${linkBase} text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800`
            }
          >
            {t(language, "preferences")}
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors"
          >
            {t(language, "languageToggle")}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
