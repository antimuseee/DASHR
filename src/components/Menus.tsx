import { useState, useEffect } from 'react';
import { useGameStore, checkHighscoreQualifiesAsync, addHighscoreAsync, getHighscoresAsync, HighScoreEntry, gameActions } from '../utils/store';
import { getDevice } from '../utils/device';
import { isLeaderboardConfigured } from '../utils/leaderboard';
import { HOLDER_TIERS, HolderTier } from '../utils/token';
import { 
  SKINS, TRAILS, SkinId, TrailId, 
  getUnlockedSkins, getUnlockedTrails, 
  getEquippedSkin, getEquippedTrail, 
  setEquippedSkin, setEquippedTrail,
  meetsRequirement
} from '../utils/cosmetics';

function restartGame() {
  console.log('[Menus] Play button clicked - restarting game');
  
  const game = window.phaserGame;
  if (game) {
    console.log('[Menus] Phaser game found');
    
    // Get the scene manager
    const sceneManager = game.scene;
    console.log('[Menus] Scene manager keys:', sceneManager.getScenes(true).map((s: Phaser.Scene) => s.scene.key));
    
    const mainScene = sceneManager.getScene('Main');
    
    if (mainScene) {
      console.log('[Menus] Main scene found');
      const isActive = mainScene.scene.isActive();
      const isPaused = mainScene.scene.isPaused();
      const isSleeping = mainScene.scene.isSleeping();
      console.log('[Menus] Scene state - isActive:', isActive, 'isPaused:', isPaused, 'isSleeping:', isSleeping);
      
      // Stop the scene first to ensure clean state, then start it fresh
      // This ensures create() is called
      if (isActive || isPaused) {
        console.log('[Menus] Scene is active/paused, stopping first...');
        mainScene.scene.stop();
      }
      
      // Longer delay on mobile to ensure proper cleanup before restart
      // Mobile devices need more time to release resources
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const restartDelay = isMobile ? 100 : 50;
      
      setTimeout(() => {
        console.log('[Menus] Starting scene fresh...');
        // Double-check scene isn't somehow still active
        const currentScene = sceneManager.getScene('Main');
        if (currentScene && currentScene.scene.isActive()) {
          console.log('[Menus] Scene still active, stopping again...');
          currentScene.scene.stop();
          setTimeout(() => sceneManager.start('Main'), 50);
        } else {
          sceneManager.start('Main');
        }
      }, restartDelay);
    } else {
      // Scene doesn't exist - launch it
      console.log('[Menus] Main scene not found, launching it');
      sceneManager.launch('Main');
    }
    
    // Set game phase to running (scene will also call startRun() in create())
    gameActions.startRun();
    console.log('[Menus] Game phase set to running');
  } else {
    console.error('[Menus] Phaser game not found! window.phaserGame:', window.phaserGame);
  }
}

function backToTitle() {
  useGameStore.setState({ phase: 'title' });
}

function getTierClass(tier?: HolderTier): string {
  if (!tier || tier === 'none') return '';
  return `${tier}-tier`;
}

