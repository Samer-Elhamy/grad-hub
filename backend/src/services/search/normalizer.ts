/**
 * Normalizer — maps raw scraped data to the CrawledIdea schema.
 *
 * THIS IS THE FILTER GATE: embedded systems projects are stripped here,
 * before storage. This is not a UI-level filter — it's an architectural gate
 * that prevents embedded systems from ever entering the database.
 *
 * Also handles:
 *   - Auto-category assignment via keyword matching
 *   - Tech stack extraction from description text
 *   - Arabic title/description placeholder generation
 *   - Difficulty estimation from tech complexity
 */

import type { CrawledIdea } from '../../types/search.types';
import { CATEGORY_KEYWORDS } from '../../types/search.types';

// ═══════════════════════════════════════════════════════════════════════════
// EMBEDDED SYSTEMS FILTER — DO NOT REMOVE
// ═══════════════════════════════════════════════════════════════════════════
// This is the critical constraint: no embedded systems projects pass through.
// The filter runs on raw text BEFORE any transformation.
// ═══════════════════════════════════════════════════════════════════════════

/** Keywords that identify an embedded systems project — filter at the normalizer level */
const EMBEDDED_KEYWORDS: string[] = [
  'embedded',
  'microcontroller',
  'arduino',
  'raspberry pi',
  'fpga',
  'vhdl',
  'verilog',
  'iot hardware',
  'sensor',
  'actuator',
  'firmware',
  'rtos',
  'real-time os',
  'circuit',
  'pcb',
  'electronic',
  'microchip',
  'atmega',
  'stm32',
  'esp32',           // ESP32 itself is a microcontroller
  'esp8266',         // ESP8266 itself is a microcontroller
  'nrf52',           // Common MCU
  'msp430',          // TI MCU
  '8051',            // Legacy MCU
  'arm cortex',      // MCU architecture (but not ARM CPUs in general)
  'logic gate',
  'breadboard',
  'oscilloscope',
  'soldering',
  'hardware design',
  'hardware interfacing',
];

/**
 * Check if text contains embedded systems keywords.
 * Returns true if the project should be REJECTED.
 */
export function isEmbeddedSystem(text: string): boolean {
  const lower = text.toLowerCase();
  return EMBEDDED_KEYWORDS.some((keyword) => lower.includes(keyword));
}

// ═══════════════════════════════════════════════════════════════════════════
// Category assignment
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assign a category by matching keywords in the title + description.
 * Falls back to the most common category "Web Applications" if nothing matches.
 */
export function assignCategory(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Map<string, number> = new Map();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > 0) {
      scores.set(category, score);
    }
  }

  if (scores.size === 0) return 'Web Applications';

  // Return the category with the highest keyword match count
  let bestCategory = 'Web Applications';
  let bestScore = 0;
  for (const [cat, score] of scores) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }
  return bestCategory;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tech stack extraction
// ═══════════════════════════════════════════════════════════════════════════

const KNOWN_TECH: string[] = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Kotlin', 'Go', 'Golang',
  'Rust', 'C++', 'C#', 'Swift', 'Ruby', 'PHP', 'Scala', 'Dart', 'Julia',
  'R', 'Perl', 'Haskell',
  // Frontend
  'React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Gatsby',
  'Tailwind CSS', 'Bootstrap', 'Material UI', 'Shadcn',
  // Backend
  'Node.js', 'Express', 'FastAPI', 'Flask', 'Django', 'Spring Boot',
  'ASP.NET', 'Laravel', 'Ruby on Rails',
  // Mobile
  'Flutter', 'React Native', 'SwiftUI', 'Jetpack Compose', 'Xamarin',
  // Database
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'DynamoDB',
  'Elasticsearch', 'Neo4j', 'Cassandra', 'MariaDB',
  // Cloud / DevOps
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
  'GitHub Actions', 'Jenkins', 'Prometheus', 'Grafana', 'Helm',
  // AI / ML
  'PyTorch', 'TensorFlow', 'Keras', 'Scikit-learn', 'XGBoost',
  'Transformers', 'Hugging Face', 'OpenAI', 'LangChain', 'LlamaIndex',
  'Ollama', 'OpenCV', 'YOLO', 'Stable Diffusion',
  // Blockchain
  'Solidity', 'Ethereum', 'Web3.js', 'Hardhat', 'Hyperledger',
  // Data
  'Apache Spark', 'Kafka', 'Airflow', 'dbt', 'Snowflake', 'BigQuery',
  'Databricks', 'Pandas', 'NumPy', 'Jupyter',
  // Other
  'GraphQL', 'gRPC', 'WebSocket', 'Socket.io', 'Redis', 'Nginx',
  'Three.js', 'Unity', 'Unreal Engine',
];

/**
 * Extract known tech stack items from a block of text.
 * Case-insensitive matching, deduplicated.
 */
export function extractTechStack(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const tech of KNOWN_TECH) {
    // Also search for lowercase variants
    if (lower.includes(tech.toLowerCase())) {
      found.add(tech);
    }
  }

  return [...found].sort();
}

