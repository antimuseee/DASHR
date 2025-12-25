import { useState, useEffect } from 'react';

const TUTORIAL_SEEN_KEY = 'trench-runner-tutorial-seen';

interface TutorialStep {
  title: string;
  content: string;
  icon?: string;
  highlight?: string; // CSS class or element to highlight
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Trench Runner!",
    content: "Survive the crypto trenches, collect coins, and avoid rug pulls. The longer you survive, the bigger your gains!",
    icon: "🏃‍♂️"
  },
  {
    title: "Controls",
    content: "Desktop: Arrow keys or WASD to switch lanes. Space/Up/W to jump, Down/S to slide.\n\nMobile: Swipe left/right to change lanes, swipe up to jump, swipe down to slide.",
    icon: "🎮"
  },
  {
    title: "Collect Coins",
    content: "Grab coins to increase your score. Collect them quickly in succession to build your combo multiplier for massive point gains!",
    icon: "🪙"
  },
  {
    title: "Power-Up Boosts",
    content: "⚡ 2X Boost - Doubles your combo gains\n🛡️ Shield - Protects from one hit\n🧲 Magnet - Attracts nearby coins\n\nCollect 3 of each type to activate!",
    icon: "⚡"
  },
  {
    title: "Avoid Obstacles",
    content: "🚫 RUG PULL - Jump over or slide under these scam obstacles\n⬛ PITS - Gaps in the floor. Jump to avoid falling!",
    icon: "⚠️"
  },
  {
    title: "Whale Wallet Tracker",
    content: "Survive long enough and the WHALE WALLET TRACKER activates! The chart goes vertical as a whale enters your position...",
    icon: "🐋"
  },
  {
    title: "⚠️ Whale Manipulation!",
    content: "When the whale appears, YOUR CONTROLS GET REVERSED! Left becomes right, right becomes left. The whale is manipulating the market... can you survive?",
    icon: "🔄"
  },
  {
    title: "Holder Perks",
    content: "Connect your wallet and hold tokens to unlock exclusive skins, trails, and badges! Higher tiers = more rewards.\n\n🥉 Bronze → 🥈 Silver → 🥇 Gold → 💎 Diamond",
    icon: "👛"
  },
  {
    title: "Ready to Run!",
    content: "You're ready to dive into the trenches. Survive as long as you can and climb the leaderboard!\n\nGood luck, degen! 🚀",
    icon: "🎯"
  }
];

interface TutorialProps {
  onComplete: () => void;
  forceShow?: boolean; // For testing or manual trigger
}

export function hasTutorialBeenSeen(): boolean {
  return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true';
}

export function markTutorialAsSeen(): void {
  localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
}

export function resetTutorial(): void {
  localStorage.removeItem(TUTORIAL_SEEN_KEY);
}

export default function Tutorial({ onComplete, forceShow }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  
  console.log('[Tutorial] Rendering, forceShow:', forceShow, 'step:', currentStep);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    console.log('[Tutorial] Completing - marking as seen and calling onComplete');
    setIsExiting(true);
    markTutorialAsSeen();
    // Small delay for exit animation, then notify parent to unmount
    setTimeout(() => {
      console.log('[Tutorial] Calling onComplete callback');
      onComplete();
    }, 300);
  };
  
  // Cleanup effect to ensure component is properly removed
  useEffect(() => {
    return () => {
      console.log('[Tutorial] Component unmounting');
    };
  }, []);

  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className={`tutorial-overlay ${isExiting ? 'tutorial-exit' : ''}`}>
      <div className="tutorial-backdrop" onClick={handleSkip} />
      
      <div className="tutorial-container">
        {/* Skip button - always visible */}
        <button className="tutorial-skip" onClick={handleSkip}>
          Skip Tutorial →
        </button>

        {/* Progress indicator */}
        <div className="tutorial-progress">
          {tutorialSteps.map((_, index) => (
            <div 
              key={index}
              className={`tutorial-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="tutorial-content">
          <div className="tutorial-icon">{step.icon}</div>
          <h2 className="tutorial-title">{step.title}</h2>
          <p className="tutorial-text">{step.content}</p>
        </div>

        {/* Navigation buttons */}
        <div className="tutorial-nav">
          <button 
            className="tutorial-btn tutorial-btn-secondary"
            onClick={handlePrevious}
            disabled={isFirstStep}
            style={{ opacity: isFirstStep ? 0.3 : 1 }}
          >
            ← Back
          </button>
          
          <span className="tutorial-step-count">
            {currentStep + 1} / {tutorialSteps.length}
          </span>

          <button 
            className="tutorial-btn tutorial-btn-primary"
            onClick={handleNext}
          >
            {isLastStep ? "Let's Go! 🚀" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

