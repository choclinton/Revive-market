import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, Dimensions, TextInput } from 'react-native';
import { ThemedText } from '../themed-text';
import { ThemedView } from '../themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { dataService, Product } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProductDetailViewProps {
  productId: string;
  onBack: () => void;
}

const CART_KEY = 'revive_market_cart';

export default function ProductDetailView({ productId, onBack }: ProductDetailViewProps) {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [chatInitiated, setChatInitiated] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const isLargeScreen = screenWidth > 800;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const prod = await dataService.getProductById(productId);
        setProduct(prod);
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      const cartStr = await AsyncStorage.getItem(CART_KEY);
      const cart = cartStr ? JSON.parse(cartStr) : [];
      
      const existingItemIndex = cart.findIndex((item: any) => item.product.id === product.id);
      if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += 1;
      } else {
        cart.push({ product, quantity: 1 });
      }

      await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const handleContactSeller = async () => {
    if (!product) return;
    setChatInitiated(true);
    try {
      await dataService.createChatRoom(product.id);
      setChatInitiated(false);
      alert('Chat room initialized! Tap the Chats tab to start messaging the seller.');
    } catch (err) {
      setChatInitiated(false);
      console.error('Failed to contact seller:', err);
      alert('Error initializing chat: ' + (err as Error).message);
    }
  };

  const getQualityStyle = (quality: string) => {
    switch (quality) {
      case 'A': return { bg: '#E2F3E4', text: '#2E7D32', label: 'Grade A (Like New)' };
      case 'B': return { bg: '#E3F2FD', text: '#1565C0', label: 'Grade B (Good)' };
      case 'C': return { bg: '#ECEFF1', text: '#455A64', label: 'Grade C (Fair)' };
      default: return { bg: '#F5F5F5', text: '#757575', label: 'Used' };
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  if (!product) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Product not found.</ThemedText>
        <Pressable onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <ThemedText style={{ color: '#FFF' }}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const qDetails = getQualityStyle(product.quality);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Back Button Header */}
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backBtnRow}>
            <ThemedText style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>← Back to Feed</ThemedText>
          </Pressable>
        </View>

        {/* Responsive Content Split */}
        <View style={[styles.detailLayout, isLargeScreen && styles.rowLayout]}>
          
          {/* Images Section */}
          <View style={[styles.imageSection, isLargeScreen && styles.halfWidth]}>
            <Image
              source={{ uri: product.images[activeImageIndex] }}
              style={styles.mainImage}
              resizeMode="contain"
            />
            {product.images.length > 1 && (
              <ScrollView horizontal style={styles.thumbnailsScroller} contentContainerStyle={styles.thumbnailsContainer}>
                {product.images.map((img, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setActiveImageIndex(idx)}
                    style={[
                      styles.thumbnailBtn,
                      { borderColor: activeImageIndex === idx ? colors.primary : '#E0E0E0' }
                    ]}
                  >
                    <Image source={{ uri: img }} style={styles.thumbnailImg} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Details & Specifications Section */}
          <View style={[styles.detailsSection, isLargeScreen && styles.halfWidth]}>
            <View style={styles.metaRow}>
              <ThemedText type="small" style={{ opacity: 0.5, fontSize: 14 }}>{product.category}</ThemedText>
              <View style={[styles.qualityBadge, { backgroundColor: qDetails.bg }]}>
                <ThemedText type="smallBold" style={{ fontSize: 12, color: qDetails.text }}>{qDetails.label}</ThemedText>
              </View>
            </View>

            <ThemedText type="subtitle" style={styles.title}>{product.title}</ThemedText>
            
            <ThemedText type="subtitle" style={[styles.price, { color: colors.primary }]}>
              {product.price.toLocaleString()} FCFA
            </ThemedText>

            {/* Description */}
            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>Product Description</ThemedText>
              <ThemedText type="small" style={styles.descriptionText}>
                {product.description}
              </ThemedText>
            </View>

            {/* Technical Specifications */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <View style={styles.section}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>Technical Specs</ThemedText>
                <View style={[styles.specsTable, { borderColor: colors.textSecondary + '20' }]}>
                  {Object.entries(product.specs).map(([key, val], idx) => (
                    <View
                      key={key}
                      style={[
                        styles.specRow,
                        { borderBottomWidth: idx === Object.keys(product.specs).length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: colors.textSecondary + '20' }
                      ]}
                    >
                      <ThemedText type="smallBold" style={[styles.specKey, { color: colors.textSecondary }]}>
                        {key}
                      </ThemedText>
                      <ThemedText type="small" style={styles.specValue}>
                        {val}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Warranty Info badge */}
            <View style={[styles.warrantyCard, { backgroundColor: colors.backgroundElement, borderColor: colors.success + '40' }]}>
              <ThemedText type="smallBold" style={{ color: colors.success, fontSize: 15 }}>
                🛡️ 30-Day Revive Market Warranty Included
              </ThemedText>
              <ThemedText type="small" style={{ opacity: 0.8, fontSize: 12, lineHeight: 18 }}>
                Tested and verified by our technicians. Full refunds or repairs if defective within 30 days of purchase.
              </ThemedText>
            </View>

            {/* Location & Stock details */}
            <View style={styles.infoRow}>
              <ThemedText type="small">📍 Available in: <ThemedText type="smallBold">{product.location}</ThemedText></ThemedText>
              <ThemedText type="small">📦 Stock count: <ThemedText type="smallBold">{product.stock_quantity} units</ThemedText></ThemedText>
            </View>

            {/* Actions Buttons */}
            <View style={styles.actionsContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.cartBtn,
                  { backgroundColor: cartSuccess ? colors.success : colors.primary },
                  pressed && styles.btnPressed
                ]}
                onPress={handleAddToCart}
              >
                <ThemedText style={styles.btnText}>
                  {cartSuccess ? '✓ Added to Cart' : '🛒 Add to Cart'}
                </ThemedText>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.chatBtn,
                  { borderColor: colors.primary },
                  pressed && styles.btnPressed
                ]}
                onPress={handleContactSeller}
              >
                {chatInitiated ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <ThemedText style={[styles.chatBtnText, { color: colors.primary }]}>
                    💬 Contact Seller
                  </ThemedText>
                )}
              </Pressable>
            </View>

          </View>
        </View>

      </ScrollView>
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
    gap: Spacing.three,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  header: {
    height: 50,
    justifyContent: 'center',
  },
  backBtnRow: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  backBtn: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 8,
  },
  detailLayout: {
    gap: Spacing.four,
  },
  rowLayout: {
    flexDirection: 'row',
  },
  imageSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfWidth: {
    flex: 1,
  },
  mainImage: {
    width: '100%',
    height: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  thumbnailsScroller: {
    marginTop: Spacing.two,
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  thumbnailBtn: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  detailsSection: {
    gap: Spacing.three,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qualityBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
  },
  section: {
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  descriptionText: {
    lineHeight: 22,
    opacity: 0.85,
  },
  specsTable: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    padding: Spacing.two,
  },
  specKey: {
    flex: 1,
    fontSize: 14,
  },
  specValue: {
    flex: 2,
    fontSize: 14,
  },
  warrantyCard: {
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    gap: Spacing.one,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    opacity: 0.8,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  cartBtn: {
    flex: 2,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  chatBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBtnText: {
    fontWeight: '700',
    fontSize: 16,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