// ═══════════════════════════════════════════════════════════════════════════
// Difficulty estimation
// ═══════════════════════════════════════════════════════════════════════════

const ADVANCED_TECH: string[] = [
  'kubernetes', 'distributed', 'real-time', 'microservice',
  'pytorch', 'tensorflow', 'reinforcement', 'generative',
  'blockchain', 'smart contract', 'compiler', 'operating system',
  'computer vision', 'nlp', 'speech recognition', 'autonomous',
  'kubernetes', 'terraform', 'deep learning', 'llm', 'gpt',
];

const INTERMEDIATE_TECH: string[] = [
  'react', 'node.js', 'express', 'docker', 'postgresql',
  'graphql', 'websocket', 'api', 'oauth', 'jwt',
  'flask', 'django', 'mongodb', 'redis', 'aws', 'azure',
];

/**
 * Estimate difficulty based on tech stack keywords in title and description.
 * Returns: "مبتدئ" | "متوسط" | "متقدم"
 */
export function estimateDifficulty(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  const advancedScore = ADVANCED_TECH.filter((t) => text.includes(t)).length;
  const intermediateScore = INTERMEDIATE_TECH.filter((t) =>
    text.includes(t),
  ).length;

  if (advancedScore >= 2) return 'متقدم';
  if (intermediateScore >= 2 || advancedScore >= 1) return 'متوسط';
  return 'مبتدئ';
}

// ═══════════════════════════════════════════════════════════════════════════
// Truncation helpers
// ═══════════════════════════════════════════════════════════════════════════

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

// ═══════════════════════════════════════════════════════════════════════════
// Main normalizer function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize raw scraped data into the CrawledIdea schema.
 *
 * This function is the single entry point for all data entering the system.
 * It applies:
 *   1. Embedded systems filtering (REJECTS matching projects)
 *   2. Field mapping (raw → CrawledIdea)
 *   3. Category auto-assignment
 *   4. Tech stack extraction
 *   5. Difficulty estimation
 *
 * @returns The normalized CrawledIdea, or null if the project was rejected
 *          (e.g., embedded systems, empty title).
 */
export function normalizeScrapedIdea(raw: Record<string, unknown>): CrawledIdea | null {
  const titleEn = String(raw.title ?? raw.titleEn ?? '').trim();
  const descriptionEn = String(
    raw.description ?? raw.descriptionEn ?? '',
  ).trim();

  // Reject empty titles
  if (!titleEn) return null;

  // ── EMBEDDED SYSTEMS FILTER ──────────────────────────────────────────
  // Check both title and description; reject if any keyword matches.
  const filterText = `${titleEn} ${descriptionEn}`;
  if (isEmbeddedSystem(filterText)) {
    return null; // Reject — will be excluded from results
  }

  // ── Field mapping ─────────────────────────────────────────────────────
  const techStackFromRaw = Array.isArray(raw.techStack)
    ? (raw.techStack as string[]).filter(Boolean)
    : extractTechStack(descriptionEn);

  const category = raw.category
    ? String(raw.category)
    : assignCategory(titleEn, descriptionEn);

  const difficulty = raw.difficulty
    ? String(raw.difficulty)
    : estimateDifficulty(titleEn, descriptionEn);

  const sourceType =
    raw.sourceType === 'github' ? ('github' as const) : ('university' as const);
  const university = String(raw.university ?? '');
  const country = String(raw.country ?? '');
  const year = raw.year ? Number(raw.year) : null;
  const studentName = raw.studentName ? String(raw.studentName) : '';
  const sourceUrl = String(raw.sourceUrl ?? '');

  // Short descriptions
  const shortDescEn = truncate(descriptionEn, 120);
  const shortDescAr = '';

  // Check if Arabic is needed
  // If we only have English content and the university is from an Arab country,
  // mark for translation
  const needsTranslation =
    ['Saudi Arabia', 'UAE', 'Egypt', 'Qatar', 'Oman', 'Kuwait', 'Bahrain', 'Jordan'].includes(country) &&
    !raw.titleAr;

  return {
    titleEn,
    titleAr: String(raw.titleAr ?? ''),
    descriptionEn,
    descriptionAr: String(raw.descriptionAr ?? ''),
    shortDescEn,
    shortDescAr,
    university,
    country,
    sourceUrl,
    sourceType,
    techStack: techStackFromRaw,
    category,
    difficulty,
    studentName: studentName || undefined,
    year,
    crawledAt: new Date().toISOString(),
    needsTranslation,
  } as CrawledIdea;
}

/**
 * Batch normalize an array of raw scraped entries.
 * Filters out null results (rejected projects).
 */
export function normalizeBatch(rawItems: Record<string, unknown>[]): CrawledIdea[] {
  const results: CrawledIdea[] = [];
  let rejectedCount = 0;

  for (const raw of rawItems) {
    const normalized = normalizeScrapedIdea(raw);
    if (normalized) {
      results.push(normalized);
    } else {
      rejectedCount++;
    }
  }

  if (rejectedCount > 0) {
    console.info(
      `[Normalizer] Rejected ${rejectedCount}/${rawItems.length} items (embedded systems filter or empty title)`,
    );
  }

  return results;
}
