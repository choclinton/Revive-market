const { createClient } = require('@supabase/supabase-js');
globalThis.WebSocket = require('ws');

const supabase = createClient(
  'https://elrpfemvhcakqcfajsgr.supabase.co',
  'sb_publishable_yMUByCRbWE1Bfcvth1cVfA_k_avEZ5G',
  { auth: { persistSession: false } }
);

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'choclinton@revivemarket.com',
    password: 'adminpassword123',
  });
  if (error) {
    console.error('Login failed:', error.message);
  } else {
    console.log('Login success!', data.user.id);
  }
}

testLogin();
