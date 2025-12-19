import { gameActions, useGameStore } from '../utils/store';

function TitleMenu() {
  return (
    <div className="center-bottom menus">
      <div className="menu-card">
        <h2>Trench Runner: Degen Dash</h2>
        <p>Swipe up to jump, down to slide, left/right to switch lanes.</p>
        <button className="btn" onClick={gameActions.startRun}>Play</button>
        <button className="btn secondary" onClick={() => alert('Shop coming soon: cosmetics & trails with TT')}>
          Shop
        </button>
      </div>
    </div>
  );
}

function PauseMenu() {
  return (
    <div className="center-bottom menus">
      <div className="menu-card">
        <h3>Paused</h3>
        <p>Swipe up to jump, down to slide, left/right to change lanes.</p>
        <button className="btn" onClick={gameActions.resume}>Resume</button>
        <button className="btn secondary" onClick={gameActions.startRun}>Restart</button>
      </div>
    </div>
  );
}

function GameOver() {
  const { score, distance, tokens, best } = useGameStore();
  return (
    <div className="center-bottom menus">
      <div className="menu-card">
        <h3>Run Over</h3>
        <p>Score: {score.toFixed(0)} â€¢ Distance: {distance.toFixed(0)}m â€¢ TT: {tokens.toFixed(0)}</p>
        <p>Best: {best.toFixed(0)}</p>
        <button className="btn" onClick={gameActions.startRun}>Replay</button>
        <button className="btn secondary" onClick={gameActions.backToTitle}>Back to Title</button>
      </div>
    </div>
  );
}

export default function Menus({ phase }: { phase: string }) {
  const { score, distance, multiplier, tokens } = useGameStore();
  return (
    <>
      <div className="topbar" style={{ pointerEvents: 'none' }}>
        <div className="stat-pill">Score: {score.toFixed(0)}</div>
        <div className="stat-pill">Dist: {distance.toFixed(0)}m</div>
        <div className="stat-pill">x{multiplier.toFixed(1)}</div>
        <div className="stat-pill">TT: {tokens.toFixed(0)}</div>
      </div>
      {phase === 'title' && <TitleMenu />}
      {phase === 'paused' && <PauseMenu />}
      {phase === 'gameover' && <GameOver />}
      {phase === 'running' && (
        <div className="center-bottom">
          <div className="menu-card" style={{ padding: '8px 12px' }}>
            Swipe: up = jump â€¢ down = slide â€¢ left/right = lanes
          </div>
        </div>
      )}
    </>
  );
}
