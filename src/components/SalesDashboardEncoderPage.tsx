import React from "react";
import { EncoderForm } from "./sales-dashboard/EncoderForm";
import type { SaleEntry } from "../types/sales";

type SalesDashboardEncoderPageProps = {
  onSave: (entry: SaleEntry) => void;
  savedCount: number;
};

export function SalesDashboardEncoderPage({ onSave, savedCount }: SalesDashboardEncoderPageProps) {
  return (
    <div className="w-full max-w-7xl mx-auto">
      <EncoderForm onSave={onSave} savedCount={savedCount} />
    </div>
  );
}
