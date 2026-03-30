import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#')) acc[key.trim()] = vals.join('=').trim().replace(/"/g, '');
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function checkSubs() {
  console.log("Checking push_subscriptions...");
  const { data, error } = await supabase.from('push_subscriptions').select('*');
  console.log("Error:", error);
  console.log("Data:", data);
  process.exit();
}
checkSubs();
