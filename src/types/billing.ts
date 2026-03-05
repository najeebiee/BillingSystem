export type BillStatus =
  | "draft"
  | "awaiting_approval"
  | "rejected"
  | "approved"
  | "paid"
  | "void";

export type PriorityLevel = "urgent" | "high" | "standard" | "low";

export type PaymentMethod = "bank_transfer" | "check" | "cash" | "other";

export interface Vendor {
  id: string;
  name: string;
  address?: string | null;
}

export interface Bill {
  id: string;
  vendor_id: string;
  reference_no: string;
  request_date: string;
  priority_level: PriorityLevel;
  payment_method: PaymentMethod;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_no?: string | null;
  status: BillStatus;
  remarks?: string | null;
  rejection_reason?: string | null;
  total_amount: number;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface BillBreakdown {
  id?: string;
  bill_id: string;
  payment_method: PaymentMethod;
  description?: string | null;
  amount: number;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_no?: string | null;
}

export interface BillAttachment {
  id: string;
  bill_id: string;
  file_path: string;
  file_name: string;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_by?: string | null;
  created_at?: string;
}

export interface BillDetails {
  bill: Bill;
  vendor: Vendor;
  breakdowns: BillBreakdown[];
  attachments: BillAttachment[];
}