function Leaderboard({ scores, currentScore, loading }: { scores: HighScoreEntry[]; currentScore?: number; loading?: boolean }) {
  const isCloud = isLeaderboardConfigured();
  
  if (loading) {
    return (
      <div className="leaderboard">
        <h4>🏆 {isCloud ? 'GLOBAL' : 'LOCAL'} TOP 100</h4>
        <p className="no-scores">Loading scores...</p>
      </div>
    );
  }
  
  if (scores.length === 0) {
    return (
      <div className="leaderboard">
        <h4>🏆 {isCloud ? 'GLOBAL' : 'LOCAL'} TOP 100</h4>
        <p className="no-scores">No scores yet. Be the first!</p>
      </div>
    );
  }
  
  return (
    <div className="leaderboard">
      <h4>🏆 {isCloud ? 'GLOBAL' : 'LOCAL'} TOP 100</h4>
      <div className="leaderboard-list">
        {scores.map((entry, i) => {
          const tierInfo = entry.tier ? HOLDER_TIERS[entry.tier] : null;
          const tierClass = getTierClass(entry.tier);
          
          return (
            <div 
              key={i} 
              className={`leaderboard-row ${currentScore && entry.score === currentScore ? 'highlight' : ''} ${i < 3 ? 'top-three' : ''} ${tierClass}`}
            >
              <span className="rank">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <span className="name">
                {entry.name}
                {tierInfo && tierInfo.tier !== 'none' && (
                  <span className="leaderboard-tier" title={`${tierInfo.name} Holder`}>
                    {tierInfo.emoji}
                  </span>
                )}
              </span>
              <span className="score">{Math.round(entry.score).toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// Helper to update player cosmetics in the running game
function updatePlayerCosmetics(skinId: SkinId, trailId: TrailId) {
  const game = window.phaserGame;
  if (game) {
    const mainScene = game.scene.getScene('Main') as any;
    if (mainScene?.player?.updateCosmetics) {
      mainScene.player.updateCosmetics(skinId, trailId);
      console.log(`[Cosmetics] Updated player: Skin=${skinId}, Trail=${trailId}`);
    }
  }
}

function CosmeticsMenu({ onClose }: { onClose: () => void }) {
  const { holderTier } = useGameStore();
  const [selectedSkin, setSelectedSkin] = useState<SkinId>(getEquippedSkin());
  const [selectedTrail, setSelectedTrail] = useState<TrailId>(getEquippedTrail());
  
  const allSkins = Object.values(SKINS);
  const allTrails = Object.values(TRAILS);
  
  const handleSkinSelect = (skinId: SkinId) => {
    if (meetsRequirement(holderTier, SKINS[skinId].requiredTier)) {
      console.log(`[Cosmetics Menu] Selecting skin: ${skinId}`);
      setSelectedSkin(skinId);
      setEquippedSkin(skinId);
      console.log(`[Cosmetics Menu] Saved to localStorage: ${localStorage.getItem('trench-equipped-skin')}`);
      // Update player immediately
      updatePlayerCosmetics(skinId, selectedTrail);
    } else {
      console.log(`[Cosmetics Menu] Skin ${skinId} locked - requires ${SKINS[skinId].requiredTier}`);
    }
  };
  
  const handleTrailSelect = (trailId: TrailId) => {
    if (meetsRequirement(holderTier, TRAILS[trailId].requiredTier)) {
      setSelectedTrail(trailId);
      setEquippedTrail(trailId);
      // Update player immediately
      updatePlayerCosmetics(selectedSkin, trailId);
    }
  };
  
  const tierInfo = HOLDER_TIERS[holderTier];
  
  return (
    <div className="center-bottom center-vertical menus">
      <div className="menu-card cosmetics-card">
        <h3>🎨 Cosmetics</h3>
        
        {/* Current tier display */}
        <div className="tier-status" style={{ color: tierInfo.color }}>
          {tierInfo.emoji} {tierInfo.name} Holder
        </div>
        
        {/* Skins section */}
        <div className="cosmetics-section">
          <h4>Runner Skins</h4>
          <div className="cosmetics-grid">
            {allSkins.map((skin) => {
              const isUnlocked = meetsRequirement(holderTier, skin.requiredTier);
              const isEquipped = selectedSkin === skin.id;
              const tierRequired = HOLDER_TIERS[skin.requiredTier];
              
              return (
                <div
                  key={skin.id}
                  className={`cosmetic-item ${isUnlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => isUnlocked && handleSkinSelect(skin.id)}
                  style={{ 
                    borderColor: isEquipped ? tierInfo.color : undefined,
                    cursor: isUnlocked ? 'pointer' : 'not-allowed'
                  }}
                >
                  <div 
                    className="cosmetic-preview skin-preview"
                    style={{ 
                      backgroundColor: skin.id === 'default' 
                        ? '#1a1a2e' // Default dark color
                        : `#${skin.tint.toString(16).padStart(6, '0')}`,
                      boxShadow: skin.id !== 'default' ? `0 0 8px ${`#${skin.tint.toString(16).padStart(6, '0')}`}` : 'none'
                    }}
                  >
                    {skin.id === 'default' && <span style={{ fontSize: '12px', opacity: 0.7 }}>⚪</span>}
                  </div>
                  <div className="cosmetic-name">{skin.name}</div>
                  {!isUnlocked && (
                    <div className="cosmetic-lock">
                      🔒 {tierRequired.emoji}
                    </div>
                  )}
                  {isEquipped && <div className="equipped-badge">✓</div>}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Trails section */}
        <div className="cosmetics-section">
          <h4>Trail Effects</h4>
          <div className="cosmetics-grid">
            {allTrails.map((trail) => {
              const isUnlocked = meetsRequirement(holderTier, trail.requiredTier);
              const isEquipped = selectedTrail === trail.id;
              const tierRequired = HOLDER_TIERS[trail.requiredTier];
              
              return (
                <div
                  key={trail.id}
                  className={`cosmetic-item ${isUnlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}`}
                  onClick={() => isUnlocked && handleTrailSelect(trail.id)}
                  style={{ 
                    borderColor: isEquipped ? tierInfo.color : undefined,
                    cursor: isUnlocked ? 'pointer' : 'not-allowed'
                  }}
                >
                  <div className="cosmetic-preview trail-preview">
                    {trail.colors.length > 0 ? (
                      <div 
                        className="trail-dots"
                        style={{ 
                          background: `linear-gradient(90deg, ${trail.colors.map(c => `#${c.toString(16).padStart(6, '0')}`).join(', ')})` 
                        }}
                      />
                    ) : (
                      <span style={{ opacity: 0.5 }}>None</span>
                    )}
                  </div>
                  <div className="cosmetic-name">{trail.name}</div>
                  {!isUnlocked && (
                    <div className="cosmetic-lock">
                      🔒 {tierRequired.emoji}
                    </div>
                  )}
                  {isEquipped && <div className="equipped-badge">✓</div>}
                </div>
              );
            })}
          </div>
        </div>
        
        <p className="cosmetics-hint">
          Hold more tokens to unlock exclusive cosmetics!
        </p>
        
        <button className="btn" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function TitleMenu({ onShowTutorial }: { onShowTutorial?: () => void }) {
  const [scores, setScores] = useState<HighScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCosmetics, setShowCosmetics] = useState(false);
  const device = getDevice();
  
  useEffect(() => {
    setLoading(true);
    getHighscoresAsync()
      .then((data) => setScores(data))
      .catch((e) => console.error('Failed to load scores:', e))
      .finally(() => setLoading(false));
  }, []);
  
  if (showCosmetics) {
    return <CosmeticsMenu onClose={() => setShowCosmetics(false)} />;
  }
  
  return (
    <div className="center-bottom center-vertical menus">
      <div className="menu-card title-card">
        <h2>Trench Runner: Degen Dash</h2>
        {device.isDesktop ? (
          <>
            <p>Arrow keys or A/D to switch lanes. Space/Up/W to jump.</p>
            <p className="boost-hint">Collect boosts and press 1/2/3 to activate!</p>
          </>
        ) : (
          <p>Swipe to move, tap to jump. Collect boosts!</p>
        )}
        <button className="btn" onClick={restartGame}>Play</button>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button className="btn secondary" style={{ flex: 1 }} onClick={onShowTutorial}>📖 How to Play</button>
          <button className="btn secondary" style={{ flex: 1 }} onClick={() => setShowCosmetics(true)}>🎨 Cosmetics</button>
        </div>
        <Leaderboard scores={scores} loading={loading} />
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
        {device.isDesktop && <p>Arrow keys or A/D to switch lanes. Space/Up/W = jump.</p>}
        <button className="btn" onClick={restartGame}>Resume</button>
        <button className="btn secondary" onClick={restartGame}>Restart</button>
      </div>
    </div>
  );
}

function GameOver() {
  const { score, distance, tokens, best, multiplier, distanceScore, coinScore, whaleScore, maxCombo, boostsUsed, whaleTokens } = useGameStore();
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState<HighScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [qualifies, setQualifies] = useState(false);
  
  useEffect(() => {
    setLoading(true);
    setSubmitted(false);
    setPlayerName('');
    
    // Check if score qualifies and load scores
    Promise.all([
      checkHighscoreQualifiesAsync(score),
      getHighscoresAsync()
    ]).then(([doesQualify, loadedScores]) => {
      setQualifies(doesQualify);
      setShowNameEntry(doesQualify);
      setScores(loadedScores);
    }).catch((e) => {
      console.error('Failed to check/load scores:', e);
      setQualifies(false);
      setShowNameEntry(false);
    }).finally(() => {
      setLoading(false);
    });
  }, [score]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim().length > 0 && !submitting) {
      setSubmitting(true);
      try {
        // Get current holder tier to save with the score
        const holderTier = gameActions.getHolderTier();
        const newScores = await addHighscoreAsync(playerName.trim(), score, distance, holderTier);
        setScores(newScores);
        setShowNameEntry(false);
        setSubmitted(true);
      } catch (err) {
        console.error('Failed to submit score:', err);
      } finally {
        setSubmitting(false);
      }
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
            <span className="score-label">🏃 Survived</span>
            <span className="score-value">{Math.round(distance).toLocaleString()}m</span>
          </div>
          <div className="score-row">
            <span className="score-label">📊 Distance Multiplier</span>
            <span className="score-value">×{Math.round(multiplier)}</span>
          </div>
          <div className="score-row">
            <span className="score-label">📍 Distance Score</span>
            <span className="score-value">{Math.round(distanceScore).toLocaleString()} pts</span>
          </div>
          <div className="score-row">
            <span className="score-label">💰 Bags</span>
            <span className="score-value">{Math.round(tokens).toLocaleString()} coins → {Math.round(coinScore).toLocaleString()} pts</span>
          </div>
          {whaleTokens > 0 && (
            <div className="score-row whale-bonus">
              <span className="score-label">🐋 Whale Haul</span>
              <span className="score-value">{whaleTokens} caught → {Math.round(whaleScore).toLocaleString()} pts</span>
            </div>
          )}
          <div className="score-row">
            <span className="score-label">🔥 Peak Combo</span>
            <span className="score-value">x{maxCombo}</span>
          </div>
          <div className="score-row">
            <span className="score-label">⚡ Boosts Burned</span>
            <span className="score-value">{boostsUsed}</span>
          </div>
          <div className="score-divider"></div>
          <div className="score-row total">
            <span className="score-label">📈 TOTAL GAINS</span>
            <span className="score-value">{Math.round(score).toLocaleString()}</span>
          </div>
        </div>
        
        <p className="best-score">🏆 Personal Best: {Math.round(best).toLocaleString()}</p>
        
        {/* Highscore name entry */}
        {showNameEntry && !submitted && (
          <div className="highscore-entry">
            <div className="highscore-banner">🎉 NEW HIGH SCORE! 🎉</div>
            <p>You made it to the Top 100!</p>
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
                <button type="submit" className="btn" disabled={playerName.trim().length === 0 || submitting}>
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
                <button type="button" className="btn secondary" onClick={handleSkip} disabled={submitting}>
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
          <Leaderboard scores={scores} currentScore={submitted ? Math.floor(score) : undefined} loading={loading} />
        )}
        
        <div className="gameover-buttons">
          <button className="btn" onClick={restartGame}>Replay</button>
          <button className="btn secondary" onClick={backToTitle}>Main Menu</button>
        </div>
      </div>
    </div>
  );
}

import { SHIELD_DURATION, MAGNET_DURATION, CHARGES_NEEDED, COMBO_CHARGES_NEEDED } from '../utils/store';

export default function Menus({ phase, onShowTutorial }: { phase: string; onShowTutorial?: () => void }) {
  const { score, distance, multiplier, tokens, activeBoost, boostTimer, hasShield, shieldTimer, hasMagnet, magnetTimer, comboCount, comboProgress, comboTimer, boostInventory, magnetCharges, doubleCharges, shieldCharges } = useGameStore();
  const [showCosmetics, setShowCosmetics] = useState(false);
  const device = getDevice();
  
  // Show cosmetics menu overlay if open (check this first, before other menus)
  if (showCosmetics) {
    return (
      <>
        <CosmeticsMenu onClose={() => {
          setShowCosmetics(false);
          // Resume game after closing cosmetics if it was running
          if (phase === 'paused') {
            gameActions.resume();
          }
        }} />
      </>
    );
  }
  
  return (
    <>
      {/* How to Play and Cosmetics buttons - visible during gameplay */}
      {phase === 'running' && !showCosmetics && (
        <>
          <button 
            className="how-to-play-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onShowTutorial) {
                onShowTutorial();
              }
            }}
            style={{ pointerEvents: 'auto' }}
            title="How to Play"
          >
            📖
          </button>
          <button 
            className="cosmetics-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowCosmetics(true);
              gameActions.pause();
            }}
            style={{ pointerEvents: 'auto' }}
            title="Cosmetics"
          >
            🎨
          </button>
        </>
      )}
      
      <div className="topbar" style={{ pointerEvents: 'none' }}>
        <div className="stat-pill">Score: {Math.round(score).toLocaleString()}</div>
        <div className="stat-pill">Dist: {Math.round(distance).toLocaleString()}m</div>
        <div className="stat-pill">Coins: {Math.round(tokens).toLocaleString()}</div>
        <div className={`stat-pill combo-pill ${comboCount > 0 || comboProgress > 0 ? 'active' : 'inactive'} ${activeBoost === 'double' ? 'energized' : ''}`}>
          <div 
            className="combo-fill combo-timer-fill" 
            style={{ width: comboTimer > 0 ? `${(comboTimer / 0.8) * 100}%` : '0%' }}
          />
          <div 
            className="combo-fill combo-progress-fill" 
            style={{ width: `${(comboProgress / COMBO_CHARGES_NEEDED) * 100}%` }}
          />
          <span className="combo-text">
            🔥 {comboCount > 0 
              ? `x${activeBoost === 'double' ? comboCount * 2 : comboCount}${comboProgress > 0 && comboCount < 10 ? ` +${comboProgress}` : ''}`
              : comboProgress > 0 
                ? `${comboProgress}/${COMBO_CHARGES_NEEDED}`
                : 'x0'
            }
          </span>
        </div>
      </div>
      
      {/* Active boost indicators */}
      {phase === 'running' && (activeBoost || hasShield || hasMagnet) && (
        <div className="boost-indicators">
          {activeBoost === 'double' && (
            <div className="boost-pill boost-double">
              ⚡ 2X ({Math.round(boostTimer)}s)
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
              <span className="shield-time">{Math.round(shieldTimer)}s</span>
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
              <span className="magnet-time">{Math.round(magnetTimer)}s</span>
            </div>
          )}
        </div>
      )}
      
      {/* Boost inventory */}
      {phase === 'running' && (
        <div className="boost-inventory" style={{ pointerEvents: 'auto' }}>
          <div 
            className={`inventory-slot ${boostInventory.double > 0 ? 'has-boost' : doubleCharges > 0 ? 'charging' : 'empty'}`} 
            title="Press 1 or Q (needs 3 pickups)"
            onClick={() => gameActions.activateBoostFromInventory('double')}
            style={{ cursor: boostInventory.double > 0 ? 'pointer' : 'default' }}
          >
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
          <div 
            className={`inventory-slot ${boostInventory.shield > 0 ? 'has-boost' : shieldCharges > 0 ? 'charging' : 'empty'}`} 
            title="Press 2 or E (needs 3 pickups)"
            onClick={() => gameActions.activateBoostFromInventory('shield')}
            style={{ cursor: boostInventory.shield > 0 ? 'pointer' : 'default' }}
          >
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
          <div 
            className={`inventory-slot ${boostInventory.magnet > 0 ? 'has-boost' : magnetCharges > 0 ? 'charging' : 'empty'}`} 
            title="Press 3 or R (needs 3 pickups)"
            onClick={() => gameActions.activateBoostFromInventory('magnet')}
            style={{ cursor: boostInventory.magnet > 0 ? 'pointer' : 'default' }}
          >
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
      
      {phase === 'title' && <TitleMenu onShowTutorial={onShowTutorial} />}
      {phase === 'paused' && <PauseMenu />}
      {phase === 'gameover' && <GameOver />}
    </>
  );
}
