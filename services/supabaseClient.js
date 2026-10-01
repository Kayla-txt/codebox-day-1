const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required in your .env file.'
  );
}

const supabase = createClient(supabaseUrl, supabasePublishableKey);

function createUserClient(accessToken) {
  return createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

module.exports = { createUserClient, supabase };
