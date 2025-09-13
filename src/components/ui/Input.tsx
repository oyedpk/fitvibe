import React from "react";

export function Input({
  label,
  value,
  onChange,
  placeholder = "",
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`text-sm ${className}`}>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <input
        className="w-full rounded-xl border px-3 py-2 shadow-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
