import { useGameStore } from '../utils/store';

function restartGame() {
  const game = window.phaserGame;
  if (game) {
    const mainScene = game.scene.getScene('Main');
    if (mainScene) {
      mainScene.scene.restart();
    }
  }
}

function backToTitle() {
  useGameStore.setState({ phase: 'title' });
}

function TitleMenu() {
  return (
    <div className="center-bottom menus">
      <div className="menu-card">
        <h2>Trench Runner: Degen Dash</h2>
        <p>Arrow keys or WASD to move. Space/Up to jump, Down to slide.</p>
        <button className="btn" onClick={restartGame}>Play</button>
        <button className="btn secondary" onClick={() => alert('Shop coming soon!')}>Shop</button>
      </div>
    </div>
  );
}

function PauseMenu() {
  return (
    <div className="center-bottom menus">
      <div className="menu-card">
        <h3>Paused</h3>
        <p>Arrow keys or WASD. Space/Up = jump, Down = slide.</p>
        <button className="btn" onClick={restartGame}>Resume</button>
        <button className="btn secondary" onClick={restartGame}>Restart</button>
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
        <p>Score: {score.toFixed(0)} | Distance: {distance.toFixed(0)}m | TT: {tokens.toFixed(0)}</p>
        <p>Best: {best.toFixed(0)}</p>
        <button className="btn" onClick={restartGame}>Replay</button>
        <button className="btn secondary" onClick={backToTitle}>Back to Title</button>
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
            Arrow keys / WASD | Space = jump | Down = slide
          </div>
        </div>
      )}
    </>
  );
}
