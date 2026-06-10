import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { dataService, ChatRoom, ChatMessage } from '../services/dataService';

export default function ChatScreen() {
  const { user } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

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

  // Load messages & setup real-time subscription
  useEffect(() => {
    if (!activeRoomId) return;

    async function loadMessages() {
      try {
        const list = await dataService.getChatMessages(activeRoomId as string);
        setActiveMessages(list);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    }
    loadMessages();

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
            // Fetch sender profile name
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', payload.new.sender_id)
              .single();

            const newMsg: ChatMessage = {
              id: payload.new.id,
              room_id: payload.new.room_id,
              sender_id: payload.new.sender_id,
              sender_name: profile?.name || 'User',
              message: payload.new.message,
              created_at: payload.new.created_at,
            };

            setActiveMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeRoomId]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeRoomId || !user) return;

    const text = inputText.trim();
    setInputText('');

    try {
      const sentMsg = await dataService.sendMessage(activeRoomId, text);
      setActiveMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      // Auto simulated support reply in Mock Mode only
      if (dataService.isMock() && user.role === 'client') {
        setSending(true);
        setTimeout(() => {
          const supportReply: ChatMessage = {
            id: 'msg-' + Math.random().toString(36).substring(2, 9),
            room_id: activeRoomId,
            sender_id: 'admin-support',
            sender_name: 'Revive Market Support',
            message: `Hello ${user.name}! Thanks for your message. A sales representative will review your request regarding the product details shortly. Let us know if you want pickup or delivery!`,
            created_at: new Date().toISOString(),
          };
          setActiveMessages((prev) => [...prev, supportReply]);
          setSending(false);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
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
                      <ThemedText style={[styles.msgText, isMe && { color: '#FFF' }]}>
                        {msg.message}
                      </ThemedText>
                    </View>
                  </View>
                );
              })}
              {sending && (
                <View style={styles.loadingReplyRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <ThemedText type="small" style={{ opacity: 0.6 }}>Seller is typing...</ThemedText>
                </View>
              )}
            </ScrollView>

            {/* Input Bar */}
            <View style={[styles.inputBar, { borderTopColor: colors.textSecondary + '20' }]}>
              <TextInput
                style={[styles.chatInput, { borderColor: colors.textSecondary + '40', color: colors.text, backgroundColor: colors.backgroundElement }]}
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

          </KeyboardAvoidingView>
        ) : (
          /* Chat Rooms List View */
          <View style={{ flex: 1 }}>
            <View style={styles.listHeader}>
              <ThemedText type="subtitle" style={styles.headerTitle}>Seller Conversations</ThemedText>
            </View>

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
});
