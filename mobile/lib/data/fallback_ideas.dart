import '../models/idea.dart';

const fallbackIdeas = <Idea>[
  Idea(
    id: 9001,
    title: 'AI Study Planner',
    titleAr: 'مخطط مذاكرة ذكي',
    description:
        'A mobile planner that turns course deadlines into a weekly study plan.',
    descriptionAr:
        'تطبيق موبايل يحول مواعيد المواد والتسليمات إلى خطة مذاكرة أسبوعية.',
    category: 'Machine Learning',
    university: 'Grad Hub',
    country: 'Remote',
    difficulty: 'intermediate',
    technologies: ['Flutter', 'Node.js', 'AI'],
    tags: ['planning', 'students', 'productivity'],
    imageUrl:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    sourceUrl: 'https://github.com/Samer-Elhamy/grad-hub',
  ),
  Idea(
    id: 9002,
    title: 'Campus Lost & Found',
    titleAr: 'مفقودات الجامعة',
    description:
        'A verified lost-and-found board with image search and claim tracking.',
    descriptionAr: 'منصة مفقودات للجامعة مع بحث بالصور وتتبع طلبات الاستلام.',
    category: 'Mobile Development',
    university: 'Grad Hub',
    country: 'Remote',
    difficulty: 'beginner',
    technologies: ['Flutter', 'Express', 'PostgreSQL'],
    tags: ['campus', 'community', 'search'],
    imageUrl:
        'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=1200&q=80',
    sourceUrl: 'https://github.com/Samer-Elhamy/grad-hub',
  ),
  Idea(
    id: 9003,
    title: 'Graduation Project Matcher',
    titleAr: 'مرشح مشاريع التخرج',
    description:
        'A recommendation system that matches students with projects by skills and interests.',
    descriptionAr:
        'نظام ترشيح يربط الطلاب بأفكار مشاريع تناسب مهاراتهم واهتماماتهم.',
    category: 'Software Engineering',
    university: 'Grad Hub',
    country: 'Remote',
    difficulty: 'advanced',
    technologies: ['Flutter', 'TypeScript', 'Vector Search'],
    tags: ['recommendations', 'graduation', 'teams'],
    imageUrl:
        'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    sourceUrl: 'https://github.com/Samer-Elhamy/grad-hub',
  ),
];
