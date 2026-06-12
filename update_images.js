const { createClient } = require('@supabase/supabase-js');

globalThis.WebSocket = require('ws');

const supabaseUrl = 'https://elrpfemvhcakqcfajsgr.supabase.co';
const supabaseKey = 'sb_publishable_yMUByCRbWE1Bfcvth1cVfA_k_avEZ5G';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const phoneImages = [
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1598327105666-5b89351cb31b?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1605236453806-6ff3685287fb?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533228100845-08145b01de14?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b9?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1556656793-08538906a9f8?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1601784551446-20c9e07cd8d6?q=80&w=600&auto=format&fit=crop'
];

const laptopImages = [
  'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1531297172868-9f1d8b394145?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1588702545922-e10db84f932e?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1515378960530-7c0da6229678?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1593642702821-c823b13eb2a5?q=80&w=600&auto=format&fit=crop'
];

const accessoryImages = [
  'https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1585298723682-7115561c51b7?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1572569433602-66b40264440b?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1606220588913-b3eea4eceb54?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1615526675159-e248c3021d3f?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1578319439584-104c94d37305?q=80&w=600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?q=80&w=600&auto=format&fit=crop'
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function updateImages() {
  console.log('Logging in as Admin...');
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@revivemarket.com',
    password: 'adminpassword123',
  });

  if (authError) {
    console.error('Admin login failed:', authError.message);
    return;
  }
  
  console.log('Fetching all products...');
  
  // Since we have ~500 products, we can fetch all at once
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, category');
    
  if (fetchError) {
    console.error('Error fetching products:', fetchError.message);
    return;
  }
  
  console.log(`Found ${products.length} products. Assigning random images...`);
  
  const updatedProducts = products.map(p => {
    let newImage = '';
    if (p.category === 'phones') newImage = rand(phoneImages);
    else if (p.category === 'laptops') newImage = rand(laptopImages);
    else newImage = rand(accessoryImages);
    
    return {
      id: p.id,
      images: [newImage] // Must match the TEXT[] structure
    };
  });
  
  const batchSize = 10;
  for (let i = 0; i < updatedProducts.length; i += batchSize) {
    const batch = updatedProducts.slice(i, i + batchSize);
    console.log(`Updating batch ${i} to ${i + batch.length}...`);
    
    await Promise.all(batch.map(async (p) => {
      const { error: updateError } = await supabase.from('products').update({ images: p.images }).eq('id', p.id);
      if (updateError) {
        console.error('Error updating product:', updateError.message);
      }
    }));
  }

  console.log('Successfully updated all product images!');
}

updateImages();
