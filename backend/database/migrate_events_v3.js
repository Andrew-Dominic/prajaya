require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const migrationSQL = `
-- 1. Add page_type column for independent presentation control
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS page_type VARCHAR(20) DEFAULT 'TEASER';

-- 2. Auto-detect existing content pages
-- Events that already have content blocks should be marked as CONTENT_PAGE
UPDATE public.events 
SET page_type = 'CONTENT_PAGE' 
WHERE content IS NOT NULL 
  AND content::text != 'null'
  AND content::text != '[]'
  AND jsonb_typeof(content) = 'array'
  AND jsonb_array_length(content) > 0;

-- 3. Ensure all events without content default to TEASER
UPDATE public.events 
SET page_type = 'TEASER'
WHERE page_type IS NULL;
`;

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Starting migration v3...');
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    console.log('Migration v3 successful! Added page_type column and auto-detected content pages.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
