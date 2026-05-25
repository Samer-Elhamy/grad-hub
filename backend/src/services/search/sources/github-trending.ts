/**
 * GitHub Trending scraper — fetches trending repos and converts to idea format.
 *
 * Scrapes https://github.com/trending for daily/weekly trending repos across
 * specified languages. Each trending repo is suggested as a "project idea worth exploring"
 * since trending repos represent real-world problems being solved.
 */

import * as cheerio from 'cheerio';
import type { CrawledIdea } from '../../../types/search.types';

/** Shape returned by the GitHub trending scraper */
export interface TrendingRepo {
  name: string;
  owner: string;
  repo: string;
  description: string;
  language: string;
  stars: number;
  starsToday: number;
  url: string;
  sourceType: 'github';
}

/**
 * Scrape GitHub trending for a specific language and timeframe.
 *
 * @param language - Programming language filter (e.g. "javascript", "python")
 * @param since    - Timeframe: "daily" or "weekly"
 * @returns Array of trending repos
 */
export async function scrapeGithubTrending(
  language: string,
  since: 'daily' | 'weekly' = 'daily',
): Promise<TrendingRepo[]> {
  const url = `https://github.com/trending/${language.toLowerCase()}?since=${since}`;
  const repos: TrendingRepo[] = [];

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; GradHubCrawler/1.0; +https://gradprojects.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(
        `[GitHubTrending] HTTP ${response.status} fetching trending/${language}`,
      );
      return repos;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // GitHub trending lists repos in <article class="Box-row"> containers
    $('article.Box-row').each((_i: number, el: any) => {
      const ctx = $(el);

      // Extract owner/repo from the h2 link
      const h2Link = ctx.find('h2 a');
      const href = h2Link.attr('href') ?? '';
      const parts = href.replace(/^\//, '').split('/');
      if (parts.length < 2) return;

      const owner = parts[0];
      const repo = parts[1];
      const fullName = `${owner}/${repo}`;

      // Description
      const description = ctx.find('p').text().replace(/\s+/g, ' ').trim();

      // Language
      const langEl = ctx.find('[itemprop="programmingLanguage"]');
      const language = langEl.text().trim();

      // Stars count
      const starsText = ctx
        .find('.octicon-star')
        .parent()
        .text()
        .replace(/\s+/g, ' ')
        .trim();
      const stars = parseCount(starsText);

      // Stars today
      const todayText = ctx
        .find('.octicon-star')
        .parent()
        .next()
        .text()
        .replace(/\s+/g, ' ')
        .trim();
      const starsTodayText = todayText.match(/[\d,]+/)?.[0] ?? '0';
      const starsToday = parseCount(starsTodayText);

      repos.push({
        name: fullName,
        owner,
        repo,
        description,
        language,
        stars,
        starsToday,
        url: `https://github.com/${fullName}`,
        sourceType: 'github',
      });
    });
  } catch (error) {
    console.error(`[GitHubTrending] Error scraping trending/${language}:`, error);
  }

  return repos;
}

/**
 * Scrape GitHub trending for all configured languages (daily and weekly).
 * Returns a flat deduplicated list of trending repos.
 */
export async function scrapeAllLanguages(
  languages: string[],
): Promise<TrendingRepo[]> {
  const seen = new Set<string>();
  const all: TrendingRepo[] = [];

  for (const lang of languages) {
    try {
      const daily = await scrapeGithubTrending(lang, 'daily');
      for (const repo of daily) {
        if (!seen.has(repo.name)) {
          seen.add(repo.name);
          all.push(repo);
        }
      }
    } catch (error) {
      console.error(`[GitHubTrending] Failed daily/${lang}:`, error);
    }

    // Small delay between languages
    await delay(1000);
  }

  return all;
}

/** Convert a TrendingRepo into the CrawledIdea schema */
export function trendingRepoToIdea(repo: TrendingRepo): CrawledIdea {
  const techStack = [repo.language].filter(Boolean);
  const title = `${repo.repo}: ${repo.description.slice(0, 80)}`;
  const description = repo.description
    ? repo.description
    : `A trending open-source project on GitHub: ${repo.name} with ${repo.stars} stars. Explore the repository to understand the problem it solves and the tech choices made.`;

  return {
    titleEn: title,
    titleAr: '',
    descriptionEn: description,
    descriptionAr: '',
    shortDescEn: description.slice(0, 120),
    shortDescAr: '',
    university: '',
    country: '',
    sourceUrl: repo.url,
    sourceType: 'github',
    techStack,
    category: assignCategoryFromRepo(repo),
    difficulty: estimateDifficulty(repo),
    year: new Date().getFullYear(),
    crawledAt: new Date().toISOString(),
    needsTranslation: false,
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Parse number like "1,234" or "12.3k" into an integer */
function parseCount(text: string): number {
  const cleaned = text.replace(/,/g, '').trim();
  if (!cleaned) return 0;

  if (cleaned.endsWith('k')) {
    return Math.round(parseFloat(cleaned) * 1000);
  }
  if (cleaned.endsWith('m')) {
    return Math.round(parseFloat(cleaned) * 1_000_000);
  }
  return parseInt(cleaned, 10) || 0;
}

/** Assign a category based on repo language and name */
function assignCategoryFromRepo(repo: TrendingRepo): string {
  const lang = repo.language.toLowerCase();
  const name = repo.repo.toLowerCase();
  const desc = repo.description.toLowerCase();

  const text = `${name} ${desc}`;

  if (
    /ai|ml|llm|neural|gpt|transformer|nlp|vision|deep.?learn/.test(text)
  ) {
    return 'AI/ML';
  }
  if (
    /react|vue|angular|next|nuxt|svelte|webapp|frontend|backend|full.?stack/.test(
      text,
    )
  ) {
    return 'Web Applications';
  }
  if (
    /flutter|react.?native|swift|kotlin|android|ios|mobile/.test(text)
  ) {
    return 'Mobile Apps';
  }
  if (
    /kubernetes|docker|terraform|devops|cloud|aws|azure|serverless/.test(text)
  ) {
    return 'Cloud/DevOps';
  }
  if (/security|crypto|encrypt|auth|vuln|malware|firewall/.test(text)) {
    return 'Cybersecurity';
  }
  if (
    /data.?science|pandas|spark|hadoop|analytics|etl|dashboard/.test(text)
  ) {
    return 'Data Science';
  }
  if (
    /blockchain|ethereum|solidity|web3|defi|nft|crypto/.test(text)
  ) {
    return 'Blockchain';
  }
  if (
    /unity|unreal|game|gaming|godot|3d|webgl|opengl/.test(text)
  ) {
    return 'Game Development';
  }

  // Default based on language
  if (['python', 'r', 'julia'].includes(lang)) return 'Data Science';
  if (['javascript', 'typescript'].includes(lang)) return 'Web Applications';
  if (['rust', 'go', 'c++'].includes(lang)) return 'Cloud/DevOps';

  return 'Web Applications';
}

function estimateDifficulty(repo: TrendingRepo): string {
  // Rough heuristic: more stars = more interesting/relevant, not necessarily harder
  if (repo.stars > 10000) return 'متقدم';
  if (repo.stars > 1000) return 'متوسط';
  return 'مبتدئ';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
