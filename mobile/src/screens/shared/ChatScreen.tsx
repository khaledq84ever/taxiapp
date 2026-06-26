import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { socketService } from '../../services/socket';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  isMine: boolean;
}

export default function ChatScreen({ route }: any) {
  const { tripId, otherName } = route.params as { tripId: string; otherName: string };
  const { user } = useSelector((s: RootState) => s.auth);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    socketService.on('server:chat-message', (data: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: data.text,
          senderId: data.senderId,
          timestamp: data.timestamp,
          isMine: data.senderId === user?.id,
        },
      ]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });

    return () => {
      socketService.off('server:chat-message');
    };
  }, [user?.id]);

  const sendMessage = () => {
    if (!text.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      senderId: user?.id ?? '',
      timestamp: new Date().toISOString(),
      isMine: true,
    };
    setMessages((prev) => [...prev, msg]);
    socketService.emit('chat:message', { tripId, text: text.trim() });
    setText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.bubble, item.isMine ? styles.myBubble : styles.theirBubble]}>
      <Text style={[styles.bubbleText, item.isMine && styles.myBubbleText]}>{item.text}</Text>
      <Text style={[styles.time, item.isMine && styles.myTime]}>{formatTime(item.timestamp)}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerName}>{otherName}</Text>
        <Text style={styles.headerSub}>In-trip chat</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>Say hi to {otherName}!</Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#aaa"
          value={text}
          onChangeText={setText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!text.trim()}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  header: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 52,
  },
  headerName: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#aaa', fontSize: 13, marginTop: 2 },

  messageList: { padding: 16, gap: 8, flexGrow: 1 },

  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 2,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFD700',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleText: { fontSize: 15, color: '#1a1a2e', lineHeight: 20 },
  myBubbleText: { color: '#1a1a2e' },
  time: { fontSize: 11, color: '#aaa', marginTop: 4, alignSelf: 'flex-end' },
  myTime: { color: '#7a6600' },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyChatText: { color: '#bbb', fontSize: 15 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1a1a2e',
    maxHeight: 100,
    backgroundColor: '#f8f8f8',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 18, color: '#1a1a2e' },
});
