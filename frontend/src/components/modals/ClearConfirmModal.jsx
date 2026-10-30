import React from 'react';

export default function ClearConfirmModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
          🗑️
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Clear Shortlist?</h3>
          <p className="text-xs text-slate-500 mt-1">
            Are you sure you want to remove all shortlisted items? This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
          >
            Yes, Clear All
          </button>
        </div>
      </div>
    </div>
  );
}