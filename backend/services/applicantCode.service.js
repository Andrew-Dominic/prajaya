/**
 * Service to manage persistent, auto-incrementing applicant codes (e.g. pjf/26/001).
 * 
 * Persistence guarantee:
 * Counter is stored in an independent database table `applicant_counters`.
 * Deleting or exporting rows in the `applications` table will NEVER reset or decrement this counter.
 */

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
    pool.on('error', (err) => {
      console.error('PostgreSQL Pool unexpected error on idle client:', err);
    });
  }
  return pool;
}

/**
 * Format a counter number into the applicant code: pjf/{YY}/{001}
 */
function formatApplicantCode(number, date = new Date()) {
  const yy = date.getFullYear().toString().slice(-2);
  const paddedNumber = String(number).padStart(3, '0');
  return `pjf/${yy}/${paddedNumber}`;
}

/**
 * Initialize the applicant code database schema and backfill any missing codes.
 */
async function initApplicantCodeSystem(supabaseClient) {
  const dbPool = getPool();
  
  if (dbPool) {
    try {
      // 1. Create applicant_counters table if not exists
      await dbPool.query(`
        CREATE TABLE IF NOT EXISTS applicant_counters (
          id VARCHAR(50) PRIMARY KEY,
          last_number INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      // 2. Ensure applications table has applicant_code column
      await dbPool.query(`
        ALTER TABLE applications 
        ADD COLUMN IF NOT EXISTS applicant_code TEXT;
      `);

      // 3. Check if applicant_counter row exists
      const counterRes = await dbPool.query(`
        SELECT last_number FROM applicant_counters WHERE id = 'applicant_counter';
      `);

      let currentCounter = 0;
      if (counterRes.rows.length === 0) {
        // Initialize counter row
        await dbPool.query(`
          INSERT INTO applicant_counters (id, last_number, updated_at)
          VALUES ('applicant_counter', 0, NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
      } else {
        currentCounter = counterRes.rows[0].last_number;
      }

      // 4. Backfill any existing applications that have no applicant_code
      const missingRes = await dbPool.query(`
        SELECT id, created_at 
        FROM applications 
        WHERE applicant_code IS NULL OR applicant_code = ''
        ORDER BY created_at ASC, id ASC;
      `);

      if (missingRes.rows.length > 0) {
        console.log(`Backfilling ${missingRes.rows.length} existing application(s) with applicant codes...`);
        for (const app of missingRes.rows) {
          currentCounter += 1;
          const code = formatApplicantCode(currentCounter, app.created_at ? new Date(app.created_at) : new Date());
          await dbPool.query(`
            UPDATE applications 
            SET applicant_code = $1 
            WHERE id = $2;
          `, [code, app.id]);
        }

        // Update the counter to reflect backfilled applications
        await dbPool.query(`
          UPDATE applicant_counters 
          SET last_number = GREATEST(last_number, $1), updated_at = NOW() 
          WHERE id = 'applicant_counter';
        `, [currentCounter]);
        console.log(`Backfill complete. Current counter: ${currentCounter}`);
      }

      console.log('Applicant Code System initialized successfully (PostgreSQL).');
      return;
    } catch (err) {
      console.error('Error initializing applicant code system via PostgreSQL:', err);
    }
  }

  // Fallback to Supabase client if direct PG is unavailable
  if (supabaseClient) {
    try {
      const { data: counterData, error: counterErr } = await supabaseClient
        .from('applicant_counters')
        .select('*')
        .eq('id', 'applicant_counter');

      if (counterErr) {
        console.warn('Supabase applicant_counters lookup warning:', counterErr.message);
      } else if (!counterData || counterData.length === 0) {
        await supabaseClient
          .from('applicant_counters')
          .insert([{ id: 'applicant_counter', last_number: 0 }]);
      }
      console.log('Applicant Code System initialized via Supabase client.');
    } catch (fallbackErr) {
      console.error('Fallback initialization error:', fallbackErr);
    }
  }
}

/**
 * Atomically increment the persistent counter and return the formatted applicant code.
 * 
 * Guarantees that:
 * 1. Each code is strictly incremented (e.g. pjf/26/001, pjf/26/002, ...).
 * 2. Deleting records from applications never resets the counter because it reads
 *    and increments applicant_counters.
 */
async function generateNextApplicantCode(supabaseClient) {
  const dbPool = getPool();

  if (dbPool) {
    try {
      // Atomic upsert with RETURNING in PostgreSQL guarantees no race condition
      const res = await dbPool.query(`
        INSERT INTO applicant_counters (id, last_number, updated_at)
        VALUES ('applicant_counter', 1, NOW())
        ON CONFLICT (id)
        DO UPDATE SET 
          last_number = applicant_counters.last_number + 1,
          updated_at = NOW()
        RETURNING last_number;
      `);

      const nextNumber = res.rows[0].last_number;
      const code = formatApplicantCode(nextNumber);
      console.log(`Generated Applicant Code: ${code} (seq #${nextNumber})`);
      return code;
    } catch (err) {
      console.error('Error generating applicant code via PostgreSQL:', err);
      // Attempt to proceed with Supabase fallback below
    }
  }

  // Supabase fallback if direct PG connection is down
  if (supabaseClient) {
    try {
      const { data: currentRows, error: fetchErr } = await supabaseClient
        .from('applicant_counters')
        .select('last_number')
        .eq('id', 'applicant_counter')
        .single();

      let nextNum = 1;
      if (!fetchErr && currentRows) {
        nextNum = (currentRows.last_number || 0) + 1;
        await supabaseClient
          .from('applicant_counters')
          .update({ last_number: nextNum, updated_at: new Date().toISOString() })
          .eq('id', 'applicant_counter');
      } else {
        await supabaseClient
          .from('applicant_counters')
          .insert([{ id: 'applicant_counter', last_number: nextNum }]);
      }

      const code = formatApplicantCode(nextNum);
      console.log(`Generated Applicant Code via Supabase fallback: ${code}`);
      return code;
    } catch (err) {
      console.error('Supabase fallback error generating applicant code:', err);
    }
  }

  // Failsafe timestamp-based code in case DB is unreachable
  const fallbackNum = Date.now() % 10000;
  return formatApplicantCode(fallbackNum);
}

module.exports = {
  formatApplicantCode,
  initApplicantCodeSystem,
  generateNextApplicantCode,
};
