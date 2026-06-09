// firebaseClient.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { API_KEY, DB_URL } from './constants';

const firebaseConfig = {
  apiKey: API_KEY,
  databaseURL: DB_URL,
};

let app = null;
let auth = null;
let db = null;

export function initializeFirebase() {
  if (app && auth && db) return { app, auth, db };

  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getDatabase(app);

    return { app, auth, db };
  } catch (error) {
    console.log('Firebase init error:', error);
    return { app: null, auth: null, db: null };
  }
}

export function getFirebaseAuth() {
  if (!auth) initializeFirebase();
  return auth;
}

export function getFirebaseDB() {
  if (!db) initializeFirebase();
  return db;
}

export function getFirebaseApp() {
  if (!app) initializeFirebase();
  return app;
}

export function isAuthReady() {
  return !!auth;
}
