import type { Idea, PreferenceVector, SwipeRecord } from '../types/api';

/**
 * IdeasService — handles idea retrieval and preference-ranked ordering.
 *
 * Note: This is a stub/mock implementation for the route scaffolding phase.
 * In production, this queries the PostgreSQL database with pgvector similarity search.
 */

const STUB_IDEAS: Idea[] = [
  {
    id: 1,
    title_ar: 'مساعد تشخيص طبي بالذكاء الاصطناعي',
    title_en: 'AI-Powered Medical Diagnosis Assistant',
    category: 'AI/ML',
    short_desc_ar: 'نظام ذكاء اصطناعي متعدد الوسائط يحلل الأعراض النصية والصور الطبية',
    short_desc_en: 'A multimodal AI system that analyzes textual symptoms and medical images',
    university: 'MIT',
    country: 'USA',
    tech_stack: ['Python', 'PyTorch', 'React', 'Docker', 'PostgreSQL'],
    difficulty: 'متقدم',
    rating: 0,
    featured: true,
    description: 'A multimodal AI system that analyzes textual symptoms and medical images to provide accurate preliminary diagnoses',
    description_ar: 'نظام ذكاء اصطناعي يجمع بين تحليل الأعراض والصور الطبية لتقديم تشخيص مبدئي يساعد الطبيب أو المستخدم على فهم الحالة قبل الكشف المتخصص.',
    technologies: ['Python', 'PyTorch', 'React', 'Docker', 'PostgreSQL'],
    image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80',
    source_url: 'https://www.ibm.com/think/topics/artificial-intelligence-healthcare',
  },
  {
    id: 2,
    title_ar: 'شاتوب للصحة النفسية مدعوم بالذكاء الاصطناعي',
    title_en: 'NLP-Powered Mental Health Support Chatbot',
    category: 'AI/ML',
    short_desc_ar: 'روبوت محادثة يعالج اللغة الطبيعية لفهم المشاعر',
    short_desc_en: 'A conversational agent using NLP to understand emotions',
    university: 'Stanford',
    country: 'USA',
    tech_stack: ['Python', 'Transformers', 'FastAPI', 'React Native', 'MongoDB'],
    difficulty: 'متقدم',
    rating: 0,
    featured: true,
    description: 'A conversational agent using NLP to understand emotions and provide initial mental health support',
    description_ar: 'روبوت محادثة يستخدم معالجة اللغة الطبيعية لفهم المشاعر وتقديم دعم نفسي أولي، مع إمكانية تصعيد الحالات الخطرة لمختصين.',
    technologies: ['Python', 'Transformers', 'FastAPI', 'React Native', 'MongoDB'],
    image_url: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=80',
    source_url: 'https://www.ibm.com/think/topics/chatbots',
  },
  {
    id: 3,
    title_ar: 'منصة تحليل المشاعر في وسائل التواصل',
    title_en: 'Social Media Sentiment Analysis Platform',
    category: 'Data Science',
    short_desc_ar: 'منصة تحليل آراء المستخدمين من منشورات تويتر وفيسبوك',
    short_desc_en: 'A platform analyzing user opinions from Twitter and Facebook posts',
    university: 'UC Berkeley',
    country: 'USA',
    tech_stack: ['Python', 'Scikit-learn', 'React', 'Docker', 'PostgreSQL'],
    difficulty: 'متوسط',
    rating: 0,
    featured: false,
    description: 'A platform analyzing user opinions from social media posts using NLP and ML',
    description_ar: 'منصة لتحليل آراء المستخدمين على وسائل التواصل باستخدام تقنيات معالجة اللغة الطبيعية والتعلم الآلي لاستخراج الاتجاهات والمشاعر.',
    technologies: ['Python', 'Scikit-learn', 'React', 'Docker', 'PostgreSQL'],
    image_url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=80',
    source_url: 'https://www.ibm.com/think/topics/sentiment-analysis',
  },
  {
    id: 4,
    title_ar: 'تطبيق ويب للتعاون في كتابة الأكواد',
    title_en: 'Real-time Collaborative Code Editor',
    category: 'Web Applications',
    short_desc_ar: 'محرر أكواد تعاوني يدعم التحرير المتزامن',
    short_desc_en: 'A collaborative code editor supporting real-time concurrent editing',
    university: 'ETH Zurich',
    country: 'Switzerland',
    tech_stack: ['Node.js', 'React', 'WebSocket', 'Redis', 'Docker'],
    difficulty: 'متوسط',
    rating: 0,
    featured: false,
    description: 'A real-time collaborative code editor with multi-user support and conflict resolution',
    description_ar: 'محرر أكواد تعاوني يعمل لحظيًا ويدعم أكثر من مستخدم في نفس الملف مع إدارة التعارضات والمزامنة عبر WebSocket.',
    technologies: ['Node.js', 'React', 'WebSocket', 'Redis', 'Docker'],
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    source_url: 'https://ably.com/topic/collaborative-editing',
  },
  {
    id: 5,
    title_ar: 'نظام توصية ذكي للمواد التعليمية',
    title_en: 'Smart Educational Content Recommender',
    category: 'AI/ML',
    short_desc_ar: 'نظام توصية يستخدم التعلم العميق لاقتراح مواد تعليمية مخصصة',
    short_desc_en: 'A deep learning recommendation system for personalized educational content',
    university: 'Carnegie Mellon',
    country: 'USA',
    tech_stack: ['Python', 'TensorFlow', 'FastAPI', 'React', 'PostgreSQL'],
    difficulty: 'متقدم',
    rating: 0,
    featured: false,
    description: 'A smart recommendation system using deep learning to suggest personalized learning materials',
    description_ar: 'نظام توصية ذكي يقترح مواد تعليمية مخصصة حسب مستوى الطالب وسلوكه السابق باستخدام نماذج تعلم عميق.',
    technologies: ['Python', 'TensorFlow', 'FastAPI', 'React', 'PostgreSQL'],
    image_url: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=1200&q=80',
    source_url: 'https://www.ibm.com/think/topics/recommendation-engine',
  },
];

