import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oaxylfbcnshpkuiymsmv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9heHlsZmJjbnNocGt1aXltc212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NTUyMjcsImV4cCI6MjA4OTMzMTIyN30.EeOU3Q3qJvr7mzRx9uWYN423V-9F0GoI7phYeiEBdqg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const email = `test_casal_${Date.now()}@example.com`
  const password = "password123!"
  
  console.log('Testing signUp with email:', email)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: 'Conta Casal Test' }
    }
  })
  
  if (signUpError) {
    console.log('SignUp Error:', signUpError)
    return
  }
  console.log('SignUp Data User:', signUpData.user?.id, 'Session:', !!signUpData.session)
  
  console.log('\nTesting signInWithPassword...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (signInError) {
    console.log('SignIn Error:', signInError.message)
    console.log('Status code:', signInError.status)
  } else {
    console.log('SignIn Data User:', signInData.user?.id, 'Session:', !!signInData.session)
  }
}

test().catch(console.error)
