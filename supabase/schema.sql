-- Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL CHECK (price >= 0),
    images TEXT[] DEFAULT '{}'::TEXT[],
    location TEXT NOT NULL, -- Cameroon region/town
    category TEXT NOT NULL, -- phones, laptops, accessories, etc.
    specs JSONB DEFAULT '{}'::JSONB,
    quality TEXT NOT NULL CHECK (quality IN ('A', 'B', 'C')),
    warranty_days INTEGER DEFAULT 30,
    stock_quantity INTEGER DEFAULT 1 CHECK (stock_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to products" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Allow admins to modify products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
        )
    );

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    total_price NUMERIC NOT NULL CHECK (total_price >= 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered')),
    delivery_type TEXT CHECK (delivery_type IN ('pickup', 'delivery')),
    delivery_address TEXT,
    delivery_fee NUMERIC DEFAULT 0,
    payment_gateway TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow clients to view their own orders" ON public.orders
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Allow admins to view/modify all orders" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
        )
    );

-- ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0)
);

-- Enable RLS for Order Items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow clients to view their own order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE public.orders.id = order_id AND public.orders.client_id = auth.uid()
        )
    );

CREATE POLICY "Allow admins to view/modify all order items" ON public.order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
        )
    );

-- CHAT ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for Chat Rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow buyers to view/create their own chat rooms" ON public.chat_rooms
    FOR ALL USING (
        auth.uid() = buyer_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
        )
    );

-- CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for Chat Messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow participants to view/send messages in their rooms" ON public.chat_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.chat_rooms
            WHERE public.chat_rooms.id = room_id AND (
                public.chat_rooms.buyer_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'
                )
            )
        )
    );

-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, phone, address, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', 'User'),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'address',
        COALESCE(new.raw_user_meta_data->>'role', 'client')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
