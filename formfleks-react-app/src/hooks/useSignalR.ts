import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuthStore } from '../store/useAuthStore';
import { notify } from '../lib/notifications';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: string;
  isRead: boolean;
}

export const useSignalR = () => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (connection) {
        connection.stop();
      }
      return;
    }

    // Connect to the SignalR Hub
    const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : '';
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${baseUrl}/hubs/notification`, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (connection) {
      // Event handler'ı start() dışında kaydetmek en güvenli yöntemdir (React Strict Mode uyumluluğu için)
      connection.on('ReceiveNotification', (notification: AppNotification) => {
        console.log('🔔 MUC-DEBUG: SignalR Notification Received!', notification);
        // Update local state
        setNotifications((prev) => [notification, ...prev]);

        // Show Toast
        notify.info(`${notification.title}: ${notification.message}`);
      });

      if (connection.state === signalR.HubConnectionState.Disconnected) {
        connection.start()
          .then(() => console.log('SignalR Connected.'))
          .catch(e => console.error('SignalR Connection Error: ', e));
      }
    }

    return () => {
      if (connection) {
        connection.off('ReceiveNotification');
      }
    };
  }, [connection]);

  return { connection, notifications, setNotifications };
};
