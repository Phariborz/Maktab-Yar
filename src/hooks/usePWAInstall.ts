import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type MobilePlatform = 'android' | 'ios';

const DISMISS_STORAGE_KEY = 'maktabyar_pwa_prompt_dismissed_v1';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [detectedPlatform, setDetectedPlatform] =
    useState<MobilePlatform>('android');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 1. Detect standalone mode (already added to home screen)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    // 2. Detect iOS (iPhone, iPad, iPod — including iPadOS desktop-class UA)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' &&
        window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    if (isIOSDevice) {
      setDetectedPlatform('ios');
    } else {
      setDetectedPlatform('android');
    }

    // 3. Auto-open customized popup if not installed and not dismissed recently
    if (!isStandalone) {
      const dismissedAt = localStorage.getItem(DISMISS_STORAGE_KEY);
      const shouldShowAutomatically =
        !dismissedAt ||
        Date.now() - Number(dismissedAt) > 1000 * 60 * 60 * 24; // 24 hours cooldown
      if (shouldShowAutomatically) {
        const timer = window.setTimeout(() => {
          setIsOpen(true);
        }, 1200);
        return () => window.clearTimeout(timer);
      }
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsOpen(false);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const dismissPrompt = useCallback((remember = true) => {
    setIsOpen(false);
    if (remember) {
      try {
        localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const openPrompt = useCallback(() => {
    setIsOpen(true);
  }, []);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isAndroid,
    detectedPlatform,
    isOpen,
    openPrompt,
    dismissPrompt,
    install,
  };
}
