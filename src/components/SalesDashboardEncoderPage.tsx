import React from "react";
import { EncoderForm } from "./sales-dashboard/EncoderForm";

export function SalesDashboardEncoderPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">New Sale Entry</h1>
        <p className="text-sm text-gray-600">Encode sale transactions.</p>
      </div>
      <EncoderForm />
    </div>
  );
}
