import React from "react";

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  className = "",
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <label className={`text-sm ${className}`}>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <select
        className="w-full rounded-xl border px-3 py-2 shadow-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
