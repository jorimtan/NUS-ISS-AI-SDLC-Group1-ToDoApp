import { useEffect, useState } from 'react';
import { Todo } from '@/lib/db';

interface ReminderNotification {
  todo: Todo;
  minutesUntilDue: number;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isPolling, setIsPolling] = useState(false);

  // Request notification permission
  async function requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    localStorage.setItem('notification_permission_requested', 'true');
    return result === 'granted';
  }

  // Check if permission already granted
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Poll for reminders every 60 seconds
  useEffect(() => {
    if (permission !== 'granted') return;

    let intervalId: NodeJS.Timeout;

    async function checkReminders() {
      try {
        const res = await fetch('/api/notifications/check');
        if (!res.ok) return;

        const data = await res.json();
        
        // Show notification for each reminder
        data.reminders.forEach((reminder: ReminderNotification) => {
          showNotification(reminder);
        });
      } catch (error) {
        console.error('Failed to check reminders:', error);
      }
    }

    // Initial check
    checkReminders();

    // Poll every 60 seconds
    intervalId = setInterval(checkReminders, 60 * 1000);
    setIsPolling(true);

    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [permission]);

  function showNotification(reminder: ReminderNotification) {
    const { todo, minutesUntilDue } = reminder;

    const timeStr = formatMinutes(minutesUntilDue);
    const notification = new Notification('📋 Todo Reminder', {
      body: `${todo.title} is due in ${timeStr}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `todo-${todo.id}`,  // Prevents duplicate notifications
      requireInteraction: false,
    });

    // Click to focus app and scroll to todo
    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Scroll to todo
      const element = document.getElementById(`todo-${todo.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
  }

  function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  return {
    permission,
    requestPermission,
    isPolling,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
  };
}
