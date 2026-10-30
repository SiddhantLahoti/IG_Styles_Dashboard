import React from 'react';

export default function ExportProgressModal({ isOpen, exportType, progress }) {
  if (!isOpen) return null;

  const isCatalogue = exportType === 'catalogue';
  const percent = progress?.percent || 0;
  const current = progress?.current || 0;
  const total = progress?.total || 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold animate-pulse">
            📥
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isCatalogue ? 'Generating Catalogue Grid...' : 'Generating Row-Wise Excel...'}
            </h3>
            <p className="text-xs text-slate-500">Embedding images and formatting cells</p>
          </div>
        </div>

        {/* Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Counter */}
        <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
          <span>
            Processing item <b className="text-indigo-600">{current}</b> of{' '}
            <b className="text-slate-900">{total}</b>
          </span>
          <span className="font-bold text-indigo-700">{percent}%</span>
        </div>
      </div>
    </div>
  );
}