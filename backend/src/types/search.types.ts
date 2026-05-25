/**
 * Search Crawler — shared type definitions
 *
 * These types describe the crawling, normalization, and dedup pipeline
 * for the deep search background worker that discovers CS/IT graduation projects.
 */

/** A raw idea extracted from a university project page or GitHub trending repo */
export interface CrawledIdea {
  /** Normalized English title */
  titleEn: string;
  /** Original Arabic title if found, empty string otherwise */
  titleAr: string;
  /** Full description in English */
  descriptionEn: string;
  /** Full description in Arabic (if found) */
  descriptionAr: string;
  /** Short one-line summary (~120 chars) */
  shortDescEn: string;
  /** Short one-line summary in Arabic */
  shortDescAr: string;
  /** Source university name (empty for GitHub repos) */
  university: string;
  /** Source country (empty for GitHub repos) */
  country: string;
  /** Source URL where this idea was found */
  sourceUrl: string;
  /** Source type identifier */
  sourceType: 'university' | 'github';
  /** Detected tech stack keywords */
  techStack: string[];
  /** Auto-assigned category e.g. "AI/ML", "Web Applications" */
  category: string;
  /** Difficulty estimate: "مبتدئ" | "متوسط" | "متقدم" */
  difficulty: string;
  /** Year of the project if available */
  year: number | null;
  /** When this idea was crawled */
  crawledAt: string;
  /** Whether this idea needs Arabic translation */
  needsTranslation: boolean;
}

/** Source configuration for a single university */
export interface UniversitySource {
  name: string;
  rank: number;
  baseUrl: string;
  /** Known paths that list capstone / thesis / project showcases */
  projectPages: string[];
  /** CSS selectors for extracting fields from each project card */
  selectors: {
    /** Container selector wrapping each project entry */
    container: string;
    /** CSS selector for the project title within the container */
    title: string;
    /** CSS selector for the description */
    description: string;
    /** Optional selector for tech stack tags */
    techStack?: string;
    /** Optional selector for the year / date */
    year?: string;
    /** Optional selector for student name(s) */
    studentName?: string;
  };
  /** When true, only the CS dept homepage is known (URLs need manual research) */
  requiresResearch?: boolean;
  /** ISO-3166 alpha-2 country code */
  country: string;
}

/** Full configuration for the crawler service */
export interface SearchConfig {
  /** Interval in milliseconds between full crawl runs (default: 1 hour) */
  crawlIntervalMs: number;
  /** Maximum concurrent page requests */
  maxConcurrency: number;
  /** Delay in ms between consecutive requests from the same domain */
  requestDelayMs: number;
  /** HTTP request timeout in ms */
  requestTimeoutMs: number;
  /** User-agent string for HTTP requests */
  userAgent: string;
  /** GitHub trending language filters */
  githubLanguages: string[];
  /** Whether to crawl GitHub trending */
  enableGithubTrending: boolean;
  /** Whether to crawl university pages */
  enableUniversityCrawl: boolean;
  /** Max retries per URL before giving up */
  maxRetries: number;
}

/** Result of a single crawl operation (one page / one source) */
export interface CrawlResult {
  source: string;
  sourceType: 'university' | 'github';
  url: string;
  success: boolean;
  ideasFound: number;
  ideasAccepted: number;
  errors: string[];
  statusCode: number | null;
  durationMs: number;
  rateLimitRemaining: number | null;
  /** ISO timestamp */
  crawledAt: string;
}

/** Event payload emitted when new ideas flow through the pipeline */
export interface NewIdeasFoundEvent {
  totalCrawled: number;
  totalAccepted: number;
  totalDeduplicated: number;
  ideas: CrawledIdea[];
  sources: string[];
}

/** Normalizer function signature — maps raw scraped data to CrawledIdea */
export type NormalizerFn = (raw: Record<string, unknown>) => CrawledIdea;

