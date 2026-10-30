import React, { useEffect, useState } from 'react';
import { getSyncStatus } from '../services/api';

export default function InitialLoader({ onReady }) {
  const [statusText, setStatusText] = useState('Initializing catalog engine...');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    let timer;

    async function pollStatus() {
      try {
        const data = await getSyncStatus();
        if (data.is_ready) {
          setStatusText(`Loaded ${data.records?.toLocaleString() || 0} items & ${data.images?.toLocaleString() || 0} images!`);
          setFadeOut(true);
          setTimeout(() => {
            onReady(data);
          }, 500);
          return;
        } else {
          setStatusText(data.step || 'Reading catalog files...');
        }
      } catch (err) {
        setStatusText('Waiting for server connection...');
      }

      timer = setTimeout(pollStatus, 1000);
    }

    pollStatus();

    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
        <span className="absolute text-2xl animate-pulse">💎</span>
      </div>
      <h3 className="text-base font-bold text-slate-800 mt-4 tracking-wide">Syncing Catalog Data</h3>
      <p className="text-xs text-slate-500 mt-1">{statusText}</p>
    </div>
  );
}