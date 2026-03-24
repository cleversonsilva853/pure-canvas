const supabaseUrl = 'https://oaxylfbcnshpkuiymsmv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9heHlsZmJjbnNocGt1aXltc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTUyMjcsImV4cCI6MjA4OTMzMTIyN30.EeOU3Q3qJvr7mzRx9uWYN423V-9F0GoI7phYeiEBdqg'

async function test() {
  const email = `test_casal_${Date.now()}@example.com`
  const password = "password123!"
  const signUpRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, data: { full_name: 'Test' } })
  })
  const signUpJson = await signUpRes.json()
  console.log('SignUp:', signUpRes.status, signUpJson.error || 'Success')
  
  const signInRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const signInJson = await signInRes.json()
  console.log('SignIn:', signInRes.status, signInJson.error_description || signInJson.error || 'Success')
}
test().catch(console.error)
