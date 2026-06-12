import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { dataService, ChatRoom, ChatMessage, Appointment } from '../services/dataService';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

export default function ChatScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];
  const router = useRouter();

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Appointments, image and chatbot state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Bot conversation state: 'main_menu' | 'category' | 'idle'
  const [botMenuState, setBotMenuState] = useState<'idle' | 'main_menu' | 'category'>('idle');
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);

  // ─── Structured Bot Menu Definition ────────────────────────────────────────
  const BOT_MENU: Record<string, {
    icon: string;
    label: string;
    subQuestions: { label: string; questionText: string }[];
  }> = {
    sell: {
      icon: '💰',
      label: 'Sell a Device',
      subQuestions: [
        {
          label: 'Ask if they want to sell a device',
          questionText: 'Hi! Do you want to sell a device? If so, please specify the brand, model, and functional condition (e.g. works perfectly, has a cracked screen, etc.).'
        },
        {
          label: 'Ask for device photos',
          questionText: 'Could you please upload clear photos of your device (front, back, and sides) so we can assess its condition and give you a price quote?'
        },
        {
          label: 'Ask about accessories',
          questionText: 'Do you have the original box, charger, or any other accessories that came with the device? Having accessories can increase the payout value.'
        },
        {
          label: 'Ask for preferred payment mode',
          questionText: 'How would you prefer to receive payment once we verify the device? We support MTN MoMo, Orange Money, and Bank Transfer.'
        },
      ],
    },
    auction: {
      icon: '🔄',
      label: 'Auction / Swap',
      subQuestions: [
        {
          label: 'Ask if they want to swap/trade-in',
          questionText: 'Are you interested in trading/swapping your current device for another device on our platform? If so, please tell us which model you have and which one you want to swap it for.'
        },
        {
          label: 'Ask if they want to auction',
          questionText: 'Would you like to put your device up for auction? This allows other buyers to place bids on it over 24 to 72 hours, and the highest bidder wins.'
        },
        {
          label: 'Ask for target swap cash difference',
          questionText: 'What is your target cash difference for this swap? How much extra cash are you willing to add or expect to receive?'
        },
      ],
    },
    issues: {
      icon: '⚠️',
      label: 'Report an Issue',
      subQuestions: [
        {
          label: 'Ask what issue they are facing',
          questionText: 'Hello, what specific issue or problem are you experiencing with your device, order, or the application? Please describe it so we can help.'
        },
        {
          label: 'Ask for order ID',
          questionText: 'Could you please provide your Order ID so we can track it down in our system?'
        },
        {
          label: 'Ask for screenshots/photos of issue',
          questionText: 'Could you please upload a screenshot of the error or a photo showing the issue with the item you received?'
        },
      ],
    },
    payments: {
      icon: '💳',
      label: 'Payments & Fees',
      subQuestions: [
        {
          label: 'Ask what payment method was used',
          questionText: 'Which payment method did you use for the transaction? (MTN MoMo, Orange Money, or Bank Transfer?)'
        },
        {
          label: 'Ask for payment transaction ID',
          questionText: 'Could you please send the transaction ID or copy-paste the payment confirmation message you received?'
        },
        {
          label: 'Ask if they want a refund',
          questionText: 'Would you like us to cancel this order and issue a refund to your original payment method?'
        },
      ],
    },
    warranty: {
      icon: '🛡️',
      label: 'Warranty & Returns',
      subQuestions: [
        {
          label: 'Ask when device was received',
          questionText: 'When did you receive the device? This will help us confirm if it is still covered under our 30-day comprehensive warranty.'
        },
        {
          label: 'Ask to describe hardware defect',
          questionText: 'What functional or hardware defects are you experiencing? (e.g. charging port, battery capacity, speaker, display issues)'
        },
        {
          label: 'Ask about physical or liquid drops',
          questionText: 'Has the device experienced any accidental physical drops or exposure to liquid/moisture since you received it?'
        },
      ],
    },
    delivery: {
      icon: '🚚',
      label: 'Delivery & Locations',
      subQuestions: [
        {
          label: 'Ask for delivery city & address',
          questionText: 'Which city are you located in, and what is your preferred delivery address or nearest landmark?'
        },
        {
          label: 'Ask if they prefer showroom pickup',
          questionText: 'Would you prefer to pick up the device for free at one of our showrooms? We have pick-up centers in Douala (Akwa) and Yaoundé (Bastos).'
        },
        {
          label: 'Ask for preferred delivery time',
          questionText: 'What is your preferred date and time range for delivery?'
        },
      ],
    },
    appointment: {
      icon: '📅',
      label: 'Book an Appointment',
      subQuestions: [
        {
          label: 'Suggest booking showroom visit',
          questionText: 'Would you like to schedule an appointment to visit our showroom and inspect the device in person? Tap the 📅 calendar icon in the input bar below to select a convenient date and time.'
        },
        {
          label: 'Ask which showroom they will visit',
          questionText: 'Which showroom location would you like to visit? We have showrooms in Douala Akwa and Yaoundé Bastos.'
        },
        {
          label: 'Ask what time slot is preferred',
          questionText: 'What time of day works best for your visit? We have slots available at 09:00 AM, 11:00 AM, 02:00 PM, and 04:00 PM.'
        },
      ],
    },
  };

  // Greeting keywords that trigger the main menu
  const GREETING_TRIGGERS = ['hello', 'hi', 'hey', 'help', 'start', 'bonjour', 'salut', 'good morning', 'good afternoon', 'good evening', 'helo'];

  // Check if message is a greeting
  const isGreeting = (msg: string) =>
    GREETING_TRIGGERS.some((g) => msg.toLowerCase().trim().startsWith(g) || msg.toLowerCase().trim() === g);

  const scrollRef = useRef<ScrollView>(null);

  const TIME_SLOTS = ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'];

  const getNext14Days = () => {
    const list = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      if (nextDate.getDay() !== 0) { // Skip Sundays
        list.push(nextDate);
      }
    }
    return list;
  };

  // Load chat rooms
  useEffect(() => {
    async function loadRooms() {
      setLoading(true);
      try {
        const list = await dataService.getChatRooms();
        setRooms(list);
      } catch (err) {
        console.error('Failed to load chat rooms:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRooms();
  }, [activeRoomId]);

  // ─── Auto-suggest questionnaire categories to Admin based on client message ───
  const suggestBotCategoryForMessage = (messageText: string) => {
    if (isGreeting(messageText)) {
      setBotMenuState('main_menu');
      setCurrentCategory(null);
      return;
    }

    const lower = messageText.toLowerCase();
    let matchedCategory: string | null = null;
    if (lower.includes('sell') || lower.includes('buy') || lower.includes('device')) {
      matchedCategory = 'sell';
    } else if (lower.includes('auction') || lower.includes('swap') || lower.includes('bid')) {
      matchedCategory = 'auction';
    } else if (lower.includes('issue') || lower.includes('problem') || lower.includes('error') || lower.includes('wrong') || lower.includes('scam')) {
      matchedCategory = 'issues';
    } else if (lower.includes('pay') || lower.includes('fee') || lower.includes('momo') || lower.includes('orange')) {
      matchedCategory = 'payments';
    } else if (lower.includes('warranty') || lower.includes('return') || lower.includes('policy')) {
      matchedCategory = 'warranty';
    } else if (lower.includes('delivery') || lower.includes('shipping') || lower.includes('location') || lower.includes('address') || lower.includes('showroom')) {
      matchedCategory = 'delivery';
    } else if (lower.includes('appointment') || lower.includes('schedule') || lower.includes('calendar') || lower.includes('visit')) {
      matchedCategory = 'appointment';
    }

    if (matchedCategory) {
      setBotMenuState('category');
      setCurrentCategory(matchedCategory);
    }
  };

  // Load messages & setup real-time subscription
  useEffect(() => {
    if (!activeRoomId) return;

    async function loadMessages() {
      try {
        const list = await dataService.getChatMessages(activeRoomId as string);
        setActiveMessages(list);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

        // If user is Admin, auto-suggest chatbot categories based on the client's last message
        if (user?.role === 'admin' && list.length > 0) {
          const lastMsg = list[list.length - 1];
          if (lastMsg.sender_id !== user.id) {
            suggestBotCategoryForMessage(lastMsg.message || '');
          }
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }
    loadMessages();

    // Load appointments for this room
    async function loadAppointments() {
      try {
        const list = await dataService.getAppointments(activeRoomId as string);
        setAppointments(list);
      } catch (err) {
        console.error('Failed to load appointments:', err);
      }
    }
    loadAppointments();

    if (!dataService.isMock()) {
      const channel = supabase
        .channel(`room-${activeRoomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${activeRoomId}`,
          },
          async (payload) => {
            // Fetch sender profile name & role
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, role')
              .eq('id', payload.new.sender_id)
              .single();

            const newMsg: ChatMessage = {
              id: payload.new.id,
              room_id: payload.new.room_id,
              sender_id: payload.new.sender_id,
              sender_name: profile?.name || 'User',
              message: payload.new.message,
              image_url: payload.new.image_url,
              created_at: payload.new.created_at,
            };

            setActiveMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

            // If user is admin and the new incoming message is from the client, auto-suggest category
            if (user?.role === 'admin' && payload.new.sender_id !== user.id) {
              suggestBotCategoryForMessage(payload.new.message || '');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeRoomId, user]);

  // ─── Handle a bot chip tap (category or sub-question) ─────────────────────
  const handleBotAction = async (action: string, roomId: string) => {
    // "back" → reset to main menu
    if (action === '__back__') {
      setBotMenuState('main_menu');
      setCurrentCategory(null);
      return;
    }

    // Category selected → show sub-questions
    if (BOT_MENU[action]) {
      setCurrentCategory(action);
      setBotMenuState('category');
      return;
    }

    // Sub-question selected → send the questionText as a message from Admin
    if (currentCategory && BOT_MENU[currentCategory]) {
      const cat = BOT_MENU[currentCategory];
      const found = cat.subQuestions.find((q) => q.label === action);
      if (found) {
        setSending(true);
        try {
          const sentMsg = await dataService.sendMessage(roomId, found.questionText);
          setActiveMessages((prev) => {
            if (prev.some((m) => m.id === sentMsg.id)) return prev;
            return [...prev, sentMsg];
          });
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (err) {
          console.error('Failed to send question prompt:', err);
        } finally {
          setSending(false);
        }
      }
    }
  };

  // ─── Render the correct chip row depending on user role and state ──────────
  const renderBotChips = () => {
    if (!activeRoomId || !user) return null;

    // Clients only see the "📅 Book Appointment / Pickup" option
    if (user.role !== 'admin') {
      return (
        <View style={[styles.botChipsContainer, { backgroundColor: colors.background }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.botChipsScroll}>
            <Pressable
              onPress={() => setShowCalendarModal(true)}
              style={[styles.chipBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.primary + '30' }]}
            >
              <ThemedText type="small" style={{ color: colors.primary, fontSize: 12 }}>📅 Book Appointment / Pickup</ThemedText>
            </Pressable>
          </ScrollView>
        </View>
      );
    }

    // Admins see the chatbot menu
    if (botMenuState === 'main_menu') {
      return (
        <View style={[styles.botChipsContainer, { backgroundColor: colors.background }]}>
          <ThemedText type="small" style={[styles.botChipsLabel, { color: colors.textSecondary }]}>Revive Assistant — Choose a question category:</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.botChipsScroll}>
            {Object.entries(BOT_MENU).map(([key, cat]) => (
              <Pressable
                key={key}
                onPress={() => handleBotAction(key, activeRoomId)}
                style={[styles.chipBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.primary + '40' }]}
              >
                <ThemedText type="small" style={{ color: colors.primary, fontSize: 12 }}>
                  {cat.icon} {cat.label}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (botMenuState === 'category' && currentCategory && BOT_MENU[currentCategory]) {
      const cat = BOT_MENU[currentCategory];
      return (
        <View style={[styles.botChipsContainer, { backgroundColor: colors.background }]}>
          <ThemedText type="small" style={[styles.botChipsLabel, { color: colors.textSecondary }]}>
            {cat.icon} {cat.label} — Choose question to send:
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.botChipsScroll}>
            <Pressable
              onPress={() => handleBotAction('__back__', activeRoomId)}
              style={[styles.chipBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.textSecondary + '40' }]}
            >
              <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: 12 }}>⬅ Back to Menu</ThemedText>
            </Pressable>
            {cat.subQuestions.map((q) => (
              <Pressable
                key={q.label}
                onPress={() => handleBotAction(q.label, activeRoomId)}
                style={[styles.chipBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.primary + '40' }]}
              >
                <ThemedText type="small" style={{ color: colors.primary, fontSize: 12 }}>❓ {q.label}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      );
    }

    // idle — show main menu suggestion
    return (
      <View style={[styles.botChipsContainer, { backgroundColor: colors.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.botChipsScroll}>
          <Pressable
            onPress={() => handleBotAction('__back__', activeRoomId)}
            style={[styles.chipBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.primary + '30' }]}
          >
            <ThemedText type="small" style={{ color: colors.primary, fontSize: 12 }}>🤖 Open Assistant Menu</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setShowCalendarModal(true)}
            style={[styles.chipBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.primary + '30' }]}
          >
            <ThemedText type="small" style={{ color: colors.primary, fontSize: 12 }}>📅 Book Appointment</ThemedText>
          </Pressable>
        </ScrollView>
      </View>
    );
  };

  const handlePickImage = async () => {
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
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      alert('Failed to select image.');
    }
  };


  const handleConfirmAppointment = async () => {
    if (!selectedDate || !selectedTime || !activeRoomId) {
      alert('Please select both date and time slot.');
      return;
    }

    // Parse time slot hours
    const isPm = selectedTime.includes('PM');
    let hours = parseInt(selectedTime.split(':')[0]);
    if (isPm && hours !== 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;

    const appointmentDate = new Date(selectedDate);
    appointmentDate.setHours(hours, 0, 0, 0);

    try {
      setSending(true);
      const newApp = await dataService.createAppointment(activeRoomId, appointmentDate.toISOString());
      setAppointments((prev) => [...prev, newApp]);

      const formattedDate = appointmentDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const appointmentMsg = `📅 *Appointment Request:* Showroom visit/pickup scheduled for ${formattedDate} at ${selectedTime}.`;
      
      const sentMsg = await dataService.sendMessage(activeRoomId, appointmentMsg);
      setActiveMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      setShowCalendarModal(false);
      setSelectedDate(null);
      setSelectedTime(null);
      
      // Auto trigger bot affirmation response
      setTimeout(async () => {
        const botMsg = await dataService.sendMessage(activeRoomId, "🤖 **Showroom Appointment Confirmed!** We have registered your visit. Our sales team will keep the device ready for you. See you then!");
        setActiveMessages((prev) => [...prev, botMsg]);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }, 1000);

    } catch (err) {
      console.error('Failed to schedule appointment:', err);
      alert('Failed to schedule appointment.');
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !selectedImageUri) || !activeRoomId || !user) return;

    const text = inputText.trim();
    setInputText('');

    const imageUri = selectedImageUri;
    setSelectedImageUri(null);

    try {
      setSending(true);
      let uploadedUrl = undefined;
      if (imageUri) {
        uploadedUrl = await dataService.uploadImage('chat-attachments', imageUri);
      }

      const sentMsg = await dataService.sendMessage(activeRoomId, text, uploadedUrl);
      setActiveMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      // Auto simulated support reply in Mock Mode only (if user is client)
      if (dataService.isMock() && user.role === 'client' && text) {
        setTimeout(() => {
          const supportReply: ChatMessage = {
            id: 'msg-' + Math.random().toString(36).substring(2, 9),
            room_id: activeRoomId,
            sender_id: 'admin-support',
            sender_name: 'Revive Market Support',
            message: `Hello ${user.name}! Thanks for your message. A sales representative will review your request shortly. Let us know if you want pickup or delivery!`,
            created_at: new Date().toISOString(),
          };
          setActiveMessages((prev) => [...prev, supportReply]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {activeRoomId ? (
          /* Active Chat Thread View */
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            {/* Context Product Card Header */}
            <View style={[styles.activeHeader, { backgroundColor: colors.backgroundElement }]}>
              <Pressable onPress={() => setActiveRoomId(null)} style={styles.backBtn}>
                <ThemedText style={{ color: colors.primary, fontWeight: '700' }}>✕ Close</ThemedText>
              </Pressable>
              
              {activeRoom && (
                <View style={styles.activeProductRow}>
                  <Image source={{ uri: activeRoom.product_image }} style={styles.productThumbnail} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold" numberOfLines={1}>{activeRoom.product_title}</ThemedText>
                    <ThemedText type="small" style={{ color: colors.primary, fontWeight: '700' }}>
                      {activeRoom.product_price ? activeRoom.product_price.toLocaleString() : '0'} FCFA
                    </ThemedText>
                  </View>
                </View>
              )}
            </View>

            {/* Upcoming appointments on UI */}
            {appointments.length > 0 && (
              <View style={[styles.appointmentBanner, { backgroundColor: colors.primary + '10', borderBottomColor: colors.primary + '25', borderBottomWidth: 1 }]}>
                <ThemedText type="smallBold" style={{ color: colors.primary, fontSize: 13, marginBottom: 4 }}>
                  📅 Upcoming Showroom Appointments:
                </ThemedText>
                {appointments.map((app) => (
                  <View key={app.id} style={styles.appointmentBannerRow}>
                    <ThemedText type="small" style={{ fontWeight: '500' }}>
                      • {new Date(app.appointment_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(app.appointment_date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </ThemedText>
                    <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                      <ThemedText type="smallBold" style={{ fontSize: 9, color: colors.success }}>{app.status.toUpperCase()}</ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Messages Scroll View */}
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.messagesScroller}
              showsVerticalScrollIndicator={false}
            >
              {activeMessages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.msgBubbleWrapper,
                      isMe ? styles.myMsgWrapper : styles.theirMsgWrapper
                    ]}
                  >
                    <ThemedText type="small" style={[styles.senderLabel, isMe && { textAlign: 'right' }]}>
                      {isMe ? 'You' : msg.sender_name}
                    </ThemedText>
                    
                    <View
                      style={[
                        styles.msgBubble,
                        isMe 
                          ? { backgroundColor: colors.primary, borderBottomRightRadius: 2 } 
                          : { backgroundColor: colors.backgroundElement, borderBottomLeftRadius: 2 }
                      ]}
                    >
                      {msg.image_url && (
                        <Image source={{ uri: msg.image_url }} style={styles.bubbleImage} resizeMode="cover" />
                      )}
                      {msg.message ? (
                        <ThemedText style={[styles.msgText, isMe && { color: '#FFF' }]}>
                          {msg.message}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                );
              })}
              {sending && (
                <View style={styles.loadingReplyRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <ThemedText type="small" style={{ opacity: 0.6 }}>Assistant is typing...</ThemedText>
                </View>
              )}
            </ScrollView>

            {/* Attachment Preview Pane */}
            {selectedImageUri && (
              <View style={[styles.imagePreviewRow, { backgroundColor: colors.backgroundElement, borderTopColor: colors.textSecondary + '20' }]}>
                <Image source={{ uri: selectedImageUri }} style={styles.imagePreviewThumb} />
                <Pressable onPress={() => setSelectedImageUri(null)} style={styles.clearPreviewBtn}>
                  <ThemedText style={{ color: colors.primary, fontWeight: '700' }}>✕ Remove</ThemedText>
                </Pressable>
              </View>
            )}
            {/* Dynamic Bot Chip Row */}
            {renderBotChips()}
            {/* Input Bar */}
            <View style={[styles.inputBar, { borderTopColor: colors.textSecondary + '20', backgroundColor: colors.backgroundElement }]}>
              <Pressable onPress={handlePickImage} style={styles.iconActionBtn}>
                <ThemedText style={{ fontSize: 22 }}>📷</ThemedText>
              </Pressable>
              <Pressable onPress={() => setShowCalendarModal(true)} style={styles.iconActionBtn}>
                <ThemedText style={{ fontSize: 22 }}>📅</ThemedText>
              </Pressable>
              
              <TextInput
                style={[styles.chatInput, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.background }]}
                placeholder="Type your message..."
                placeholderTextColor={colors.textSecondary + '80'}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
              />
              <Pressable
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                onPress={handleSendMessage}
              >
                <ThemedText style={styles.sendBtnText}>Send</ThemedText>
              </Pressable>
            </View>

            {/* Appointment Calendar Modal */}
            <Modal
              visible={showCalendarModal}
              transparent
              animationType="slide"
              onRequestClose={() => setShowCalendarModal(false)}
            >
              <View style={styles.modalOverlay}>
                <ThemedView style={[styles.modalContent, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.modalHeader}>
                    <ThemedText type="subtitle">Schedule Appointment</ThemedText>
                    <Pressable onPress={() => setShowCalendarModal(false)}>
                      <ThemedText style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>Close</ThemedText>
                    </Pressable>
                  </View>

                  <ScrollView contentContainerStyle={styles.calendarForm} showsVerticalScrollIndicator={false}>
                    <ThemedText type="smallBold" style={styles.modalLabel}>1. Select showroom date</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesContainer}>
                      {getNext14Days().map((d, idx) => {
                        const isSelected = selectedDate?.toDateString() === d.toDateString();
                        return (
                          <Pressable
                            key={idx}
                            style={[
                              styles.dateOptionBtn,
                              { backgroundColor: colors.background, borderColor: colors.textSecondary + '20' },
                              isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                            onPress={() => setSelectedDate(d)}
                          >
                            <ThemedText type="small" style={[styles.dateTextDay, isSelected && { color: '#FFF' }]}>
                              {d.toLocaleDateString(undefined, { weekday: 'short' })}
                            </ThemedText>
                            <ThemedText type="smallBold" style={[styles.dateTextNum, isSelected && { color: '#FFF', fontSize: 18 }]}>
                              {d.getDate()}
                            </ThemedText>
                            <ThemedText type="small" style={[{ fontSize: 10, opacity: 0.7 }, isSelected && { color: '#FFF', opacity: 1 }]}>
                              {d.toLocaleDateString(undefined, { month: 'short' })}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    <ThemedText type="smallBold" style={[styles.modalLabel, { marginTop: Spacing.three }]}>2. Choose showroom time slot</ThemedText>
                    <View style={styles.timeGrid}>
                      {TIME_SLOTS.map((t) => {
                        const isSelected = selectedTime === t;
                        return (
                          <Pressable
                            key={t}
                            style={[
                              styles.timeOptionBtn,
                              { backgroundColor: colors.background, borderColor: colors.textSecondary + '20' },
                              isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                            ]}
                            onPress={() => setSelectedTime(t)}
                          >
                            <ThemedText type="smallBold" style={[isSelected && { color: '#FFF' }]}>
                              {t}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.confirmAppBtn,
                        { backgroundColor: colors.primary },
                        pressed && styles.btnPressed
                      ]}
                      onPress={handleConfirmAppointment}
                    >
                      <ThemedText style={styles.confirmAppText}>
                        Confirm Visit & Notify Seller
                      </ThemedText>
                    </Pressable>
                  </ScrollView>
                </ThemedView>
              </View>
            </Modal>

          </KeyboardAvoidingView>
        ) : (
          /* Chat Rooms List View */
          <View style={{ flex: 1 }}>
            <View style={styles.listHeader}>
              <ThemedText type="subtitle" style={styles.headerTitle}>Seller Conversations</ThemedText>
            </View>

            {user?.role === 'client' && (
              <Pressable
                style={({pressed}) => [
                  { backgroundColor: colors.primary, padding: Spacing.three, marginHorizontal: Spacing.three, marginTop: Spacing.three, borderRadius: 12, alignItems: 'center' },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={() => router.push('/profile')}
              >
                <ThemedText style={{ color: '#FFF', fontWeight: '800' }}>💰 Sell Your Device</ThemedText>
              </Pressable>
            )}

            <ScrollView contentContainerStyle={styles.roomsList} showsVerticalScrollIndicator={false}>
              {rooms.map((room) => (
                <Pressable
                  key={room.id}
                  style={[styles.roomCard, { backgroundColor: colors.backgroundElement }]}
                  onPress={() => setActiveRoomId(room.id)}
                >
                  <Image source={{ uri: room.product_image }} style={styles.roomImage} resizeMode="cover" />
                  
                  <View style={styles.roomMeta}>
                    <ThemedText type="smallBold">{room.product_title}</ThemedText>
                    <ThemedText type="small" style={{ opacity: 0.5 }}>Buyer: {room.buyer_name}</ThemedText>
                    {room.last_message && (
                      <ThemedText type="small" numberOfLines={1} style={{ opacity: 0.7, marginTop: 4 }}>
                        {room.last_message}
                      </ThemedText>
                    )}
                  </View>

                  <View style={styles.rightInfo}>
                    <ThemedText style={styles.arrowIcon}>→</ThemedText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

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
  keyboardContainer: {
    flex: 1,
  },
  listHeader: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  roomsList: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  roomImage: {
    width: 54,
    height: 54,
    borderRadius: 8,
  },
  roomMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  rightInfo: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  arrowIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: Spacing.three,
  },
  backBtn: {
    paddingVertical: Spacing.one,
  },
  activeProductRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  productThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 6,
  },
  messagesScroller: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  msgBubbleWrapper: {
    maxWidth: '75%',
    gap: 2,
  },
  myMsgWrapper: {
    alignSelf: 'flex-end',
  },
  theirMsgWrapper: {
    alignSelf: 'flex-start',
  },
  senderLabel: {
    fontSize: 11,
    opacity: 0.5,
  },
  msgBubble: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 6,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
  },
  loadingReplyRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: Spacing.one,
    paddingLeft: Spacing.one,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    padding: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: 1,
  },
  imagePreviewThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  clearPreviewBtn: {
    paddingHorizontal: Spacing.two,
  },
  botChipsContainer: {
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  botChipsLabel: {
    paddingHorizontal: Spacing.three,
    marginBottom: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  botChipsScroll: {
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
  },
  chipBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconActionBtn: {
    padding: Spacing.one,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appointmentBanner: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  appointmentBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inputBar: {
    flexDirection: 'row',
    padding: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: Spacing.four,
    fontSize: 15,
  },
  sendBtn: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
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
    marginBottom: Spacing.three,
  },
  calendarForm: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  modalLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  datesContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  dateOptionBtn: {
    width: 65,
    height: 75,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  dateTextDay: {
    fontSize: 11,
    opacity: 0.7,
  },
  dateTextNum: {
    fontSize: 16,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginVertical: Spacing.one,
  },
  timeOptionBtn: {
    width: '47%',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmAppBtn: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  confirmAppText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
