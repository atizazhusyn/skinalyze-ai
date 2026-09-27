import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User
} from 'firebase/auth';
import { auth } from '../config/firebase';

const USER_KEY = '@user_data';

export const saveUser = async ({ email, password }: { email: string; password: string }) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify({
      email: user.email,
      uid: user.uid,
      lastLogin: new Date().toISOString()
    }));
    return user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please use a different email or try logging in.');
    }
    throw new Error(error.message);
  }
};

export const loginUser = async ({ email, password }: { email: string; password: string }) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify({
      email: user.email,
      uid: user.uid,
      lastLogin: new Date().toISOString()
    }));
    return user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password. Please try again.');
    }
    throw new Error(error.message);
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    }
    throw new Error(error.message);
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const user = auth.currentUser;
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify({
        email: user.email,
        uid: user.uid,
        lastLogin: new Date().toISOString()
      }));
    }
    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const getStoredUser = async () => {
  try {
    const userData = await AsyncStorage.getItem(USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    return null;
  }
};
