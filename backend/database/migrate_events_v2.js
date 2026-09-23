require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const migrationSQL = `
-- 1. Add new columns for separated lifecycles and draft state
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_lifecycle_status VARCHAR(50) DEFAULT 'UPCOMING',
ADD COLUMN IF NOT EXISTS publication_status VARCHAR(50) DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS draft_data JSONB;

-- 2. Migrate existing data
-- Map existing event status
UPDATE public.events 
SET event_lifecycle_status = UPPER(status)
WHERE status IN ('upcoming', 'completed', 'ongoing', 'cancelled', 'Upcoming', 'Completed', 'Ongoing', 'Cancelled');

-- Fallback for 'draft' or unknown statuses
UPDATE public.events 
SET event_lifecycle_status = 'UPCOMING'
WHERE LOWER(status) = 'draft' OR status IS NULL;

-- Map publication status
UPDATE public.events
SET publication_status = CASE WHEN is_published = true THEN 'PUBLISHED' ELSE 'DRAFT' END;

-- 3. Update RLS Policies to use publication_status
DROP POLICY IF EXISTS "Public can view published events" ON public.events;
DROP POLICY IF EXISTS "Public can view images for published events" ON public.event_images;
DROP POLICY IF EXISTS "Public can view links for published events" ON public.event_links;

CREATE POLICY "Public can view published events"
ON public.events FOR SELECT
USING (publication_status = 'PUBLISHED');

CREATE POLICY "Public can view images for published events"
ON public.event_images FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_images.event_id 
        AND events.publication_status = 'PUBLISHED'
    )
);

CREATE POLICY "Public can view links for published events"
ON public.event_links FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.events 
        WHERE events.id = event_links.event_id 
        AND events.publication_status = 'PUBLISHED'
    )
);
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration v2...');
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    console.log('Migration v2 successful! Added event_lifecycle_status, publication_status, draft_data and updated RLS.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
