import React, { useLayoutEffect, useRef } from "react";

type AutoGrowTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number;
  maxHeight?: number;
};

export function AutoGrowTextarea({
  value,
  onChange,
  className = "",
  minRows = 3,
  maxHeight = 220,
  ...props
}: AutoGrowTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.rows = minRows;
    textarea.style.height = "auto";

    const nextHeight = textarea.scrollHeight;
    if (nextHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.height = `${nextHeight}px`;
      textarea.style.overflowY = "hidden";
    }
  };

  useLayoutEffect(() => {
    syncHeight();
  }, [value, minRows, maxHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => {
        onChange?.(event);
        syncHeight();
      }}
      className={`textarea-auto-grow ${className}`.trim()}
      {...props}
    />
  );
}
