import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { parseMarkdown } from '../lib/utils/markdown';
import { GEMINI_API_KEY as API_KEY, GEMINI_API_URL as API_URL } from '../lib/config/gemini';

interface Message {
  text: string;
  isUser: boolean;
}

const SYSTEM_PROMPT = "You are a helpful medical assistant specializing in dermatology. You can provide information about skin diseases, their symptoms, treatments, and general skin care advice. Always remind users to consult with healthcare professionals for medical advice. Keep responses concise and helpful.";

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const scrollViewRef = useRef<ScrollView>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setLoading(true);
    setIsTyping(true);
    
    // Auto scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${SYSTEM_PROMPT}\n\nUser: ${userMessage}` }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      console.log('Gemini API response:', data);

      if (data.error) {
        setMessages(prev => [
          ...prev,
          { text: `Error: ${data.error.message}`, isUser: false }
        ]);
      } else if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        const botResponse = data.candidates[0].content.parts[0].text;
        setMessages(prev => [...prev, { text: botResponse, isUser: false }]);
      } else {
        setMessages(prev => [
          ...prev,
          { text: 'Sorry, I encountered an unknown error. Please try again.', isUser: false }
        ]);
      }
      
      // Auto scroll to bottom after response
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('API key')) {
          errorMessage = 'API configuration error. Please contact support.';
        }
      }
      
      setMessages(prev => [...prev, { 
        text: errorMessage, 
        isUser: false 
      }]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation for send button
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
  }, []);

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setInputText(suggestion);
    setShowSuggestions(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#2d6a5e" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#14b8a6" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>AI Assistant</Text>
              <Text style={styles.subtitle}>Dermatology Expert</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.clearButton} onPress={clearChat}>
            <Ionicons name="trash-outline" size={20} color="#e11d48" />
          </TouchableOpacity>
        </Animated.View>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && showSuggestions && (
            <Animated.View 
              style={[
                styles.welcomeContainer,
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    })
                  }]
                }
              ]}
            >
              <View style={styles.welcomeIconContainer}>
                <Ionicons name="medical-outline" size={64} color="#14b8a6" />
              </View>
              <Text style={styles.welcomeTitle}>Welcome to AI Assistant</Text>
              <Text style={styles.welcomeMessage}>
                I'm your dermatology expert! I can help with skin conditions, 
                treatment advice, and general skincare questions.
              </Text>
              <View style={styles.suggestionChips}>
                {[
                  { text: "What causes acne?", icon: "flame-outline" },
                  { text: "How to treat dry skin?", icon: "water-outline" },
                  { text: "Sun protection tips", icon: "sunny-outline" },
                  { text: "Skin care routine", icon: "sparkles-outline" }
                ].map((suggestion, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.suggestionChip}
                    onPress={() => handleSuggestionPress(suggestion.text)}
                  >
                    <Ionicons name={suggestion.icon as any} size={16} color="#14b8a6" />
                    <Text style={styles.suggestionText}>{suggestion.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}
          
          {messages.map((message, index) => (
            <Animated.View
              key={index}
              style={[
                styles.messageBubble,
                message.isUser ? styles.userMessage : styles.botMessage,
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateX: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [message.isUser ? 50 : -50, 0],
                    })
                  }]
                }
              ]}
            >
              <View style={styles.messageHeader}>
                <View style={[
                  styles.messageAvatar,
                  message.isUser ? styles.userAvatar : styles.botAvatar
                ]}>
                  <Ionicons 
                    name={message.isUser ? "person" : "medical"} 
                    size={16} 
                    color={message.isUser ? "#fff" : "#14b8a6"} 
                  />
                </View>
                <View style={styles.messageInfo}>
                  <Text style={styles.messageSender}>
                    {message.isUser ? "You" : "AI Assistant"}
                  </Text>
                  <Text style={styles.messageTime}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <Text style={[
                styles.messageText,
                message.isUser && styles.userMessageText
              ]}>
                {message.isUser ? message.text : parseMarkdown(message.text, styles.messageText)}
              </Text>
            </Animated.View>
          ))}
          
          {loading && (
            <Animated.View 
              style={[
                styles.loadingContainer,
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })
                  }]
                }
              ]}
            >
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
              <Text style={styles.typingText}>AI is thinking...</Text>
            </Animated.View>
          )}
        </ScrollView>

        <Animated.View 
          style={[
            styles.inputContainer,
            {
              opacity: fadeAnim,
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                })
              }]
            }
          ]}
        >
          <View style={styles.inputWrapper}>
            <View style={styles.inputIconContainer}>
              <Ionicons name="chatbubble-outline" size={20} color="#14b8a6" />
            </View>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                setShowSuggestions(false);
              }}
              placeholder="Ask about skin conditions..."
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={500}
            />
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity 
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
                onPress={sendMessage}
                disabled={!inputText.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color={!inputText.trim() || loading ? "#9ca3af" : "#fff"} 
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
          <View style={styles.inputFooter}>
            <Text style={styles.characterCount}>{inputText.length}/500</Text>
            <TouchableOpacity 
              style={styles.voiceButton}
              onPress={() => {
                // Voice input functionality can be added here
                Alert.alert('Voice Input', 'Voice input feature coming soon!');
              }}
            >
              <Ionicons name="mic-outline" size={16} color="#14b8a6" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f9d5e5' 
  },
  container: {
    flex: 1,
    backgroundColor: '#f9d5e5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d5b56',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContentContainer: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  welcomeIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginBottom: 12,
  },
  welcomeMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  suggestionChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#14b8a6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    marginVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionText: {
    color: '#14b8a6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  userMessage: {
    backgroundColor: '#14b8a6',
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  userAvatar: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  botAvatar: {
    backgroundColor: '#f0fdfa',
  },
  messageInfo: {
    flex: 1,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  messageTime: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  messageText: {
    color: '#0d5b56',
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14b8a6',
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f9fafb',
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIconContainer: {
    marginRight: 12,
    paddingTop: 4,
  },
  input: {
    flex: 1,
    color: '#0d5b56',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 20,
    padding: 12,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
  },
  voiceButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
}); 