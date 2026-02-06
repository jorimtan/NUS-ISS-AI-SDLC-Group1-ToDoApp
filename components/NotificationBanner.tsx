'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';

export function NotificationBanner() {
  const { permission, requestPermission, isSupported } = useNotifications();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner if permission not granted and not previously dismissed
    const dismissed = localStorage.getItem('notification_banner_dismissed');
    if (permission === 'default' && !dismissed && isSupported) {
      setIsVisible(true);
    }
  }, [permission, isSupported]);

  async function handleEnable() {
    const granted = await requestPermission();
    if (granted) {
      setIsVisible(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem('notification_banner_dismissed', 'true');
    setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white px-4 py-3 shadow-lg">
      <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔔</span>
          <div>
            <p className="font-semibold">Enable notifications?</p>
            <p className="text-sm text-blue-100">
              Get reminded about upcoming todos
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEnable}
            className="px-4 py-2 bg-white text-blue-600 font-semibold rounded hover:bg-blue-50"
          >
            Enable
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-white hover:bg-blue-700 rounded"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