/** Get the next best idea based on preference vector matching.
 *  Currently returns a random idea (preference-ranked ordering logic is a placeholder).
 */
export async function getNextIdea(
  preferences: PreferenceVector,
  reviewedRecords: Pick<SwipeRecord, 'idea_id' | 'timestamp'>[] = [],
  activeIdeaIds: number[] = [],
): Promise<Idea | null> {
  // Filter out excluded categories
  const excluded = preferences.excluded_categories ?? [];
  const active = new Set(activeIdeaIds);
  const reviewed = new Map(
    reviewedRecords.map((record) => [record.idea_id, record.timestamp]),
  );
  const matchingCandidates = STUB_IDEAS.filter(
    (idea) => !excluded.includes(idea.category) && !active.has(idea.id),
  );

  const candidates = matchingCandidates.filter((idea) => !reviewed.has(idea.id));

  if (matchingCandidates.length === 0) return null;

  if (candidates.length === 0) {
    const recycled = matchingCandidates
      .map((idea) => ({
        idea,
        reviewedAt: reviewed.get(idea.id) ?? new Date(0).toISOString(),
      }))
      .sort(
        (a, b) =>
          new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime() ||
          a.idea.id - b.idea.id,
      );
    const selected = recycled[0].idea;
    // #region agent log
    fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H14,H15',location:'backend/src/services/ideas.service.ts:getNextIdea',message:'backend recycled reviewed idea after exhausted candidates',data:{excludedCategories:preferences.excluded_categories,reviewedIdeaIds:reviewedRecords.map((record)=>record.idea_id),activeIdeaIds,recycledCandidates:recycled.map(({idea,reviewedAt})=>({ideaId:idea.id,category:idea.category,reviewedAt})),selectedIdeaId:selected.id,selectedCategory:selected.category,selectionMode:'least_recently_reviewed_recycle'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return selected;
  }

  // Rank by the learned category weights until pgvector similarity search is wired in.
  const ranked = candidates
    .map((idea) => ({
      idea,
      score: preferences.category_weights[idea.category] ?? 0.5,
    }))
    .sort((a, b) => b.score - a.score || a.idea.id - b.idea.id);
  const selected = ranked[0].idea;
  // #region agent log
  fetch('http://127.0.0.1:7261/ingest/f0a8580a-2159-4d02-8dff-6d707a9bcc1c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'3cfbd7'},body:JSON.stringify({sessionId:'3cfbd7',runId:'pre-fix',hypothesisId:'H6,H13,H15',location:'backend/src/services/ideas.service.ts:getNextIdea',message:'backend next idea selected',data:{excludedCategories:preferences.excluded_categories,reviewedIdeaIds:reviewedRecords.map((record)=>record.idea_id),activeIdeaIds,categoryWeights:preferences.category_weights,candidateCategories:candidates.map((idea)=>idea.category),rankedCandidates:ranked.map(({idea,score})=>({ideaId:idea.id,category:idea.category,score})),selectedIdeaId:selected.id,selectedCategory:selected.category,selectionMode:'category_weight_ranked_excluding_reviewed_and_active'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return selected;
}

/** Get all ideas (for seeding or admin use) */
export async function getAllIdeas(): Promise<Idea[]> {
  return [...STUB_IDEAS];
}

/** Get one idea by ID. */
export async function getIdeaById(id: number): Promise<Idea | null> {
  return STUB_IDEAS.find((idea) => idea.id === id) ?? null;
}
