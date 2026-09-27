import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const diseases = [
  { 
    name: 'Mpox', 
    desc: 'Mpox (Monkeypox) is a viral disease causing fever, rash, and swollen lymph nodes. It can be transmitted from animals to humans.',
    icon: 'bug-outline',
    symptoms: ['Fever', 'Rash', 'Swollen lymph nodes', 'Headache'],
    severity: 'Moderate'
  },
  { 
    name: 'Chickenpox', 
    desc: 'Chickenpox is a highly contagious viral infection causing an itchy, blister-like rash on the skin.',
    icon: 'flame-outline',
    symptoms: ['Itchy rash', 'Blisters', 'Fever', 'Fatigue'],
    severity: 'Mild to Moderate'
  },
  { 
    name: 'Measles', 
    desc: 'Measles is a highly contagious virus that causes fever, cough, runny nose, and a characteristic rash.',
    icon: 'medical-outline',
    symptoms: ['High fever', 'Cough', 'Runny nose', 'Rash'],
    severity: 'Severe'
  },
  { 
    name: 'Cowpox', 
    desc: 'Cowpox is a rare viral disease transmitted from cattle to humans, causing mild skin lesions.',
    icon: 'paw-outline',
    symptoms: ['Skin lesions', 'Mild fever', 'Swelling'],
    severity: 'Mild'
  },
  { 
    name: 'HFMD', 
    desc: 'Hand, Foot, and Mouth Disease (HFMD) is a common viral illness in children, causing sores in the mouth and a rash on the hands and feet.',
    icon: 'hand-left-outline',
    symptoms: ['Mouth sores', 'Hand/foot rash', 'Fever', 'Sore throat'],
    severity: 'Mild to Moderate'
  },
];

export default function AboutDiseases() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(0));
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

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

  const handleLearnMore = (disease: string) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(disease + ' skin disease')}`;
    Linking.openURL(url);
  };

  const toggleExpanded = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Mild': return '#10b981';
      case 'Moderate': return '#f59e0b';
      case 'Severe': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#2d6a5e" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="medical-outline" size={24} color="#14b8a6" />
          <Text style={styles.headerTitle}>About Skin Diseases</Text>
        </View>
        <View style={styles.placeholder} />
      </Animated.View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Introduction Section */}
        <Animated.View 
          style={[
            styles.introSection,
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
          <View style={styles.introCard}>
            <Ionicons name="information-circle-outline" size={32} color="#14b8a6" />
            <Text style={styles.introTitle}>Understanding Skin Diseases</Text>
            <Text style={styles.introText}>
              Learn about common skin diseases, their symptoms, and severity levels. 
              This information helps you understand what our AI can detect and analyze.
            </Text>
          </View>
        </Animated.View>

        {/* Disease Cards */}
        {diseases.map((disease, idx) => (
          <Animated.View
            key={idx}
            style={[
              styles.diseaseCard,
              {
                opacity: fadeAnim,
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50 * (idx + 1), 0],
                  })
                }]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.cardHeader}
              onPress={() => toggleExpanded(idx)}
              activeOpacity={0.7}
            >
              <View style={styles.iconRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name={disease.icon as any} size={24} color="#fff" />
                </View>
                <View style={styles.diseaseInfo}>
                  <Text style={styles.diseaseName}>{disease.name}</Text>
                  <View style={styles.severityContainer}>
                    <View style={[styles.severityDot, { backgroundColor: getSeverityColor(disease.severity) }]} />
                    <Text style={[styles.severityText, { color: getSeverityColor(disease.severity) }]}>
                      {disease.severity}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons 
                name={expandedCard === idx ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#6b7280" 
              />
            </TouchableOpacity>

            <Text style={styles.diseaseDesc}>{disease.desc}</Text>

            {expandedCard === idx && (
              <Animated.View style={styles.expandedContent}>
                <View style={styles.symptomsSection}>
                  <Text style={styles.symptomsTitle}>Common Symptoms:</Text>
                  <View style={styles.symptomsList}>
                    {disease.symptoms.map((symptom, symptomIdx) => (
                      <View key={symptomIdx} style={styles.symptomItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                        <Text style={styles.symptomText}>{symptom}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.learnMoreButton}
                    onPress={() => handleLearnMore(disease.name)}
                  >
                    <Ionicons name="open-outline" size={16} color="#fff" />
                    <Text style={styles.learnMoreText}>Learn More</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        ))}

        {/* Footer Information */}
        <Animated.View 
          style={[
            styles.footerSection,
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
          <View style={styles.footerCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#14b8a6" />
            <Text style={styles.footerTitle}>Important Notice</Text>
            <Text style={styles.footerText}>
              This information is for educational purposes only. Always consult with a healthcare professional 
              for proper diagnosis and treatment of any skin condition.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f9d5e5' 
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginLeft: 8,
  },
  placeholder: {
    width: 40,
  },
  container: { 
    flex: 1, 
    backgroundColor: '#f9d5e5' 
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  introSection: {
    marginBottom: 24,
  },
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginTop: 12,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  diseaseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  diseaseInfo: {
    flex: 1,
  },
  diseaseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginBottom: 4,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  diseaseDesc: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  expandedContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  symptomsSection: {
    marginBottom: 16,
  },
  symptomsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginBottom: 12,
  },
  symptomsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  symptomText: {
    fontSize: 12,
    color: '#0d5b56',
    marginLeft: 6,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  learnMoreButton: {
    backgroundColor: '#14b8a6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
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
    marginLeft: 6,
  },
  footerSection: {
    marginTop: 24,
  },
  footerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0d5b56',
    marginTop: 12,
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
}); 