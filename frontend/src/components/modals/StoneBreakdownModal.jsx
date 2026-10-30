import React, { useState, useEffect } from 'react';
import { getRmDetails } from '../../services/api';

export default function StoneBreakdownModal({ isOpen, onClose, styleCode }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ items: [], total_stones_wt: 0, total_stones_qty: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !styleCode) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getRmDetails(styleCode)
      .then((res) => {
        if (isMounted) {
          setData(res || { items: [], total_stones_wt: 0, total_stones_qty: 0 });
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load details');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, styleCode]);

  if (!isOpen || !styleCode) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>💎 Stone Breakdown</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
                {styleCode}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Total Stone Carats: {data.total_stones_wt || 0} CT • Total Stones: {data.total_stones_qty || 0}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Table */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Shape</th>
                <th className="p-2.5">Sieve (Ln1 - Ln2)</th>
                <th className="p-2.5">Qty</th>
                <th className="p-2.5 text-right">Carats (Wt)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-slate-400">
                    Loading breakdown...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-rose-500">
                    {error}
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-slate-400">
                    No stone details found for this style in File B.
                  </td>
                </tr>
              ) : (
                data.items.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-bold">{r.Ctg || '-'}</td>
                    <td className="p-2.5">{r.SubCtg || '-'}</td>
                    <td className="p-2.5 font-mono text-[11px]">
                      {r.Ln1} - {r.Ln2}
                    </td>
                    <td className="p-2.5">{r.RmQty || 0}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">{r.RmWt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}