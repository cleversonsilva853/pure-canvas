const supabaseUrl = 'https://oaxylfbcnshpkuiymsmv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9heHlsZmJjbnNocGt1aXltc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTUyMjcsImV4cCI6MjA4OTMzMTIyN30.EeOU3Q3qJvr7mzRx9uWYN423V-9F0GoI7phYeiEBdqg'

async function checkTables() {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_tables`, {
    method: 'POST',
    headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' }
  })
  // If get_tables RPC doesn't exist, try querying information_schema
  if (res.status === 404) {
    const res2 = await fetch(`${supabaseUrl}/rest/v1/?select=name`, {
      method: 'GET',
      headers: { 'apikey': supabaseKey }
    })
    console.log('Tables:', await res2.text())
  } else {
    console.log('Tables:', await res.json())
  }
}
checkTables().catch(console.error)
