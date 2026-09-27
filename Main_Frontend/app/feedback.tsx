import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { auth, db } from '../lib/config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

export default function FeedbackScreen() {
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [feature, setFeature] = useState('General');
  const [submitting, setSubmitting] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [successAnim] = useState(new Animated.Value(0));
  const [isSuccess, setIsSuccess] = useState(false);

  const submitFeedback = async () => {
    if (!auth.currentUser) {
      Alert.alert('Login required', 'Please login to submit feedback.');
      return;
    }
    if (rating <= 0) {
      Alert.alert('Missing rating', 'Please select a star rating.');
      return;
    }
    setSubmitting(true);
    try {
      const userEmail = auth.currentUser.email || 'Anonymous';
      const uid = auth.currentUser.uid;

      // Use a global 'feedback' collection so admins can see all entries
      await addDoc(collection(db, 'feedback'), {
        uid,
        email: userEmail,
        rating,
        message,
        feature,
        timestamp: serverTimestamp(),
      });

      // Success animation
      setIsSuccess(true);
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(successAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        router.back();
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#2d6a5e" />
            </TouchableOpacity>
            <Text style={styles.title}>Feedback</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Rating Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rate Your Experience</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setRating(n)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={n <= rating ? "star" : "star-outline"}
                    size={32}
                    color={n <= rating ? "#fbbf24" : "#d1d5db"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingText}>
              {rating === 0 ? 'Tap a star to rate' :
                rating === 1 ? 'Poor' :
                  rating === 2 ? 'Fair' :
                    rating === 3 ? 'Good' :
                      rating === 4 ? 'Very Good' : 'Excellent'}
            </Text>
          </View>

          {/* Feature Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What would you like to feedback on?</Text>
            <View style={styles.featureGrid}>
              {[
                { name: 'Prediction', icon: 'analytics-outline' },
                { name: 'LRP', icon: 'eye-outline' },
                { name: 'Treatment', icon: 'medical-outline' },
                { name: 'Monitoring', icon: 'trending-up-outline' },
                { name: 'General', icon: 'chatbubble-outline' }
              ].map(f => (
                <TouchableOpacity
                  key={f.name}
                  style={[styles.featureChip, feature === f.name && styles.featureChipActive]}
                  onPress={() => setFeature(f.name)}
                >
                  <Ionicons
                    name={f.icon as any}
                    size={20}
                    color={feature === f.name ? '#fff' : '#14b8a6'}
                  />
                  <Text style={[styles.featureChipText, feature === f.name && styles.featureChipTextActive]}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Feedback Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Feedback</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Share your thoughts, suggestions, or report any issues..."
                placeholderTextColor="#9ca3af"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>{message.length}/500</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={submitFeedback}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Success Overlay */}
        <Animated.View
          pointerEvents={isSuccess ? 'auto' : 'none'}
          style={[
            styles.successOverlay,
            {
              opacity: successAnim,
              transform: [{
                scale: successAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                })
              }]
            }
          ]}
        >
          <View style={styles.successContent}>
            <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            <Text style={styles.successTitle}>Thank You!</Text>
            <Text style={styles.successMessage}>Your feedback has been submitted successfully.</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9d5e5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d5b56',
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#14b8a6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureChipActive: {
    backgroundColor: '#14b8a6',
  },
  featureChipText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  featureChipTextActive: {
    color: '#fff',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#14b8a6',
    fontSize: 16,
    color: '#0d5b56',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  characterCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 12,
    color: '#9ca3af',
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: '#14b8a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});


