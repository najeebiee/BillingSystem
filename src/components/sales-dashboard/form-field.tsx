import React from "react";

type FormFieldProps = {
  label: string;
  type?: "text" | "number" | "date";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
};

export function FormField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false
}: FormFieldProps) {
  return (
    <div className="w-full">
      <label className="mb-1.5 block text-sm text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className="h-11 w-full rounded-lg border border-[#D0D5DD] px-3 text-sm outline-none focus:border-[#2E3A8C] disabled:bg-gray-50 disabled:text-gray-400"
      />
    </div>
  );
}
