-- ============================================================================
-- Grad Projects Hub v3 — Full Database Schema Reference
-- ============================================================================
-- Platform:     PostgreSQL 16+ with pgvector extension
-- Purpose:      Personal Idea Discovery Platform
--               Tinder-style card swiping for CS project ideas with
--               AI-powered preference learning and vector similarity search.
--
-- Tables:
--   1. users                — Local user accounts
--   2. topics               — Hierarchical topic taxonomy
--   3. ideas                — Project idea repository (with vector embeddings)
--   4. swipe_history        — Per-swipe interaction records
--   5. preference_vectors   — Per-user preference profiles
--
-- Indexes:
--   - B-tree indexes on FKs, categories, timestamps, difficulty
--   - IVFFlat index on ideas.embedding for vector similarity search
--   - Unique index on preference_vectors.user_id
--
-- Migrations (execute in order):
--   001_create_tables.sql   → Tables, constraints, types
--   002_add_indexes.sql     → Performance indexes
--   003_seed_data.sql       → Seed with default user + 30 existing ideas
-- ============================================================================

-- ============================================================================
-- EXTENSION: pgvector
-- ============================================================================
-- Enables vector(1536) column type and IVFFlat/HNSW index support for
-- similarity search. Required before any vector-typed column is used.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Simple local user records. This is a personal tool with a single user,
-- so no multi-user auth complexity is needed. Structure allows future
-- multi-user expansion without schema changes.
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL       PRIMARY KEY,                       -- Auto-incrementing unique user ID
    name       VARCHAR(255) NOT NULL,                          -- Display name
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()             -- Registration timestamp
);

-- ============================================================================
-- TABLE: topics
-- ============================================================================
-- Hierarchical topic taxonomy for categorising and filtering ideas.
-- Top-level topics represent broad categories (AI/ML, Web, etc.) and
-- child topics represent specific technologies or sub-domains.
-- The self-referencing parent_id FK enables unlimited depth nesting.
-- ============================================================================
CREATE TABLE IF NOT EXISTS topics (
    id          SERIAL        PRIMARY KEY,                     -- Auto-incrementing topic ID
    name        VARCHAR(255)  NOT NULL,                        -- Human-readable topic name
    category    VARCHAR(100)  NOT NULL,                        -- Parent category grouping
    parent_id   INTEGER       REFERENCES topics(id)
                              ON DELETE SET NULL,              -- Self-ref FK for hierarchy
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),          -- Creation timestamp
    CONSTRAINT  uq_topic_name UNIQUE (name, category)          -- No duplicate name within a category
);

-- ============================================================================
-- TABLE: ideas
-- ============================================================================
-- Core repository of project ideas. Sources include:
--   - Initial seed: 30 manually curated ideas from ideas.json
--   - Deep Search Agent: continuously discovers new ideas from top CS universities
--   - GitHub trending repos
--
-- The embedding column (VECTOR(1536)) stores semantic embeddings generated
-- by the Feedback Agent's AI model. The IVFFlat index enables fast
-- "find similar ideas" queries for personalised recommendations.
-- ============================================================================
CREATE TABLE IF NOT EXISTS ideas (
    id            SERIAL        PRIMARY KEY,                   -- Auto-incrementing idea ID
    title_ar      TEXT          NOT NULL,                      -- Arabic title
    title_en      TEXT          NOT NULL,                      -- English title
    description   TEXT          NOT NULL DEFAULT '',           -- Full project description
    university    VARCHAR(255)  NOT NULL DEFAULT '',           -- Source university
    category      VARCHAR(100)  NOT NULL,                      -- Category classification
    topics        JSONB         NOT NULL DEFAULT '[]'::jsonb,  -- Array of topic/tag strings
    tech_stack    JSONB         NOT NULL DEFAULT '[]'::jsonb,  -- Array of tech/tool strings
    difficulty    VARCHAR(20)   NOT NULL DEFAULT 'intermediate'
                  CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),  -- Skill level
    links         JSONB         NOT NULL DEFAULT '[]'::jsonb,  -- Array of reference URLs
    embedding     VECTOR(1536),                                -- Semantic embedding for similarity
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()         -- Record creation timestamp
);

-- ============================================================================
-- TABLE: swipe_history
-- ============================================================================
-- Records every swipe interaction. This is the primary data source for the
-- Feedback Agent, which builds preference profiles by analysing patterns
-- in direction, dwell time, and optional ratings.
--
-- Fields captured per swipe:
--   direction:     'left'  → dismissed / not interested
--                  'right' → interested / saved for later
--   dwell_time_ms: how long the user viewed the card (milliseconds)
--   rating:        optional 1-5 star rating on right-swipes
--
-- Expected volume: hundreds to thousands per user session.
-- Indexed by (idea_id, timestamp) for efficient per-idea analytics.
-- ============================================================================
CREATE TABLE IF NOT EXISTS swipe_history (
    id            SERIAL        PRIMARY KEY,                   -- Auto-incrementing swipe ID
    idea_id       INTEGER       NOT NULL
                  REFERENCES ideas(id) ON DELETE CASCADE,      -- FK to the swiped idea
    direction     VARCHAR(5)    NOT NULL
                  CHECK (direction IN ('left', 'right')),      -- Swipe direction
    dwell_time_ms INTEGER,                                     -- View duration (ms)
    rating        SMALLINT      CHECK (rating IS NULL
                              OR (rating >= 1 AND rating <= 5)),-- Explicit rating (1-5)
    timestamp     TIMESTAMPTZ   NOT NULL DEFAULT NOW()         -- Swipe timestamp
);

