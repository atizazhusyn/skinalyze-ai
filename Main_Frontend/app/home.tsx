import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { logoutUser, getStoredUser, getCurrentUser } from '../lib/utils/auth';
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    checkAuth();
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

  const handleLogout = async () => {
    try {
      setLoading(true);
      setMenuVisible(false);
      await logoutUser();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    setMenuVisible(false);
    router.push('/change-password');
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
      {/* Hamburger Menu Icon */}
      <TouchableOpacity style={styles.menuIcon} onPress={() => setMenuVisible(true)}>
        <Ionicons name="menu" size={32} color="#2d6a5e" />
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          <Text style={styles.title}>Welcome to Skinalyze AI</Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.button} onPress={() => router.push('/analyze')}>
              <Text style={styles.buttonText}>Analyze Skin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => router.push('/chat')}>
              <Text style={styles.buttonText}>Chat with AI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => router.push('/about')}>
              <Text style={styles.buttonText}>About Skin Diseases</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => router.push('/history')}>
              <Text style={styles.buttonText}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={() => router.push('/patient-monitoring')}>
              <Text style={styles.buttonText}>Patient Monitoring & Follow Up</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={() => router.push('/feedback')}>
              <Text style={styles.buttonText}>Feedback</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {/* Modal for Menu */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuModal}>
            <TouchableOpacity style={styles.menuItem} onPress={handleChangePassword}>
              <Ionicons name="key-outline" size={22} color="#2d6a5e" style={{ marginRight: 10 }} />
              <Text style={styles.menuText}>Change Password</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#e57373" style={{ marginRight: 10 }} />
              <Text style={[styles.menuText, { color: '#e57373' }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fde6e6',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: '100%',
  },
  menuIcon: {
    position: 'absolute',
    top: 24,
    left: 18,
    zIndex: 10,
    backgroundColor: 'transparent',
    padding: 4,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2d6a5e',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#6db0a6',
    borderRadius: 24,
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  signOutButton: {
    backgroundColor: '#e57373',
    borderRadius: 24,
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuModal: {
    marginTop: 60,
    marginLeft: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuText: {
    fontSize: 18,
    color: '#2d6a5e',
    fontWeight: '600',
  },
}); 