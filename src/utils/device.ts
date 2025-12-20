// Device detection utility for platform-specific game adjustments

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
}

export function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent.toLowerCase();
  
  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 || 
    // @ts-ignore - for older browsers
    navigator.msMaxTouchPoints > 0;
  
  // Mobile detection via user agent
  const mobileKeywords = /android|webos|iphone|ipod|blackberry|iemobile|opera mini|mobile/i;
  const tabletKeywords = /ipad|tablet|playbook|silk/i;
  
  const isMobileUA = mobileKeywords.test(ua);
  const isTabletUA = tabletKeywords.test(ua) || (ua.includes('android') && !ua.includes('mobile'));
  
  // Screen size based detection (backup)
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const smallScreen = Math.min(screenWidth, screenHeight) < 768;
  
  // Combine checks
  const isMobile = (isMobileUA || (hasTouch && smallScreen)) && !isTabletUA;
  const isTablet = isTabletUA || (hasTouch && !smallScreen && Math.min(screenWidth, screenHeight) < 1024);
  const isDesktop = !isMobile && !isTablet;
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    hasTouch,
    screenWidth,
    screenHeight,
    pixelRatio: window.devicePixelRatio || 1,
  };
}

// Platform-specific game settings
export interface PlatformSettings {
  // Gameplay
  baseSpeed: number;
  speedMultiplier: number;
  laneWidth: number;
  collectibleSize: number;
  obstacleSize: number;
  hitboxPadding: number; // Extra forgiveness on collision
  
  // Spawning
  collectibleSpawnRate: number;
  obstacleSpawnRate: number;
  boostSpawnDistance: { min: number; max: number };
  
  // Controls
  swipeSensitivity: number;
  doubleTapWindow: number;
  
  // UI
  uiScale: number;
  fontSize: number;
  buttonSize: number;
}

export function getPlatformSettings(device: DeviceInfo): PlatformSettings {
  if (device.isMobile) {
    return {
      // Slightly slower, more forgiving for mobile
      baseSpeed: 180,
      speedMultiplier: 0.9,
      laneWidth: 100,
      collectibleSize: 1.3, // Bigger targets
      obstacleSize: 0.9, // Slightly smaller obstacles
      hitboxPadding: 15, // More forgiving collisions
      
      // More generous spawning
      collectibleSpawnRate: 0.8,
      obstacleSpawnRate: 0.85,
      boostSpawnDistance: { min: 400, max: 800 },
      
      // Touch controls
      swipeSensitivity: 30,
      doubleTapWindow: 300,
      
      // Larger UI
      uiScale: 1.2,
      fontSize: 16,
      buttonSize: 60,
    };
  }
  
  if (device.isTablet) {
    return {
      baseSpeed: 190,
      speedMultiplier: 0.95,
      laneWidth: 110,
      collectibleSize: 1.15,
      obstacleSize: 0.95,
      hitboxPadding: 10,
      
      collectibleSpawnRate: 0.9,
      obstacleSpawnRate: 0.9,
      boostSpawnDistance: { min: 500, max: 1000 },
      
      swipeSensitivity: 40,
      doubleTapWindow: 280,
      
      uiScale: 1.1,
      fontSize: 14,
      buttonSize: 50,
    };
  }
  
  // Desktop - original settings
  return {
    baseSpeed: 200,
    speedMultiplier: 1.0,
    laneWidth: 120,
    collectibleSize: 1.0,
    obstacleSize: 1.0,
    hitboxPadding: 5,
    
    collectibleSpawnRate: 1.0,
    obstacleSpawnRate: 1.0,
    boostSpawnDistance: { min: 600, max: 1000 },
    
    swipeSensitivity: 50,
    doubleTapWindow: 250,
    
    uiScale: 1.0,
    fontSize: 12,
    buttonSize: 40,
  };
}

// Singleton instances
let cachedDevice: DeviceInfo | null = null;
let cachedSettings: PlatformSettings | null = null;

export function getDevice(): DeviceInfo {
  if (!cachedDevice) {
    cachedDevice = detectDevice();
    console.log('[Device]', cachedDevice.isMobile ? 'Mobile' : cachedDevice.isTablet ? 'Tablet' : 'Desktop', cachedDevice);
  }
  return cachedDevice;
}

export function getSettings(): PlatformSettings {
  if (!cachedSettings) {
    cachedSettings = getPlatformSettings(getDevice());
    console.log('[Platform Settings]', cachedSettings);
  }
  return cachedSettings;
}

// Re-detect on resize (for orientation changes)
export function refreshDevice(): void {
  cachedDevice = detectDevice();
  cachedSettings = getPlatformSettings(cachedDevice);
}

