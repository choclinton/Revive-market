import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { CAMEROON_TOWNS, CATEGORIES, dataService } from '../services/dataService';

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

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin states
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Phones');
  const [newQuality, setNewQuality] = useState<'A' | 'B' | 'C'>('A');
  const [newLocation, setNewLocation] = useState('Douala');
  const [newImage, setNewImage] = useState('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const isLargeScreen = screenWidth > 800;

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const list = await dataService.getOrders();
      setOrders(list as any[]);
    } catch (err) {
      console.error('Failed to load orders:', err);
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
    if (!newTitle || !newPrice || !newDesc) {
      alert('Please fill in all fields.');
      return;
    }

    setIsSubmittingProduct(true);
    try {
      await dataService.createProduct({
        title: newTitle,
        description: newDesc,
        price: parseFloat(newPrice),
        images: [newImage],
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
    } catch (err) {
      console.error('Failed to add product:', err);
    } finally {
      setIsSubmittingProduct(false);
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
                <ThemedText type="subtitle" style={styles.sectionTitle}>Admin Management</ThemedText>
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
                    <ThemedText type="smallBold">Product Image URL</ThemedText>
                    <TextInput
                      style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                      placeholder="https://..."
                      value={newImage}
                      onChangeText={setNewImage}
                    />
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

              {/* Manage Orders */}
              <View style={styles.adminOrdersHeader}>
                <ThemedText type="smallBold" style={{ fontSize: 18 }}>Client Orders Panel</ThemedText>
                <Pressable onPress={loadOrders} style={styles.refreshBtn}>
                  <ThemedText type="small" style={{ color: colors.primary }}>🔄 Refresh</ThemedText>
                </Pressable>
              </View>

              {orders.length === 0 ? (
                <ThemedText style={{ opacity: 0.6, paddingVertical: Spacing.two }}>No orders placed yet.</ThemedText>
              ) : (
                orders.map((order) => (
                  <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.orderHeaderRow}>
                      <ThemedText type="smallBold">Order ID: {order.id}</ThemedText>
                      <ThemedText type="small" style={{ opacity: 0.6 }}>{new Date(order.created_at).toLocaleDateString()}</ThemedText>
                    </View>

                    {order.items.map((item, idx) => (
                      <View key={idx} style={styles.orderItemRow}>
                        <ThemedText type="small" style={{ flex: 2 }} numberOfLines={1}>{item.product.title}</ThemedText>
                        <ThemedText type="small" style={{ flex: 1 }}>qty: {item.quantity}</ThemedText>
                        <ThemedText type="smallBold" style={{ flex: 1, textAlign: 'right' }}>{(item.product.price * item.quantity).toLocaleString()} FCFA</ThemedText>
                      </View>
                    ))}

                    <View style={styles.orderFooterRow}>
                      <ThemedText type="smallBold">Total: {order.total.toLocaleString()} FCFA</ThemedText>
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
                ))
              )}

            </View>
          ) : (
            /* CLIENT DASHBOARD INTERFACE */
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Your Purchase History & Warranty</ThemedText>

              {orders.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <ThemedText style={{ opacity: 0.6 }}>You haven't placed any orders yet.</ThemedText>
                </View>
              ) : (
                orders.map((order) => (
                  <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.orderHeaderRow}>
                      <ThemedText type="smallBold">Order Ref: {order.id}</ThemedText>
                      <View style={[styles.statusBadge, { backgroundColor: order.status === 'delivered' ? '#E2F3E4' : '#FFF8E1' }]}>
                        <ThemedText type="smallBold" style={{ fontSize: 11, color: order.status === 'delivered' ? colors.success : '#F57F17' }}>
                          Status: {order.status.toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Order Items */}
                    {order.items.map((item, idx) => {
                      const daysLeft = getWarrantyDaysLeft(order.warranty_expiry);
                      const percentLeft = (daysLeft / 30) * 100;
                      
                      return (
                        <View key={idx} style={styles.clientItemCard}>
                          <View style={styles.orderItemRow}>
                            <Image source={{ uri: item.product.images[0] }} style={styles.clientItemImg} resizeMode="cover" />
                            <View style={{ flex: 1 }}>
                              <ThemedText type="smallBold" numberOfLines={1}>{item.product.title}</ThemedText>
                              <ThemedText type="small" style={{ opacity: 0.6 }}>Grade {item.product.quality} | Qty: {item.quantity}</ThemedText>
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
                      <ThemedText type="small">Payment: {order.paymentGateway} | Delivery: {order.deliveryType.toUpperCase()}</ThemedText>
                      <ThemedText type="smallBold" style={{ color: colors.primary }}>
                        Grand Total: {order.total.toLocaleString()} FCFA
                      </ThemedText>
                    </View>
                  </View>
                ))
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
});
