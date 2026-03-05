import React, { useState } from "react";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  hidden?: boolean;
};

type FormSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
};

export function FormSelect({ label, value, onChange, options }: FormSelectProps) {
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
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
          backgroundColor: "#FFFFFF",
          color: "#111827",
          fontSize: "14px",
          lineHeight: "20px",
          fontWeight: 400,
        }}
      >
        {options.map((option) => (
          <option
            key={`${option.value}-${option.label}`}
            value={option.value}
            disabled={option.disabled}
            hidden={option.hidden}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}