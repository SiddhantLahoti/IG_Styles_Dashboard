import React, { useState, useRef, useEffect } from 'react';

export default function MultiSelectDropdown({
  label,
  defaultLabel,
  options = [],
  selected = [],
  onChange,
  maxHeightClass = 'max-h-48',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter((item) => item !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const filteredOptions = options.filter((opt) =>
    String(opt).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const count = selected.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {label && <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>}

      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full text-left text-xs bg-white border border-slate-300 rounded-lg p-2.5 flex justify-between items-center hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <span
          className={`truncate ${
            count === 0 ? 'text-slate-500' : 'text-indigo-600 font-semibold'
          }`}
        >
          {count === 0 ? defaultLabel : `${count} selected`}
        </span>
        <span className="text-[10px] text-slate-400">▼</span>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-2 space-y-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full text-xs border border-slate-200 rounded p-1.5 mb-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <div className={`${maxHeightClass} overflow-y-auto space-y-1 text-xs pr-1`}>
            {filteredOptions.length === 0 ? (
              <div className="text-slate-400 p-2 text-center text-[11px]">No matches</div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selected.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 rounded cursor-pointer select-none text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOption(opt)}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span className="truncate">{opt}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}