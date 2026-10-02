import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, TextInput, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getCurrentUser, getStoredUser } from '../lib/utils/auth';
import { db } from '../lib/config/firebase';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { parseMarkdown } from '../lib/utils/markdown';
import { GEMINI_API_KEY, GEMINI_API_URL } from '../lib/config/gemini';

interface PredictionHistory {
  id: string;
  timestamp: string;
  result: {
    prediction: string;
    confidence: number;
    all_probabilities: {
      [key: string]: number;
    };
  };
}

export default function History() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [predictionHistory, setPredictionHistory] = useState<PredictionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [monitorVisible, setMonitorVisible] = useState(false);
  const [selectedPredictionId, setSelectedPredictionId] = useState<string | null>(null);
  const [followupStatus, setFollowupStatus] = useState<'Better'|'Same'|'Worse'>('Better');
  const [followupNotes, setFollowupNotes] = useState('');
  const [followupSaving, setFollowupSaving] = useState(false);
  const [patientSymptoms, setPatientSymptoms] = useState('');
  const [patientMedications, setPatientMedications] = useState('');
  const [patientAllergies, setPatientAllergies] = useState('');
  const [followups, setFollowups] = useState<any[]>([]);
  const [followupsLoading, setFollowupsLoading] = useState(false);
  const [followupDetail, setFollowupDetail] = useState<any | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(0));
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false);
  const [aiAnalysisHistory, setAiAnalysisHistory] = useState<any[]>([]);
  const [aiAnalysisHistoryLoading, setAiAnalysisHistoryLoading] = useState(false);

  // Function to load AI analysis history
  const loadAIAnalysisHistory = async () => {
    if (!user?.uid) return;
    
    setAiAnalysisHistoryLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'aiAnalysis'),
        orderBy('analysisDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const analysisData: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        analysisData.push({ 
          id: doc.id, 
          ...data,
          analysisDate: data.analysisDate?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      setAiAnalysisHistory(analysisData);
    } catch (error) {
      console.error('Error loading AI analysis history:', error);
    } finally {
      setAiAnalysisHistoryLoading(false);
    }
  };

  // Function to save AI feedback to Firebase
  const saveAIFeedbackToFirebase = async (feedbackText: string, followupData: any, previousFollowups: any[]) => {
    if (!user?.uid) return;
    
    try {
      const aiAnalysisData = {
        feedbackText,
        followupData: {
          status: followupData.status,
          symptoms: followupData.symptoms,
          medications: followupData.medications,
          allergies: followupData.allergies,
          notes: followupData.notes,
          createdAt: followupData.createdAt
        },
        previousFollowupsCount: previousFollowups.length,
        analysisDate: serverTimestamp(),
        predictionId: selectedPredictionId,
        userId: user.uid
      };

      await addDoc(collection(db, 'users', user.uid, 'aiAnalysis'), aiAnalysisData);
      console.log('AI feedback saved to Firebase successfully');
      
      // Reload AI analysis history to show the new entry
      await loadAIAnalysisHistory();
    } catch (error) {
      console.error('Error saving AI feedback to Firebase:', error);
      // Don't throw error here to avoid breaking the main flow
    }
  };

  // Function to generate AI feedback for monitoring progress
  const generateAIFeedback = async (followupData: any, previousFollowups: any[]) => {
    setAiFeedbackLoading(true);
    try {
      const prompt = `You are a medical AI assistant analyzing patient monitoring progress. Based on the follow-up data, provide personalized feedback about the patient's condition.

Current Follow-up Data:
- Status: ${followupData.status}
- Symptoms: ${followupData.symptoms || 'Not specified'}
- Medications: ${followupData.medications || 'Not specified'}
- Allergies: ${followupData.allergies || 'Not specified'}
- Notes: ${followupData.notes}

Previous Follow-ups: ${previousFollowups.length > 0 ? previousFollowups.map(f => `Status: ${f.status}, Symptoms: ${f.symptoms || 'N/A'}, Date: ${f.createdAt}`).join('; ') : 'No previous follow-ups'}

Please provide a comprehensive analysis using markdown formatting:

## Progress Analysis
- Analysis of whether the condition is improving, staying the same, or getting worse
- Specific observations about symptom changes

## Recommendations
- Recommendations for continued care
- When to seek immediate medical attention

## Next Steps
- Encouragement and next steps
- Actionable advice

Format your response using markdown:
- Use **bold** for important points
- Use *italic* for emphasis
- Use ## for main sections
- Use ### for subsections
- Use - for bullet points
- Use > for important quotes or warnings

Keep the tone supportive and medical, easy to understand. Be specific about progress indicators and provide actionable advice.`;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        const feedbackText = data.candidates[0].content.parts[0].text;
        setAiFeedback(feedbackText);
        
        // Save AI feedback to Firebase
        await saveAIFeedbackToFirebase(feedbackText, followupData, previousFollowups);
      } else {
        throw new Error('Invalid response from AI service');
      }
    } catch (error) {
      console.error('Error generating AI feedback:', error);
      // Fallback feedback if Gemini API fails
      const statusText = followupData.status === 'Better' ? 'improving' : 
                        followupData.status === 'Worse' ? 'worsening' : 'stable';
      const fallbackFeedback = `Based on your follow-up, your condition appears to be ${statusText}. Please continue monitoring your symptoms and consult with a healthcare professional if you have any concerns.`;
      setAiFeedback(fallbackFeedback);
      
      // Save fallback feedback to Firebase as well
      await saveAIFeedbackToFirebase(fallbackFeedback, followupData, previousFollowups);
    } finally {
      setAiFeedbackLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.uid) {
      loadPredictionHistory();
      loadAIAnalysisHistory();
    }
  }, [user]);

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
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        const storedUser = await getStoredUser();
        if (!storedUser) {
          router.replace('/login');
          return;
        }
        setUser(storedUser);
      } else {
        setUser({
          email: currentUser.email,
          uid: currentUser.uid,
          lastLogin: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const loadPredictionHistory = async () => {
    if (!user?.uid) return;
    
    setHistoryLoading(true);
    try {
      // First, get all documents for the user (without sorting)
      const q = query(
        collection(db, 'analysisHistory'),
        where('uid', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const results: PredictionHistory[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          timestamp: data.timestamp || new Date().toISOString(),
          result: data.result || {}
        });
      });
      
      // Sort the results in JavaScript (client-side)
      results.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      
      setPredictionHistory(results);
    } catch (error) {
      console.error('Error loading prediction history:', error);
      Alert.alert('Error', 'Failed to load prediction history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const openMonitorModal = (predictionId: string) => {
    setSelectedPredictionId(predictionId);
    setMonitorVisible(true);
    loadFollowups(predictionId);
  };

  const saveFollowup = async () => {
    if (!user?.uid) {
      Alert.alert('Login required', 'Please login to add follow-ups.');
      return;
    }
    if (!selectedPredictionId) {
      Alert.alert('Info', 'No prediction selected.');
      return;
    }
    if (!followupNotes.trim()) {
      Alert.alert('Missing notes', 'Please provide follow-up notes.');
      return;
    }
    setFollowupSaving(true);
    try {
      // Use simpler path structure: users/{userId}/monitoring/{predictionId}/items
      const followupsCol = collection(db, 'users', user.uid, 'monitoring', selectedPredictionId, 'items');
      const newDoc = await addDoc(followupsCol, {
        status: followupStatus,
        notes: followupNotes,
        symptoms: patientSymptoms,
        medications: patientMedications,
        allergies: patientAllergies,
        createdAt: serverTimestamp(),
      });
      const newFollowup = { 
        id: newDoc.id, 
        status: followupStatus, 
        notes: followupNotes, 
        symptoms: patientSymptoms,
        medications: patientMedications,
        allergies: patientAllergies,
        createdAt: new Date().toISOString() 
      };
      
      setFollowups(prev => [newFollowup, ...prev]);
      
      // Generate AI feedback for the monitoring progress
      await generateAIFeedback(newFollowup, followups);
      
      setMonitorVisible(false);
      setFollowupNotes('');
      setPatientSymptoms('');
      setPatientMedications('');
      setPatientAllergies('');
      
      Alert.alert('Success', 'Follow-up saved successfully!');
    } catch (e: any) {
      console.error('Error saving follow-up:', e);
      Alert.alert('Error', e.message || 'Failed to save follow-up');
    } finally {
      setFollowupSaving(false);
    }
  };

  const loadFollowups = async (predictionId: string) => {
    if (!user?.uid) return;
    setFollowupsLoading(true);
    try {
      // Use simpler path structure: users/{userId}/monitoring/{predictionId}/items
      const q = query(collection(db, 'users', user.uid, 'monitoring', predictionId, 'items'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const items: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        items.push({ 
          id: d.id, 
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      setFollowups(items);
    } catch (e) {
      console.error('Error loading followups:', e);
      setFollowups([]);
    } finally {
      setFollowupsLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2d6a5e" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="time-outline" size={24} color="#14b8a6" />
          <Text style={styles.headerTitle}>History</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={loadPredictionHistory}
          disabled={historyLoading}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={historyLoading ? "#ccc" : "#2d6a5e"} 
          />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.content,
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
          {/* User Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={24} color="#14b8a6" />
              <Text style={styles.sectionTitle}>User Information</Text>
            </View>
            <View style={styles.userInfoCard}>
              <View style={styles.userInfoRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="mail-outline" size={20} color="#14b8a6" />
                </View>
                <View style={styles.userInfoContent}>
                  <Text style={styles.userInfoLabel}>Email</Text>
                  <Text style={styles.userInfoText}>{user?.email || 'No email available'}</Text>
                </View>
              </View>
              <View style={styles.userInfoRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="key-outline" size={20} color="#14b8a6" />
                </View>
                <View style={styles.userInfoContent}>
                  <Text style={styles.userInfoLabel}>User ID</Text>
                  <Text style={styles.userInfoText}>{user?.uid?.substring(0, 8) || 'N/A'}...</Text>
                </View>
              </View>
              <View style={styles.userInfoRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="time-outline" size={20} color="#14b8a6" />
                </View>
                <View style={styles.userInfoContent}>
                  <Text style={styles.userInfoLabel}>Last Login</Text>
                  <Text style={styles.userInfoText}>{user?.lastLogin ? formatDate(user.lastLogin) : 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Previous Predictions Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics-outline" size={24} color="#14b8a6" />
              <Text style={styles.sectionTitle}>Previous Predictions</Text>
            </View>
            {historyLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#14b8a6" />
                <Text style={styles.loadingText}>Loading predictions...</Text>
              </View>
            ) : predictionHistory.length > 0 ? (
              predictionHistory.map((prediction, index) => (
                <Animated.View 
                  key={prediction.id} 
                  style={[
                    styles.predictionCard,
                    {
                      opacity: fadeAnim,
                      transform: [{
                        translateX: slideAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50 * (index + 1), 0],
                        })
                      }]
                    }
                  ]}
                >
                  <View style={styles.predictionHeader}>
                    <View style={styles.dateContainer}>
                      <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                      <Text style={styles.predictionDate}>{formatDate(prediction.timestamp)}</Text>
                    </View>
                    <View style={styles.confidenceContainer}>
                      <Text style={styles.confidenceText}>
                        {prediction.result?.confidence ? 
                          `${(prediction.result.confidence * 100).toFixed(1)}%` : 
                          'N/A'
                        }
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.predictionContent}>
                    <Text style={styles.predictionText}>
                      {prediction.result?.prediction || 'Unknown prediction'}
                    </Text>
                    
                    {prediction.result?.all_probabilities && (
                      <View style={styles.probabilitiesContainer}>
                        <Text style={styles.probabilitiesTitle}>Top Probabilities:</Text>
                        {Object.entries(prediction.result.all_probabilities)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 3)
                          .map(([disease, prob]) => (
                            <View key={disease} style={styles.probabilityRow}>
                              <Text style={styles.diseaseName}>{disease}</Text>
                              <View style={styles.probabilityBar}>
                                <View 
                                  style={[
                                    styles.probabilityFill, 
                                    { width: `${prob * 100}%` }
                                  ]} 
                                />
                              </View>
                              <Text style={styles.probabilityValue}>
                                {(prob * 100).toFixed(1)}%
                              </Text>
                            </View>
                          ))
                        }
                      </View>
                    )}
                  </View>
                  
                  
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No predictions yet</Text>
                <Text style={styles.emptyStateSubtext}>Start analyzing your skin to see your history here</Text>
                <TouchableOpacity 
                  style={styles.startAnalyzingButton}
                  onPress={() => router.push('/analyze')}
                >
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                  <Text style={styles.startAnalyzingText}>Start Analyzing</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Health Guidelines Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#14b8a6" />
              <Text style={styles.sectionTitle}>Health & Safety Guidelines</Text>
            </View>
            <View style={styles.cautionsCard}>
              <View style={styles.cautionItem}>
                <View style={styles.cautionIconContainer}>
                  <Ionicons name="hand-left-outline" size={24} color="#14b8a6" />
                </View>
                <View style={styles.cautionContent}>
                  <Text style={styles.cautionTitle}>Clean Hands</Text>
                  <Text style={styles.cautionText}>Always wash your hands before touching your face or applying skincare products</Text>
                </View>
              </View>
              
              <View style={styles.cautionItem}>
                <View style={styles.cautionIconContainer}>
                  <Ionicons name="body-outline" size={24} color="#14b8a6" />
                </View>
                <View style={styles.cautionContent}>
                  <Text style={styles.cautionTitle}>Clean Body</Text>
                  <Text style={styles.cautionText}>Maintain good personal hygiene and keep your skin clean and dry</Text>
                </View>
              </View>
              
              <View style={styles.cautionItem}>
                <View style={styles.cautionIconContainer}>
                  <Ionicons name="sunny-outline" size={24} color="#14b8a6" />
                </View>
                <View style={styles.cautionContent}>
                  <Text style={styles.cautionTitle}>Sun Protection</Text>
                  <Text style={styles.cautionText}>Use sunscreen with SPF 30+ and avoid prolonged sun exposure</Text>
                </View>
              </View>
              
              <View style={styles.cautionItem}>
                <View style={styles.cautionIconContainer}>
                  <Ionicons name="water-outline" size={24} color="#14b8a6" />
                </View>
                <View style={styles.cautionContent}>
                  <Text style={styles.cautionTitle}>Hydration</Text>
                  <Text style={styles.cautionText}>Drink plenty of water and keep your skin well-moisturized</Text>
                </View>
              </View>
              
              <View style={styles.cautionItem}>
                <View style={styles.cautionIconContainer}>
                  <Ionicons name="medical-outline" size={24} color="#14b8a6" />
                </View>
                <View style={styles.cautionContent}>
                  <Text style={styles.cautionTitle}>Professional Care</Text>
                  <Text style={styles.cautionText}>Consult a dermatologist for persistent skin issues or concerns</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Monitor Progress Modal */}
      <Modal visible={monitorVisible} transparent animationType="fade" onRequestClose={() => setMonitorVisible(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ backgroundColor: '#fff6f0', padding: 16, borderRadius: 16, width: '90%', maxHeight: '90%', borderWidth: 1, borderColor: '#14b8a6' }}>
            <ScrollView style={{ maxHeight: '100%' }} showsVerticalScrollIndicator={false}>
              <Text style={styles.resultTitle}>Patient Monitoring</Text>
              
              <Text style={styles.diseaseLabel}>Symptoms Improvement</Text>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                {(['Better','Same','Worse'] as const).map(s => (
                  <TouchableOpacity key={s} style={[styles.chip, followupStatus === s && styles.chipActive]} onPress={() => setFollowupStatus(s)}>
                    <Text style={[styles.chipText, followupStatus === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.diseaseLabel}>Current Symptoms</Text>
              <TextInput
                style={styles.input}
                placeholder="Describe current symptoms..."
                placeholderTextColor="#9ca3af"
                value={patientSymptoms}
                onChangeText={setPatientSymptoms}
                multiline
              />
              
              <Text style={styles.diseaseLabel}>Current Medications</Text>
              <TextInput
                style={styles.input}
                placeholder="List current medications..."
                placeholderTextColor="#9ca3af"
                value={patientMedications}
                onChangeText={setPatientMedications}
                multiline
              />
              
              <Text style={styles.diseaseLabel}>Allergies</Text>
              <TextInput
                style={styles.input}
                placeholder="List any allergies..."
                placeholderTextColor="#9ca3af"
                value={patientAllergies}
                onChangeText={setPatientAllergies}
                multiline
              />
              
              <Text style={styles.diseaseLabel}>Follow-up Notes</Text>
              <TextInput
                style={styles.input}
                placeholder="Additional notes..."
                placeholderTextColor="#9ca3af"
                value={followupNotes}
                onChangeText={setFollowupNotes}
                multiline
              />
              
              {/* AI Feedback Section */}
              {aiFeedbackLoading && (
                <View style={styles.aiFeedbackLoading}>
                  <ActivityIndicator size="small" color="#14b8a6" />
                  <Text style={styles.aiFeedbackLoadingText}>Analyzing your progress...</Text>
                </View>
              )}

              {aiFeedback && (
                <View style={styles.aiFeedbackContainer}>
                  <View style={styles.aiFeedbackHeader}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#14b8a6" />
                    <Text style={styles.aiFeedbackTitle}>AI Progress Analysis</Text>
                  </View>
                  <ScrollView style={styles.aiFeedbackScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
                    <View style={{ paddingBottom: 8 }}>
                      {parseMarkdown(aiFeedback, styles.aiFeedbackText)}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* AI Analysis History */}
              {aiAnalysisHistory.length > 0 && (
                <View style={styles.aiAnalysisHistoryContainer}>
                  <View style={styles.aiAnalysisHistoryHeader}>
                    <Ionicons name="time-outline" size={20} color="#14b8a6" />
                    <Text style={styles.aiAnalysisHistoryTitle}>Previous AI Analyses</Text>
                  </View>
                  <ScrollView style={styles.aiAnalysisHistoryScroll} showsVerticalScrollIndicator={false}>
                    {aiAnalysisHistory.map((analysis, index) => (
                      <TouchableOpacity
                        key={analysis.id}
                        style={styles.aiAnalysisHistoryItem}
                        onPress={() => setAiFeedback(analysis.feedbackText)}
                      >
                        <View style={styles.aiAnalysisHistoryItemHeader}>
                          <Text style={styles.aiAnalysisHistoryItemDate}>
                            {new Date(analysis.analysisDate).toLocaleDateString()}
                          </Text>
                          <Text style={styles.aiAnalysisHistoryItemStatus}>
                            Status: {analysis.followupData.status}
                          </Text>
                        </View>
                        <Text style={styles.aiAnalysisHistoryItemPreview} numberOfLines={2}>
                          {analysis.feedbackText.substring(0, 100)}...
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity style={styles.analyzeButton} onPress={saveFollowup} disabled={followupSaving}>
                <Text style={styles.buttonText}>{followupSaving ? 'Saving...' : 'Save Follow-up'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backButton} onPress={() => {
                setMonitorVisible(false);
                setAiFeedback(null);
              }}>
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Follow-up Detail Modal */}
      <Modal visible={!!followupDetail} transparent animationType="fade" onRequestClose={() => setFollowupDetail(null)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16, width: '92%' }}>
            {followupDetail && (
              <>
                <Text style={{ color: '#0d5b56', fontWeight: '700', fontSize: 18, marginBottom: 12 }}>Follow-up Details</Text>
                <Text style={{ color: '#0d5b56', fontWeight: '600' }}>Status: {followupDetail.status}</Text>
                {followupDetail.symptoms ? (
                  <Text style={{ color: '#0d5b56', marginTop: 6 }}>Symptoms: {followupDetail.symptoms}</Text>
                ) : null}
                {followupDetail.medications ? (
                  <Text style={{ color: '#0d5b56', marginTop: 6 }}>Medications: {followupDetail.medications}</Text>
                ) : null}
                {followupDetail.allergies ? (
                  <Text style={{ color: '#0d5b56', marginTop: 6 }}>Allergies: {followupDetail.allergies}</Text>
                ) : null}
                {followupDetail.notes ? (
                  <Text style={{ color: '#0d5b56', marginTop: 6 }}>Notes: {followupDetail.notes}</Text>
                ) : null}
                <Text style={{ color: '#6b7280', marginTop: 8, fontSize: 12 }}>
                  Date: {followupDetail.createdAt ? new Date(followupDetail.createdAt).toLocaleString() : 'Unknown'}
                </Text>
              </>
            )}
            <TouchableOpacity style={styles.backButton} onPress={() => setFollowupDetail(null)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginLeft: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginLeft: 8,
  },
  userInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfoContent: {
    flex: 1,
  },
  userInfoLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  userInfoText: {
    fontSize: 16,
    color: '#0d5b56',
    fontWeight: '600',
  },
  predictionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  predictionDate: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginLeft: 6,
  },
  confidenceContainer: {
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  confidenceText: {
    fontSize: 12,
    color: '#14b8a6',
    fontWeight: '700',
  },
  predictionContent: {
    marginBottom: 16,
  },
  predictionText: {
    fontSize: 18,
    color: '#0d5b56',
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyStateText: {
    fontSize: 20,
    color: '#6b7280',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  startAnalyzingButton: {
    backgroundColor: '#14b8a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startAnalyzingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  cautionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cautionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cautionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cautionContent: {
    flex: 1,
  },
  cautionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginBottom: 6,
  },
  cautionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  loadingText: {
    fontSize: 16,
    color: '#14b8a6',
    marginTop: 12,
    fontWeight: '500',
  },
  probabilitiesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  probabilitiesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginBottom: 12,
  },
  probabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  diseaseName: {
    fontSize: 14,
    color: '#0d5b56',
    flex: 1,
    fontWeight: '500',
  },
  probabilityBar: {
    flex: 2,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  probabilityFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 3,
  },
  probabilityValue: {
    fontSize: 12,
    color: '#14b8a6',
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'right',
  },
  monitorButton: {
    backgroundColor: '#14b8a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monitorButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginBottom: 20,
    textAlign: 'center',
  },
  diseaseLabel: {
    fontSize: 18,
    color: '#0d5b56',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#14b8a6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    color: '#0d5b56',
    fontSize: 14,
    minHeight: 40,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#14b8a6',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#14b8a6',
  },
  chipText: {
    color: '#14b8a6',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  analyzeButton: {
    backgroundColor: '#14b8a6',
    padding: 16,
    borderRadius: 25,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#e11d48',
    padding: 16,
    borderRadius: 25,
    marginBottom: 16,
  },
  buttonText: {
    color: '#003333',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  aiFeedbackLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    marginTop: 12,
  },
  aiFeedbackLoadingText: {
    color: '#14b8a6',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  aiFeedbackContainer: {
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  aiFeedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
  },
  aiFeedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginLeft: 8,
  },
  aiFeedbackScroll: {
    maxHeight: 200,
  },
  aiFeedbackText: {
    color: '#0d5b56',
    fontSize: 14,
    lineHeight: 20,
  },
  aiAnalysisHistoryContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  aiAnalysisHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiAnalysisHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginLeft: 8,
  },
  aiAnalysisHistoryScroll: {
    maxHeight: 200,
  },
  aiAnalysisHistoryItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  aiAnalysisHistoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiAnalysisHistoryItemDate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  aiAnalysisHistoryItemStatus: {
    fontSize: 12,
    color: '#14b8a6',
    fontWeight: '600',
  },
  aiAnalysisHistoryItemPreview: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});
