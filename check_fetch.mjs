import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...vals] = line.split('=');
  if (key && !key.startsWith('#')) acc[key.trim()] = vals.join('=').trim().replace(/"/g, '');
  return acc;
}, {});

async function main() {
  try {
    const url = `${env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions?select=*`;
    const res = await fetch(url, { headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
    console.log("--- Push Subscriptions ---");
    console.log(JSON.stringify(await res.json(), null, 2));

    const url2 = `${env.VITE_SUPABASE_URL}/rest/v1/notifications?select=*`;
    const res2 = await fetch(url2, { headers: { apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}` } });
    console.log("--- Notifications ---");
    console.log(JSON.stringify(await res.json(), null, 2));
  } catch(e) {
    console.error(e);
  }
}
main();
