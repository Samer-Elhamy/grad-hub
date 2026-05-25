-- ============================================================================
-- Migration 003: Seed Data
-- Grad Projects Hub v3 — Initial Data from ideas.json
-- ============================================================================
-- Seeds the database with:
--   1. A default local user account
--   2. Top-level topics derived from the known categories
--   3. Sub-topics from unique tech_stack items across all ideas
--   4. All 30 existing project ideas from ideas.json
--   5. An initial (empty) preference vector for the default user
--
-- All statements are wrapped in a single transaction for atomic execution.
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 1. Default user (personal tool — single local user)
-- --------------------------------------------------------------------------
INSERT INTO users (id, name)
VALUES (1, 'Default User')
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 2. Topics — top-level categories first, then sub-topics
-- --------------------------------------------------------------------------

-- Top-level topics (parent_id = NULL)
INSERT INTO topics (name, category, parent_id) VALUES
    ('AI/ML',            'AI/ML',            NULL),
    ('Web Applications', 'Web Applications', NULL),
    ('Mobile Apps',      'Mobile Apps',      NULL),
    ('Cybersecurity',    'Cybersecurity',    NULL),
    ('Data Science',     'Data Science',     NULL),
    ('Cloud/DevOps',     'Cloud/DevOps',     NULL),
    ('Blockchain',       'Blockchain',       NULL),
    ('Game Development', 'Game Development', NULL),
    ('IoT',              'IoT',              NULL)
ON CONFLICT (name, category) DO NOTHING;

-- Sub-topics — unique tech items from ideas, linked to their parent category
-- AI/ML sub-topics
INSERT INTO topics (name, category, parent_id) VALUES
    ('Python',              'AI/ML',            (SELECT id FROM topics WHERE name = 'AI/ML')),
    ('PyTorch',             'AI/ML',            (SELECT id FROM topics WHERE name = 'AI/ML')),
    ('TensorFlow',          'AI/ML',            (SELECT id FROM topics WHERE name = 'AI/ML')),
    ('Transformers',        'AI/ML',            (SELECT id FROM topics WHERE name = 'AI/ML')),
    ('Scikit-learn',        'AI/ML',            (SELECT id FROM topics WHERE name = 'AI/ML')),
    ('YOLOv8',              'AI/ML',            (SELECT id FROM topics WHERE name = 'AI/ML')),
    ('OpenCV',              'AI/ML',            (SELECT id FROM topics WHERE name = 'AI/ML')),
    ('Computer Vision',     'AI/ML',            (SELECT id FROM topics WHERE name = 'AI/ML')),
    ('NLP',                 'AI/ML',            (SELECT id FROM topics WHERE name = 'AI/ML')),
    ('Deep Learning',       'AI/ML',            (SELECT id FROM topics WHERE name = 'AI/ML'))
ON CONFLICT (name, category) DO NOTHING;

-- Web Applications sub-topics
INSERT INTO topics (name, category, parent_id) VALUES
    ('React',               'Web Applications', (SELECT id FROM topics WHERE name = 'Web Applications')),
    ('Node.js',             'Web Applications', (SELECT id FROM topics WHERE name = 'Web Applications')),
    ('Next.js',             'Web Applications', (SELECT id FROM topics WHERE name = 'Web Applications')),
    ('Vue.js',              'Web Applications', (SELECT id FROM topics WHERE name = 'Web Applications')),
    ('Nuxt.js',             'Web Applications', (SELECT id FROM topics WHERE name = 'Web Applications')),
    ('Tailwind CSS',        'Web Applications', (SELECT id FROM topics WHERE name = 'Web Applications')),
    ('WebSockets',          'Web Applications', (SELECT id FROM topics WHERE name = 'Web Applications')),
    ('Socket.io',           'Web Applications', (SELECT id FROM topics WHERE name = 'Web Applications'))
ON CONFLICT (name, category) DO NOTHING;

