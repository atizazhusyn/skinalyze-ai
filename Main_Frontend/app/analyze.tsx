import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, Animated, ScrollView, Linking, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from '../lib/config/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { parseMarkdown } from '../lib/utils/markdown';

interface PredictionResult {
  prediction: string;
  confidence: number;
  all_probabilities: {
    [key: string]: number;
  };
}

interface ExplainResult {
  predicted_class: string;
  confidence: number;
  heatmap_image: string; // base64 png
}

// Use your computer's local IP address here
const API_URL = 'http://192.168.100.18:5000';

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyAl3q3-1eM9Y7zCilpiOBokXcRD4TZadoA'; // Replace with your actual API key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export default function AnalyzeSkin() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [heatmapBase64, setHeatmapBase64] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [treatLoading, setTreatLoading] = useState(false);
  const [treatmentText, setTreatmentText] = useState<string | null>(null);
  const [currentPredictionId, setCurrentPredictionId] = useState<string | null>(null);
  const [slideAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);

  // Function to test server connectivity
  const testServerConnection = async () => {
    try {
      console.log('Testing server connection to:', API_URL);
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('Server is reachable');
        return true;
      } else {
        console.log('Server responded with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Server connection test failed:', error);
      return false;
    }
  };

  // Function to generate AI analysis using Gemini API
  const generateAIAnalysis = async (predictionData: PredictionResult) => {
    setAiAnalysisLoading(true);
    try {
      const topDisease = predictionData.prediction;
      const confidence = (predictionData.confidence * 100).toFixed(1);
      
      const prompt = `You are a medical AI assistant specializing in dermatology. Based on the skin analysis results, provide a comprehensive and personalized response.

Analysis Results:
- Predicted Condition: ${topDisease}
- Confidence Level: ${confidence}%

Please provide a detailed response using markdown formatting:

## Analysis Summary
- Clear explanation of what the ${confidence}% confidence means for ${topDisease}
- What this confidence level indicates about the diagnosis
- How reliable this prediction is

## Condition Overview
- Detailed description of ${topDisease}
- Common causes and risk factors
- Typical progression and timeline

## Symptoms & Characteristics
- Primary symptoms to expect
- Visual characteristics of the condition
- Associated symptoms (fever, pain, etc.)
- How symptoms may change over time

## Diagnostic Considerations
- What the AI analysis detected
- Additional tests that might be needed
- Differential diagnoses to consider
- When to seek second opinion

## Care Recommendations
- Immediate care steps
- General hygiene and skin care
- Lifestyle modifications
- Environmental factors to consider

## When to Seek Help
- Urgent warning signs
- When to see a dermatologist
- Emergency situations
- Follow-up care recommendations

Format your response using markdown:
- Use **bold** for important points
- Use *italic* for emphasis
- Use ## for main sections
- Use ### for subsections
- Use - for bullet points
- Use > for important warnings

Be specific, medical, and actionable. Provide detailed information that helps the user understand their condition and next steps.`;

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
        const analysisText = data.candidates[0].content.parts[0].text;
        setAiAnalysis(analysisText);
      } else {
        throw new Error('Invalid response from AI service');
      }
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      // Fallback analysis if Gemini API fails
      const topDisease = predictionData.prediction;
      const confidence = (predictionData.confidence * 100).toFixed(1);
      setAiAnalysis(`Based on the analysis, you have a ${confidence}% probability of ${topDisease}. This means the condition is likely present. Please consult with a healthcare professional for proper diagnosis and treatment.`);
    } finally {
      setAiAnalysisLoading(false);
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

    // Pulse animation for analyze button
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setPrediction(null);
      setHeatmapBase64(null);
      setAiAnalysis(null);
      setTreatmentText(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to use the camera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setPrediction(null);
      setHeatmapBase64(null);
      setAiAnalysis(null);
      setTreatmentText(null);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setLoading(true);
    console.log('Starting image analysis...');
    console.log('Selected image URI:', selectedImage);
    console.log('API URL:', API_URL);

    try {
      // Test server connectivity first
      const isServerReachable = await testServerConnection();
      if (!isServerReachable) {
        throw new Error(`Cannot connect to server at ${API_URL}. Please check if the backend server is running.`);
      }
      // Create form data with proper image handling
      const formData = new FormData();
      
      // For React Native, we need to handle the image differently
      const imageData = {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'photo.jpg',
      };
      
      console.log('Image data:', imageData);
      formData.append('image', imageData as any);

      console.log('Sending request to:', `${API_URL}/predict`);
      
      // Make the API request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Don't set Content-Type for FormData, let the browser set it
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      let data: any = null;
      try {
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('JSON parse error:', e);
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        const serverMsg = data && typeof data.error === 'string' ? data.error : `HTTP error! status: ${response.status}`;
        console.error('Server error:', serverMsg);
        throw new Error(serverMsg);
      }

      if (!data) {
        throw new Error('Invalid server response.');
      }

      console.log('Analysis result:', data);
      setPrediction(data);
      setHeatmapBase64(null);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      // Generate AI analysis using Gemini API
      await generateAIAnalysis(data);
      
      // Save to Firestore
      if (auth.currentUser) {
        const createdAtIso = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'analysisHistory'), {
          uid: auth.currentUser.uid,
          timestamp: createdAtIso,
          result: data,
        });
        const pid = docRef.id;
        setCurrentPredictionId(pid);
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'predictions', pid), {
          predictedClass: data.prediction,
          confidence: data.confidence,
          createdAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      let errorMessage = 'Failed to analyze image. ';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Cannot connect to server. Please check if the backend server is running on ' + API_URL;
        } else if (error.message.toLowerCase().includes('no skin detected')) {
          errorMessage = 'No skin detected. Please take a clear, well-lit, close-up photo of skin.';
        } else {
          errorMessage += error.message;
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const explainImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }
    setExplainLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);

      const response = await fetch(`${API_URL}/explain`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      const data: ExplainResult = await response.json();
      if (!response.ok) {
        const serverMsg = (data as any)?.error || `HTTP error! status: ${response.status}`;
        throw new Error(serverMsg);
      }
      setHeatmapBase64(`data:image/png;base64,${data.heatmap_image}`);
    } catch (error) {
      let errorMessage = 'Failed to generate explanation. ';
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage += 'Please check if the server is running and accessible.';
        } else if (error.message.toLowerCase().includes('no skin detected')) {
          errorMessage = 'No skin detected. Please take a clear, well-lit, close-up photo of skin.';
        } else {
          errorMessage += error.message;
        }
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setExplainLoading(false);
    }
  };

  const getTreatment = async () => {
    if (!prediction || !topDisease) {
      Alert.alert('Info', 'Please run analysis first.');
      return;
    }
    setTreatLoading(true);
    try {
      const prompt = `You are a medical AI assistant specializing in dermatology. Provide a comprehensive treatment plan for ${topDisease} using markdown formatting.

## Treatment Plan for ${topDisease}

### Immediate Care
- First aid and immediate steps
- Pain relief if needed
- Infection prevention

### Home Remedies
- Safe home treatments
- Natural remedies (if applicable)
- Lifestyle modifications

### Medical Treatment
- When to see a doctor immediately
- Prescription medications (if needed)
- Professional treatments

### Prevention
- How to prevent recurrence
- Protective measures
- Long-term care

### Warning Signs
- When to seek emergency care
- Red flags to watch for

Format your response using markdown:
- Use **bold** for important points
- Use *italic* for emphasis
- Use ## for main sections
- Use ### for subsections
- Use - for bullet points
- Use > for important warnings

Be specific, medical, and actionable. Include dosage information where appropriate.`;

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
        const treatmentText = data.candidates[0].content.parts[0].text;
        setTreatmentText(treatmentText);
        
        // Save to Firebase
        if (auth.currentUser && currentPredictionId) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'predictions', currentPredictionId), {
            predictedClass: topDisease,
            confidence: topConfidence,
            createdAt: serverTimestamp(),
          }, { merge: true });
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'predictions', currentPredictionId, 'treatment', 'latest'), {
            text: treatmentText,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        throw new Error('Invalid response from AI service');
      }
    } catch (e: any) {
      console.error('Error generating treatment:', e);
      // Fallback treatment
      const fallbackTreatment = `## Treatment Plan for ${topDisease}

### Immediate Care
- Keep the affected area clean and dry
- Avoid scratching or picking at the area
- Apply cool compresses if there's inflammation

### When to See a Doctor
- If symptoms worsen or don't improve
- If you develop fever or other systemic symptoms
- If the condition spreads to other areas

### General Precautions
- Maintain good hygiene
- Avoid known triggers
- Follow any prescribed treatment plan

> **Important:** This is general information. Please consult with a healthcare professional for proper diagnosis and treatment.`;
      setTreatmentText(fallbackTreatment);
    } finally {
      setTreatLoading(false);
    }
  };



  // Find the disease with the highest probability
  let topDisease: string | null = null;
  let topConfidence: number | null = null;
  if (prediction && prediction.all_probabilities) {
    const entries = Object.entries(prediction.all_probabilities);
    if (entries.length > 0) {
      const [disease, prob] = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max);
      topDisease = disease;
      topConfidence = prob;
    }
  }

  const handleLearnMore = () => {
    if (topDisease) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(topDisease + ' skin disease')}`;
      Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.mainContainer, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#2d6a5e" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Ionicons name="camera-outline" size={24} color="#14b8a6" />
              <Text style={styles.title}>Analyze Skin Condition</Text>
            </View>
            <View style={styles.placeholder} />
          </View>
          
          {/* Image Section */}
          <Animated.View 
            style={[
              styles.imageSection,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  })
                }]
              }
            ]}
          >
            <View style={styles.imageContainer}>
              {selectedImage ? (
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: selectedImage }} style={styles.image} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => {
                      setSelectedImage(null);
                      setPrediction(null);
                      setHeatmapBase64(null);
                      setTreatmentText(null);
                      setAiAnalysis(null);
                    }}
                  >
                    <Ionicons name="close-circle" size={24} color="#e11d48" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.placeholderContainer}>
                  <Ionicons name="camera-outline" size={48} color="#9ca3af" />
                  <Text style={styles.placeholderText}>No image selected</Text>
                  <Text style={styles.placeholderSubtext}>Choose an image to analyze</Text>
                </View>
              )}
            </View>

            {/* Image Selection Buttons */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={[styles.selectButton, styles.halfButton]} 
                onPress={pickImage}
              >
                <Ionicons name="images-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.selectButton, styles.halfButton]} 
                onPress={takePhoto}
              >
                <Ionicons name="camera-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Camera</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity 
                style={[styles.analyzeButton, !selectedImage && styles.disabledButton]} 
                onPress={analyzeImage}
                disabled={!selectedImage || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="search-outline" size={20} color="#fff" />
                )}
                <Text style={styles.buttonText}>
                  {loading ? 'Analyzing...' : 'Analyze Image'}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity 
              style={[styles.actionButton, (!topDisease) && styles.disabledButton]} 
              onPress={getTreatment}
              disabled={!topDisease || treatLoading}
            >
              {treatLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="medical-outline" size={20} color="#fff" />
              )}
              <Text style={styles.buttonText}>
                {treatLoading ? 'Fetching...' : 'Get Treatment'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, (!selectedImage || !prediction) && styles.disabledButton]} 
              onPress={explainImage}
              disabled={!selectedImage || !prediction || explainLoading}
            >
              {explainLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="eye-outline" size={20} color="#fff" />
              )}
              <Text style={styles.buttonText}>
                {explainLoading ? 'Generating...' : 'Explain (LRP)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Guidance Card */}
          <View style={styles.guidanceCard}>
            <Ionicons name="information-circle-outline" size={20} color="#14b8a6" />
            <Text style={styles.guidanceNote}>
              For best results, use a high-quality, well-lit, close-up photo of skin. Non-skin images will be rejected.
            </Text>
          </View>

          {/* Loading Indicators */}
          {loading && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#14b8a6" />
              <Text style={styles.loadingText}>Analyzing your image...</Text>
            </View>
          )}
          {explainLoading && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#14b8a6" />
              <Text style={styles.loadingText}>Generating explanation...</Text>
            </View>
          )}

          {prediction && topDisease && (
            <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
              <View style={styles.resultHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={styles.resultTitle}>Diagnosis Complete</Text>
              </View>
              
              <View style={styles.diagnosisContainer}>
                <View style={styles.diseaseRow}>
                  <Text style={styles.diseaseLabel}>Condition:</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{topDisease}</Text>
                  </View>
                </View>
                <View style={styles.diseaseRow}>
                  <Text style={styles.diseaseLabel}>Confidence:</Text>
                  <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceValue}>
                      {(topConfidence! * 100).toFixed(1)}%
                    </Text>
                    <View style={styles.confidenceBar}>
                      <View 
                        style={[
                          styles.confidenceFill, 
                          { width: `${topConfidence! * 100}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.learnMoreButton} 
                onPress={handleLearnMore}
              >
                <Ionicons name="open-outline" size={16} color="#fff" />
                <Text style={styles.learnMoreText}>
                  Learn more about {topDisease}
                </Text>
              </TouchableOpacity>
              
              <View style={styles.warningContainer}>
                <Ionicons name="warning-outline" size={16} color="#f59e0b" />
                <Text style={styles.infoNote}>
                  This is an AI prediction. Please consult a healthcare professional for a confirmed diagnosis.
                </Text>
              </View>
            </Animated.View>
          )}

          {treatmentText && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="medical-outline" size={24} color="#14b8a6" />
                <Text style={styles.resultTitle}>Treatment Recommendation</Text>
              </View>
              <ScrollView style={styles.treatmentScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                <View style={styles.treatmentContent}>
                  {parseMarkdown(treatmentText, styles.treatmentText)}
                </View>
              </ScrollView>
            </View>
          )}

          {/* AI Analysis Section */}
          {aiAnalysisLoading && (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#14b8a6" />
              <Text style={styles.loadingText}>Generating AI analysis...</Text>
            </View>
          )}

          {aiAnalysis && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#14b8a6" />
                <Text style={styles.resultTitle}>AI Analysis</Text>
              </View>
              <ScrollView style={styles.treatmentScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                <View style={styles.treatmentContent}>
                  {parseMarkdown(aiAnalysis, styles.treatmentText)}
                </View>
              </ScrollView>
            </View>
          )}


          {heatmapBase64 && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="eye-outline" size={24} color="#14b8a6" />
                <Text style={styles.resultTitle}>AI Analysis Heatmap</Text>
              </View>
              
              <View style={styles.heatmapContainer}>
                <Text style={styles.heatmapDescription}>
                  **Heatmap Analysis:** This visualization shows which areas of your skin the AI model identified as most relevant for the diagnosis of {topDisease || 'the detected condition'}. The colored overlay indicates the model's attention pattern.
                </Text>
                
                <View style={styles.heatmapImageContainer}>
                  <Image 
                    source={{ uri: heatmapBase64 }} 
                    style={styles.heatmapImage}
                    resizeMode="contain" 
                  />
                </View>
                
                <View style={styles.heatmapLegend}>
                  <Text style={styles.legendTitle}>Heatmap Legend:</Text>
                  
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#ff4444' }]} />
                    <Text style={styles.legendText}>
                      <Text style={styles.legendBold}>Red Areas:</Text> High confidence disease indicators
                    </Text>
                  </View>
                  
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#ffaa00' }]} />
                    <Text style={styles.legendText}>
                      <Text style={styles.legendBold}>Orange Areas:</Text> Moderate disease indicators
                    </Text>
                  </View>
                  
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#ffff00' }]} />
                    <Text style={styles.legendText}>
                      <Text style={styles.legendBold}>Yellow Areas:</Text> Low confidence indicators
                    </Text>
                  </View>
                  
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#00ff00' }]} />
                    <Text style={styles.legendText}>
                      <Text style={styles.legendBold}>Green Areas:</Text> Normal/healthy skin
                    </Text>
                  </View>
                  
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#0000ff' }]} />
                    <Text style={styles.legendText}>
                      <Text style={styles.legendBold}>Blue Areas:</Text> Background/unrelated areas
                    </Text>
                  </View>
                </View>
                
                <View style={styles.heatmapInfo}>
                  <Text style={styles.heatmapInfoText}>
                    <Text style={styles.heatmapInfoBold}>How to interpret:</Text> Focus on the red and orange areas - these are where the AI detected the strongest signs of {topDisease || 'the condition'}. The heatmap helps explain the AI's reasoning and can guide you on which areas to monitor.
                  </Text>
                </View>
              </View>
            </View>
          )}



          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
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
  mainContainer: {
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
  headerBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginLeft: 8,
  },
  placeholder: {
    width: 40,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imageContainer: {
    width: 320,
    height: 320,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#14b8a6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  placeholderContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 18,
    color: '#9ca3af',
    marginTop: 12,
    fontWeight: '500',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  selectButton: {
    backgroundColor: '#14b8a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 25,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  analyzeButton: {
    backgroundColor: '#14b8a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 25,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButton: {
    backgroundColor: '#14b8a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  guidanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  guidanceNote: {
    flex: 1,
    color: '#6b7280',
    fontSize: 14,
    marginLeft: 8,
    lineHeight: 20,
  },
  loadingCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  loadingText: {
    color: '#14b8a6',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 20,
    width: '100%',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginLeft: 8,
  },
  diagnosisContainer: {
    marginBottom: 20,
  },
  diseaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  diseaseLabel: {
    fontSize: 16,
    color: '#0d5b56',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  confidenceContainer: {
    alignItems: 'flex-end',
  },
  confidenceValue: {
    fontSize: 16,
    color: '#0d5b56',
    fontWeight: '600',
    marginBottom: 4,
  },
  confidenceBar: {
    width: 100,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 3,
  },
  learnMoreButton: {
    backgroundColor: '#14b8a6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  learnMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  infoNote: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    lineHeight: 16,
  },
  treatmentScroll: {
    maxHeight: 300,
  },
  treatmentContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  treatmentText: {
    color: '#0d5b56',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  heatmapContainer: {
    alignItems: 'center',
  },
  heatmapImageContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 8,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  heatmapImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  heatmapDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  heatmapLegend: {
    width: '100%',
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginBottom: 12,
    textAlign: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
    lineHeight: 16,
  },
  legendBold: {
    fontWeight: 'bold',
    color: '#0d5b56',
  },
  heatmapInfo: {
    marginTop: 16,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#14b8a6',
  },
  heatmapInfoText: {
    fontSize: 13,
    color: '#0d5b56',
    lineHeight: 18,
  },
  heatmapInfoBold: {
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#e11d48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 16,
    borderRadius: 25,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  halfButton: {
    width: '48%',
  },
}); 