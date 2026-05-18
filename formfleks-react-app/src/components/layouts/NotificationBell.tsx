import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useSignalR } from '../../hooks/useSignalR';
import type { AppNotification } from '../../hooks/useSignalR';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

export const NotificationBell: React.FC = () => {
  const { notifications, setNotifications } = useSignalR();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get<AppNotification[]>('/notifications/my?limit=20');
        setNotifications(response.data);
      } catch (error) {
        console.error('Failed to load notifications', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [setNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string, actionUrl?: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      
      if (actionUrl) {
        setIsOpen(false);
        navigate(actionUrl);
      }
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.isRead);
    for (const notif of unreadNotifs) {
      await api.post(`/notifications/${notif.id}/read`);
    }
    setNotifications([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-brand-gray hover:bg-surface-muted rounded-full transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-danger text-[9px] font-bold text-white ring-2 ring-white dark:ring-surface-base">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[80vh] overflow-hidden flex flex-col bg-white dark:bg-surface-base rounded-xl shadow-xl border border-surface-muted z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-surface-muted flex justify-between items-center bg-surface-muted/30">
            <h3 className="font-semibold text-brand-dark">Bildirimler</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-brand-primary hover:underline font-medium flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Tümü Okundu
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center text-brand-gray text-sm">Yükleniyor...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-brand-gray flex flex-col items-center">
                <Bell className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Henüz bildiriminiz yok.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif.id, notif.actionUrl)}
                    className={`p-4 border-b border-surface-muted/50 hover:bg-surface-muted/50 cursor-pointer transition-colors relative ${!notif.isRead ? 'bg-brand-primary/5 dark:bg-brand-primary/10' : ''}`}
                  >
                    {!notif.isRead && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary rounded-r-full" />
                    )}
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-sm ${!notif.isRead ? 'font-semibold text-brand-dark' : 'font-medium text-brand-gray'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-brand-gray shrink-0 mt-0.5 ml-2">
                        {new Date(notif.createdAt).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-brand-gray line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                    {notif.actionUrl && (
                      <div className="mt-2 text-[10px] font-medium text-brand-primary flex items-center gap-1">
                        Detaya Git <ExternalLink className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 border-t border-surface-muted text-center bg-surface-muted/20">
            <button 
              onClick={() => setIsOpen(false)}
              className="text-xs text-brand-gray hover:text-brand-dark transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
