# Revive Market 🛒📱💻

**Revive Market** is Cameroon's premium electronics marketplace connecting buyers with verified, high-quality, pre-owned devices (Phones, Laptops, Audio). It features a 30-day warranty, real-time chat, robust searching & filtering, and a seamless client/admin dashboard experience.

![Revive Market](assets/images/revive-logo.png)

---

## 🚀 Built With

- **Framework**: [Expo](https://expo.dev) & React Native (Web, iOS, Android)
- **Routing**: Expo Router (File-based navigation)
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL, Realtime, Authentication)
- **Styling**: Custom Theme System (Light/Dark Mode, Glassmorphism, Premium Layouts)

---

## ✅ Everything Accomplished So Far

### 1. Project Setup & Authentication
- Initialized Universal Expo app functioning across Web, Tablets, and Mobile.
- Designed a stunning Landing Page with a premium, responsive layout.
- Fully functional Sign-In and Registration flow (Email/Password & Roles).
- Supabase SDK successfully integrated for real-time authentication.

### 2. Home, Intelligent Search, and Filtering
- Responsive Home Page grid layout.
- Advanced Search with debounce capabilities.
- Dynamic filtering by **Category**, **Cameroon Regions** (e.g., Douala, Yaoundé), **Quality Grades** (A, B, C), and **Price**.
- Live data fetching via a unified cross-platform `dataService`.

### 3. Shopping Cart & Product Checkout
- Comprehensive Product Detail Views showing device specs, seller details, and 30-day warranty assurance.
- Persistent local Cart state using a custom Web/Native safe storage utility.
- Checkout flow offering Delivery or Warehouse Pickup.
- Simulated Mobile Money payment modal (MTN MoMo, Orange Money, UBA).

### 4. Real-Time Chat System
- Full database schema designed for `chat_rooms` and `chat_messages`.
- Supabase Real-Time subscriptions implemented for instant messaging between Buyers and Admins.
- Beautiful, intuitive chat bubbles mimicking modern messaging applications.

### 5. Client & Admin Dashboards
- **Client Dashboard**: Tracks purchase history, payment status, and a dynamic progress bar for the 30-Day Warranty.
- **Admin Dashboard**: Specialized interface to manage inventory (Upload new products with images, price, and specs) and update client order statuses (Pending, Paid, Shipped, Delivered).
- Cross-platform navigation resolved using robust `expo-router` Tabs.

---

## 🚧 What Is Left To Be Done (Future Enhancements)

While the core functionality is robust and fully implemented, the following items remain to push the application to production-readiness:

1. **Payment Gateway Integration**
   - Replace the simulated payment modal with actual APIs for **MTN Mobile Money**, **Orange Money**, or **Campay/Flutterwave** for live transaction processing.

2. **Push Notifications**
   - Integrate Expo Push Notifications to alert users of new chat messages from sellers and order status updates (e.g., "Your order has been shipped").

3. **Data Seeding & Migration**
   - Ensure the Supabase cloud instance is fully populated with real seed data (Product catalogs, High-res images, Categories).
   - Complete transition from any residual "Mock Mode" fallbacks to 100% live database constraints.

4. **Extensive Cross-Device QA**
   - Perform deep-dive Quality Assurance (QA) to guarantee that all Admin and Client views display perfectly across all esoteric screen sizes (e.g., very small Android phones or ultrawide desktop monitors).

5. **App Store & Web Deployment**
   - Deploy the web version via Vercel or Netlify.
   - Build native iOS and Android binaries (`.ipa` and `.apk`/`.aab`) using EAS (Expo Application Services) for store submission.

---

## 💻 Running the Project Locally

To run the project in your local development environment:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the Expo Server:
   ```bash
   npx expo start
   ```
   - Press `w` to open in the Web Browser.
   - Press `a` to open on Android Emulator.
   - Press `i` to open on iOS Simulator.
