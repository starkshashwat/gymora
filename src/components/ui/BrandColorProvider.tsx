'use client';

import { useEffect } from 'react';

interface BrandColorProviderProps {
  initialColor?: string;
}

export default function BrandColorProvider({ initialColor }: BrandColorProviderProps) {
  useEffect(() => {
    // If initialColor provided, apply it immediately
    if (initialColor) {
      document.documentElement.style.setProperty('--brand-color', initialColor);
    } else {
      // Otherwise fetch from settings API
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.settings?.domain?.brand_color) {
            document.documentElement.style.setProperty('--brand-color', data.settings.domain.brand_color);
          }
        })
        .catch(() => {});
    }

    // Listen for real-time settings update events
    const handleSettingsUpdated = () => {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.settings?.domain?.brand_color) {
            document.documentElement.style.setProperty('--brand-color', data.settings.domain.brand_color);
          }
        })
        .catch(() => {});
    };

    window.addEventListener('gym:settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('gym:settings-updated', handleSettingsUpdated);
  }, [initialColor]);

  return null;
}
