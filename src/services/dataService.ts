import { storage } from '../utils/storage';
import { supabase } from '../utils/supabase';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  location: string; // Town in Cameroon
  category: string;
  specs: Record<string, string>;
  quality: 'A' | 'B' | 'C';
  warranty_days: number;
  stock_quantity: number;
  created_at: string;
}

export const CAMEROON_TOWNS = [
  'Douala',
  'Yaoundé',
  'Bamenda',
  'Buea',
  'Bafoussam',
  'Garoua',
  'Limbe',
  'Kribi',
  'Maroua',
  'Ngaoundéré',
] as const;

export const CATEGORIES = [
  'Phones',
  'Laptops',
  'Accessories',
] as const;

// Seed Mock Data
const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    title: 'iPhone 13 Pro Max - 256GB',
    description: 'Perfect functional state. Battery health is 92%. Screen is original, no scratches. Comes with charging cable.',
    price: 480000,
    images: ['https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=500&auto=format&fit=crop'],
    location: 'Douala',
    category: 'Phones',
    specs: { storage: '256GB', RAM: '6GB', battery: '92%', color: 'Sierra Blue' },
    quality: 'A',
    warranty_days: 30,
    stock_quantity: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    title: 'MacBook Pro 13" M1 2020',
    description: 'Minor scuff marks on the bottom cover. 100% functional. 8-core CPU, 8-core GPU.',
    price: 650000,
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop'],
    location: 'Yaoundé',
    category: 'Laptops',
    specs: { processor: 'M1', RAM: '8GB', SSD: '256GB', batteryCycles: '180' },
    quality: 'B',
    warranty_days: 30,
    stock_quantity: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'prod-5',
    title: 'Samsung Galaxy S22 Ultra 5G',
    description: 'Very good condition. Small screen scratch on the bottom edge. Includes original S-Pen.',
    price: 380000,
    images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&auto=format&fit=crop'],
    location: 'Bafoussam',
    category: 'Phones',
    specs: { storage: '128GB', RAM: '8GB', battery: '88%', color: 'Burgundy' },
    quality: 'B',
    warranty_days: 30,
    stock_quantity: 2,
    created_at: new Date(Date.now() - 345600000).toISOString(),
  },
];

let localProductsDb = [...MOCK_PRODUCTS];

export interface OrderItem {
  id?: string;
  product_id: string;
  price: number;
  quantity: number;
  product?: Product;
}

export interface Order {
  id: string;
  client_id?: string;
  total_price: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
  delivery_type: 'pickup' | 'delivery';
  delivery_address?: string;
  delivery_fee: number;
  payment_gateway?: string;
  created_at: string;
  warranty_expiry?: string;
  items?: OrderItem[];
  client_name?: string;
}

export interface ChatRoom {
  id: string;
  buyer_id: string;
  product_id: string;
  created_at: string;
  buyer_name?: string;
  product_title?: string;
  product_price?: number;
  product_image?: string;
  last_message?: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  image_url?: string;
  created_at: string;
  sender_name?: string;
}

export interface Appointment {
  id: string;
  room_id: string;
  client_id?: string;
  appointment_date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
}

