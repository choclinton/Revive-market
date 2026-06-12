import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { storage } from '../utils/storage';
import { Product, dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

interface CartItem {
  product: Product;
  quantity: number;
}

const CART_KEY = 'revive_market_cart';
const ORDERS_KEY = 'revive_market_orders';

export default function CartScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  if (user?.role === 'admin') {
    return (
      <ThemedView style={[styles.container, styles.centerContainer, { padding: Spacing.four }]}>
        <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
          Access Denied
        </ThemedText>
        <ThemedText style={{ opacity: 0.6, textAlign: 'center', marginTop: Spacing.two }}>
          Administrators do not have access to the shopping cart or checkout flows.
        </ThemedText>
      </ThemedView>
    );
  }

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Delivery options states
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '');
  const [deliveryRegion, setDeliveryRegion] = useState(user?.address?.split(',').pop()?.trim() || 'Douala');

  // Payment Simulation states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState<'MTN MoMo' | 'Orange Money' | 'UBA' | 'First Bank' | 'CCA Bank' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    setLoading(true);
    try {
      const cartStr = await storage.getItem(CART_KEY);
      if (cartStr) {
        setCartItems(JSON.parse(cartStr));
      }
    } catch (err) {
      console.error('Failed to load cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, amount: number) => {
    try {
      const updated = cartItems.map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + amount;
          return { ...item, quantity: newQty < 1 ? 1 : newQty };
        }
        return item;
      });
      setCartItems(updated);
      await storage.setItem(CART_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to update quantity:', err);
    }
  };

  const removeItem = async (productId: string) => {
    try {
      const filtered = cartItems.filter((item) => item.product.id !== productId);
      setCartItems(filtered);
      await storage.setItem(CART_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  // Calculate delivery fee dynamically based on location in Cameroon
  const getDeliveryFee = () => {
    if (deliveryType === 'pickup') return 0;
    const region = deliveryRegion.toLowerCase();
    if (region.includes('douala') || region.includes('yaoundé') || region.includes('yaounde')) {
      return 1500;
    }
    if (region.includes('bamenda') || region.includes('buea') || region.includes('limbe')) {
      return 1000;
    }
    return 2000; // other towns
  };

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const getGrandTotal = () => {
    return getSubtotal() + getDeliveryFee();
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setShowPaymentModal(true);
  };

  const runPaymentSimulation = async () => {
    if (!paymentGateway) {
      alert('Please select a payment gateway');
      return;
    }
    if ((paymentGateway === 'MTN MoMo' || paymentGateway === 'Orange Money') && !phoneNumber) {
      alert('Please enter your mobile money number');
      return;
    }

    setIsProcessingPayment(true);
    
    // Simulate transaction delay
    setTimeout(async () => {
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
      
      // Save order via dataService
      try {
        await dataService.createOrder({
          delivery_type: deliveryType,
          delivery_address: deliveryAddress,
          delivery_fee: getDeliveryFee(),
          payment_gateway: paymentGateway || undefined,
        }, cartItems.map(item => ({ product: item.product, quantity: item.quantity })));

        // Clear Cart
        await storage.removeItem(CART_KEY);
        setCartItems([]);
      } catch (err) {
        console.error('Failed to save order:', err);
        alert('Order placement failed: ' + (err as Error).message);
      }
    }, 2500);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>Shopping Cart</ThemedText>
        </View>

        {cartItems.length === 0 ? (
          <View style={styles.emptyCartContainer}>
            <ThemedText style={styles.emptyText}>Your cart is currently empty.</ThemedText>
            <ThemedText type="small" style={{ opacity: 0.6, marginTop: 4 }}>
              Add some Grade A, B, or C electronics from the home feed!
            </ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Cart Items List */}
            <View style={styles.section}>
              {cartItems.map((item) => (
                <View key={item.product.id} style={[styles.cartItemRow, { backgroundColor: colors.backgroundElement }]}>
                  <Image source={{ uri: item.product.images[0] }} style={styles.itemImage} resizeMode="cover" />
                  
                  <View style={styles.itemDetails}>
                    <ThemedText type="smallBold" numberOfLines={1}>{item.product.title}</ThemedText>
                    <ThemedText type="small" style={{ opacity: 0.7, fontSize: 13 }}>Grade {item.product.quality}</ThemedText>
                    
                    <ThemedText type="smallBold" style={{ color: colors.primary, marginTop: 4 }}>
                      {item.product.price.toLocaleString()} FCFA
                    </ThemedText>
                  </View>

                  <View style={styles.quantityControls}>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.product.id, -1)}
                    >
                      <ThemedText type="smallBold">-</ThemedText>
                    </Pressable>
                    <ThemedText type="smallBold">{item.quantity}</ThemedText>
                    <Pressable
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(item.product.id, 1)}
                    >
                      <ThemedText type="smallBold">+</ThemedText>
                    </Pressable>
                  </View>

                  <Pressable style={styles.removeBtn} onPress={() => removeItem(item.product.id)}>
                    <ThemedText style={{ color: '#D32F2F', fontSize: 18 }}>✕</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Delivery/Shipping Selection */}
            <View style={[styles.cardSection, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>Delivery Option</ThemedText>
              
              <View style={styles.deliveryToggleRow}>
                <Pressable
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: colors.background },
                    deliveryType === 'pickup' && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setDeliveryType('pickup')}
                >
                  <ThemedText style={[styles.toggleText, deliveryType === 'pickup' && { color: '#FFF' }]}>
                    Pickup (Warehouse)
                  </ThemedText>
                </Pressable>
                
                <Pressable
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: colors.background },
                    deliveryType === 'delivery' && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setDeliveryType('delivery')}
                >
                  <ThemedText style={[styles.toggleText, deliveryType === 'delivery' && { color: '#FFF' }]}>
                    Home Delivery
                  </ThemedText>
                </Pressable>
              </View>

              {deliveryType === 'delivery' && (
                <View style={styles.deliveryForm}>
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={styles.label}>Town / City</ThemedText>
                    <TextInput
                      style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                      placeholder="e.g. Buea, Douala, Yaoundé"
                      value={deliveryRegion}
                      onChangeText={(val) => {
                        setDeliveryRegion(val);
                        setDeliveryAddress(val);
                      }}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <ThemedText type="smallBold" style={styles.label}>Street / Neighborhood Address</ThemedText>
                    <TextInput
                      style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                      placeholder="e.g. Molyko, Opposite landmark"
                      value={deliveryAddress}
                      onChangeText={setDeliveryAddress}
                    />
                  </View>
                </View>
              )}

              {deliveryType === 'pickup' && (
                <ThemedText type="small" style={{ opacity: 0.7, fontStyle: 'italic', marginTop: Spacing.two }}>
                  📍 Warehouse locations: Douala (Akwa), Yaoundé (Bastos), Buea (Molyko). We will notify you once items are ready for pickup.
                </ThemedText>
              )}
            </View>

            {/* Summary Order Details */}
            <View style={[styles.cardSection, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>Order Summary</ThemedText>
              
              <View style={styles.summaryRow}>
                <ThemedText type="small">Subtotal</ThemedText>
                <ThemedText type="small">{getSubtotal().toLocaleString()} FCFA</ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText type="small">Delivery Fee</ThemedText>
                <BillingFeeText fee={getDeliveryFee()} colors={colors} />
              </View>

              <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.textSecondary + '20', paddingTop: 8, marginTop: 4 }]}>
                <ThemedText type="smallBold">Total</ThemedText>
                <ThemedText type="smallBold" style={{ color: colors.primary, fontSize: 18 }}>
                  {getGrandTotal().toLocaleString()} FCFA
                </ThemedText>
              </View>
            </View>

            {/* Checkout Button */}
            <Pressable
              style={({ pressed }) => [
                styles.checkoutBtn,
                { backgroundColor: colors.primary },
                pressed && styles.btnPressed
              ]}
              onPress={handleCheckout}
            >
              <ThemedText style={styles.checkoutText}>Proceed to Checkout</ThemedText>
            </Pressable>

          </ScrollView>
        )}

        {/* PAYMENT SIMULATION MODAL */}
        <Modal
          visible={showPaymentModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => !isProcessingPayment && setShowPaymentModal(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
              
              {paymentSuccess ? (
                <View style={styles.successWrapper}>
                  <ThemedText style={styles.successIcon}>🎉</ThemedText>
                  <ThemedText type="subtitle" style={styles.successTitle}>Payment Successful!</ThemedText>
                  <ThemedText type="small" style={{ textAlign: 'center', opacity: 0.7 }}>
                    Your transaction of {getGrandTotal().toLocaleString()} FCFA was processed successfully. 
                    Your order status is now paid.
                  </ThemedText>
                  <Pressable
                    style={[styles.closeBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setPaymentSuccess(false);
                      setShowPaymentModal(false);
                    }}
                  >
                    <ThemedText style={{ color: '#FFF', fontWeight: '700' }}>Done</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.paymentForm}>
                  <View style={styles.modalHeader}>
                    <ThemedText type="smallBold" style={{ fontSize: 18 }}>Virtual Payment Gateway</ThemedText>
                    {!isProcessingPayment && (
                      <Pressable onPress={() => setShowPaymentModal(false)}>
                        <ThemedText style={{ fontSize: 20 }}>✕</ThemedText>
                      </Pressable>
                    )}
                  </View>

                  <ThemedText type="small" style={{ opacity: 0.7 }}>
                    Select a simulated gateway to process your order payment of <ThemedText type="smallBold">{getGrandTotal().toLocaleString()} FCFA</ThemedText>.
                  </ThemedText>

                  {/* Gateway options */}
                  <View style={styles.gatewayGrid}>
                    {[
                      { name: 'MTN MoMo', color: '#FFCC00', textColor: '#000' },
                      { name: 'Orange Money', color: '#FF6600', textColor: '#FFF' },
                      { name: 'UBA', color: '#D32F2F', textColor: '#FFF' },
                      { name: 'First Bank', color: '#0D47A1', textColor: '#FFF' },
                      { name: 'CCA Bank', color: '#37474F', textColor: '#FFF' }
                    ].map((gw) => (
                      <Pressable
                        key={gw.name}
                        style={[
                          styles.gatewayBtn,
                          { backgroundColor: gw.color },
                          paymentGateway === gw.name && { borderWidth: 3, borderColor: '#00E676' }
                        ]}
                        onPress={() => setPaymentGateway(gw.name as any)}
                      >
                        <ThemedText style={{ color: gw.textColor, fontWeight: '700', fontSize: 13 }}>
                          {gw.name}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>

                  {/* MoMo Number Input */}
                  {(paymentGateway === 'MTN MoMo' || paymentGateway === 'Orange Money') && (
                    <View style={styles.inputGroup}>
                      <ThemedText type="smallBold" style={styles.label}>Mobile Number</ThemedText>
                      <TextInput
                        style={[styles.input, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                        placeholder="e.g. 677889900"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                      />
                    </View>
                  )}

                  {/* Submit simulated Payment */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.payBtn,
                      { backgroundColor: colors.primary },
                      pressed && styles.btnPressed,
                      isProcessingPayment && { opacity: 0.7 }
                    ]}
                    onPress={runPaymentSimulation}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>
                        Pay Now
                      </ThemedText>
                    )}
                  </Pressable>
                </ScrollView>
              )}

            </ThemedView>
          </View>
        </Modal>

      </SafeAreaView>
    </ThemedView>
  );
}

function BillingFeeText({ fee, colors }: { fee: number; colors: any }) {
  if (fee === 0) {
    return <ThemedText type="small" style={{ color: colors.success, fontWeight: '700' }}>FREE</ThemedText>;
  }
  return <ThemedText type="small">{fee.toLocaleString()} FCFA</ThemedText>;
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    opacity: 0.6,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.two,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 2,
    justifyContent: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  removeBtn: {
    paddingHorizontal: Spacing.two,
  },
  cardSection: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  deliveryToggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  toggleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deliveryForm: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    opacity: 0.8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  checkoutBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  checkoutText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  paymentForm: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  gatewayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginVertical: Spacing.two,
  },
  gatewayBtn: {
    width: '48%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  payBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  successWrapper: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  successIcon: {
    fontSize: 64,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  closeBtn: {
    height: 48,
    borderRadius: 10,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
