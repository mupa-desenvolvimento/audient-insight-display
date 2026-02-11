import { useState, useEffect } from 'react';
import { INITIAL_SLIDES } from '@/data/presentation-slides';

export interface PresentationConfig {
  showLite: boolean;
  showFlow: boolean;
  showInsight: boolean;
  showImpact: boolean;
  showComparison: boolean;
  showDetails: boolean;
  slideOrder: number[];
}

const DEFAULT_CONFIG: PresentationConfig = {
  showLite: true,
  showFlow: true,
  showInsight: true,
  showImpact: true,
  showComparison: true,
  showDetails: true,
  slideOrder: INITIAL_SLIDES.map(s => s.id),
};

const STORAGE_KEY = 'mupa_presentation_config';

export const usePresentationConfig = () => {
  const [config, setConfig] = useState<PresentationConfig>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const currentConfig = stored ? JSON.parse(stored) : DEFAULT_CONFIG;
    
    // Ensure slideOrder is synchronized with available slides
    const currentSlideIds = INITIAL_SLIDES.map(s => s.id);
    const storedOrder = currentConfig.slideOrder || [];
    
    // 1. Keep only IDs that still exist
    const validStoredOrder = storedOrder.filter((id: number) => currentSlideIds.includes(id));
    
    // 2. Add any new IDs that are missing from stored order
    const newIds = currentSlideIds.filter(id => !validStoredOrder.includes(id));
    
    const finalOrder = [...validStoredOrder, ...newIds];
    
    // Return config with guaranteed slideOrder
    return { ...currentConfig, slideOrder: finalOrder };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    
    // Dispatch a custom event so other components (like PlansSection) update immediately
    window.dispatchEvent(new Event('presentation-config-changed'));
  }, [config]);

  // Listen for changes from other components/tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    };

    window.addEventListener('presentation-config-changed', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('presentation-config-changed', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const toggleOption = (key: keyof PresentationConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateConfig = (newConfig: Partial<PresentationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  return {
    config,
    toggleOption,
    updateConfig
  };
};