-- Mobile Apps sub-topics
INSERT INTO topics (name, category, parent_id) VALUES
    ('Flutter',             'Mobile Apps',      (SELECT id FROM topics WHERE name = 'Mobile Apps')),
    ('React Native',        'Mobile Apps',      (SELECT id FROM topics WHERE name = 'Mobile Apps')),
    ('Kotlin',              'Mobile Apps',      (SELECT id FROM topics WHERE name = 'Mobile Apps')),
    ('Swift',               'Mobile Apps',      (SELECT id FROM topics WHERE name = 'Mobile Apps')),
    ('ARKit',               'Mobile Apps',      (SELECT id FROM topics WHERE name = 'Mobile Apps')),
    ('AR',                  'Mobile Apps',      (SELECT id FROM topics WHERE name = 'Mobile Apps')),
    ('Jetpack Compose',     'Mobile Apps',      (SELECT id FROM topics WHERE name = 'Mobile Apps'))
ON CONFLICT (name, category) DO NOTHING;

-- Cybersecurity sub-topics
INSERT INTO topics (name, category, parent_id) VALUES
    ('OAuth 2.0',           'Cybersecurity',    (SELECT id FROM topics WHERE name = 'Cybersecurity')),
    ('Zero Trust',          'Cybersecurity',    (SELECT id FROM topics WHERE name = 'Cybersecurity')),
    ('Penetration Testing', 'Cybersecurity',    (SELECT id FROM topics WHERE name = 'Cybersecurity')),
    ('Phishing Detection',  'Cybersecurity',    (SELECT id FROM topics WHERE name = 'Cybersecurity'))
ON CONFLICT (name, category) DO NOTHING;

-- Data Science sub-topics
INSERT INTO topics (name, category, parent_id) VALUES
    ('Apache Spark',        'Data Science',     (SELECT id FROM topics WHERE name = 'Data Science')),
    ('Pandas',              'Data Science',     (SELECT id FROM topics WHERE name = 'Data Science')),
    ('Bioinformatics',      'Data Science',     (SELECT id FROM topics WHERE name = 'Data Science')),
    ('Sentiment Analysis',  'Data Science',     (SELECT id FROM topics WHERE name = 'Data Science')),
    ('Data Visualisation',  'Data Science',     (SELECT id FROM topics WHERE name = 'Data Science'))
ON CONFLICT (name, category) DO NOTHING;

-- Cloud/DevOps sub-topics
INSERT INTO topics (name, category, parent_id) VALUES
    ('Kubernetes',          'Cloud/DevOps',     (SELECT id FROM topics WHERE name = 'Cloud/DevOps')),
    ('Docker',              'Cloud/DevOps',     (SELECT id FROM topics WHERE name = 'Cloud/DevOps')),
    ('Terraform',           'Cloud/DevOps',     (SELECT id FROM topics WHERE name = 'Cloud/DevOps')),
    ('Prometheus',          'Cloud/DevOps',     (SELECT id FROM topics WHERE name = 'Cloud/DevOps')),
    ('Grafana',             'Cloud/DevOps',     (SELECT id FROM topics WHERE name = 'Cloud/DevOps')),
    ('AWS Lambda',          'Cloud/DevOps',     (SELECT id FROM topics WHERE name = 'Cloud/DevOps')),
    ('Serverless',          'Cloud/DevOps',     (SELECT id FROM topics WHERE name = 'Cloud/DevOps')),
    ('Multi-Cloud',         'Cloud/DevOps',     (SELECT id FROM topics WHERE name = 'Cloud/DevOps'))
ON CONFLICT (name, category) DO NOTHING;

-- Blockchain sub-topics
INSERT INTO topics (name, category, parent_id) VALUES
    ('Solidity',            'Blockchain',       (SELECT id FROM topics WHERE name = 'Blockchain')),
    ('Ethereum',            'Blockchain',       (SELECT id FROM topics WHERE name = 'Blockchain')),
    ('Web3.js',             'Blockchain',       (SELECT id FROM topics WHERE name = 'Blockchain')),
    ('Hyperledger',         'Blockchain',       (SELECT id FROM topics WHERE name = 'Blockchain')),
    ('Smart Contracts',     'Blockchain',       (SELECT id FROM topics WHERE name = 'Blockchain'))
