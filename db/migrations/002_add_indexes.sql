-- ============================================================================
-- Migration 002: Add Indexes
-- Grad Projects Hub v3 — Query Performance Optimisation
-- ============================================================================
-- Adds performance indexes on foreign keys, frequently filtered/queried
-- columns, and a pgvector IVFFlat index for semantic similarity search.
-- All indexes use IF NOT EXISTS for idempotent re-runs.
-- ============================================================================

-- --------------------------------------------------------------------------
-- ideas table indexes
-- --------------------------------------------------------------------------

-- Index on category for fast filtering by department/interest area.
CREATE INDEX IF NOT EXISTS idx_ideas_category
    ON ideas (category);

-- Index on difficulty for filtering by skill level.
CREATE INDEX IF NOT EXISTS idx_ideas_difficulty
    ON ideas (difficulty);

-- Composite index for common feed queries: category + created_at.
-- The Deep Search Agent and Feedback Agent both filter by category
-- and sort by recency to present the freshest relevant ideas.
CREATE INDEX IF NOT EXISTS idx_ideas_category_created
    ON ideas (category, created_at DESC);

-- pgvector IVFFlat index for approximate nearest-neighbour search.
-- Uses cosine distance (vector_cosine_ops), the standard metric for
-- text-embedding similarity. IVFFlat requires a probe/lists parameter
-- tuned to the expected dataset size (4 × sqrt(n) lists for ~10k rows).
-- Lists = 100 is a reasonable starting point for < 50k records.
CREATE INDEX IF NOT EXISTS idx_ideas_embedding
    ON ideas
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

COMMENT ON INDEX idx_ideas_category        IS 'Fast category filtering for feed queries.';
COMMENT ON INDEX idx_ideas_difficulty      IS 'Difficulty-level filter for personalised feeds.';
COMMENT ON INDEX idx_ideas_category_created IS 'Composite index for filtered + chronological feed queries.';
COMMENT ON INDEX idx_ideas_embedding       IS 'IVFFlat index (lists=100) for cosine-similarity vector search on embeddings.';

-- --------------------------------------------------------------------------
-- swipe_history table indexes
-- --------------------------------------------------------------------------

-- FK index for JOINs with ideas table (most common operation).
CREATE INDEX IF NOT EXISTS idx_swipe_history_idea_id
    ON swipe_history (idea_id);

-- Timestamp index for time-windowed analytics (Feedback Agent queries
-- recent swipes to update preference vectors incrementally).
CREATE INDEX IF NOT EXISTS idx_swipe_history_timestamp
    ON swipe_history (timestamp DESC);

-- Composite index for per-idea swipe analytics (e.g. "how many right-swipes
-- did this idea get in the last week?").
CREATE INDEX IF NOT EXISTS idx_swipe_history_idea_timestamp
    ON swipe_history (idea_id, timestamp DESC);

COMMENT ON INDEX idx_swipe_history_idea_id         'FK join optimisation — swipes → ideas.';
COMMENT ON INDEX idx_swipe_history_timestamp       'Time-series analytics for the Feedback Agent.';
COMMENT ON INDEX idx_swipe_history_idea_timestamp  'Per-idea swipe analytics over time.';

-- --------------------------------------------------------------------------
-- preference_vectors table indexes
-- --------------------------------------------------------------------------

-- FK index for looking up a user's preference profile.
CREATE UNIQUE INDEX IF NOT EXISTS idx_preference_vectors_user_id
    ON preference_vectors (user_id);

COMMENT ON INDEX idx_preference_vectors_user_id  'Unique per-user preference profile lookup.';

-- --------------------------------------------------------------------------
-- topics table indexes
-- --------------------------------------------------------------------------

-- Index for building topic hierarchies (parent → children queries).
CREATE INDEX IF NOT EXISTS idx_topics_parent_id
    ON topics (parent_id);

-- Index for name-based lookups (e.g. "find topic by name").
CREATE INDEX IF NOT EXISTS idx_topics_name
    ON topics (name);

COMMENT ON INDEX idx_topics_parent_id  'Hierarchical queries — find child topics.';
COMMENT ON INDEX idx_topics_name       'Name-based topic lookup.';
