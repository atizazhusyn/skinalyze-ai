
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, TextInput, Modal, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { auth, db } from '../lib/config/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { parseMarkdown } from '../lib/utils/markdown';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// --- Types ---
interface Prediction {
  id: string;
  timestamp: string;
  result: {
    prediction: string;
    confidence: number;
    all_probabilities?: { [key: string]: number };
  };
  imageUrl?: string;
}

interface FollowUp {
  id: string;
  status: 'Better' | 'Same' | 'Worse';
  symptoms: string;
  medications: string;
  allergies: string;
  notes: string;
  createdAt: string;
}

// --- Configuration ---
// Ideally invoke from env, but reusing existing key for consistency based on history.tsx
const GEMINI_API_KEY = 'AIzaSyAl3q3-1eM9Y7zCilpiOBokXcRD4TZadoA';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export default function PatientMonitoring() {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [loading, setLoading] = useState(false);

  // Prediction List State
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  // Detail View State
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [followupsLoading, setFollowupsLoading] = useState(false);

  // Add Follow-up State
  const [modalVisible, setModalVisible] = useState(false);
  const [status, setStatus] = useState<'Better' | 'Same' | 'Worse'>('Better');
  const [symptoms, setSymptoms] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Analysis & Report
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

  // --- Fetching Logic ---
  const fetchPredictions = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'analysisHistory'), where('uid', '==', auth.currentUser.uid));
      const snapshot = await getDocs(q);
      const results: Prediction[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          timestamp: data.timestamp || new Date().toISOString(),
          result: data.result || {},
          imageUrl: data.imageUrl
        });
      });
      // Sort client-side
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPredictions(results);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', 'Failed to load predictions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowups = async (predictionId: string) => {
    if (!auth.currentUser) return;
    setFollowupsLoading(true);
    try {
      const q = query(
        collection(db, 'users', auth.currentUser.uid, 'monitoring', predictionId, 'items'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const items: FollowUp[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        items.push({
          id: doc.id,
          status: data.status,
          symptoms: data.symptoms,
          medications: data.medications,
          allergies: data.allergies,
          notes: data.notes,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      setFollowups(items);
    } catch (e: any) {
      console.error(e);
      // Silent fail or alert
    } finally {
      setFollowupsLoading(false);
    }
  };

  const handleSelectPrediction = (prediction: Prediction) => {
    setSelectedPrediction(prediction);
    setAnalysisResult(null); // Reset analysis
    setViewMode('detail');
    fetchFollowups(prediction.id);
  };

  // --- Actions ---
  const saveFollowup = async () => {
    if (!auth.currentUser || !selectedPrediction) return;
    if (!notes.trim() && !symptoms.trim()) {
      Alert.alert('Required', 'Please enter symptoms or notes.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'monitoring', selectedPrediction.id, 'items'), {
        status,
        symptoms,
        medications,
        allergies,
        notes,
        createdAt: serverTimestamp()
      });
      setModalVisible(false);
      resetForm();
      fetchFollowups(selectedPrediction.id); // Refresh
      Alert.alert('Success', 'Follow-up recorded.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStatus('Better');
    setSymptoms('');
    setMedications('');
    setAllergies('');
    setNotes('');
  };

  // --- Gemini & Report ---
  const generateAnalysis = async () => {
    if (followups.length === 0) {
      Alert.alert('No Data', 'Add some follow-up records first.');
      return;
    }
    setAnalyzing(true);
    try {
      const historyText = followups.map(f =>
        `- Date: ${new Date(f.createdAt).toLocaleDateString()}, Status: ${f.status}, Symptoms: ${f.symptoms}, Notes: ${f.notes}`
      ).join('\n');

      const prompt = `You are a medical assistant AI. Analyze the progress of a patient with a skin condition predicted as "${selectedPrediction?.result?.prediction}". 
        
        Here is the follow-up history (newest first):
        ${historyText}

        Please provide a concise progress report. 
        IMPORTANT: Return ONLY the report content. Do not include introductory phrases like "Here is the report" or "Based on the data". Start directly with the first section.
        
        Required Sections:
        1. **Overall Trend**: (Improving/Worsening/Stable)
        2. **Key Symptom Changes**: (Specific observations)
        3. **Recommendations for Next Steps**: (Actionable advice)

        Format as clear Markdown.`;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        setAnalysisResult(data.candidates[0].content.parts[0].text);
      } else {
        throw new Error('No analysis generated.');
      }
    } catch (e: any) {
      Alert.alert('AI Error', e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const generatePDF = async () => {
    if (!selectedPrediction) return;
    try {
      // Convert basic markdown to HTML for PDF
      const formatMarkdownToHtml = (text: string) => {
        return text
          .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
          .replace(/\*(.*?)\*/g, '<i>$1</i>')     // Italic
          .replace(/\n\n/g, '<br><br>')           // Paragraphs
          .replace(/\n/g, '<br>');                // Line breaks
      };

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, sans-serif; padding: 20px; }
              h1 { color: #0d5b56; }
              h2 { color: #14b8a6; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
              .card { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
              .label { font-weight: bold; color: #555; }
              .analysis-box { background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 8px; }
            </style>
          </head>
          <body>
            <h1>Patient Monitoring Report</h1>
            <p><span class="label">Date:</span> ${new Date().toLocaleDateString()}</p>
            <p><span class="label">Condition:</span> ${selectedPrediction.result.prediction} (Confidence: ${(selectedPrediction.result.confidence * 100).toFixed(1)}%)</p>
            
            ${analysisResult ? `<h2>AI Progress Analysis</h2><div class="analysis-box">${formatMarkdownToHtml(analysisResult)}</div>` : ''}

            <h2>Follow-up History</h2>
            ${followups.map(f => `
              <div class="card">
                <p><span class="label">Date:</span> ${new Date(f.createdAt).toLocaleDateString()}</p>
                <p><span class="label">Status:</span> ${f.status}</p>
                <p><span class="label">Symptoms:</span> ${f.symptoms || '-'}</p>
                <p><span class="label">Notes:</span> ${f.notes || '-'}</p>
              </div>
            `).join('')}
          </body>
        </html>
        `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to generate PDF: ' + e.message);
    }
  };


  // --- Render ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (viewMode === 'detail') {
            setViewMode('list');
            setSelectedPrediction(null);
          } else {
            router.back();
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#2d6a5e" />
        </TouchableOpacity>
        <Text style={styles.title}>{viewMode === 'list' ? 'Select Prediction' : 'Monitoring'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {viewMode === 'list' ? (
        // --- LIST VIEW ---
        <ScrollView contentContainerStyle={styles.listContent}>
          {loading ? <ActivityIndicator size="large" color="#14b8a6" /> : (
            predictions.length === 0 ? (
              <Text style={styles.emptyText}>No predictions found. Analyze your skin first.</Text>
            ) : (
              predictions.map(pred => (
                <TouchableOpacity key={pred.id} style={styles.predCard} onPress={() => handleSelectPrediction(pred)}>
                  <View>
                    <Text style={styles.predTitle}>{pred.result.prediction}</Text>
                    <Text style={styles.predDate}>{new Date(pred.timestamp).toLocaleDateString()}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#ccc" />
                </TouchableOpacity>
              ))
            )
          )}
        </ScrollView>
      ) : (
        // --- DETAIL VIEW ---
        <ScrollView contentContainerStyle={styles.detailContent}>
          {selectedPrediction && (
            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Condition: {selectedPrediction.result.prediction}</Text>
              <Text style={styles.subText}>Detected on {new Date(selectedPrediction.timestamp).toLocaleDateString()}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Add Follow-up</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={generateAnalysis}>
              {analyzing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Analyze Progress</Text>}
            </TouchableOpacity>
          </View>

          {analysisResult && (
            <View style={styles.analysisCard}>
              <Text style={styles.analysisTitle}>AI Analysis Report</Text>
              <View>
                {parseMarkdown(analysisResult, styles.analysisText)}
              </View>
              <TouchableOpacity style={styles.pdfBtn} onPress={generatePDF}>
                <Ionicons name="document-text-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Download PDF Report</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.historyTitle}>Follow-up History</Text>
          {followupsLoading ? <ActivityIndicator color="#14b8a6" /> : (
            followups.length === 0 ? <Text style={styles.emptyText}>No follow-ups recorded yet.</Text> : (
              followups.map(f => (
                <View key={f.id} style={styles.followupCard}>
                  <View style={styles.followupHeader}>
                    <Text style={[styles.statusBadge,
                    f.status === 'Better' ? styles.statusGreen :
                      f.status === 'Worse' ? styles.statusRed : styles.statusGray
                    ]}>{f.status}</Text>
                    <Text style={styles.dateText}>{new Date(f.createdAt).toLocaleDateString()}</Text>
                  </View>
                  {f.symptoms ? <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Symptoms:</Text> {f.symptoms}</Text> : null}
                  {f.notes ? <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Notes:</Text> {f.notes}</Text> : null}
                </View>
              ))
            )
          )}
        </ScrollView>
      )}

      {/* Add Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Follow-up</Text>

            <Text style={styles.label}>Status:</Text>
            <View style={styles.statusRow}>
              {(['Better', 'Same', 'Worse'] as const).map(s => (
                <TouchableOpacity key={s}
                  style={[styles.statusOption, status === s && styles.statusOptionActive]}
                  onPress={() => setStatus(s)}>
                  <Text style={[styles.statusText, status === s && styles.statusTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={styles.input} placeholder="Symptoms..." value={symptoms} onChangeText={setSymptoms} />
            <TextInput style={styles.input} placeholder="Medications..." value={medications} onChangeText={setMedications} />
            <TextInput style={styles.input} placeholder="Notes..." value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.btnTextBlack}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveFollowup} disabled={saving}>
                <Text style={styles.btnTextWhite}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9d5e5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0d5b56' },
  backButton: { padding: 5 },
  listContent: { padding: 20 },
  detailContent: { padding: 20 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 20 },

  // List Cards
  predCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  predTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  predDate: { fontSize: 12, color: '#888' },

  // Detail View
  infoCard: { backgroundColor: '#e0f2f1', padding: 15, borderRadius: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#00695c' },
  subText: { fontSize: 14, color: '#004d40' },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: { flex: 1, backgroundColor: '#14b8a6', padding: 15, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  secondaryBtn: { backgroundColor: '#0d9488' },
  actionBtnText: { color: '#fff', fontWeight: 'bold' },

  analysisCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#7c3aed' },
  analysisTitle: { fontSize: 16, fontWeight: 'bold', color: '#7c3aed', marginBottom: 10 },
  analysisText: { fontSize: 14, color: '#333', lineHeight: 20 },
  pdfBtn: { backgroundColor: '#7c3aed', padding: 10, borderRadius: 8, marginTop: 15, flexDirection: 'row', justifyContent: 'center', gap: 5 },

  historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  followupCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10 },
  followupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, overflow: 'hidden', fontSize: 12, fontWeight: 'bold', color: '#fff' },
  statusGreen: { backgroundColor: '#10b981' },
  statusRed: { backgroundColor: '#ef4444' },
  statusGray: { backgroundColor: '#6b7280' },
  dateText: { color: '#888', fontSize: 12 },
  detailText: { fontSize: 14, color: '#555', marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  label: { marginBottom: 5, fontWeight: 'bold', color: '#555' },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  statusOption: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignItems: 'center' },
  statusOptionActive: { backgroundColor: '#14b8a6', borderColor: '#14b8a6' },
  statusText: { color: '#555' },
  statusTextActive: { color: '#fff', fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 14 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 12, backgroundColor: '#eee', borderRadius: 8, alignItems: 'center' },
  saveBtn: { flex: 1, padding: 12, backgroundColor: '#14b8a6', borderRadius: 8, alignItems: 'center' },
  btnTextBlack: { color: '#333', fontWeight: 'bold' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' },
});
