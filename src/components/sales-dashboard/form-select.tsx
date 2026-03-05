import React from "react";

type FormSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
};

export function FormSelect({
  label,
  value,
  onChange,
  options,
  disabled = false
}: FormSelectProps) {
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-11 w-full rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm outline-none focus:border-[#2E3A8C] disabled:bg-gray-50 disabled:text-gray-400"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
