const { createClient } = require('@supabase/supabase-js');

const WebSocket = require('ws');
globalThis.WebSocket = WebSocket;

const supabaseUrl = 'https://elrpfemvhcakqcfajsgr.supabase.co';
const supabaseKey = 'sb_publishable_yMUByCRbWE1Bfcvth1cVfA_k_avEZ5G';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function seedAdmin() {
  console.log('Seeding admin user...');
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@revivemarket.com',
    password: 'adminpassword123',
    options: {
      data: {
        name: 'Revive Admin',
        role: 'admin',
      }
    }
  });

  if (error) {
    console.error('Error creating admin:', error.message);
    if (error.message.includes('already registered')) {
       console.log('Admin user already exists. Trying to update profile to ensure admin role...');
       const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
         email: 'admin@revivemarket.com',
         password: 'adminpassword123',
       });
       if (signInError) {
         console.error('Sign in error. Make sure the password is "adminpassword123":', signInError.message);
       } else {
         const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', signInData.user.id);
            
         if (updateError) {
             console.error('Failed to force profile to admin:', updateError.message);
         } else {
             console.log('Profile successfully confirmed as Admin.');
         }
       }
    }
  } else {
    console.log('Admin created successfully! ID:', data.user.id);
  }
}

seedAdmin();
