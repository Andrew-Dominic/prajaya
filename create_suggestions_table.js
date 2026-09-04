const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database');
    await client.query(`
      CREATE TABLE IF NOT EXISTS suggestions (
        id uuid default uuid_generate_v4() primary key,
        name text not null,
        email text not null,
        suggestion text not null,
        created_at timestamp with time zone default timezone('utc'::text, now()) not null
      );
    `);
    console.log('Table suggestions created successfully.');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await client.end();
  }
}

run();
