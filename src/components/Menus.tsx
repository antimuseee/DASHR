import { useState, useEffect } from 'react';
import { useGameStore, checkHighscoreQualifies, addHighscore, getHighscores, HighScoreEntry } from '../utils/store';
import { getDevice } from '../utils/device';

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

function Leaderboard({ scores, currentScore }: { scores: HighScoreEntry[]; currentScore?: number }) {
  if (scores.length === 0) {
    return (
      <div className="leaderboard">
        <h4>🏆 TOP 10 LEADERBOARD</h4>
        <p className="no-scores">No scores yet. Be the first!</p>
      </div>
    );
  }
  
  return (
    <div className="leaderboard">
      <h4>🏆 TOP 10 LEADERBOARD</h4>
      <div className="leaderboard-list">
        {scores.map((entry, i) => (
          <div 
            key={i} 
            className={`leaderboard-row ${currentScore && entry.score === currentScore ? 'highlight' : ''} ${i < 3 ? 'top-three' : ''}`}
          >
            <span className="rank">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
            </span>
            <span className="name">{entry.name}</span>
            <span className="score">{entry.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TitleMenu() {
  const [scores, setScores] = useState<HighScoreEntry[]>([]);
  const device = getDevice();
  
  useEffect(() => {
    setScores(getHighscores());
  }, []);
  
  return (
    <div className="center-bottom center-vertical menus">
      <div className="menu-card title-card">
        <h2>Trench Runner: Degen Dash</h2>
        {device.isDesktop ? (
          <>
            <p>Arrow keys or WASD to move. Space/Up to jump, Down to slide.</p>
            <p className="boost-hint">Collect boosts and press 1/2/3 to activate!</p>
          </>
        ) : (
          <p>Swipe to move, tap to jump. Collect boosts!</p>
        )}
        <button className="btn" onClick={restartGame}>Play</button>
        <button className="btn secondary" onClick={() => alert('Shop coming soon!')}>Shop</button>
        <Leaderboard scores={scores} />
      </div>
    </div>
  );
}

function PauseMenu() {
  const device = getDevice();
  return (
    <div className="center-bottom menus">
      <div className="menu-card">
        <h3>Paused</h3>
        {device.isDesktop && <p>Arrow keys or WASD. Space/Up = jump, Down = slide.</p>}
        <button className="btn" onClick={restartGame}>Resume</button>
        <button className="btn secondary" onClick={restartGame}>Restart</button>
      </div>
    </div>
  );
}

function GameOver() {
  const { score, distance, tokens, best, distanceScore, collectibleScore, maxCombo, boostsUsed } = useGameStore();
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useState<HighScoreEntry[]>([]);
  const [qualifies, setQualifies] = useState(false);
  
  useEffect(() => {
    const doesQualify = checkHighscoreQualifies(score);
    setQualifies(doesQualify);
    setShowNameEntry(doesQualify);
    setScores(getHighscores());
    setSubmitted(false);
    setPlayerName('');
  }, [score]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim().length > 0) {
      const newScores = addHighscore(playerName.trim(), score, distance);
      setScores(newScores);
      setShowNameEntry(false);
      setSubmitted(true);
    }
  };
  
  const handleSkip = () => {
    setShowNameEntry(false);
  };
  
  return (
    <div className="center-bottom center-vertical menus">
      <div className="menu-card gameover-card">
        <h3>Run Over</h3>
        
        <div className="score-breakdown">
          <div className="score-row">
            <span className="score-label">🏃 Distance</span>
            <span className="score-value">{distance.toFixed(0)}m</span>
          </div>
          <div className="score-row">
            <span className="score-label">📍 Distance Score</span>
            <span className="score-value">{distanceScore.toFixed(0)}</span>
          </div>
          <div className="score-row">
            <span className="score-label">💎 Collectibles</span>
            <span className="score-value">{collectibleScore.toFixed(0)}</span>
          </div>
          <div className="score-row">
            <span className="score-label">🪙 Tokens</span>
            <span className="score-value">{tokens}</span>
          </div>
          <div className="score-row">
            <span className="score-label">🔥 Max Combo</span>
            <span className="score-value">x{maxCombo}</span>
          </div>
          <div className="score-row">
            <span className="score-label">⚡ Boosts Used</span>
            <span className="score-value">{boostsUsed}</span>
          </div>
          <div className="score-divider"></div>
          <div className="score-row total">
            <span className="score-label">TOTAL SCORE</span>
            <span className="score-value">{score.toFixed(0)}</span>
          </div>
        </div>
        
        <p className="best-score">🏆 Personal Best: {best.toFixed(0)}</p>
        
        {/* Highscore name entry */}
        {showNameEntry && !submitted && (
          <div className="highscore-entry">
            <div className="highscore-banner">🎉 NEW HIGH SCORE! 🎉</div>
            <p>You made it to the Top 10!</p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                }}
                onKeyUp={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                }}
                placeholder="ENTER NAME"
                maxLength={10}
                autoFocus
                className="name-input"
              />
              <div className="entry-buttons">
                <button type="submit" className="btn" disabled={playerName.trim().length === 0}>
                  Submit
                </button>
                <button type="button" className="btn secondary" onClick={handleSkip}>
                  Skip
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Show message after submission */}
        {submitted && (
          <div className="submitted-message">
            ✅ Score saved to leaderboard!
          </div>
        )}
        
        {/* Show leaderboard */}
        {!showNameEntry && (
          <Leaderboard scores={scores} currentScore={submitted ? Math.floor(score) : undefined} />
        )}
        
        <div className="gameover-buttons">
          <button className="btn" onClick={restartGame}>Replay</button>
          <button className="btn secondary" onClick={backToTitle}>Back to Title</button>
        </div>
      </div>
    </div>
  );
}

import { SHIELD_DURATION, MAGNET_DURATION, CHARGES_NEEDED, COMBO_CHARGES_NEEDED } from '../utils/store';

export default function Menus({ phase }: { phase: string }) {
  const { score, distance, multiplier, tokens, activeBoost, boostTimer, hasShield, shieldTimer, hasMagnet, magnetTimer, comboCount, comboProgress, comboTimer, boostInventory, magnetCharges, doubleCharges, shieldCharges } = useGameStore();
  const device = getDevice();
  return (
    <>
      <div className="topbar" style={{ pointerEvents: 'none' }}>
        <div className="stat-pill">Score: {score.toFixed(0)}</div>
        <div className="stat-pill">Dist: {distance.toFixed(0)}m</div>
        <div className="stat-pill">x{multiplier.toFixed(1)}</div>
        <div className="stat-pill">TT: {tokens.toFixed(0)}</div>
        <div className={`stat-pill combo-pill ${comboCount > 0 || comboProgress > 0 ? 'active' : 'inactive'} ${activeBoost === 'double' ? 'energized' : ''}`}>
          <div 
            className="combo-fill combo-timer-fill" 
            style={{ width: comboTimer > 0 ? `${(comboTimer / 1.2) * 100}%` : '0%' }}
          />
          <div 
            className="combo-fill combo-progress-fill" 
            style={{ width: `${(comboProgress / COMBO_CHARGES_NEEDED) * 100}%` }}
          />
          <span className="combo-text">🔥 x{comboCount > 0 ? (activeBoost === 'double' ? comboCount * 2 : comboCount) : '-'} {comboProgress > 0 && comboCount < 10 ? `+${comboProgress}` : ''}</span>
        </div>
      </div>
      
      {/* Active boost indicators */}
      {phase === 'running' && (activeBoost || hasShield || hasMagnet) && (
        <div className="boost-indicators">
          {activeBoost === 'double' && (
            <div className="boost-pill boost-double">
              ⚡ 2X ({boostTimer.toFixed(1)}s)
            </div>
          )}
          {hasShield && (
            <div className="boost-pill boost-shield shield-with-bar">
              <span className="shield-label">🛡️ SHIELD</span>
              <div className="shield-bar-container">
                <div 
                  className="shield-bar-fill" 
                  style={{ width: `${(shieldTimer / SHIELD_DURATION) * 100}%` }}
                />
              </div>
              <span className="shield-time">{shieldTimer.toFixed(1)}s</span>
            </div>
          )}
          {hasMagnet && (
            <div className="boost-pill boost-magnet magnet-with-bar">
              <span className="magnet-label">🧲 MAGNET</span>
              <div className="magnet-bar-container">
                <div 
                  className="magnet-bar-fill" 
                  style={{ width: `${(magnetTimer / MAGNET_DURATION) * 100}%` }}
                />
              </div>
              <span className="magnet-time">{magnetTimer.toFixed(1)}s</span>
            </div>
          )}
        </div>
      )}
      
      {/* Boost inventory */}
      {phase === 'running' && (
        <div className="boost-inventory">
          <div className={`inventory-slot ${boostInventory.double > 0 ? 'has-boost' : doubleCharges > 0 ? 'charging' : 'empty'}`} title="Press 1 or Q (needs 3 pickups)">
            <div 
              className="slot-fill slot-fill-double" 
              style={{ 
                height: boostInventory.double > 0 
                  ? '100%' 
                  : `${(doubleCharges / CHARGES_NEEDED) * 100}%` 
              }} 
            />
            {device.isDesktop && <span className="boost-key">1</span>}
            <span className="boost-icon">⚡</span>
            <span className="boost-count">{boostInventory.double > 0 ? boostInventory.double : `${doubleCharges}/${CHARGES_NEEDED}`}</span>
          </div>
          <div className={`inventory-slot ${boostInventory.shield > 0 ? 'has-boost' : shieldCharges > 0 ? 'charging' : 'empty'}`} title="Press 2 or E (needs 3 pickups)">
            <div 
              className="slot-fill slot-fill-shield" 
              style={{ 
                height: boostInventory.shield > 0 
                  ? '100%' 
                  : `${(shieldCharges / CHARGES_NEEDED) * 100}%` 
              }} 
            />
            {device.isDesktop && <span className="boost-key">2</span>}
            <span className="boost-icon">🛡️</span>
            <span className="boost-count">{boostInventory.shield > 0 ? boostInventory.shield : `${shieldCharges}/${CHARGES_NEEDED}`}</span>
          </div>
          <div className={`inventory-slot ${boostInventory.magnet > 0 ? 'has-boost' : magnetCharges > 0 ? 'charging' : 'empty'}`} title="Press 3 or R (needs 3 pickups)">
            <div 
              className="slot-fill slot-fill-magnet" 
              style={{ 
                height: boostInventory.magnet > 0 
                  ? '100%' 
                  : `${(magnetCharges / CHARGES_NEEDED) * 100}%` 
              }} 
            />
            {device.isDesktop && <span className="boost-key">3</span>}
            <span className="boost-icon">🧲</span>
            <span className="boost-count">{boostInventory.magnet > 0 ? boostInventory.magnet : `${magnetCharges}/${CHARGES_NEEDED}`}</span>
          </div>
        </div>
      )}
      
      {phase === 'title' && <TitleMenu />}
      {phase === 'paused' && <PauseMenu />}
      {phase === 'gameover' && <GameOver />}
      {phase === 'running' && device.isDesktop && (
        <div className="center-bottom">
          <div className="menu-card" style={{ padding: '8px 12px' }}>
            Move: WASD/Arrows | Jump: Space | Slide: S/Down | Boosts: 1/2/3
          </div>
        </div>
      )}
    </>
  );
}
