import { create } from 'zustand';

type GamePhase = 'title' | 'running' | 'paused' | 'gameover';

interface GameState {
  score: number;
  distance: number;
  multiplier: number;
  tokens: number;
  best: number;
  phase: GamePhase;
  runId: number;
}

const initialState: GameState = {
  score: 0,
  distance: 0,
  multiplier: 1,
  tokens: 0,
  best: Number(localStorage.getItem('trench-best') || 0),
  phase: 'title',
  runId: 0,
};

export const useGameStore = create<GameState>(() => initialState);

export const gameActions = {
  startRun: () =>
    useGameStore.setState((s) => ({
      phase: 'running',
      score: 0,
      distance: 0,
      multiplier: 1,
      tokens: 0,
      runId: s.runId + 1,
    })),
  pause: () => useGameStore.setState({ phase: 'paused' }),
  resume: () => useGameStore.setState({ phase: 'running' }),
  updateHUD: (data: Partial<Pick<GameState, 'score' | 'distance' | 'multiplier' | 'tokens'>>) =>
    useGameStore.setState(data),
  gameOver: (finalScore: number, distance: number, tokens: number) => {
    useGameStore.setState((s) => {
      const best = Math.max(s.best, finalScore);
      localStorage.setItem('trench-best', String(best));
      return { phase: 'gameover', score: finalScore, distance, tokens, best };
    });
  },
  backToTitle: () => useGameStore.setState(initialState),
};
