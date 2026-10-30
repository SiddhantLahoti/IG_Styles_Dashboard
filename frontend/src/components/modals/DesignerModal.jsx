import React from 'react';

export default function DesignerModal({ isOpen, onClose, item }) {
  if (!isOpen || !item) return null;

  const styleCode = item.Dmcd || item.drcd || '-';

  const rows = [
    { label: 'Concept Designer 1', value: item.ConByDesc },
    { label: 'Concept Designer 2', value: item.ConByDesc1 },
    { label: 'Creative Designer 1', value: item.CreatByDesc },
    { label: 'Creative Designer 2', value: item.CreatByDesc1 },
    { label: 'Weight Designer 1', value: item.WetByDesc },
    { label: 'Weight Designer 2', value: item.WetByDesc1 },
  ];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>👤 Design Team</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
                {styleCode}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Assigned concept, creative, and weight designers</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 6 Designer Attributes */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
          {rows.map((row, idx) => (
            <div key={idx} className="flex justify-between items-center p-2.5 hover:bg-slate-50">
              <span className="text-slate-500 font-medium">{row.label}</span>
              <span className="text-slate-900 font-bold">{row.value || '-'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}