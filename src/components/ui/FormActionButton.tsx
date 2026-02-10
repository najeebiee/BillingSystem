import React from "react";

type FormActionButtonProps = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function FormActionButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  ariaLabel,
}: FormActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={["btn-pill", "no-print", className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}
