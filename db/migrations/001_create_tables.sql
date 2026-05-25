-- ============================================================================
-- Migration 001: Create Tables
-- Grad Projects Hub v3 — PostgreSQL Schema with pgvector
-- ============================================================================
-- This migration creates the foundational schema for the personal idea
-- discovery platform. It enables vector similarity search via pgvector,
-- stores ideas, user swipe interactions, preference profiles, and
-- hierarchical topic categorisation.
-- ============================================================================

-- Enable pgvector extension for vector similarity search.
-- Required for semantic embedding comparisons in the Feedback Agent.
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. users — Simple local user records (personal use, no multi-user auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL       PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users       IS 'Local user accounts. Personal tool — no complex auth required.';
COMMENT ON COLUMN users.id    IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN users.name  IS 'Display name for the user.';
COMMENT ON COLUMN users.created_at IS 'Account creation timestamp.';

-- ============================================================================
-- 2. topics — Hierarchical topic taxonomy for categorising ideas
-- ============================================================================
CREATE TABLE IF NOT EXISTS topics (
    id          SERIAL        PRIMARY KEY,
    name        VARCHAR(255)  NOT NULL,
    category    VARCHAR(100)  NOT NULL,
    parent_id   INTEGER       REFERENCES topics(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT  uq_topic_name UNIQUE (name, category)
);

COMMENT ON TABLE  topics              IS 'Hierarchical topic taxonomy. Top-level topics = categories, children = sub-topics.';
COMMENT ON COLUMN topics.name         IS 'Human-readable topic name (e.g. "PyTorch", "Computer Vision").';
COMMENT ON COLUMN topics.category     IS 'Parent category grouping (e.g. "AI/ML", "Web Applications").';
COMMENT ON COLUMN topics.parent_id    IS 'Self-referencing FK for building topic hierarchies. NULL = top-level topic.';
COMMENT ON COLUMN topics.created_at   IS 'When this topic entry was added.';

-- ============================================================================
-- 3. ideas — Project idea repository with vector embeddings
-- ============================================================================
CREATE TABLE IF NOT EXISTS ideas (
    id            SERIAL        PRIMARY KEY,
    title_ar      TEXT          NOT NULL,
    title_en      TEXT          NOT NULL,
    description   TEXT          NOT NULL DEFAULT '',
    university    VARCHAR(255)  NOT NULL DEFAULT '',
    category      VARCHAR(100)  NOT NULL,
    topics        JSONB         NOT NULL DEFAULT '[]'::jsonb,
    tech_stack    JSONB         NOT NULL DEFAULT '[]'::jsonb,
    difficulty    VARCHAR(20)   NOT NULL DEFAULT 'intermediate'
                              CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    links         JSONB         NOT NULL DEFAULT '[]'::jsonb,
    embedding     VECTOR(1536),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  ideas               IS 'Repository of project ideas discovered via Deep Search Agent or manually seeded.';
COMMENT ON COLUMN ideas.id            IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN ideas.title_ar      IS 'Project title in Arabic.';
COMMENT ON COLUMN ideas.title_en      IS 'Project title in English.';
COMMENT ON COLUMN ideas.description   IS 'Detailed project description (typically English).';
COMMENT ON COLUMN ideas.university    IS 'Source university or originating institution.';
COMMENT ON COLUMN ideas.category      IS 'Top-level category classification (e.g. AI/ML, Web Applications).';
COMMENT ON COLUMN ideas.topics        IS 'JSON array of topic/tag strings for fine-grained filtering and similarity.';
COMMENT ON COLUMN ideas.tech_stack    IS 'JSON array of technologies/tools used (e.g. ["Python", "React"]).';
COMMENT ON COLUMN ideas.difficulty    IS 'Difficulty level: beginner, intermediate, or advanced.';
COMMENT ON COLUMN ideas.links         IS 'JSON array of reference URLs (project links, papers, repos).';
COMMENT ON COLUMN ideas.embedding     IS 'pgvector embedding for semantic similarity search (1536-dimension).';
COMMENT ON COLUMN ideas.created_at    IS 'When this idea was added to the database.';

-- ============================================================================
-- 4. swipe_history — Every user swipe interaction record
-- ============================================================================
CREATE TABLE IF NOT EXISTS swipe_history (
    id            SERIAL        PRIMARY KEY,
    idea_id       INTEGER       NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    direction     VARCHAR(5)    NOT NULL CHECK (direction IN ('left', 'right')),
    dwell_time_ms INTEGER,
    rating        SMALLINT      CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
    timestamp     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  swipe_history              IS 'Every swipe interaction: left (skip/dismiss) or right (interested/save).';
COMMENT ON COLUMN swipe_history.id           IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN swipe_history.idea_id      IS 'FK to the idea that was swiped. Cascading delete.';
COMMENT ON COLUMN swipe_history.direction    IS 'Swipe direction: left = dismiss, right = interested.';
COMMENT ON COLUMN swipe_history.dwell_time_ms IS 'How long the user viewed the card before swiping (milliseconds).';
COMMENT ON COLUMN swipe_history.rating       IS 'Optional explicit rating 1–5 given after a right-swipe.';
COMMENT ON COLUMN swipe_history.timestamp    IS 'Exact time of the swipe interaction.';

-- ============================================================================
-- 5. preference_vectors — Per-user preference profile for the Feedback Agent
-- ============================================================================
CREATE TABLE IF NOT EXISTS preference_vectors (
    id                SERIAL        PRIMARY KEY,
    user_id           INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_weights  JSONB         NOT NULL DEFAULT '{}'::jsonb,
    keyword_weights   JSONB         NOT NULL DEFAULT '{}'::jsonb,
    topic_affinities  JSONB         NOT NULL DEFAULT '{}'::jsonb,
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  preference_vectors                  IS 'Preference profile per user — built by the Feedback Agent from swipe history.';
COMMENT ON COLUMN preference_vectors.id               IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN preference_vectors.user_id          IS 'FK to the user this preference profile belongs to.';
COMMENT ON COLUMN preference_vectors.category_weights IS 'JSON map: category → weight (e.g. {"AI/ML": 0.85, "Web": 0.30}).';
COMMENT ON COLUMN preference_vectors.keyword_weights  IS 'JSON map: keyword → weight (e.g. {"python": 0.9, "react": 0.7}).';
COMMENT ON COLUMN preference_vectors.topic_affinities IS 'JSON map: topic_id → affinity score (e.g. {"1": 0.75, "3": 0.40}).';
COMMENT ON COLUMN preference_vectors.updated_at       IS 'Last time this preference vector was updated.';