/** Dedup lookup result */
export interface DedupResult {
  /** True when this idea already exists in the database */
  isDuplicate: boolean;
  /** The checksum (MD5 of title+sourceUrl) */
  checksum: string;
  /** Levenshtein score if a fuzzy match was found, null otherwise */
  fuzzyScore: number | null;
  /** ID of the existing duplicate idea, if found */
  existingIdeaId: number | null;
}

/** Default search configuration values */
export const DEFAULT_SEARCH_CONFIG: SearchConfig = Object.freeze({
  crawlIntervalMs: 60 * 60 * 1000, // 1 hour
  maxConcurrency: 3,
  requestDelayMs: 2000, // 2 seconds
  requestTimeoutMs: 15000,
  userAgent:
    'Mozilla/5.0 (compatible; GradHubCrawler/1.0; +https://gradprojects.com)',
  githubLanguages: ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go'],
  enableGithubTrending: true,
  enableUniversityCrawl: true,
  maxRetries: 2,
});

/** Category keywords used by the normalizer to auto-assign categories */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'AI/ML': [
    'machine learning', 'deep learning', 'neural network', 'nlp',
    'computer vision', 'natural language', 'transformer', 'gpt',
    'llm', 'large language model', 'classification', 'object detection',
    'reinforcement learning', 'pytorch', 'tensorflow', 'keras',
    'recommendation', 'predictive model', 'regression', 'clustering',
    'sentiment analysis', 'image recognition', 'speech recognition',
    'generative ai', 'diffusion model', 'rag', 'retrieval augmented',
    'fine-tuning', 'embeddings', 'vector search',
  ],
  'Web Applications': [
    'react', 'vue', 'angular', 'next.js', 'nuxt', 'svelte',
    'web app', 'web application', 'full-stack', 'full stack',
    'frontend', 'backend', 'rest api', 'graphql', 'saas',
    'progressive web', 'spa', 'single page', 'responsive',
    'tailwind', 'bootstrap', 'express', 'node.js', 'django',
    'flask', 'fastapi', 'spring boot',
  ],
  'Mobile Apps': [
    'flutter', 'react native', 'swift', 'kotlin', 'android',
    'ios', 'mobile app', 'cross-platform', 'jetpack compose',
    'swiftui', 'dart', 'kotlin multiplatform',
  ],
  'Cloud/DevOps': [
    'kubernetes', 'docker', 'terraform', 'ci/cd', 'devops',
    'cloud', 'aws', 'azure', 'gcp', 'serverless', 'lambda',
    'microservice', 'prometheus', 'grafana', 'helm',
    'infrastructure as code', 'iac', 'jenkins', 'github actions',
  ],
  Cybersecurity: [
    'security', 'cybersecurity', 'encryption', 'authentication',
    'authorization', 'zero trust', 'penetration', 'vulnerability',
    'malware', 'ransomware', 'firewall', 'intrusion detection',
    'ids', 'ips', 'siem', 'secure', 'cryptography', 'blockchain security',
    'oauth', 'jwt', 'xss', 'sql injection', 'web security',
  ],
  'Data Science': [
    'data science', 'data analysis', 'data pipeline', 'etl',
    'data visualization', 'analytics', 'dashboard', 'tableau',
    'power bi', 'apache spark', 'hadoop', 'big data',
    'data warehouse', 'data lake', 'pandas', 'numpy', 'jupyter',
    'statistical', 'time series', 'forecasting',
  ],
  Blockchain: [
    'blockchain', 'ethereum', 'solidity', 'smart contract',
    'web3', 'defi', 'nft', 'cryptocurrency', 'bitcoin',
    'hyperledger', 'decentralized', 'dapp', 'distributed ledger',
  ],
  'Game Development': [
    'unity', 'unreal engine', 'game', 'gaming', 'godot',
    '3d rendering', 'opengl', 'vulkan', 'webgl', 'three.js',
    'procedural generation', '2d game', '3d game', 'multiplayer',
  ],
};
