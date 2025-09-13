import React from "react";

export function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  className = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  className?: string;
}) {
  return (
    <label className={`text-sm ${className}`}>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <input
        type="number"
        className="w-full rounded-xl border px-3 py-2 shadow-sm"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
