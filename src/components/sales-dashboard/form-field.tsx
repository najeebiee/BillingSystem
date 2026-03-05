import React, { useState } from "react";

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
  readOnly = false,
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <label className="block">
      <span
        className="block mb-2"
        style={{
          color: "#374151",
          fontSize: "14px",
          lineHeight: "20px",
          fontWeight: 400,
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full px-3"
        style={{
          height: "44px",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: isFocused ? "#2E3A8C" : "#D0D5DD",
          borderRadius: "8px",
          outline: "none",
          backgroundColor: disabled ? "#F9FAFB" : "#FFFFFF",
          color: disabled ? "#9CA3AF" : "#111827",
          fontSize: "14px",
          lineHeight: "20px",
          fontWeight: 400,
        }}
      />
    </label>
  );
}