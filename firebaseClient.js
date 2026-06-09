// firebaseClient.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_KEY, DB_URL } from './constants';

// Firebase config
const firebaseConfig = {
  apiKey: API_KEY,
  databaseURL: DB_URL,
};

// Singleton pattern — bir kere başlat
let app = null;
let auth = null;
let db = null;

export function initializeFirebase() {
  if (app) return { app, auth, db };

  try {
    // App başlat
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    // Auth başlat — React Native persistence ile
    try {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } catch (e) {
      console.log('initializeAuth hatası, getAuth deneniyor:', e.message);
      // Fallback: getAuth
      auth = getAuth(app);
    }

    // Database başlat
    db = getDatabase(app);

    console.log('✅ Firebase başarıyla başlatıldı');
    return { app, auth, db };
  } catch (error) {
    console.error('❌ Firebase başlatma hatası:', error);
    return { app: null, auth: null, db: null };
  }
}

// Auth instance güvenli şekilde al
export function getFirebaseAuth() {
  if (!auth) {
    const { auth: newAuth } = initializeFirebase();
    return newAuth;
  }
  return auth;
}

// Database instance güvenli şekilde al
export function getFirebaseDB() {
  if (!db) {
    const { db: newDB } = initializeFirebase();
    return newDB;
  }
  return db;
}

// App instance güvenli şekilde al
export function getFirebaseApp() {
  if (!app) {
    const { app: newApp } = initializeFirebase();
    return newApp;
  }
  return app;
}

// Auth state hazır mı kontrol et
export function isAuthReady() {
  return auth !== null;
}