ON CONFLICT (name, category) DO NOTHING;

-- Game Development sub-topics
INSERT INTO topics (name, category, parent_id) VALUES
    ('Unity',               'Game Development', (SELECT id FROM topics WHERE name = 'Game Development')),
    ('Unreal Engine',       'Game Development', (SELECT id FROM topics WHERE name = 'Game Development')),
    ('C#',                  'Game Development', (SELECT id FROM topics WHERE name = 'Game Development')),
    ('C++',                 'Game Development', (SELECT id FROM topics WHERE name = 'Game Development')),
    ('VR',                  'Game Development', (SELECT id FROM topics WHERE name = 'Game Development')),
    ('Procedural Generation','Game Development',(SELECT id FROM topics WHERE name = 'Game Development'))
ON CONFLICT (name, category) DO NOTHING;

-- IoT sub-topics
INSERT INTO topics (name, category, parent_id) VALUES
    ('ESP32',               'IoT',              (SELECT id FROM topics WHERE name = 'IoT')),
    ('MQTT',                'IoT',              (SELECT id FROM topics WHERE name = 'IoT')),
    ('AWS IoT Core',        'IoT',              (SELECT id FROM topics WHERE name = 'IoT')),
    ('Smart Agriculture',   'IoT',              (SELECT id FROM topics WHERE name = 'IoT')),
    ('Fleet Tracking',      'IoT',              (SELECT id FROM topics WHERE name = 'IoT'))
ON CONFLICT (name, category) DO NOTHING;

-- --------------------------------------------------------------------------
-- 3. Seed all 30 ideas from ideas.json
-- --------------------------------------------------------------------------
-- Each row maps: id, title_ar, title_en, description, university, category,
-- topics (jsonb), tech_stack (jsonb), difficulty, links (jsonb), embedding.
-- embedding is deliberately NULL — to be populated by the Feedback Agent
-- once it computes text embeddings via the configured AI model.
-- links is empty for seeded data — future Deep Search Agent results will
-- populate this with reference URLs.
-- difficulty mapped from Arabic: مبتدئ→beginner, متوسط→intermediate, متقدم→advanced
-- --------------------------------------------------------------------------

