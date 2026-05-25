/**
 * HTML Parser — generic extraction helpers and university-specific page parsers
 *
 * Uses cheerio to extract structured data from raw HTML content.
 * All parsers return a consistent intermediate format for the normalizer.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/** Extract text content from a single-element selector, trimmed */
export function extractText(
  $: cheerio.CheerioAPI,
  selector: string,
  context?: Cheerio<AnyNode>,
): string {
  const el = context
    ? $(selector, context).first()
    : $(selector).first();
  return el.text().replace(/\s+/g, ' ').trim();
}

/** Extract attribute value from a single-element selector */
export function extractAttr(
  $: cheerio.CheerioAPI,
  selector: string,
  attr: string,
  context?: Cheerio<AnyNode>,
): string | undefined {
  const el = context
    ? $(selector, context).first()
    : $(selector).first();
  return el.attr(attr);
}

/** Extract text from all matching elements, returns trimmed array */
export function extractAllText(
  $: cheerio.CheerioAPI,
  selector: string,
  context?: Cheerio<AnyNode>,
): string[] {
  const els = context
    ? $(selector, context)
    : $(selector);
  const results: string[] = [];
  els.each((_i, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t) results.push(t);
  });
  return results;
}

/** Extract all href links from matching anchor elements */
export function extractLinks(
  $: cheerio.CheerioAPI,
  selector: string,
  baseUrl: string,
  context?: Cheerio<AnyNode>,
): string[] {
  const els = context
    ? $(selector, context)
    : $(selector);
  const links: string[] = [];
  els.each((_i, el) => {
    const href = $(el).attr('href');
    if (href) {
      links.push(resolveUrl(baseUrl, href));
    }
  });
  return [...new Set(links)];
}

/** Resolve a potentially relative URL against a base */
export function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

/** Extract <meta> tag content by name or property */
export function extractMetaTag(
  $: cheerio.CheerioAPI,
  name: string,
): string | null {
  return (
    $(`meta[name="${name}"]`).attr('content') ??
    $(`meta[property="${name}"]`).attr('content') ??
    null
  );
}

/** Safely parse a year from text — returns null on failure */
export function parseYear(text: string): number | null {
  const match = text.match(/\b(20\d{2})\b/);
  return match ? parseInt(match[1], 10) : null;
}

/** Strip HTML tags and normalize whitespace */
export function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// University-specific page parsers
// ---------------------------------------------------------------------------

/**
 * Generic project-card parser.
 * Works for university pages where each project is wrapped in a container
 * element with known CSS selectors for title, description, tech stack, etc.
 */
export function parseGenericProjectPage(
  html: string,
  sourceUrl: string,
  university: string,
): Record<string, unknown>[] {
  const $ = cheerio.load(html);
  const projects: Record<string, unknown>[] = [];

  // Derive container selector heuristically
  const containerSelectors = [
    '.project-card', '.project-item', '.capstone-item',
    '.thesis-item', '.portfolio-item', '.showcase-item',
    'article.project', 'li.project', '.card.project',
    '[class*="project"]', '[class*="capstone"]', '[class*="thesis"]',
    'tr.project', '.entry', '.item',
  ];

  // Try to find containers by trying common selectors
  let containers: any = null;
  for (const sel of containerSelectors) {
    const found = $(sel);
    if (found.length > 0) {
      containers = found;
      break;
    }
  }

  // Fallback: treat all <li> or rows in <tbody> as containers
  if (!containers || containers.length === 0) {
    // Try table rows
    const rows = $('table tbody tr');
    if (rows.length > 0) {
      containers = rows;
    }
  }

  if (!containers || containers.length === 0) return [];

  containers.each((_i: number, el: any) => {
    const ctx = $(el);

    // Title: try h2-h4, strong, or any link text
    const title =
      extractText($, 'h2', ctx) ||
      extractText($, 'h3', ctx) ||
      extractText($, 'h4', ctx) ||
      extractText($, '.title', ctx) ||
      extractText($, 'strong', ctx) ||
      extractText($, 'a', ctx);

    if (!title) return; // skip entries without a title

    const description =
      extractText($, '.description', ctx) ||
      extractText($, '.desc', ctx) ||
      extractText($, 'p', ctx) ||
      extractText($, '.summary', ctx);

    const techStack = extractAllText($, '.tech-stack span, .tech-stack a, .tags span, .technologies li', ctx);
    const yearText = extractText($, '.year, .date, time', ctx);
    const year = yearText ? parseYear(yearText) : null;
    const studentName = extractText($, '.author, .student, .student-name', ctx);

    // Look for a link to the project detail page
    const link = extractAttr($, 'a', 'href', ctx);
    const fullUrl = link ? resolveUrl(sourceUrl, link) : sourceUrl;

    projects.push({
      title,
      description,
      techStack: techStack.length > 0 ? techStack : [],
      year,
      studentName,
      sourceUrl: fullUrl,
      university,
      containerHtml: ctx.html() ?? '',
    });
  });

  return projects;
}

/**
 * Extract project-like entries from a plain list or table structure.
 * Useful for university capstone/thesis listing pages.
 */
export function parseTablePage(
  html: string,
  sourceUrl: string,
  university: string,
): Record<string, unknown>[] {
  const $ = cheerio.load(html);
  const projects: Record<string, unknown>[] = [];

  // Try parsing as a table
  const rows = $('table tbody tr');
  if (rows.length > 0) {
    rows.each((_i, el) => {
      const cells = $(el).find('td');
      if (cells.length < 2) return;

      const title = $(cells[0]).text().trim();
      if (!title) return;

      const description = cells.length >= 2 ? $(cells[1]).text().trim() : '';
      const techItems: string[] = [];
      for (let j = 2; j < cells.length; j++) {
        const cellText = $(cells[j]).text().trim();
        if (cellText) techItems.push(cellText);
      }

      projects.push({
        title,
        description,
        techStack: techItems,
        year: null,
        studentName: '',
        sourceUrl,
        university,
      });
    });
  }

  return projects;
}

/**
 * Parse a university's project showcase that uses a flat list format
 * (e.g. <ul><li>Title — Description — Tech</li></ul>)
 */
export function parseListPage(
  html: string,
  sourceUrl: string,
  university: string,
): Record<string, unknown>[] {
  const $ = cheerio.load(html);
  const projects: Record<string, unknown>[] = [];

  $('ul li, ol li').each((_i: number, el: any) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length < 10) return;

    // Try to split by common delimiters
    const parts = text.split(/[–—|•;]/).map((p: string) => p.trim());
    const title = parts[0];
    if (!title) return;

    const description = parts.length >= 2 ? parts[1] : '';
    const remaining = parts.slice(2).join(', ');

    // Check for year in text
    const year = parseYear(text);

    projects.push({
      title,
      description,
      techStack: remaining ? [remaining] : [],
      year,
      studentName: '',
      sourceUrl,
      university,
    });
  });

  return projects;
}
