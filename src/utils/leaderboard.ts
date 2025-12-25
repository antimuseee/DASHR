// JSONBin.io Leaderboard Service
// Simple, free, persistent global leaderboard

import { HolderTier } from './token';

const JSONBIN_API_KEY = import.meta.env.VITE_JSONBIN_API_KEY;
const BIN_ID = import.meta.env.VITE_JSONBIN_BIN_ID;

const API_URL = BIN_ID 
  ? `https://api.jsonbin.io/v3/b/${BIN_ID}`
  : 'https://api.jsonbin.io/v3/b';

export interface LeaderboardEntry {
  name: string;
  score: number;
  distance: number;
  date: string;
  tier?: HolderTier; // Optional: holder tier at time of score submission
}

interface LeaderboardData {
  scores: LeaderboardEntry[];
}

const MAX_ENTRIES = 100;

// Check if JSONBin is configured
export function isLeaderboardConfigured(): boolean {
  return !!(JSONBIN_API_KEY && BIN_ID);
}

// Get the current leaderboard
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isLeaderboardConfigured()) {
    console.warn('[Leaderboard] Not configured - using local storage');
    return [];
  }

  try {
    const response = await fetch(API_URL + '/latest', {
      method: 'GET',
      headers: {
        'X-Master-Key': JSONBIN_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const leaderboard: LeaderboardData = data.record;
    
    console.log('[Leaderboard] Loaded', leaderboard.scores?.length || 0, 'scores');
    return leaderboard.scores || [];
  } catch (e) {
    console.error('[Leaderboard] Failed to fetch:', e);
    return [];
  }
}

// Add a score to the leaderboard
export async function addToLeaderboard(
  name: string,
  score: number,
  distance: number,
  tier?: HolderTier
): Promise<LeaderboardEntry[]> {
  if (!isLeaderboardConfigured()) {
    return [];
  }

  try {
    // First, get current scores
    const currentScores = await getLeaderboard();

    // Create new entry
    const newEntry: LeaderboardEntry = {
      name: name.toUpperCase().slice(0, 10),
      score: Math.floor(score),
      distance: Math.floor(distance),
      date: new Date().toLocaleDateString(),
      tier: tier || 'none',
    };

    // Add and sort
    currentScores.push(newEntry);
    currentScores.sort((a, b) => b.score - a.score);

    // Keep only top entries
    const trimmed = currentScores.slice(0, MAX_ENTRIES);

    // Save back to JSONBin
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY,
      },
      body: JSON.stringify({ scores: trimmed }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('[Leaderboard] Score saved successfully');
    return trimmed;
  } catch (e) {
    console.error('[Leaderboard] Failed to save:', e);
    return [];
  }
}

// Check if a score qualifies for the leaderboard
export async function checkQualifies(score: number): Promise<boolean> {
  if (!isLeaderboardConfigured()) {
    return false;
  }

  try {
    const scores = await getLeaderboard();
    if (scores.length < MAX_ENTRIES) return true;
    return score > scores[scores.length - 1].score;
  } catch {
    return false;
  }
}

// Initialize a new bin (call this once to create the bin)
export async function initializeBin(): Promise<string | null> {
  if (!JSONBIN_API_KEY) {
    console.error('[Leaderboard] No API key configured');
    return null;
  }

  try {
    const response = await fetch('https://api.jsonbin.io/v3/b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY,
        'X-Bin-Name': 'trench-runner-leaderboard',
        'X-Bin-Private': 'false',
      },
      body: JSON.stringify({ scores: [] }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[Leaderboard] Created new bin:', data.metadata.id);
    return data.metadata.id;
  } catch (e) {
    console.error('[Leaderboard] Failed to create bin:', e);
    return null;
  }
}