-- ============================================================================
-- TABLE: preference_vectors
-- ============================================================================
-- Per-user preference profile built and continuously refined by the
-- Feedback Agent. Three JSONB fields capture different dimensions:
--
--   category_weights:  Map of category → weight (0.0–1.0)
--                      e.g. {"AI/ML": 0.85, "Web Applications": 0.30}
--                      Higher weight = stronger preference.
--
--   keyword_weights:   Map of keyword → weight (0.0–1.0)
--                      e.g. {"python": 0.9, "react": 0.7, "blockchain": 0.1}
--                      Learnt from tech_stack items of right-swiped ideas.
--
--   topic_affinities:  Map of topic_id → affinity score (0.0–1.0)
--                      e.g. {"1": 0.75, "3": 0.40}
--                      Used for fine-grained topic-level recommendations.
--
-- The Feedback Agent updates this row incrementally after each swipe
-- (or batch of swipes) to keep the preference signal fresh.
-- ============================================================================
CREATE TABLE IF NOT EXISTS preference_vectors (
    id                SERIAL        PRIMARY KEY,               -- Auto-incrementing ID
    user_id           INTEGER       NOT NULL
                      REFERENCES users(id) ON DELETE CASCADE,  -- FK to user
    category_weights  JSONB         NOT NULL DEFAULT '{}'::jsonb,  -- Category preference map
    keyword_weights   JSONB         NOT NULL DEFAULT '{}'::jsonb,  -- Keyword preference map
    topic_affinities  JSONB         NOT NULL DEFAULT '{}'::jsonb,  -- Topic affinity map
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()     -- Last update timestamp
);

-- ============================================================================
-- INDEXES (summary)
-- ============================================================================
-- See db/migrations/002_add_indexes.sql for full CREATE INDEX statements
-- with IF NOT EXISTS guards and COMMENT ON INDEX documentation.
--
-- Key indexes:
--   idx_ideas_category             — B-tree on ideas(category)
--   idx_ideas_difficulty           — B-tree on ideas(difficulty)
--   idx_ideas_category_created     — Composite on ideas(category, created_at DESC)
--   idx_ideas_embedding            — IVFFlat on ideas(embedding) using vector_cosine_ops
--   idx_swipe_history_idea_id      — B-tree on swipe_history(idea_id)
--   idx_swipe_history_timestamp    — B-tree on swipe_history(timestamp DESC)
--   idx_swipe_history_idea_timestamp — Composite on swipe_history(idea_id, timestamp DESC)
--   idx_preference_vectors_user_id — UNIQUE B-tree on preference_vectors(user_id)
--   idx_topics_parent_id           — B-tree on topics(parent_id)
--   idx_topics_name                — B-tree on topics(name)
-- ============================================================================

-- ============================================================================
-- ENTITY-RELATIONSHIP DIAGRAM (text)
-- ============================================================================
--
--   users 1───* preference_vectors          users: simple accounts
--     │                                        │
--     │                                      preference_vectors: per-user profile
--     │                                        │
--     │                                      ideas: project repository
--     │                                        │
--     └──────────────────── swipe_history *───1 ideas
--                              (every swipe links to exactly one idea)
--
--   topics 1───* topics (self-ref)
--     (parent_id → topics.id for hierarchical nesting)
--
--   ideas ──── topics (via JSONB topics[] array — denormalised for perf)
--     (full topic normalisation is a future enhancement)
--
-- ============================================================================

-- ============================================================================
-- QUERY REFERENCE
-- ============================================================================
--
-- 1. Get personalised idea feed (by category preference):
--    SELECT i.* FROM ideas i
--    JOIN preference_vectors pv ON pv.user_id = 1
--    ORDER BY
--      CASE i.category
--        WHEN 'AI/ML' THEN (pv.category_weights->>'AI/ML')::float
--        ELSE 0.0
--      END DESC,
--      i.created_at DESC
--    LIMIT 20;
--
-- 2. Find semantically similar ideas (cosine similarity):
--    SELECT i.id, i.title_en, 1 - (i.embedding <=> query.embedding) AS similarity
--    FROM ideas i
--    JOIN ideas query ON query.id = 1
--    WHERE i.id != 1
--    ORDER BY i.embedding <=> query.embedding
--    LIMIT 10;
--
-- 3. Swipe analytics per idea:
--    SELECT
--      i.id, i.title_en,
--      COUNT(*) FILTER (WHERE sh.direction = 'right') AS right_swipes,
--      COUNT(*) FILTER (WHERE sh.direction = 'left')  AS left_swipes,
--      AVG(sh.dwell_time_ms) AS avg_dwell_ms
--    FROM ideas i
--    LEFT JOIN swipe_history sh ON sh.idea_id = i.id
--    GROUP BY i.id, i.title_en
--    ORDER BY right_swipes DESC;
--
-- 4. Recent swipes for incremental preference update:
--    SELECT sh.*, i.category, i.tech_stack
--    FROM swipe_history sh
--    JOIN ideas i ON i.id = sh.idea_id
--    WHERE sh.timestamp > NOW() - INTERVAL '1 hour'
--    ORDER BY sh.timestamp;
-- ============================================================================
