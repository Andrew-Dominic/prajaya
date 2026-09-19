require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Example table usage
async function fetchSuggestions() {
  const { data, error } = await supabase
    .from('suggestions')
    .select('*');

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Data from suggestions:', data);
  }
}

module.exports = supabase;
