import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { CAMEROON_TOWNS, CATEGORIES, dataService } from '../services/dataService';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

interface OrderItem {
  product: {
    id: string;
    title: string;
    images: string[];
    price: number;
    quality: string;
  };
  quantity: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryType: 'pickup' | 'delivery';
  deliveryAddress: string;
  paymentGateway: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
  created_at: string;
  warranty_expiry: string;
}

const ORDERS_KEY = 'revive_market_orders';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin states
  const [adminStats, setAdminStats] = useState({ revenue: 0, inventory: 0, productsCount: 0, customersCount: 0, tradeInRequests: 0 });
  const [tradeIns, setTradeIns] = useState<any[]>([]);
  
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Phones');
  const [newQuality, setNewQuality] = useState<'A' | 'B' | 'C'>('A');
  const [newLocation, setNewLocation] = useState('Douala');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Client states
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellDevice, setSellDevice] = useState('');
  const [sellCondition, setSellCondition] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellImage, setSellImage] = useState<string | null>(null);
  const [isSubmittingSell, setIsSubmittingSell] = useState(false);

  const handlePickProductImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking product image:', err);
      alert('Failed to select image.');
    }
  };

  const handlePickSellImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSellImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking sell image:', err);
      alert('Failed to select image.');
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const isLargeScreen = screenWidth > 800;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await dataService.getOrders();
      setOrders(list as any[]);

      if (user?.role === 'admin') {
        const stats = await dataService.getAdminStats();
        setAdminStats(stats);
        const reqs = await dataService.getTradeInRequests();
        setTradeIns(reqs);
      }
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      await dataService.updateOrderStatus(orderId, newStatus);
      const updated = orders.map((order) => {
        if (order.id === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      });
      setOrders(updated);
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  // Calculate remaining warranty days out of 30 days
  const getWarrantyDaysLeft = (expiryStr: string) => {
    const expiry = new Date(expiryStr).getTime();
    const now = Date.now();
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
  };

  const handleAddProduct = async () => {
    if (!newTitle || !newPrice || !newDesc || !newImage) {
      alert('Please fill in all fields and choose a product photo.');
      return;
    }

    setIsSubmittingProduct(true);
    try {
      const uploadedUrl = await dataService.uploadImage('product-images', newImage);
      await dataService.createProduct({
        title: newTitle,
        description: newDesc,
        price: parseFloat(newPrice),
        images: [uploadedUrl],
        location: newLocation,
        category: newCategory,
        quality: newQuality,
        warranty_days: 30,
        stock_quantity: 1,
        specs: { version: 'Standard Edition' }
      });

      alert('Product uploaded successfully!');
      setShowAddProductModal(false);
      
      // Clear inputs
      setNewTitle('');
      setNewPrice('');
      setNewDesc('');
      setNewImage(null);
      loadData();
    } catch (err) {
      console.error('Failed to add product:', err);
      alert('Error creating product: ' + (err as Error).message);
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const handleSellSubmit = async () => {
    if (!sellDevice || !sellCondition || !sellPrice) {
      alert('Please fill in all fields.');
      return;
    }
    setIsSubmittingSell(true);
    try {
      // 1. Upload the image if one was picked
      let uploadedUrl = 'https://images.unsplash.com/photo-1588508065123-287b28e01397?w=500&auto=format&fit=crop';
      if (sellImage) {
        uploadedUrl = await dataService.uploadImage('product-images', sellImage);
      }

      // 2. Log the trade-in request
      await dataService.createTradeInRequest(sellDevice, sellCondition, parseFloat(sellPrice));
      
      // 3. Create a "Trade-In" product to act as the chat anchor (stock 0 so it's not buyable)
      const tradeInProduct = await dataService.createProduct({
        title: `Sell Offer: ${sellDevice}`,
        description: `Condition: ${sellCondition}`,
        price: parseFloat(sellPrice),
        images: [uploadedUrl],
        location: user?.address || 'Platform',
        category: 'Accessories', 
        quality: 'C',
        warranty_days: 0,
        stock_quantity: 0,
        specs: { tradeIn: 'true' }
      });

      // 4. Create the chat room for this trade-in
      const roomId = await dataService.createChatRoom(tradeInProduct.id);
      
      // 5. Send the automated first message from the client
      await dataService.sendMessage(roomId, `Hello, I would like to sell my device.\n\nDevice: ${sellDevice}\nCondition: ${sellCondition}\nMy Proposed Price: ${parseFloat(sellPrice).toLocaleString()} FCFA`);

      alert('Your sell request has been submitted! We have opened a support chat for you.');
      
      setShowSellModal(false);
      setSellDevice('');
      setSellCondition('');
      setSellPrice('');
      setSellImage(null);
      
      // Navigate to chat
      router.push('/chat');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmittingSell(false);
    }
  };

  const updateTradeInStatus = async (id: string, status: 'accepted' | 'rejected') => {
    try {
      await dataService.updateTradeInStatus(id, status);
      loadData();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* User Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.profileHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                <ThemedText style={[styles.avatarText, { color: colors.primary }]}>{user?.name[0].toUpperCase()}</ThemedText>
              </View>
              <View style={styles.profileInfo}>
                <ThemedText type="subtitle" style={styles.userName}>{user?.name}</ThemedText>
                <View style={styles.roleBadge}>
                  <ThemedText type="smallBold" style={styles.roleText}>{user?.role.toUpperCase()}</ThemedText>
                </View>
                <View style={styles.contactRow}>
                  <ThemedText type="small" style={styles.contactText}>📞 {user?.phone || 'Add phone number'}</ThemedText>
                </View>
                <View style={styles.contactRow}>
                  <ThemedText type="small" style={styles.contactText}>📍 {user?.address || 'Add address'}</ThemedText>
                </View>
              </View>
            </View>
            <View style={styles.actionDivider} />
            <Pressable onPress={signOut} style={({pressed}) => [styles.signOutBtn, { backgroundColor: colors.primary + '10' }, pressed && { opacity: 0.7 }]}>
              <ThemedText type="smallBold" style={{ color: colors.primary }}>Log Out</ThemedText>
            </Pressable>
          </View>

          {/* ADMIN INTERFACE */}
          {isAdmin ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Dashboard Overview</ThemedText>
                <Pressable onPress={loadData} style={styles.refreshBtn}>
                  <ThemedText type="small" style={{ color: colors.primary }}>🔄 Refresh</ThemedText>
                </Pressable>
              </View>

              {/* Admin Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
                  <ThemedText type="small" style={{ opacity: 0.6 }}>Total Revenue</ThemedText>
                  <ThemedText type="subtitle" style={{ color: colors.success }}>{adminStats.revenue.toLocaleString()} FCFA</ThemedText>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
                  <ThemedText type="small" style={{ opacity: 0.6 }}>Inventory Items</ThemedText>
                  <ThemedText type="subtitle" style={{ color: colors.primary }}>{adminStats.inventory}</ThemedText>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
                  <ThemedText type="small" style={{ opacity: 0.6 }}>Registered Clients</ThemedText>
                  <ThemedText type="subtitle" style={{ color: '#F57F17' }}>{adminStats.customersCount}</ThemedText>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }]}>
                  <ThemedText type="small" style={{ opacity: 0.6 }}>Pending Sell Req.</ThemedText>
                  <ThemedText type="subtitle" style={{ color: '#8E24AA' }}>{adminStats.tradeInRequests}</ThemedText>
                </View>
              </View>

              <View style={[styles.sectionHeader, { marginTop: Spacing.four }]}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Inventory Management</ThemedText>
                <Pressable
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAddProductModal(!showAddProductModal)}
                >
                  <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>
                    {showAddProductModal ? 'Hide Upload Form' : '➕ Upload Product'}
                  </ThemedText>
                </Pressable>
              </View>

              {/* Upload New Product Form Accordion */}
              {showAddProductModal && (
                <View style={[styles.formCard, { backgroundColor: colors.backgroundElement }]}>
                  <ThemedText type="smallBold" style={styles.formTitle}>Add Product Details</ThemedText>
                  
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold">Title</ThemedText>
                    <TextInput
                      style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                      placeholder={'e.g. MacBook Pro 16" M2'}
                      value={newTitle}
                      onChangeText={setNewTitle}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold">Price (FCFA)</ThemedText>
                    <TextInput
                      style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                      placeholder="e.g. 1200000"
                      keyboardType="numeric"
                      value={newPrice}
                      onChangeText={setNewPrice}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold">Description</ThemedText>
                    <TextInput
                      style={[styles.input, { height: 80, borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                      placeholder="Product status, details, specs..."
                      multiline
                      value={newDesc}
                      onChangeText={setNewDesc}
                    />
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <ThemedText type="smallBold">Category</ThemedText>
                      <TextInput
                        style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                        placeholder="Phones, Laptops, Audio..."
                        value={newCategory}
                        onChangeText={setNewCategory}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <ThemedText type="smallBold">Quality Grade</ThemedText>
                      <View style={styles.gradeToggleRow}>
                        {['A', 'B', 'C'].map((g) => (
                          <Pressable
                            key={g}
                            style={[
                              styles.gradeBtn,
                              { backgroundColor: colors.background },
                              newQuality === g && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setNewQuality(g as any)}
                          >
                            <ThemedText style={[newQuality === g && { color: '#FFF' }]}>{g}</ThemedText>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold">Cameroon Town Location</ThemedText>
                    <TextInput
                      style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                      placeholder="e.g. Douala, Bastos Yaoundé"
                      value={newLocation}
                      onChangeText={setNewLocation}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold">Product Photo</ThemedText>
                    {newImage ? (
                      <View style={styles.imageUploadPreviewRow}>
                        <Image source={{ uri: newImage }} style={styles.productUploadThumb} />
                        <Pressable onPress={() => setNewImage(null)} style={[styles.uploadBtn, { backgroundColor: '#FF3B30', marginLeft: Spacing.two }]}>
                          <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>✕ Remove Photo</ThemedText>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={[styles.uploadBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary, borderWidth: 1, borderStyle: 'dashed' }]}
                        onPress={handlePickProductImage}
                      >
                        <ThemedText style={{ color: colors.primary, fontWeight: '700' }}>📷 Upload Device Image</ThemedText>
                      </Pressable>
                    )}
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.submitBtn,
                      { backgroundColor: colors.primary },
                      pressed && styles.btnPressed
                    ]}
                    onPress={handleAddProduct}
                    disabled={isSubmittingProduct}
                  >
                    {isSubmittingProduct ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>Submit Product</ThemedText>
                    )}
                  </Pressable>
                </View>
              )}

              {/* Client Trade-in Requests */}
              <View style={[styles.adminOrdersHeader, { marginTop: Spacing.four }]}>
                <ThemedText type="smallBold" style={{ fontSize: 18 }}>Client Sell Requests</ThemedText>
              </View>

              {tradeIns.length === 0 ? (
                <ThemedText style={{ opacity: 0.6, paddingVertical: Spacing.two }}>No pending requests.</ThemedText>
              ) : (
                tradeIns.map((req: any) => (
                  <View key={req.id} style={[styles.orderCard, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.orderHeaderRow}>
                      <ThemedText type="smallBold">{req.client_name}</ThemedText>
                      <View style={[styles.statusBadge, { backgroundColor: req.status === 'pending' ? '#FFF8E1' : (req.status === 'accepted' ? '#E2F3E4' : '#FFEBEE') }]}>
                        <ThemedText style={{ fontSize: 10, color: req.status === 'pending' ? '#F57F17' : (req.status === 'accepted' ? colors.success : '#D32F2F') }}>
                          {req.status.toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="small">Device: {req.device_model}</ThemedText>
                    <ThemedText type="small">Condition: {req.condition}</ThemedText>
                    <ThemedText type="smallBold" style={{ marginTop: Spacing.one }}>Proposed Price: {req.proposed_price.toLocaleString()} FCFA</ThemedText>
                    
                    {req.status === 'pending' && (
                      <View style={[styles.statusControls, { marginTop: Spacing.two }]}>
                        <Pressable onPress={() => updateTradeInStatus(req.id, 'accepted')} style={[styles.statusBtn, { backgroundColor: colors.success, borderColor: colors.success, paddingVertical: 8 }]}>
                          <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Accept</ThemedText>
                        </Pressable>
                        <Pressable onPress={() => updateTradeInStatus(req.id, 'rejected')} style={[styles.statusBtn, { backgroundColor: '#D32F2F', borderColor: '#D32F2F', paddingVertical: 8 }]}>
                          <ThemedText style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>Reject</ThemedText>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ))
              )}

              {/* Manage Orders */}
              <View style={[styles.adminOrdersHeader, { marginTop: Spacing.four }]}>
                <ThemedText type="smallBold" style={{ fontSize: 18 }}>Client Orders Panel</ThemedText>
              </View>

              {orders.length === 0 ? (
                <ThemedText style={{ opacity: 0.6, paddingVertical: Spacing.two }}>No orders placed yet.</ThemedText>
              ) : (
                orders.map((order: any) => {
                  const total = order.total ?? order.total_price ?? 0;
                  return (
                    <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.backgroundElement }]}>
                      <View style={styles.orderHeaderRow}>
                        <ThemedText type="smallBold">Order ID: {order.id}</ThemedText>
                        <ThemedText type="small" style={{ opacity: 0.6 }}>{new Date(order.created_at).toLocaleDateString()}</ThemedText>
                      </View>

                      {(order.items || []).map((item: any, idx: number) => {
                        const title = item.product?.title ?? 'Product';
                        const price = item.product?.price ?? item.price ?? 0;
                        return (
                          <View key={idx} style={styles.orderItemRow}>
                            <ThemedText type="small" style={{ flex: 2 }} numberOfLines={1}>{title}</ThemedText>
                            <ThemedText type="small" style={{ flex: 1 }}>qty: {item.quantity}</ThemedText>
                            <ThemedText type="smallBold" style={{ flex: 1, textAlign: 'right' }}>{(price * item.quantity).toLocaleString()} FCFA</ThemedText>
                          </View>
                        );
                      })}

                      <View style={styles.orderFooterRow}>
                        <ThemedText type="smallBold">Total: {total.toLocaleString()} FCFA</ThemedText>
                        <View style={styles.statusControls}>
                          {['paid', 'shipped', 'delivered'].map((st) => (
                            <Pressable
                              key={st}
                              style={[
                                styles.statusBtn,
                                { backgroundColor: colors.background },
                                order.status === st && { backgroundColor: st === 'delivered' ? colors.success : colors.primary }
                              ]}
                              onPress={() => updateOrderStatus(order.id, st as any)}
                            >
                              <ThemedText style={[styles.statusBtnText, order.status === st && { color: '#FFF' }]}>
                                {st}
                              </ThemedText>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}

            </View>
          ) : (
            /* CLIENT DASHBOARD INTERFACE */
            <View style={styles.section}>
              {/* Sell Your Device Section */}
              <View style={[styles.orderCard, { backgroundColor: colors.backgroundElement, borderColor: colors.primary, borderWidth: 1, padding: Spacing.four }]}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle" style={{ fontSize: 18 }}>Sell Your Device</ThemedText>
                </View>
                <ThemedText type="small" style={{ opacity: 0.7, marginVertical: Spacing.two }}>
                  Got an old device you want to sell? Submit a request and we will offer you the best price in the market.
                </ThemedText>
                
                {showSellModal ? (
                  <View style={{ gap: Spacing.three, marginTop: Spacing.two }}>
                    <View style={styles.inputGroup}>
                      <ThemedText type="smallBold">Device Name / Model</ThemedText>
                      <TextInput
                        style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                        placeholder="e.g. iPhone 12 Pro 128GB"
                        value={sellDevice}
                        onChangeText={setSellDevice}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <ThemedText type="smallBold">Condition Description</ThemedText>
                      <TextInput
                        style={[styles.input, { height: 60, borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                        placeholder="e.g. Broken screen, battery 80%"
                        multiline
                        value={sellCondition}
                        onChangeText={setSellCondition}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <ThemedText type="smallBold">Your Proposed Price (FCFA)</ThemedText>
                      <TextInput
                        style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                        placeholder="e.g. 150000"
                        keyboardType="numeric"
                        value={sellPrice}
                        onChangeText={setSellPrice}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <ThemedText type="smallBold">Device Photo</ThemedText>
                      {sellImage ? (
                        <View style={styles.imageUploadPreviewRow}>
                          <Image source={{ uri: sellImage }} style={styles.productUploadThumb} />
                          <Pressable onPress={() => setSellImage(null)} style={[styles.uploadBtn, { backgroundColor: '#FF3B30', marginLeft: Spacing.two }]}>
                            <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>✕ Remove Photo</ThemedText>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          style={[styles.uploadBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary, borderWidth: 1, borderStyle: 'dashed' }]}
                          onPress={handlePickSellImage}
                        >
                          <ThemedText style={{ color: colors.primary, fontWeight: '700' }}>📷 Upload Device Image</ThemedText>
                        </Pressable>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                      <Pressable
                        style={[styles.submitBtn, { backgroundColor: colors.textSecondary, flex: 1 }]}
                        onPress={() => setShowSellModal(false)}
                      >
                        <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>Cancel</ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.submitBtn, { backgroundColor: colors.primary, flex: 1 }]}
                        onPress={handleSellSubmit}
                        disabled={isSubmittingSell}
                      >
                        {isSubmittingSell ? <ActivityIndicator color="#FFF" /> : <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>Submit</ThemedText>}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: Spacing.one }]}
                    onPress={() => setShowSellModal(true)}
                  >
                    <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>Request a Quote</ThemedText>
                  </Pressable>
                )}
              </View>

              <ThemedText type="subtitle" style={styles.sectionTitle}>Your Purchase History & Warranty</ThemedText>
              <Pressable onPress={loadData} style={styles.refreshBtn}>
                <ThemedText type="small" style={{ color: colors.primary }}>🔄 Refresh History</ThemedText>
              </Pressable>

              {orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText style={{ opacity: 0.6 }}>You haven't placed any orders yet.</ThemedText>
                </View>
              ) : (
                orders.map((order: any) => {
                  const total = order.total ?? order.total_price ?? 0;
                  const paymentGateway = order.paymentGateway ?? order.payment_gateway ?? 'MoMo';
                  const deliveryType = order.deliveryType ?? order.delivery_type ?? 'pickup';

                  return (
                    <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.backgroundElement }]}>
                      <View style={styles.orderHeaderRow}>
                        <ThemedText type="smallBold">Order Ref: {order.id}</ThemedText>
                        <View style={[styles.statusBadge, { backgroundColor: order.status === 'delivered' ? '#E2F3E4' : '#FFF8E1' }]}>
                          <ThemedText type="smallBold" style={{ fontSize: 11, color: order.status === 'delivered' ? colors.success : '#F57F17' }}>
                            Status: {order.status ? order.status.toUpperCase() : 'PENDING'}
                          </ThemedText>
                        </View>
                      </View>

                      {/* Order Items */}
                      {(order.items || []).map((item: any, idx: number) => {
                        const daysLeft = getWarrantyDaysLeft(order.warranty_expiry);
                        const percentLeft = (daysLeft / 30) * 100;
                        const title = item.product?.title ?? 'Product';
                        const quality = item.product?.quality ?? 'A';
                        const imageUri = item.product?.images?.[0] || 'https://via.placeholder.com/150';
                        
                        return (
                          <View key={idx} style={styles.clientItemCard}>
                            <View style={styles.orderItemRow}>
                              <Image source={{ uri: imageUri }} style={styles.clientItemImg} resizeMode="cover" />
                              <View style={{ flex: 1 }}>
                                <ThemedText type="smallBold" numberOfLines={1}>{title}</ThemedText>
                                <ThemedText type="small" style={{ opacity: 0.6 }}>Grade {quality} | Qty: {item.quantity}</ThemedText>
                              </View>
                            </View>

                            {/* Warranty progress bar display */}
                            <View style={styles.warrantyTracker}>
                              <View style={styles.warrantyHeader}>
                                <ThemedText type="smallBold" style={{ fontSize: 12, color: colors.success }}>
                                  🛡️ Warranty Coverage: {daysLeft} days remaining
                                </ThemedText>
                                <ThemedText type="small" style={{ fontSize: 11, opacity: 0.5 }}>Expired on day 30</ThemedText>
                              </View>
                              <View style={[styles.progressBarBg, { backgroundColor: colors.background }]}>
                                <View style={[styles.progressBarFill, { width: `${percentLeft}%`, backgroundColor: colors.success }]} />
                              </View>
                            </View>
                          </View>
                        );
                      })}

                      <View style={styles.clientOrderSummary}>
                        <ThemedText type="small">Payment: {paymentGateway} | Delivery: {deliveryType.toUpperCase()}</ThemedText>
                        <ThemedText type="smallBold" style={{ color: colors.primary }}>
                          Grand Total: {total.toLocaleString()} FCFA
                        </ThemedText>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.one,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  profileCard: {
    borderRadius: 24,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 10,
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    opacity: 0.6,
    fontSize: 13,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: Spacing.three,
  },
  signOutBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    gap: Spacing.four,
    marginTop: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  addBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
  },
  formCard: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputGroup: {
    gap: 4,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 15,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gradeToggleRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    height: 44,
  },
  gradeBtn: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCC',
  },
  submitBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  adminOrdersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  refreshBtn: {
    paddingVertical: Spacing.one,
  },
  orderCard: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.one,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CCC',
    paddingBottom: 6,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CCC',
    paddingTop: 8,
    marginTop: 4,
  },
  statusControls: {
    flexDirection: 'row',
    gap: 4,
  },
  statusBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCC',
  },
  statusBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: Spacing.five,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FFE082',
  },
  clientItemCard: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    paddingBottom: Spacing.two,
    marginBottom: Spacing.one,
    gap: Spacing.two,
  },
  clientItemImg: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: Spacing.two,
  },
  warrantyTracker: {
    gap: 4,
  },
  warrantyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  clientOrderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  imageUploadPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  productUploadThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  uploadBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
