import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Image, Dimensions, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { dataService, Product, CAMEROON_TOWNS, CATEGORIES } from '../services/dataService';
import ProductDetailView from '../components/shop/ProductDetailView';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { signOut } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [selectedTown, setSelectedTown] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showTownDropdown, setShowTownDropdown] = useState(false);

  // Selected Product (Detail view state)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Screen layout details
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);

  const screenWidth = dimensions.width;
  const isLargeScreen = screenWidth > 800;
  const feedWidth = isLargeScreen ? screenWidth - 260 : screenWidth;
  
  // Responsive Columns Count
  const getColumnCount = () => {
    if (feedWidth > 900) return 3;
    if (feedWidth > 600) return 2;
    return 1;
  };
  const columnCount = getColumnCount();
  const cardWidth = (feedWidth - Spacing.three * 2 - Spacing.three * (columnCount - 1)) / columnCount;

  // Load products based on filters
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const filters = {
          search,
          category: selectedCategory || undefined,
          quality: selectedQuality || undefined,
          location: selectedTown || undefined,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        };
        const list = await dataService.getProducts(filters);
        setProducts(list);
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    }

    // Debounce search input
    const delayDebounce = setTimeout(() => {
      load();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search, selectedCategory, selectedQuality, selectedTown, minPrice, maxPrice]);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory(null);
    setSelectedQuality(null);
    setSelectedTown(null);
    setMinPrice('');
    maxPrice && setMaxPrice('');
  };

  const getQualityStyle = (quality: string) => {
    switch (quality) {
      case 'A': return { bg: '#E2F3E4', text: '#2E7D32', label: 'Grade A (Like New)' };
      case 'B': return { bg: '#E3F2FD', text: '#1565C0', label: 'Grade B (Good)' };
      case 'C': return { bg: '#ECEFF1', text: '#455A64', label: 'Grade C (Fair)' };
      default: return { bg: '#F5F5F5', text: '#757575', label: 'Used' };
    }
  };

  if (selectedProductId) {
    return (
      <ProductDetailView 
        productId={selectedProductId} 
        onBack={() => setSelectedProductId(null)} 
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image
              source={require('@/assets/images/revive-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <ThemedText type="smallBold" style={styles.brandTitle}>REVIVE MARKET</ThemedText>
              <ThemedText type="small" style={{ opacity: 0.6 }}>Electronics Marketplace</ThemedText>
            </View>
          </View>
          <Pressable onPress={signOut} style={[styles.logoutBtn, { borderColor: colors.textSecondary }]}>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>Sign Out</ThemedText>
          </Pressable>
        </View>

        {/* Outer Layout containing sidebar filters on desktop */}
        <View style={[styles.layoutWrapper, isLargeScreen && styles.rowLayout]}>
          
          {/* Filters Sidebar (Desktop) or Accordion (Mobile) */}
          <View style={[styles.filtersContainer, isLargeScreen && styles.sidebarFilters, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.filterHeader}>
              <ThemedText type="smallBold" style={styles.filterSectionTitle}>Filters</ThemedText>
              <Pressable onPress={clearFilters}>
                <ThemedText type="small" style={{ color: colors.primary }}>Clear All</ThemedText>
              </Pressable>
            </View>

            {/* Keyword Search */}
            <View style={styles.filterSection}>
              <TextInput
                style={[styles.searchInput, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                placeholder="🔍 Search items..."
                placeholderTextColor={colors.textSecondary + '80'}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Cameroon Regions / Towns */}
            <View style={styles.filterSection}>
              <ThemedText type="smallBold" style={styles.filterLabel}>Region / Town (Cameroon)</ThemedText>
              <Pressable
                style={[styles.dropdownTrigger, { borderColor: colors.textSecondary + '40', backgroundColor: colors.background }]}
                onPress={() => setShowTownDropdown(!showTownDropdown)}
              >
                <ThemedText type="small">{selectedTown || 'All regions'}</ThemedText>
                <ThemedText type="small">{showTownDropdown ? '▲' : '▼'}</ThemedText>
              </Pressable>
              
              {showTownDropdown && (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.background, borderColor: colors.textSecondary + '40' }]}>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                    <Pressable
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedTown(null);
                        setShowTownDropdown(false);
                      }}
                    >
                      <ThemedText type="small">All Regions</ThemedText>
                    </Pressable>
                    {CAMEROON_TOWNS.map((town) => (
                      <Pressable
                        key={town}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedTown(town);
                          setShowTownDropdown(false);
                        }}
                      >
                        <ThemedText type="small">{town}</ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Quality Grades */}
            <View style={styles.filterSection}>
              <ThemedText type="smallBold" style={styles.filterLabel}>Device Quality Grade</ThemedText>
              <View style={styles.gradeRow}>
                {['A', 'B', 'C'].map((grade) => (
                  <Pressable
                    key={grade}
                    style={[
                      styles.gradeButton,
                      { backgroundColor: colors.background, borderColor: colors.textSecondary + '40' },
                      selectedQuality === grade && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setSelectedQuality(selectedQuality === grade ? null : grade)}
                  >
                    <ThemedText type="smallBold" style={[selectedQuality === grade && { color: '#FFF' }]}>
                      {grade}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <ThemedText type="smallBold" style={styles.filterLabel}>Price Range (FCFA)</ThemedText>
              <View style={styles.priceRangeRow}>
                <TextInput
                  style={[styles.priceInput, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                  placeholder="Min"
                  placeholderTextColor={colors.textSecondary + '60'}
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                />
                <ThemedText type="small">to</ThemedText>
                <TextInput
                  style={[styles.priceInput, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                  placeholder="Max"
                  placeholderTextColor={colors.textSecondary + '60'}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Main Feed Content Area */}
          <View style={styles.mainContent}>
            
            {/* Sell Banner */}
            <Pressable
              style={({pressed}) => [
                {
                  backgroundColor: colors.primary,
                  padding: Spacing.three,
                  borderRadius: 12,
                  marginBottom: Spacing.three,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                },
                pressed && { opacity: 0.9 }
              ]}
              onPress={() => router.push('/profile')}
            >
              <View>
                <ThemedText style={{ color: '#FFF', fontWeight: '800', fontSize: 16 }}>💰 Got a device to sell?</ThemedText>
                <ThemedText style={{ color: '#FFF', fontSize: 13, opacity: 0.9 }}>Get a cash quote instantly.</ThemedText>
              </View>
              <ThemedText style={{ color: '#FFF', fontSize: 20 }}>→</ThemedText>
            </Pressable>

            {/* Category horizontal scrolling bar */}
            <View style={styles.categoryScrollerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroller}>
                <Pressable
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: colors.backgroundElement },
                    selectedCategory === null && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setSelectedCategory(null)}
                >
                  <ThemedText type="smallBold" style={[selectedCategory === null && { color: '#FFF' }]}>
                    All Products
                  </ThemedText>
                </Pressable>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: colors.backgroundElement },
                      selectedCategory === cat && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  >
                    <ThemedText type="smallBold" style={[selectedCategory === cat && { color: '#FFF' }]}>
                      {cat}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Products Listing Grid */}
            {loading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : products.length === 0 ? (
              <View style={styles.emptyContainer}>
                <ThemedText style={{ opacity: 0.6 }}>No products match your filters.</ThemedText>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.productsGrid} showsVerticalScrollIndicator={false}>
                {products.map((item) => {
                  const qDetails = getQualityStyle(item.quality);
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.productCard,
                        { width: isLargeScreen ? cardWidth : '100%', backgroundColor: colors.backgroundElement }
                      ]}
                      onPress={() => setSelectedProductId(item.id)}
                    >
                      <Image source={{ uri: item.images[0] }} style={styles.cardImage} resizeMode="cover" />
                      
                      <View style={styles.cardDetails}>
                        <View style={styles.cardHeaderRow}>
                          <ThemedText type="small" style={{ opacity: 0.5, fontSize: 12 }}>{item.category}</ThemedText>
                          <View style={[styles.qualityBadge, { backgroundColor: qDetails.bg }]}>
                            <ThemedText type="smallBold" style={{ fontSize: 10, color: qDetails.text }}>{qDetails.label}</ThemedText>
                          </View>
                        </View>
                        
                        <ThemedText type="smallBold" style={styles.cardTitle} numberOfLines={1}>
                          {item.title}
                        </ThemedText>
                        
                        <ThemedText type="smallBold" style={[styles.cardPrice, { color: colors.primary }]}>
                          {item.price.toLocaleString()} FCFA
                        </ThemedText>
                        
                        <View style={styles.cardFooterRow}>
                          <ThemedText type="small" style={{ fontSize: 12, opacity: 0.7 }}>📍 {item.location}</ThemedText>
                          <ThemedText type="small" style={{ fontSize: 12, color: colors.success, fontWeight: '700' }}>
                            🛡️ {item.warranty_days}d Warranty
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logo: {
    width: 40,
    height: 40,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  logoutBtn: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    borderWidth: 1,
  },
  layoutWrapper: {
    flex: 1,
  },
  rowLayout: {
    flexDirection: 'row',
  },
  filtersContainer: {
    padding: Spacing.three,
    gap: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sidebarFilters: {
    width: 260,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    paddingVertical: Spacing.four,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  filterSection: {
    gap: Spacing.one,
  },
  filterLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
  },
  dropdownTrigger: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    zIndex: 999,
  },
  dropdownItem: {
    padding: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  gradeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  gradeButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  priceInput: {
    flex: 1,
    minWidth: 0,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 14,
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  categoryScrollerContainer: {
    height: 40,
  },
  categoryScroller: {
    flexDirection: 'row',
  },
  categoryBadge: {
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginRight: Spacing.two,
    height: 36,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    paddingBottom: 100,
  },
  productCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: Spacing.one,
  },
  cardImage: {
    width: '100%',
    height: 160,
  },
  cardDetails: {
    padding: Spacing.two,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qualityBadge: {
    paddingHorizontal: Spacing.one * 1.5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    paddingTop: 6,
  },
});
