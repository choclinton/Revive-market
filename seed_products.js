const { createClient } = require('@supabase/supabase-js');

// Add WS polyfill for Node 20
globalThis.WebSocket = require('ws');

const supabaseUrl = 'https://elrpfemvhcakqcfajsgr.supabase.co';
const supabaseKey = 'sb_publishable_yMUByCRbWE1Bfcvth1cVfA_k_avEZ5G';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const brandsPhones = ['iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 11', 'Samsung S21', 'Samsung S22', 'Samsung A53', 'Google Pixel 6', 'Google Pixel 7', 'Tecno Spark', 'Infinix Hot', 'Xiaomi Redmi Note 11'];
const brandsLaptops = ['MacBook Pro M1', 'MacBook Air', 'HP EliteBook', 'Dell XPS 13', 'Lenovo ThinkPad', 'ASUS ROG', 'HP ProBook', 'Acer Aspire'];
const brandsAccs = ['AirPods Pro', 'Samsung Buds', 'JBL Bluetooth Speaker', 'Fast Charger 20W', 'Powerbank 10000mAh', 'Laptop Bag', 'Wireless Mouse'];

const locations = ['Douala', 'Yaoundé', 'Bamenda', 'Buea', 'Bafoussam', 'Limbe'];
const qualities = ['A', 'B', 'C'];

// Helper to get random item
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function generateProduct(index) {
  const isPhone = index % 3 === 0;
  const isLaptop = index % 3 === 1;
  
  let category = 'phones';
  let title = '';
  let price = 0;
  let imageUrl = '';
  
  if (isPhone) {
    category = 'phones';
    title = rand(brandsPhones) + (randInt(0, 1) ? ' - Used' : ' (Renewed)');
    price = randInt(50000, 400000);
    imageUrl = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600&auto=format&fit=crop';
  } else if (isLaptop) {
    category = 'laptops';
    title = rand(brandsLaptops) + ' ' + randInt(2018, 2023) + ' Model';
    price = randInt(100000, 400000);
    imageUrl = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=600&auto=format&fit=crop';
  } else {
    category = 'accessories';
    title = rand(brandsAccs) + ' - High Quality';
    price = randInt(2500, 50000);
    imageUrl = 'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=600&auto=format&fit=crop';
  }

  // Adjust price to multiples of 500
  price = Math.round(price / 500) * 500;

  return {
    title,
    description: `This is a high quality ${category.slice(0, -1)}. Fully tested and verified by Revive Market technicians. Excellent battery life and performance.`,
    price,
    images: [imageUrl],
    location: rand(locations),
    category,
    specs: { ram: isLaptop ? '8GB' : '4GB', storage: isLaptop ? '256GB SSD' : '64GB' },
    quality: rand(qualities),
    warranty_days: randInt(15, 30),
    stock_quantity: randInt(1, 10)
  };
}

async function seedProducts() {
  console.log('Logging in as Admin to bypass RLS...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@revivemarket.com',
    password: 'adminpassword123',
  });

  if (authError) {
    console.error('Admin login failed:', authError.message);
    return;
  }
  
  console.log('Admin logged in! Generating 500+ products...');
  
  const totalProducts = 510;
  const batchSize = 50; // Supabase handles batch inserts well
  
  for (let i = 0; i < totalProducts; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < totalProducts; j++) {
      batch.push(generateProduct(i + j));
    }
    
    console.log(`Inserting batch ${i} to ${i + batch.length}...`);
    const { error } = await supabase.from('products').insert(batch);
    
    if (error) {
      console.error('Error inserting batch:', error.message);
      return;
    }
  }
  
  console.log('Successfully inserted 510 products!');
}

seedProducts();
