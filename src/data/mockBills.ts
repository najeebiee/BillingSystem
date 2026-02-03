export interface PaymentBreakdown {
  category: string;
  description: string;
  amount: number;
}

export interface Bill {
  id: string;
  date: string;
  reference: string;
  vendor: string;
  purpose: string;
  paymentMethod: string;
  priority: "Urgent" | "High" | "Standard" | "Low";
  amount: number;
  status: "Draft" | "Awaiting Approval" | "Approved" | "Paid" | "Void";
  requestedBy: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  breakdowns: PaymentBreakdown[];
  reasonForPayment: string;
  attachments: string[];
  checkedBy?: string;
  approvedBy?: string;
  submittedDate?: string;
  approvedDate?: string;
}

export const mockBills: Bill[] = [
  {
    id: "1",
    date: "01/28/2026",
    reference: "PRF-012826-004",
    vendor: "Kevlinda Empoy",
    purpose: "Savings, Loan Assistance",
    paymentMethod: "Bank Transfer",
    priority: "Urgent",
    amount: 200000.0,
    status: "Awaiting Approval",
    requestedBy: "Kenny",
    bankName: "BDO",
    accountHolder: "Kevlinda Empoy",
    accountNumber: "1234567890",
    breakdowns: [
      { category: "Savings", description: "Monthly savings deposit", amount: 150000.0 },
      { category: "Loan Assistance", description: "Emergency loan assistance", amount: 50000.0 }
    ],
    reasonForPayment: "Employee financial assistance for savings and emergency loan requirement.",
    attachments: ["PRF-012826-004-signed.pdf", "ID-copy.jpg"],
    submittedDate: "01/28/2026"
  },
  {
    id: "2",
    date: "01/27/2026",
    reference: "PRF-012726-003",
    vendor: "Office Supplies Co.",
    purpose: "Monthly office supplies purchase",
    paymentMethod: "Check",
    priority: "Standard",
    amount: 15750.0,
    status: "Approved",
    requestedBy: "Maria",
    breakdowns: [
      { category: "Other", description: "Office supplies - pens, paper, folders", amount: 15750.0 }
    ],
    reasonForPayment: "Monthly office supplies replenishment for Q1 2026.",
    attachments: ["invoice-jan2026.pdf"],
    submittedDate: "01/27/2026",
    checkedBy: "Finance Manager",
    approvedBy: "CFO",
    approvedDate: "01/28/2026"
  },
  {
    id: "3",
    date: "01/25/2026",
    reference: "PRF-012526-002",
    vendor: "Tech Solutions Inc.",
    purpose: "Software licensing renewal",
    paymentMethod: "Bank Transfer",
    priority: "High",
    amount: 85000.0,
    status: "Paid",
    requestedBy: "John",
    bankName: "BPI",
    accountHolder: "Tech Solutions Inc.",
    accountNumber: "9876543210",
    breakdowns: [
      { category: "Other", description: "Annual software license renewal", amount: 85000.0 }
    ],
    reasonForPayment: "Annual renewal of accounting software licenses for 10 users.",
    attachments: ["license-invoice.pdf"],
    submittedDate: "01/25/2026",
    checkedBy: "IT Manager",
    approvedBy: "CFO",
    approvedDate: "01/26/2026"
  },
  {
    id: "4",
    date: "01/24/2026",
    reference: "PRF-012426-001",
    vendor: "Utility Company",
    purpose: "Monthly electricity bill",
    paymentMethod: "Bank Transfer",
    priority: "Standard",
    amount: 12500.0,
    status: "Paid",
    requestedBy: "Admin",
    bankName: "Metrobank",
    accountHolder: "Utility Company",
    accountNumber: "5555123456",
    breakdowns: [
      { category: "Other", description: "January 2026 electricity consumption", amount: 12500.0 }
    ],
    reasonForPayment: "Monthly electricity bill payment for office premises.",
    attachments: [],
    submittedDate: "01/24/2026",
    checkedBy: "Admin",
    approvedBy: "Finance Manager",
    approvedDate: "01/24/2026"
  },
  {
    id: "5",
    date: "01/23/2026",
    reference: "PRF-012326-005",
    vendor: "Cleaning Services Ltd.",
    purpose: "Q1 cleaning services",
    paymentMethod: "Cash",
    priority: "Low",
    amount: 8000.0,
    status: "Draft",
    requestedBy: "Kenny",
    breakdowns: [
      { category: "Other", description: "Q1 2026 cleaning services", amount: 8000.0 }
    ],
    reasonForPayment: "Quarterly cleaning services for office building.",
    attachments: []
  }
];

export function getBillById(id: string) {
  return mockBills.find((bill) => bill.id === id);
}
