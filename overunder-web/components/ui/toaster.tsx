'use client';

import { useState, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

let toastQueue: Toast[] = [];
let setToasts: ((toasts: Toast[]) => void) | null = null;

export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const newToast: Toast = {
    id: Math.random().toString(36).substr(2, 9),
    message,
    type,
  };
  
  toastQueue = [...toastQueue, newToast];
  
  if (setToasts) {
    setToasts([...toastQueue]);
  }
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== newToast.id);
    if (setToasts) {
      setToasts([...toastQueue]);
    }
  }, 3000);
}

export function Toaster() {
  const [toasts, updateToasts] = useState<Toast[]>([]);
  
  useEffect(() => {
    setToasts = updateToasts;
    return () => {
      setToasts = null;
    };
  }, []);
  
  if (toasts.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-lg shadow-lg max-w-sm ${
            toast.type === 'success' 
              ? 'bg-green-500 text-white' 
              : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
} 