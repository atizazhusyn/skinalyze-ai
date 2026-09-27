import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyA7Qb2Csx0C2n18famMnT2oH7xj89u7LXo",
  authDomain: "xdgdf-460ae.firebaseapp.com",
  projectId: "xdgdf-460ae",
  storageBucket: "xdgdf-460ae.firebasestorage.app",
  messagingSenderId: "195913789535",
  appId: "1:195913789535:android:71760a7ba125c2995f6bea"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(app);

export { auth, db };
