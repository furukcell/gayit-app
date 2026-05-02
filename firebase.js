import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCcvq9VkMugDZTq3fOPypJIy0ATiGmPxrk",
  authDomain: "usta-mugla.firebaseapp.com",
  databaseURL: "https://usta-mugla-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "usta-mugla",
  storageBucket: "usta-mugla.firebasestorage.app",
  messagingSenderId: "834374058795",
  appId: "1:834374058795:web:778bf47fa5c932bf47fb6e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
