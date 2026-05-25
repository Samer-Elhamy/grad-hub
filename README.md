# Grad Hub — Graduation Project Discovery

![Grad Hub social preview](docs/assets/grad-hub-social-preview.svg)

**Grad Hub** helps students discover, compare, and refine graduation project ideas through a bilingual swipe experience, feedback-driven recommendations, saved history, and critical project analysis.

**جراد هب** يساعد الطلاب على اكتشاف أفكار مشاريع التخرج وتقييمها وحفظها، مع واجهة عربية/إنجليزية، توصيات تتعلم من اختياراتك، وتحليل نقدي لكل فكرة.

## Why It Exists

Choosing a graduation project is hard because ideas are usually scattered, generic, or disconnected from a student's actual interests. Grad Hub turns discovery into a focused workflow:

- Swipe through curated project ideas.
- Use **heart** for liked ideas and **star** for stronger interest.
- Track history, preferences, categories, and top keywords.
- Open detailed idea pages with risks, critique, tech stack, and research links.
- Switch instantly between Arabic RTL and English LTR.

## Product Screenshots

### Arabic Discover

![Arabic Discover screenshot](docs/assets/screenshots/discover-ar.png)

### Idea Details + Source Link

![Arabic idea details screenshot](docs/assets/screenshots/idea-detail-ar.png)

### English Discover

![English Discover screenshot](docs/assets/screenshots/discover-en.png)

## Highlights

- **Bilingual UX:** Arabic and English interface with RTL/LTR switching.
- **Feedback loop:** Swipe behavior updates category and keyword preferences.
- **Smart history:** Separate filters for starred, liked, and disliked ideas.
- **Rich idea cards:** Relevant images, title, description, difficulty, category, and tech stack.
- **Research-ready details:** Each idea has a source link for deeper exploration.
- **Critical analysis:** Detail pages explain risks and validation concerns.
- **Local persistence:** Preferences and swipe history persist in single-user development mode.
- **Multi-surface project:** React web app, Express API, static legacy site, and mobile scaffold.

## Tech Stack

| Layer | Stack |
| --- | --- |
| Web app | React, Vite, TypeScript, Zustand, Tailwind CSS, Framer Motion |
| Backend | Express, TypeScript, Zod, WebSocket |
| Static fallback | HTML, CSS, JavaScript |
| Mobile scaffold | Flutter |
| Testing | Vitest, Testing Library, Jest, Supertest |

## Repository Structure

```text
grad-hub/
├── backend/              # Express API, preferences, swipe history, idea data
├── web/                  # Main React/Vite product UI
├── site/                 # Legacy static Arabic-first prototype
├── mobile/               # Flutter mobile scaffold
├── docs/
│   ├── assets/           # Repo preview and screenshots
│   └── design-tokens.md  # UI token notes
├── tests/                # Cross-surface smoke/e2e tests
└── scripts/              # Local validation scripts
```

## Run Locally

### 1. Backend

```powershell
cd backend
npm install
npm run dev
```

The API runs on [http://localhost:3000](http://localhost:3000).

### 2. Web App

```powershell
cd web
npm install
npm run dev
```

The app runs on [http://localhost:5173](http://localhost:5173).

## Useful API Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/ideas/next` | Returns the next recommended idea |
| `GET /api/ideas/:id` | Returns a detailed idea |
| `POST /api/swipe` | Records `left`, `right`, or `up` swipe |
| `GET /api/preferences` | Reads learned preferences |
| `POST /api/preferences` | Updates preferences |
| `GET /api/history?filter=starred` | Reads starred ideas |
| `GET /api/history?filter=liked` | Reads heart-liked ideas |
| `GET /api/history?filter=disliked` | Reads disliked ideas |

## Verification

Focused checks used during development:

```powershell
cd backend
npm test -- --runTestsByPath tests/integration/api.test.ts
```

```powershell
cd web
npx vitest run src/services/__tests__/api.test.ts src/store/__tests__/index.test.ts src/pages/__tests__/Preferences.test.tsx
npx tsc -b --noEmit
```

> Note: `backend npm run typecheck` currently exposes pre-existing type issues in older search/provider modules unrelated to the main Grad Hub flow.

## Roadmap

- Replace stub ideas with database-backed project ingestion.
- Add authenticated multi-user profiles.
- Add AI-generated critique and feasibility scoring per user context.
- Add shareable project shortlists.
- Publish a hosted demo.

## License

Personal/student project. Add a formal license before commercial reuse.
