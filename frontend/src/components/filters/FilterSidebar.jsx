import React, { useState, useEffect } from 'react';
import MultiSelectDropdown from './MultiSelectDropdown';

// Helper component that keeps local state and only triggers on Enter or Blur
function BufferedInput({ value, onChange, placeholder, step = '0.001', type = 'number', className = '' }) {
  const [localVal, setLocalVal] = useState(value ?? '');

  // Keep in sync when filters are reset externally
  useEffect(() => {
    setLocalVal(value ?? '');
  }, [value]);

  const commitChange = () => {
    if (localVal !== (value ?? '')) {
      onChange(localVal);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      commitChange();
      e.target.blur();
    }
  };

  return (
    <input
      type={type}
      step={step}
      placeholder={placeholder}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={commitChange}
      onKeyDown={handleKeyDown}
      className={`text-xs border border-slate-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className}`}
    />
  );
}

export default function FilterSidebar({
  options = {},
  filters = {},
  onFilterChange,
  onReset,
  onShortlistAllFiltered,
  shortlistAllBtnText,
}) {
  return (
    <aside className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 h-fit">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b">
        <h2 className="font-semibold text-sm uppercase text-slate-700 tracking-wider">Filters</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-indigo-600 hover:underline font-medium cursor-pointer"
        >
          Reset All
        </button>
      </div>

      {/* Lab Grown / Diamond Origin Filter */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
          Diamond Origin
        </label>
        <div className="grid grid-cols-3 gap-1 text-xs">
          {[
            { label: 'All', value: '' },
            { label: 'Natural', value: 'natural' },
            { label: 'Lab Grown', value: 'lab_grown' },
          ].map((option) => {
            const isSelected = (filters.lab_grown || '') === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onFilterChange('lab_grown', option.value)}
                className={`py-1 px-1.5 rounded text-center font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Image Source Filter */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
          Image Source
        </label>
        <div className="grid grid-cols-4 gap-1 text-[11px]">
          {[
            { label: 'All', value: '' },
            { label: '500x500', value: 'primary' },
            { label: 'Sketch', value: 'secondary' },
            { label: 'Missing', value: 'none' },
          ].map((option) => {
            const isSelected = (filters.image_source || '') === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onFilterChange('image_source', option.value)}
                className={`py-1 px-1 rounded text-center font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Creation Date Range */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Creation Date</label>
        <div className="grid grid-cols-2 gap-2">
          <BufferedInput
            type="date"
            value={filters.start_date || ''}
            onChange={(val) => onFilterChange('start_date', val)}
            className="w-full"
          />
          <BufferedInput
            type="date"
            value={filters.end_date || ''}
            onChange={(val) => onFilterChange('end_date', val)}
            className="w-full"
          />
        </div>
      </div>

      {/* File A Filters */}
      <MultiSelectDropdown
        label="Category"
        defaultLabel="All Categories"
        options={options.categories || []}
        selected={filters.category || []}
        onChange={(val) => onFilterChange('category', val)}
      />

      <MultiSelectDropdown
        label="Sales Category 1"
        defaultLabel="All Sales Cat 1"
        options={options.sales_categories1 || []}
        selected={filters.sales_cat1 || []}
        onChange={(val) => onFilterChange('sales_cat1', val)}
      />

      <MultiSelectDropdown
        label="Sales Category 2"
        defaultLabel="All Sales Cat 2"
        options={options.sales_categories2 || []}
        selected={filters.sales_cat2 || []}
        onChange={(val) => onFilterChange('sales_cat2', val)}
      />

      <MultiSelectDropdown
        label="Collection"
        defaultLabel="All Brands"
        options={options.brands || []}
        selected={filters.brand || []}
        onChange={(val) => onFilterChange('brand', val)}
      />

      {/* File B Raw Material Divider */}
      <div className="pt-3 border-t border-slate-200">
        <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block mb-2">
          💎 Raw Materials
        </span>
      </div>
          {/* Only Diamonds Checkbox */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(filters.only_diamonds)}
            onChange={(e) => onFilterChange('only_diamonds', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-bold text-slate-800 block leading-tight">
              Only Diamonds
            </span>
            <span className="text-[10px] text-slate-500 block leading-tight">
              Strictly D, zero C (color stones)
            </span>
          </div>
        </label>
      </div>
      
      <MultiSelectDropdown
        label="Primary Raw Material"
        defaultLabel="All Types"
        maxHeightClass="max-h-36"
        options={options.rm_categories || []}
        selected={filters.rm_category || []}
        onChange={(val) => onFilterChange('rm_category', val)}
      />

      <MultiSelectDropdown
        label="Raw Material Sub Category"
        defaultLabel="All Shapes"
        options={options.rm_subcategories || []}
        selected={filters.rm_subcategory || []}
        onChange={(val) => onFilterChange('rm_subcategory', val)}
      />

      {/* Sieve Match Mode */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
            Sieve Filter Mode
          </label>
          <span 
            className="text-[11px] text-slate-400 cursor-help px-1 rounded hover:text-slate-600"
            title="Contains: Shows pieces containing this sieve alongside other stone sizes.&#10;Exclusive: Shows pieces containing strictly this sieve size and no other stone sizes."
          >
            ⓘ
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <button
            type="button"
            onClick={() => onFilterChange('sieve_match_mode', 'any')}
            className={`py-1 px-1.5 rounded text-center font-medium transition-all cursor-pointer ${
              (filters.sieve_match_mode || 'any') === 'any'
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Contains
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('sieve_match_mode', 'exclusive')}
            className={`py-1 px-1.5 rounded text-center font-medium transition-all cursor-pointer ${
              filters.sieve_match_mode === 'exclusive'
                ? 'bg-amber-600 text-white shadow-sm font-bold'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Only This Sieve
          </button>
        </div>
        {filters.sieve_match_mode === 'exclusive' && (filters.ln1 || filters.ln2) && (
          <p className="text-[10px] text-amber-700 font-medium">
            ⚡ Showing designs where 100% of stones match this sieve.
          </p>
        )}
      </div>
    
      {/* Sieve Sizes */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Sieve 1 (Ln1)</label>
          <BufferedInput
            placeholder="e.g. 1.50"
            value={filters.ln1 ?? ''}
            onChange={(val) => onFilterChange('ln1', val)}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Sieve 2 (Ln2)</label>
          <BufferedInput
            placeholder="e.g. 2.00"
            value={filters.ln2 ?? ''}
            onChange={(val) => onFilterChange('ln2', val)}
            className="w-full"
          />
        </div>
      </div>

      {/* Total Stone Weight */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Total Stone Weight (CT)</label>
        <div className="grid grid-cols-2 gap-2">
          <BufferedInput
            placeholder="Min"
            value={filters.min_rm_wt ?? ''}
            onChange={(val) => onFilterChange('min_rm_wt', val)}
            className="w-full"
          />
          <BufferedInput
            placeholder="Max"
            value={filters.max_rm_wt ?? ''}
            onChange={(val) => onFilterChange('max_rm_wt', val)}
            className="w-full"
          />
        </div>
      </div>

      {/* Pointed Weight */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-slate-600">Pointer Weight (Ct / Stone)</label>
          <span
            className="text-[11px] text-slate-400 cursor-help px-1 rounded hover:text-slate-600"
            title="Filters designs containing individual stones whose per-stone weight (RmWt ÷ RmQty) falls in this range."
          >
            ⓘ
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <BufferedInput
            placeholder="Min"
            value={filters.min_pointed_wt ?? ''}
            onChange={(val) => onFilterChange('min_pointed_wt', val)}
            className="w-full"
          />
          <BufferedInput
            placeholder="Max"
            value={filters.max_pointed_wt ?? ''}
            onChange={(val) => onFilterChange('max_pointed_wt', val)}
            className="w-full"
          />
        </div>
      </div>

      {/* Metal & Color Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MultiSelectDropdown
          label="Metal"
          defaultLabel="All"
          maxHeightClass="max-h-36"
          options={options.metals || []}
          selected={filters.metal || []}
          onChange={(val) => onFilterChange('metal', val)}
        />
        <MultiSelectDropdown
          label="Color"
          defaultLabel="All"
          maxHeightClass="max-h-36"
          options={options.colors || []}
          selected={filters.color || []}
          onChange={(val) => onFilterChange('color', val)}
        />
      </div>

      <MultiSelectDropdown
        label="Tone"
        defaultLabel="All Tones"
        options={options.tones || []}
        selected={filters.tone || []}
        onChange={(val) => onFilterChange('tone', val)}
      />

      {/* Set Code Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <label className="text-xs font-semibold text-slate-700">Set Code</label>
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(filters.has_set)}
              onChange={(e) => {
                const checked = e.target.checked;
                onFilterChange('has_set', checked);
                if (checked) {
                  onFilterChange('set_cd', []);
                }
              }}
              className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            Part of a set
          </label>
        </div>

        <div className={filters.has_set ? 'opacity-40 pointer-events-none' : ''}>
          <MultiSelectDropdown
            label=""
            defaultLabel={filters.has_set ? "All Set Codes (Any)" : "All Set Codes"}
            options={options.set_codes || []}
            selected={filters.set_cd || []}
            onChange={(val) => onFilterChange('set_cd', val)}
          />
        </div>
      </div>

      <MultiSelectDropdown
        label="Customer"
        defaultLabel="All Customers"
        options={options.customers || []}
        selected={filters.customer || []}
        onChange={(val) => onFilterChange('customer', val)}
      />

      <MultiSelectDropdown
        label="Model Size"
        defaultLabel="All Sizes"
        maxHeightClass="max-h-40"
        options={options.sizes || []}
        selected={filters.size || []}
        onChange={(val) => onFilterChange('size', val)}
      />

      <MultiSelectDropdown
        label="Concept Designer"
        defaultLabel="All Concept By"
        options={options.concept_designers || []}
        selected={filters.concept_by || []}
        onChange={(val) => onFilterChange('concept_by', val)}
      />

      <MultiSelectDropdown
        label="Creative Designer"
        defaultLabel="All Creative By"
        options={options.creative_designers || []}
        selected={filters.creative_by || []}
        onChange={(val) => onFilterChange('creative_by', val)}
      />

      <MultiSelectDropdown
        label="Weight Designer"
        defaultLabel="All Weight By"
        options={options.weight_designers || []}
        selected={filters.weight_by || []}
        onChange={(val) => onFilterChange('weight_by', val)}
      />

      {/* Total Weight Min/Max */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Total Weight (g)</label>
        <div className="grid grid-cols-2 gap-2">
          <BufferedInput
            placeholder="Min"
            value={filters.min_total_wt ?? ''}
            onChange={(val) => onFilterChange('min_total_wt', val)}
            className="w-full"
          />
          <BufferedInput
            placeholder="Max"
            value={filters.max_total_wt ?? ''}
            onChange={(val) => onFilterChange('max_total_wt', val)}
            className="w-full"
          />
        </div>
      </div>

      {/* Wax Weight Min/Max */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Wax Weight (g)</label>
        <div className="grid grid-cols-2 gap-2">
          <BufferedInput
            placeholder="Min"
            value={filters.min_wax_wt ?? ''}
            onChange={(val) => onFilterChange('min_wax_wt', val)}
            className="w-full"
          />
          <BufferedInput
            placeholder="Max"
            value={filters.max_wax_wt ?? ''}
            onChange={(val) => onFilterChange('max_wax_wt', val)}
            className="w-full"
          />
        </div>
      </div>
    </aside>
  );
}