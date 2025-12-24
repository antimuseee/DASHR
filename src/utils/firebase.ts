// Firebase configuration and initialization
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  Firestore,
} from 'firebase/firestore';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

// Initialize Firebase (lazy initialization)
function getFirebaseDb(): Firestore | null {
  if (!isFirebaseConfigured()) {
    console.warn('[Firebase] Not configured - using localStorage fallback');
    return null;
  }

  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      console.log('[Firebase] Initialized successfully');
    } catch (e) {
      console.error('[Firebase] Failed to initialize:', e);
      return null;
    }
  }
  return db;
}

// High score entry type
export interface CloudHighScoreEntry {
  name: string;
  score: number;
  distance: number;
  date: string;
  timestamp: number;
}

const COLLECTION_NAME = 'highscores';
const MAX_LEADERBOARD_SIZE = 10;

// Get global high scores from Firestore
export async function getCloudHighscores(): Promise<CloudHighScoreEntry[]> {
  const firestore = getFirebaseDb();
  if (!firestore) {
    return []; // Return empty, let caller fall back to localStorage
  }

  try {
    const q = query(
      collection(firestore, COLLECTION_NAME),
      orderBy('score', 'desc'),
      limit(MAX_LEADERBOARD_SIZE)
    );

    const snapshot = await getDocs(q);
    const scores: CloudHighScoreEntry[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      scores.push({
        name: data.name || 'ANON',
        score: data.score || 0,
        distance: data.distance || 0,
        date: data.date || '',
        timestamp: data.timestamp || 0,
      });
    });

    console.log('[Firebase] Loaded', scores.length, 'high scores');
    return scores;
  } catch (e) {
    console.error('[Firebase] Failed to get high scores:', e);
    return [];
  }
}

// Add a new high score to Firestore
export async function addCloudHighscore(
  name: string,
  score: number,
  distance: number
): Promise<boolean> {
  const firestore = getFirebaseDb();
  if (!firestore) {
    return false; // Let caller fall back to localStorage
  }

  try {
    const entry: CloudHighScoreEntry = {
      name: name.toUpperCase().slice(0, 10),
      score: Math.floor(score),
      distance: Math.floor(distance),
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
    };

    await addDoc(collection(firestore, COLLECTION_NAME), entry);
    console.log('[Firebase] Added high score:', entry);
    return true;
  } catch (e) {
    console.error('[Firebase] Failed to add high score:', e);
    return false;
  }
}

// Check if a score qualifies for the global leaderboard
export async function checkCloudHighscoreQualifies(score: number): Promise<boolean> {
  const scores = await getCloudHighscores();
  if (scores.length < MAX_LEADERBOARD_SIZE) return true;
  return score > scores[scores.length - 1].score;
}