export interface TradeInRequest {
  id: string;
  client_id?: string;
  client_name?: string;
  device_model: string;
  condition: string;
  proposed_price: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

const ORDERS_KEY = 'revive_market_orders';
const TRADEIN_KEY = 'revive_market_tradein';

export const dataService = {
  isMock: () => !process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL.includes('placeholder'),

  async getProducts(filters?: {
    search?: string;
    category?: string;
    quality?: string;
    location?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Product[]> {
    if (this.isMock()) {
      let result = [...localProductsDb];

      if (filters) {
        const { search, category, quality, location, minPrice, maxPrice } = filters;
        
        if (search) {
          const query = search.toLowerCase();
          result = result.filter(
            (p) =>
              p.title.toLowerCase().includes(query) ||
              p.description.toLowerCase().includes(query)
          );
        }
        if (category) {
          result = result.filter((p) => p.category.toLowerCase() === category.toLowerCase());
        }
        if (quality) {
          result = result.filter((p) => p.quality.toLowerCase() === quality.toLowerCase());
        }
        if (location) {
          result = result.filter((p) => p.location.toLowerCase() === location.toLowerCase());
        }
        if (minPrice !== undefined) {
          result = result.filter((p) => p.price >= minPrice);
        }
        if (maxPrice !== undefined) {
          result = result.filter((p) => p.price <= maxPrice);
        }
      }
      return result;
    } else {
      let query = supabase.from('products').select('*');

      if (filters) {
        const { search, category, quality, location, minPrice, maxPrice } = filters;
        if (search) {
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }
        if (category) {
          query = query.ilike('category', category);
        }
        if (quality) {
          query = query.ilike('quality', quality);
        }
        if (location) {
          query = query.ilike('location', location);
        }
        if (minPrice !== undefined) {
          query = query.gte('price', minPrice);
        }
        if (maxPrice !== undefined) {
          query = query.lte('price', maxPrice);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as Product[];
    }
  },

  async getAdminStats() {
    if (this.isMock()) {
      const ordersStr = await storage.getItem(ORDERS_KEY);
      const orders = ordersStr ? JSON.parse(ordersStr) : [];
      const tradeStr = await storage.getItem(TRADEIN_KEY);
      const tradeIns = tradeStr ? JSON.parse(tradeStr) : [];
      
      const revenue = orders
        .filter((o: any) => o.status === 'paid' || o.status === 'delivered')
        .reduce((sum: number, o: any) => sum + (o.total ?? o.total_price ?? 0), 0);
        
      const inventory = localProductsDb.reduce((sum, p) => sum + p.stock_quantity, 0);

      return {
        revenue,
        inventory,
        productsCount: localProductsDb.length,
        customersCount: 1, // Mock
        tradeInRequests: tradeIns.filter((t: any) => t.status === 'pending').length
      };
    } else {
      // Supabase aggregations
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Revenue
      const { data: orders } = await supabase.from('orders').select('total_price, status').in('status', ['paid', 'delivered', 'shipped']);
      const revenue = (orders || []).reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

      // 2. Inventory & Products Count
      const { data: products } = await supabase.from('products').select('stock_quantity');
      const inventory = (products || []).reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
      const productsCount = (products || []).length;

      // 3. Customers count
      const { count: customersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client');

      // 4. Pending Trade-Ins
      const { count: tradeInRequests } = await supabase.from('trade_in_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      return {
        revenue,
        inventory,
        productsCount,
        customersCount: customersCount || 0,
        tradeInRequests: tradeInRequests || 0
      };
    }
  },

  async getProductById(id: string): Promise<Product | null> {
    if (this.isMock()) {
      return localProductsDb.find((p) => p.id === id) || null;
    } else {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return null;
      return data as Product;
    }
  },

  async createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    if (this.isMock()) {
      const newProduct: Product = {
        ...product,
        id: 'prod-' + Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
      };
      localProductsDb.unshift(newProduct);
      return newProduct;
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    }
  },

  async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<Product> {
    if (this.isMock()) {
      const index = localProductsDb.findIndex((p) => p.id === id);
      if (index === -1) throw new Error('Product not found');
      
      const updated = { ...localProductsDb[index], ...updates };
      localProductsDb[index] = updated;
      return updated;
    } else {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    if (this.isMock()) {
      localProductsDb = localProductsDb.filter((p) => p.id !== id);
    } else {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    }
  },

  // --- ORDERS SERVICES ---
  async getOrders(): Promise<Order[]> {
    if (this.isMock()) {
      const ordersStr = await storage.getItem(ORDERS_KEY);
      if (!ordersStr) return [];
      const raw = JSON.parse(ordersStr);
      return raw.map((ord: any) => ({
        ...ord,
        total_price: ord.total,
        client_name: ord.items?.[0]?.product?.title ? 'Mock Buyer' : undefined
      }));
    } else {
      // Get current user info
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Fetch user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();

      let query = supabase.from('orders').select(`
        *,
        client:profiles(name),
        order_items(
          *,
          product:products(*)
        )
      `);

      if (profile?.role !== 'admin') {
        query = query.eq('client_id', authUser.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      return (data || []).map((ord: any) => {
        const warrantyExpiry = new Date(new Date(ord.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
        return {
          id: ord.id,
          client_id: ord.client_id,
          total_price: parseFloat(ord.total_price),
          status: ord.status,
          delivery_type: ord.delivery_type,
          delivery_address: ord.delivery_address,
          delivery_fee: parseFloat(ord.delivery_fee),
          payment_gateway: ord.payment_gateway,
          created_at: ord.created_at,
          warranty_expiry: warrantyExpiry,
          client_name: ord.client?.name || 'User',
          items: (ord.order_items || []).map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            price: parseFloat(item.price),
            quantity: item.quantity,
            product: item.product
          }))
        };
      });
    }
  },

  async createOrder(orderData: {
    delivery_type: 'pickup' | 'delivery';
    delivery_address?: string;
    delivery_fee: number;
    payment_gateway?: string;
  }, items: { product: Product; quantity: number }[]): Promise<Order> {
    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const total = subtotal + orderData.delivery_fee;

    if (this.isMock()) {
      const orderId = 'ord-' + Math.random().toString(36).substring(2, 9);
      const newOrder = {
        id: orderId,
        items: items,
        subtotal: subtotal,
        deliveryFee: orderData.delivery_fee,
        total: total,
        deliveryType: orderData.delivery_type,
        deliveryAddress: orderData.delivery_address,
        paymentGateway: orderData.payment_gateway,
        status: 'paid' as const,
        created_at: new Date().toISOString(),
        warranty_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const existingOrdersStr = await storage.getItem(ORDERS_KEY);
      const existingOrders = existingOrdersStr ? JSON.parse(existingOrdersStr) : [];
      existingOrders.unshift(newOrder);
      await storage.setItem(ORDERS_KEY, JSON.stringify(existingOrders));

      return {
        id: orderId,
        total_price: total,
        status: 'paid',
        delivery_type: orderData.delivery_type,
        delivery_address: orderData.delivery_address,
        delivery_fee: orderData.delivery_fee,
        payment_gateway: orderData.payment_gateway,
        created_at: newOrder.created_at,
        warranty_expiry: newOrder.warranty_expiry,
      };
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Insert Order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert([{
          client_id: authUser.id,
          total_price: total,
          status: 'paid', // Mark as paid for simulation success
          delivery_type: orderData.delivery_type,
          delivery_address: orderData.delivery_address,
          delivery_fee: orderData.delivery_fee,
          payment_gateway: orderData.payment_gateway
        }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Insert Order Items
      const itemsToInsert = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        price: item.product.price,
        quantity: item.quantity
      }));

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;

      return {
        id: order.id,
        client_id: order.client_id,
        total_price: parseFloat(order.total_price),
        status: order.status,
        delivery_type: order.delivery_type,
        delivery_address: order.delivery_address,
        delivery_fee: parseFloat(order.delivery_fee),
        payment_gateway: order.payment_gateway,
        created_at: order.created_at,
        warranty_expiry: new Date(new Date(order.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    }
  },

  async updateOrderStatus(orderId: string, newStatus: Order['status']): Promise<void> {
    if (this.isMock()) {
      const ordersStr = await storage.getItem(ORDERS_KEY);
      if (ordersStr) {
        const list = JSON.parse(ordersStr);
        const updated = list.map((order: any) => {
          if (order.id === orderId) {
            return { ...order, status: newStatus };
          }
          return order;
        });
        await storage.setItem(ORDERS_KEY, JSON.stringify(updated));
      }
    } else {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
      if (error) throw error;
    }
  },

  // --- CHAT SERVICES ---
  async getChatRooms(): Promise<ChatRoom[]> {
    if (this.isMock()) {
      return [
        {
          id: 'room-1',
          buyer_id: 'buyer-id',
          product_id: 'prod-1',
          buyer_name: 'John Doe',
          product_title: 'iPhone 13 Pro Max - 256GB',
          product_price: 480000,
          product_image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=500&auto=format&fit=crop',
          last_message: 'Is the price negotiable?',
          created_at: new Date().toISOString(),
        },
        {
          id: 'room-2',
          buyer_id: 'buyer-id',
          product_id: 'prod-2',
          buyer_name: 'Samuel Eto\'o',
          product_title: 'MacBook Pro 13" M1 2020',
          product_price: 650000,
          product_image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop',
          last_message: 'Hello, is this still available?',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        }
      ];
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();

      let query = supabase.from('chat_rooms').select(`
        *,
        buyer:profiles(name),
        product:products(*),
        chat_messages(message, created_at)
      `);

      if (profile?.role !== 'admin') {
        query = query.eq('buyer_id', authUser.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      return (data || []).map((room: any) => {
        // Find last message
        const sortedMsgs = (room.chat_messages || []).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const lastMsg = sortedMsgs[0]?.message || 'No messages yet';

        return {
          id: room.id,
          buyer_id: room.buyer_id,
          product_id: room.product_id,
          created_at: room.created_at,
          buyer_name: room.buyer?.name || 'Buyer',
          product_title: room.product?.title || 'Unknown Product',
          product_price: room.product?.price ? parseFloat(room.product.price) : 0,
          product_image: room.product?.images?.[0] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200',
          last_message: lastMsg
        };
      });
    }
  },

  async getChatMessages(roomId: string): Promise<ChatMessage[]> {
    if (this.isMock()) {
      const mockMessagesMap: Record<string, ChatMessage[]> = {
        'room-1': [
          { id: 'm1', room_id: 'room-1', sender_id: 'seller-id', sender_name: 'Revive Market Support', message: 'Hello! Welcome to Revive Market.', created_at: new Date(Date.now() - 7200000).toISOString() },
          { id: 'm2', room_id: 'room-1', sender_id: 'buyer-id', sender_name: 'John Doe', message: 'Hi, I saw the iPhone 13 Pro Max.', created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 'm3', room_id: 'room-1', sender_id: 'buyer-id', sender_name: 'John Doe', message: 'Is the price negotiable?', created_at: new Date(Date.now() - 1800000).toISOString() }
        ],
        'room-2': [
          { id: 'm4', room_id: 'room-2', sender_id: 'buyer-id', sender_name: 'Samuel Eto\'o', message: 'Hello, is this still available?', created_at: new Date(Date.now() - 3600000).toISOString() }
        ]
      };
      return mockMessagesMap[roomId] || [];
    } else {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles(name)
        `)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((msg: any) => ({
        id: msg.id,
        room_id: msg.room_id,
        sender_id: msg.sender_id,
        message: msg.message,
        image_url: msg.image_url,
        created_at: msg.created_at,
        sender_name: msg.sender?.name || 'User'
      }));
    }
  },

  async sendMessage(roomId: string, message: string, imageUrl?: string): Promise<ChatMessage> {
    if (this.isMock()) {
      const { data: { user } } = await supabase.auth.getUser(); // Safe local fallback if any
      const mockUser = user || { id: 'buyer-id', user_metadata: { name: 'You' } };
      return {
        id: 'msg-' + Math.random().toString(36).substring(2, 9),
        room_id: roomId,
        sender_id: mockUser.id,
        sender_name: mockUser.user_metadata?.name || 'You',
        message,
        image_url: imageUrl,
        created_at: new Date().toISOString()
      };
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Build payload conditionally — only include image_url if provided
      // This prevents PGRST204 errors if the column migration hasn't been applied yet
      const payload: Record<string, any> = {
        room_id: roomId,
        sender_id: authUser.id,
        message: message || '',
      };
      if (imageUrl) {
        payload.image_url = imageUrl;
      }

      const { data, error } = await supabase
        .from('chat_messages')
        .insert([payload])
        .select(`
          *,
          sender:profiles(name)
        `)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        room_id: data.room_id,
        sender_id: data.sender_id,
        message: data.message,
        image_url: data.image_url ?? undefined,
        created_at: data.created_at,
        sender_name: data.sender?.name || 'You'
      };
    }
  },

  async createChatRoom(productId: string): Promise<string> {
    if (this.isMock()) {
      return 'room-1';
    } else {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      // Check if room already exists for this user and product
      const { data: existing, error: findErr } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('buyer_id', authUser.id)
        .eq('product_id', productId);

      if (findErr) throw findErr;

      if (existing && existing.length > 0) {
        return existing[0].id;
      }

      // Create new room
      const { data: newRoom, error: createErr } = await supabase
        .from('chat_rooms')
        .insert([{
          buyer_id: authUser.id,
          product_id: productId
        }])
        .select()
        .single();

      if (createErr) throw createErr;

      // Add a system welcome message
      await supabase.from('chat_messages').insert([{
        room_id: newRoom.id,
        sender_id: authUser.id,
        message: 'Hello! I am interested in this product.'
      }]);

      return newRoom.id;
    }
  },

  async getAppointments(roomId: string): Promise<Appointment[]> {
    if (this.isMock()) {
      const appsStr = await storage.getItem('revive_market_appointments');
      const list = appsStr ? JSON.parse(appsStr) : [];
      return list.filter((app: any) => app.room_id === roomId);
    } else {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('room_id', roomId)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  },

  async getAllAppointments(): Promise<Appointment[]> {
    if (this.isMock()) {
      const appsStr = await storage.getItem('revive_market_appointments');
      const list = appsStr ? JSON.parse(appsStr) : [];
      return list;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      let query = supabase.from('appointments').select('*').order('appointment_date', { ascending: true });
      if (profile?.role !== 'admin') {
        query = query.eq('client_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  },

  async createAppointment(roomId: string, dateStr: string): Promise<Appointment> {
    if (this.isMock()) {
      const appsStr = await storage.getItem('revive_market_appointments');
      const list = appsStr ? JSON.parse(appsStr) : [];
      
      const existing = list.find((a: any) => a.appointment_date === dateStr && a.status !== 'cancelled');
      if (existing) throw new Error('This time slot is already booked.');

      const newApp: Appointment = {
        id: 'app-' + Math.random().toString(36).substring(2, 9),
        room_id: roomId,
        client_id: 'buyer-id',
        appointment_date: dateStr,
        status: 'scheduled',
        created_at: new Date().toISOString()
      };
      list.push(newApp);
      await storage.setItem('revive_market_appointments', JSON.stringify(list));
      return newApp;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check double booking
      const { data: existingApps, error: checkErr } = await supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');
        
      if (checkErr) throw checkErr;
      if (existingApps && existingApps.length > 0) {
        throw new Error('This time slot is already booked.');
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          room_id: roomId,
          client_id: user.id,
          appointment_date: dateStr,
          status: 'scheduled'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // --- TRADE-IN SERVICES ---
  async getTradeInRequests(): Promise<TradeInRequest[]> {
    if (this.isMock()) {
      const tradeStr = await storage.getItem(TRADEIN_KEY);
      return tradeStr ? JSON.parse(tradeStr) : [];
    } else {
      const { data, error } = await supabase
        .from('trade_in_requests')
        .select('*, client:profiles(name)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return (data || []).map((req: any) => ({
        ...req,
        client_name: req.client?.name || 'Client'
      }));
    }
  },

  async createTradeInRequest(device_model: string, condition: string, proposed_price: number): Promise<TradeInRequest> {
    if (this.isMock()) {
      const tradeStr = await storage.getItem(TRADEIN_KEY);
      const list = tradeStr ? JSON.parse(tradeStr) : [];
      const newReq: TradeInRequest = {
        id: 'trade-' + Math.random().toString(36).substring(2, 9),
        client_name: 'Mock Client',
        device_model,
        condition,
        proposed_price,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      list.unshift(newReq);
      await storage.setItem(TRADEIN_KEY, JSON.stringify(list));
      return newReq;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('trade_in_requests')
        .insert([{
          client_id: user.id,
          device_model,
          condition,
          proposed_price,
          status: 'pending'
        }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    }
  },

  async updateTradeInStatus(requestId: string, status: TradeInRequest['status']): Promise<void> {
    if (this.isMock()) {
      const tradeStr = await storage.getItem(TRADEIN_KEY);
      if (tradeStr) {
        const list = JSON.parse(tradeStr);
        const updated = list.map((r: any) => r.id === requestId ? { ...r, status } : r);
        await storage.setItem(TRADEIN_KEY, JSON.stringify(updated));
      }
    } else {
      const { error } = await supabase
        .from('trade_in_requests')
        .update({ status })
        .eq('id', requestId);
      if (error) throw error;
    }
  },

  async uploadImage(bucket: string, fileUri: string): Promise<string> {
    if (this.isMock()) {
      return fileUri;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;
      const filePath = fileName;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.warn('Supabase storage upload failed, falling back to local URI/base64:', err);
      return fileUri;
    }
  }
};
