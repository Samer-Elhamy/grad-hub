# Grad Projects Hub — Data Schemas

## `ideas.json`

Array of project idea objects.

```json
{
  "id":          "number   — Unique identifier",
  "title_ar":    "string   — Project title in Arabic",
  "title_en":    "string   — Project title in English",
  "category":    "string   — One of: AI/Machine Learning, Web Applications, Mobile Apps, Cybersecurity, Data Science, Cloud/DevOps, Blockchain, Game Development",
  "short_desc_ar":"string  — Short description in Arabic",
  "short_desc_en":"string  — Short description in English",
  "university":  "string   — University name",
  "country":     "string   — Country of the university",
  "tech_stack":  "string[] — Array of technologies/tools used",
  "difficulty":  "string   — One of: Beginner, Intermediate, Advanced",
  "rating":      "number   — Average user rating (0 = no ratings yet)",
  "featured":    "boolean  — Whether the project is featured/promoted"
}
```

**Current entries:** 15 projects

| # | Title (EN) | Category | University | Country | Difficulty |
|---|------------|----------|------------|---------|------------|
| 1 | Skin Disease Diagnosis System Using Deep Learning | AI/Machine Learning | Stanford University | USA | Advanced |
| 2 | AI-Powered Academic Writing Assistant | AI/Machine Learning | University of Cambridge | UK | Advanced |
| 3 | Smart Course Recommendation System | AI/Machine Learning | University of Toronto | Canada | Intermediate |
| 4 | Collaborative Project Management Platform for Remote Teams | Web Applications | ETH Zurich | Switzerland | Advanced |
| 5 | Online Marketplace for Local Handicrafts | Web Applications | Khalifa University | UAE | Intermediate |
| 6 | Smart Fitness Tracking Mobile App | Mobile Apps | University of Tokyo | Japan | Intermediate |
| 7 | AR Mobile App for Exploring Historical Landmarks | Mobile Apps | University of Oxford | UK | Advanced |
| 8 | Intelligent Intrusion Detection System Using Machine Learning | Cybersecurity | Carnegie Mellon University | USA | Advanced |
| 9 | Secure End-to-End Encrypted Messaging Application | Cybersecurity | KAIST | South Korea | Advanced |
| 10 | Real-Time Sales Data Analytics Dashboard | Data Science | National University of Singapore | Singapore | Intermediate |
| 11 | Social Media Sentiment Analysis System | Data Science | University of Melbourne | Australia | Intermediate |
| 12 | Cloud Infrastructure Management Platform with Kubernetes | Cloud/DevOps | Technical University of Munich | Germany | Advanced |
| 13 | Automated CI/CD Pipeline with Smart Testing | Cloud/DevOps | University of Illinois Urbana-Champaign | USA | Intermediate |
| 14 | Decentralized E-Voting System on Blockchain | Blockchain | University of Zurich | Switzerland | Advanced |
| 15 | 3D Platformer Game with Virtual Reality Support | Game Development | University of Southern California | USA | Advanced |

---

## `feedback.json`

Array of user feedback objects.

```json
{
  "id":        "number   — Unique identifier",
  "idea_id":   "number   — FK to ideas.json id",
  "user":      "string   — User name or identifier",
  "rating":    "number   — Rating 1–5",
  "comment":   "string   — Optional feedback text",
  "created_at":"string   — ISO 8601 timestamp"
}
```

**Current state:** Empty array awaiting user submissions.