INSERT INTO ideas (id, title_ar, title_en, description, university, category, topics, tech_stack, difficulty, links, embedding)
VALUES
-- 1: AI-Powered Medical Diagnosis Assistant (AI/ML)
(1,
 E'مساعد تشخيص طبي بالذكاء الاصطناعي',
 E'AI-Powered Medical Diagnosis Assistant',
 E'A multimodal AI system that analyzes textual symptoms and medical images to provide accurate preliminary diagnoses',
 E'MIT',
 E'AI/ML',
 E'["Python", "PyTorch", "Computer Vision", "Medical AI"]'::jsonb,
 E'["Python", "PyTorch", "React", "Docker", "PostgreSQL"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 2: NLP-Powered Mental Health Support Chatbot (AI/ML)
(2,
 E'شاتوب للصحة النفسية مدعوم بالذكاء الاصطناعي',
 E'NLP-Powered Mental Health Support Chatbot',
 E'A conversational agent using NLP to understand emotions and provide initial mental health support',
 E'Stanford',
 E'AI/ML',
 E'["Python", "Transformers", "NLP", "Mental Health", "Chatbot"]'::jsonb,
 E'["Python", "Transformers", "FastAPI", "React Native", "MongoDB"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 3: AI-Based Recommendation Engine for Research Papers (AI/ML)
(3,
 E'محرك توصية ذكي للأوراق البحثية',
 E'AI-Based Recommendation Engine for Research Papers',
 E'A deep learning recommendation system that suggests relevant academic papers',
 E'Cambridge',
 E'AI/ML',
 E'["Python", "TensorFlow", "Deep Learning", "Recommendation System", "Elasticsearch"]'::jsonb,
 E'["Python", "TensorFlow", "Elasticsearch", "Flask", "Neo4j"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 4: Real-Time Fraud Detection for Financial Transactions (AI/ML)
(4,
 E'كشف احتيال مالي فوري بالتعلم العميق',
 E'Real-Time Fraud Detection for Financial Transactions',
 E'A deep learning system that detects suspicious financial transactions in real time',
 E'Carnegie Mellon',
 E'AI/ML',
 E'["Python", "Scikit-learn", "Deep Learning", "Fraud Detection", "Kafka"]'::jsonb,
 E'["Python", "Scikit-learn", "Apache Kafka", "PostgreSQL", "Grafana"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 5: Computer Vision System for Autonomous Retail Checkout (AI/ML)
(5,
 E'نظام رؤية حاسوبية للدفع الآلي في المتاجر',
 E'Computer Vision System for Autonomous Retail Checkout',
 E'A computer vision system that identifies products in shopping carts and calculates the bill automatically',
 E'UC Berkeley',
 E'AI/ML',
 E'["Python", "YOLOv8", "OpenCV", "Computer Vision", "Retail AI"]'::jsonb,
 E'["Python", "YOLOv8", "OpenCV", "AWS Lambda", "DynamoDB"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 6: Predictive Analytics Platform for Chronic Disease Prevention (AI/ML)
(6,
 E'تحليبات تنبؤية للوقاية من الأمراض المزمنة',
 E'Predictive Analytics Platform for Chronic Disease Prevention',
 E'A predictive analytics platform that forecasts the risk of chronic diseases',
 E'Oxford',
 E'AI/ML',
 E'["Python", "TensorFlow", "Apache Spark", "Predictive Analytics", "Healthcare"]'::jsonb,
 E'["Python", "TensorFlow", "Apache Spark", "Flask", "Tableau"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 7: Smart E-Learning Platform with Adaptive Learning Paths (Web Applications)
(7,
 E'منصة تعلم إلكتروني ذكي بمسارات تكيفية',
 E'Smart E-Learning Platform with Adaptive Learning Paths',
 E'An interactive educational platform that uses AI to personalize learning paths',
 E'Harvard',
 E'Web Applications',
 E'["React", "Node.js", "E-Learning", "Adaptive Learning", "Redis"]'::jsonb,
 E'["React", "Node.js", "MongoDB", "Python", "Redis"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 8: Collaborative Code Editor with Real-Time AI Assistance (Web Applications)
(8,
 E'محرر أكواد تعاوني مع مساعد ذكاء اصطناعي',
 E'Collaborative Code Editor with Real-Time AI Assistance',
 E'A multi-user code editor with real-time collaboration and AI-powered code suggestions',
 E'Carnegie Mellon',
 E'Web Applications',
 E'["Next.js", "WebSockets", "AI Assistance", "Collaborative Editing", "Docker"]'::jsonb,
 E'["Next.js", "WebSockets", "PostgreSQL", "Docker", "OpenAI API"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 9: Real-Time Collaboration Platform for Remote Design Teams (Web Applications)
(9,
 E'منصة تعاون فوري لفرق التصميم عن بعد',
 E'Real-Time Collaboration Platform for Remote Design Teams',
 E'A web platform for design teams to work on the same canvas in real time',
 E'Imperial College',
 E'Web Applications',
 E'["React", "Socket.io", "Node.js", "Real-Time", "Design Tools"]'::jsonb,
 E'["React", "Socket.io", "Node.js", "PostgreSQL", "S3"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 10: Interactive Portfolio Builder for Creative Professionals (Web Applications)
(10,
 E'باني محافظ تفاعلي للمبدعين والمطورين',
 E'Interactive Portfolio Builder for Creative Professionals',
 E'An easy-to-use web tool for building professional portfolios with drag-and-drop',
 E'NUS',
 E'Web Applications',
 E'["Vue.js", "Nuxt.js", "Tailwind CSS", "Portfolio", "Drag-and-Drop"]'::jsonb,
 E'["Vue.js", "Nuxt.js", "Tailwind CSS", "Firebase", "Netlify"]'::jsonb,
 E'beginner',
 E'[]'::jsonb,
 NULL),

-- 11: AI-Powered Personal Health and Fitness Tracker (Mobile Apps)
(11,
 E'متتبع صحة ولياقة شخصي بالذكاء الاصطناعي',
 E'AI-Powered Personal Health and Fitness Tracker',
 E'A mobile app that tracks physical activity, sleep, and nutrition with AI recommendations',
 E'Stanford',
 E'Mobile Apps',
 E'["Flutter", "TensorFlow Lite", "Health", "Fitness", "AI"]'::jsonb,
 E'["Flutter", "TensorFlow Lite", "Firebase", "HealthKit", "Dart"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 12: Gamified Language Learning App with Speech Recognition (Mobile Apps)
(12,
 E'تطبيق تفاعلي لتعلم اللغات بالتعرف على الصوت',
 E'Gamified Language Learning App with Speech Recognition',
 E'A gamified language learning app with speech recognition for pronunciation assessment',
 E'University of Tokyo',
 E'Mobile Apps',
 E'["Kotlin", "TensorFlow Lite", "Speech Recognition", "Language Learning", "Gamification"]'::jsonb,
 E'["Kotlin", "TensorFlow Lite", "Room DB", "Jetpack Compose", "Firebase Auth"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 13: AR-Powered Shopping Assistant for Fashion Retail (Mobile Apps)
(13,
 E'مساعد تسوق بالواقع المعزز للأزياء',
 E'AR-Powered Shopping Assistant for Fashion Retail',
 E'A mobile app using AR to let users virtually try on clothes',
 E'Georgia Tech',
 E'Mobile Apps',
 E'["Swift", "ARKit", "CoreML", "AR", "Fashion Retail"]'::jsonb,
 E'["Swift", "ARKit", "CoreML", "Firebase", "Algolia"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 14: Crowdsourced Last-Mile Delivery Optimization Platform (Mobile Apps)
(14,
 E'منصة توصيل تشاركي لتحسين التوصيل في الميل الأخير',
 E'Crowdsourced Last-Mile Delivery Optimization Platform',
 E'A mobile platform connecting users with independent delivery couriers with route optimization',
 E'UC San Diego',
 E'Mobile Apps',
 E'["React Native", "Node.js", "GraphQL", "Logistics", "Route Optimisation"]'::jsonb,
 E'["React Native", "Node.js", "GraphQL", "PostgreSQL", "Google Maps API"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 15: Phishing Detection Browser Extension Using Deep Learning (Cybersecurity)
(15,
 E'إضافة متصفح لكشف التصيد الاحتيالي بالتعلم العميق',
 E'Phishing Detection Browser Extension Using Deep Learning',
 E'A browser extension that uses deep learning to detect phishing attacks in real time',
 E'KFUPM',
 E'Cybersecurity',
 E'["JavaScript", "Python", "TensorFlow.js", "Deep Learning", "Phishing Detection"]'::jsonb,
 E'["JavaScript", "Python", "TensorFlow.js", "Chrome APIs", "Flask"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 16: Zero-Trust Authentication System for Enterprise Networks (Cybersecurity)
(16,
 E'نظام مصادقة لا ثقة فيه للمؤسسات',
 E'Zero-Trust Authentication System for Enterprise Networks',
 E'A security system implementing Zero Trust with continuous multi-factor authentication',
 E'KAUST',
 E'Cybersecurity',
 E'["Go", "OAuth 2.0", "gRPC", "Zero Trust", "Authentication"]'::jsonb,
 E'["Go", "OAuth 2.0", "gRPC", "Redis", "Prometheus"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 17: Automated Network Vulnerability Scanner (Cybersecurity)
(17,
 E'ماسح ضعف شبكات آلي',
 E'Automated Network Vulnerability Scanner',
 E'An automated tool that scans networks for known security vulnerabilities',
 E'KSU',
 E'Cybersecurity',
 E'["Python", "Nmap", "OWASP", "Vulnerability Scanning", "Network Security"]'::jsonb,
 E'["Python", "Nmap", "OWASP ZAP", "PostgreSQL", "Django"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 18: COVID-19 Genome Sequence Analysis and Variant Tracking (Data Science)
(18,
 E'تحليل تسلسل جينوم كوفيد وتتبع المتحورات',
 E'COVID-19 Genome Sequence Analysis and Variant Tracking',
 E'A bioinformatics platform tracking COVID-19 genetic variants using sequence alignment',
 E'Tsinghua',
 E'Data Science',
 E'["Python", "Biopython", "Pandas", "Bioinformatics", "Genomics"]'::jsonb,
 E'["Python", "Biopython", "Pandas", "D3.js", "Jupyter"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 19: Smart City Traffic Data Analytics and Prediction (Data Science)
(19,
 E'تحليل بيانات حركة المرور في المدن الذكية',
 E'Smart City Traffic Data Analytics and Prediction',
 E'A system that analyzes traffic data to predict congestion and optimize signal timing',
 E'NUS',
 E'Data Science',
 E'["Python", "Apache Spark", "Kafka", "Smart City", "Traffic Analytics"]'::jsonb,
 E'["Python", "Apache Spark", "Kafka", "Tableau", "PostGIS"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 20: Social Media Sentiment Analysis for Brand Monitoring (Data Science)
(20,
 E'تحليل المشاعر لوسائل التواصل لمراقبة العلامات',
 E'Social Media Sentiment Analysis for Brand Monitoring',
 E'A sentiment analysis tool that uses NLP to measure public opinion about brands',
 E'UAE University',
 E'Data Science',
 E'["Python", "NLTK", "Scrapy", "Sentiment Analysis", "NLP"]'::jsonb,
 E'["Python", "NLTK", "Scrapy", "MongoDB", "Plotly"]'::jsonb,
 E'beginner',
 E'[]'::jsonb,
 NULL),

-- 21: Kubernetes Cluster Monitoring and Anomaly Detection (Cloud/DevOps)
(21,
 E'نظام مراقبة وكشف شذوذ لمجموعات Kubernetes',
 E'Kubernetes Cluster Monitoring and Anomaly Detection',
 E'A monitoring system for Kubernetes clusters with anomaly detection and failure prediction',
 E'TU Delft',
 E'Cloud/DevOps',
 E'["Go", "Prometheus", "Grafana", "Kubernetes", "Monitoring"]'::jsonb,
 E'["Go", "Prometheus", "Grafana", "Kubernetes", "Python"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 22: Serverless Framework for Real-Time Data Processing (Cloud/DevOps)
(22,
 E'إطار عمل بدون خادم لمعالجة البيانات الفورية',
 E'Serverless Framework for Real-Time Data Processing',
 E'A serverless framework for building real-time data processing pipelines automatically',
 E'University of Toronto',
 E'Cloud/DevOps',
 E'["AWS Lambda", "Terraform", "Python", "Serverless", "Data Processing"]'::jsonb,
 E'["AWS Lambda", "Terraform", "Python", "DynamoDB", "SQS"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 23: Multi-Cloud Cost Optimization and Resource Manager (Cloud/DevOps)
(23,
 E'مدير تحسين تكاليف الموارد متعددة السحابات',
 E'Multi-Cloud Cost Optimization and Resource Manager',
 E'A platform managing resources across AWS, Azure, and Google Cloud with cost optimization',
 E'Georgia Tech',
 E'Cloud/DevOps',
 E'["Python", "Terraform", "Go", "Multi-Cloud", "Cost Optimisation"]'::jsonb,
 E'["Python", "Terraform", "Go", "PostgreSQL", "React"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 24: Blockchain-Based Pharmaceutical Supply Chain Tracker (Blockchain)
(24,
 E'متتبع سلسلة توريد الأدوية بالبلوكشين',
 E'Blockchain-Based Pharmaceutical Supply Chain Tracker',
 E'A blockchain system tracking pharmaceuticals from manufacturer to patient ensuring authenticity',
 E'ETH Zurich',
 E'Blockchain',
 E'["Solidity", "Ethereum", "Web3.js", "Blockchain", "Supply Chain"]'::jsonb,
 E'["Solidity", "Ethereum", "Web3.js", "Node.js", "IPFS"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 25: Self-Sovereign Digital Identity Platform on Blockchain (Blockchain)
(25,
 E'منصة هوية رقمية ذاتية السيادة على البلوكشين',
 E'Self-Sovereign Digital Identity Platform on Blockchain',
 E'A digital identity platform giving users full control over personal data using blockchain',
 E'University of Toronto',
 E'Blockchain',
 E'["Solidity", "Hyperledger", "React", "Go", "Digital Identity"]'::jsonb,
 E'["Solidity", "Hyperledger", "React", "Go", "MongoDB"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 26: Decentralized Voting System with Verifiable Audit Trail (Blockchain)
(26,
 E'نظام تصويت إلكتروني لامركزي مع سجل تدقيق',
 E'Decentralized Voting System with Verifiable Audit Trail',
 E'A decentralized voting system ensuring election secrecy and transparency via blockchain',
 E'Tsinghua',
 E'Blockchain',
 E'["Solidity", "React", "Hardhat", "TypeScript", "Voting System"]'::jsonb,
 E'["Solidity", "React", "Hardhat", "TypeScript", "The Graph"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 27: Educational VR Game for Chemical Lab Safety Training (Game Development)
(27,
 E'لعبة واقع افتراضي تعليمية لتدريب السلامة المخبرية',
 E'Educational VR Game for Chemical Lab Safety Training',
 E'An immersive VR game simulating a chemistry lab for safety procedure training',
 E'MIT',
 E'Game Development',
 E'["Unity", "C#", "SteamVR", "VR", "Educational Game"]'::jsonb,
 E'["Unity", "C#", "SteamVR", "Blender", "Photon Networking"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 28: Procedural Content Generation Engine for Open-World Games (Game Development)
(28,
 E'محرك توليد إجرائي لمحتوى ألعاب العالم المفتوح',
 E'Procedural Content Generation Engine for Open-World Games',
 E'A game engine that procedurally generates worlds for infinite open-world game content',
 E'UC Berkeley',
 E'Game Development',
 E'["Unreal Engine 5", "C++", "Procedural Generation", "Perlin Noise", "Game Engine"]'::jsonb,
 E'["Unreal Engine 5", "C++", "Perlin Noise", "Python", "Houdini"]'::jsonb,
 E'advanced',
 E'[]'::jsonb,
 NULL),

-- 29: Smart Agriculture Dashboard with IoT Sensors (IoT)
(29,
 E'لوحة معلومات ذكية للزراعة بحساسات إنترنت الأشياء',
 E'Smart Agriculture Dashboard with IoT Sensors',
 E'A dashboard analyzing soil and weather sensor data for smart farming recommendations',
 E'KSU',
 E'IoT',
 E'["Node.js", "MQTT", "React", "InfluxDB", "Smart Agriculture"]'::jsonb,
 E'["Node.js", "MQTT", "React", "InfluxDB", "Grafana"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL),

-- 30: Real-Time Fleet Tracking and Logistics Optimization (IoT)
(30,
 E'نظام تتبع أساطيل ولوجستيات في الوقت الفعلي',
 E'Real-Time Fleet Tracking and Logistics Optimization',
 E'An IoT system that tracks vehicle fleets via GPS and optimizes delivery routes',
 E'KAUST',
 E'IoT',
 E'["Python", "ESP32", "AWS IoT Core", "Fleet Tracking", "Logistics"]'::jsonb,
 E'["Python", "ESP32", "AWS IoT Core", "React Native", "PostGIS"]'::jsonb,
 E'intermediate',
 E'[]'::jsonb,
 NULL)
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence to the max id so auto-generated ids stay consistent
SELECT setval('ideas_id_seq', COALESCE((SELECT MAX(id) FROM ideas), 0) + 1, false);

-- --------------------------------------------------------------------------
-- 4. Initial preference vector for the default user
-- --------------------------------------------------------------------------
INSERT INTO preference_vectors (user_id, category_weights, keyword_weights, topic_affinities)
VALUES (
    1,
    '{}'::jsonb,  -- initially empty; Feedback Agent will populate
    '{}'::jsonb,
    '{}'::jsonb
)
ON CONFLICT DO NOTHING;

COMMIT;
