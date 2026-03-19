export type PaymentMode =
  | "ALL"
  | "CASH"
  | "BANK"
  | "MAYA(IGI)"
  | "MAYA(ATC)"
  | "SBCOLLECT(IGI)"
  | "SBCOLLECT(ATC)"
  | "EWALLET"
  | "CHEQUE"
  | "EPOINTS"
  | "CONSIGNMENT"
  | "AR(CSA)"
  | "AR(LEADERSUPPORT)";

export type SaleStatus = "Released" | "To Follow" | "Pending";

export type EncoderNewMemberOption = "1" | "0";

export type EncoderMemberTypeOption =
  | "DISTRIBUTOR"
  | "STOCKIST"
  | "CENTER"
  | "NON-MEMBER";

export type EncoderPackageTypeOption =
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "USILVERGOLD"
  | "UGOLDPLATINUM"
  | "USILVERPLATINUM"
  | "RETAIL"
  | "BLISTER";

export type EncoderBlisterOption = "0" | "1";

export type EncoderPaymentModeOption =
  | "N/A"
  | "CASH"
  | "BANK"
  | "MAYA(IGI)"
  | "MAYA(ATC)"
  | "SBCOLLECT(IGI)"
  | "SBCOLLECT(ATC)"
  | "EWALLET"
  | "CHEQUE"
  | "EPOINTS"
  | "CONSIGNMENT"
  | "AR(CSA)"
  | "AR(LEADERSUPPORT)";

export type EncoderFormModel = {
  event: string;
  date: string;
  pofNumber: string;
  name: string;
  username: string;
  newMember: EncoderNewMemberOption;
  memberType: EncoderMemberTypeOption;
  packageType: EncoderPackageTypeOption;
  isToBlister: EncoderBlisterOption;
  originalPrice: number;
  quantity: number;
  blisterCount: number;
  discount: number;
  price: number;
  oneTimeDiscount: number;
  noOfBottles: number;
  sales: number;
  paymentMode: EncoderPaymentModeOption;
  paymentType: string;
  referenceNo: string;
  paymentModeTwo: EncoderPaymentModeOption;
  paymentTypeTwo: string;
  referenceNoTwo: string;
  salesTwo: number;
  released: number;
  releasedBlpk: number;
  toFollow: number;
  toFollowBlpk: number;
  remarks: string;
  receivedBy: string;
  collectedBy: string;
};

export type DailySalesRecord = {
  id: string;
  dailySalesId: string;
  pofNumber: string;
  ggTransNo: string;
  date: string;
  memberName: string;
  zeroOne: string;
  memberType: string;
  packageType: string;
  quantity: number;
  bottles: number;
  blisters: number;
  sales: number;
  paymentMode: Exclude<PaymentMode, "ALL">;
  paymentType: string;
  referenceNo: string;
  paymentModeTwo: EncoderPaymentModeOption;
  paymentTypeTwo: string;
  referenceNoTwo: string;
  salesTwo: number;
  status: SaleStatus;
  newMember: boolean;
  originalPrice: number;
  discount: number;
  discountedPrice: number;
  releasedBottle: number;
  releasedBlister: number;
  balanceBottle: number;
  balanceBlister: number;
  isToBlister: boolean;
  remarks: string;
  receivedBy: string;
  collectedBy: string;
  savedAt: string;
  source: "remote" | "local";
};

export type PrintTransaction = {
  date: string;
  pofNumber: string;
  customer: string;
  ggTransNo: string;
  modeOfPayment: string;
  encoder: string;
};

export type PrintLineItem = {
  id: string;
  productPackage: string;
  srp: number;
  discount: number;
  discountedPrice: number;
  quantity: number;
  amount: number;
  releasedBottle: number;
  releasedBlister: number;
  balanceBottle: number;
  balanceBlister: number;
};

export type DailySalesTotals = {
  totalSales: number;
  totalBottles: number;
  totalBlisters: number;
  totalTransactions: number;
  newMembers: number;
};

export type CashFieldId =
  | "cohOneThousand"
  | "cohFiveHundred"
  | "cohTwoHundred"
  | "cohOneHundred"
  | "cohFifty"
  | "cohTwenty"
  | "cohTen"
  | "cohFive"
  | "cohOne"
  | "cohCents";

export type CashOnHandPieces = Record<CashFieldId, number>;

export type TimeRange = "daily" | "weekly" | "monthly" | "custom";

export type SummaryStat = {
  id: string;
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
};

export type AgentPerformance = {
  id: string;
  name: string;
  sales: number;
  target: number;
  conversionRate: number;
  status: "active" | "idle";
};

export type SalesDataset = {
  label: string;
  summary: SummaryStat[];
  agents: AgentPerformance[];
};

