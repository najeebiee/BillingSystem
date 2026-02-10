export function formatMoneyPHP(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  return `PHP ${Number.isFinite(amount) ? amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) : "0.00"}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

export function labelPaymentMethod(value: string | null | undefined): string {
  switch (value) {
    case "bank_transfer":
      return "Bank Transfer";
    case "check":
      return "Check";
    case "cash":
      return "Cash";
    case "other":
      return "Other";
    default:
      return value || "-";
  }
}
