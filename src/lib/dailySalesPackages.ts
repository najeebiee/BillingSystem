import type {
  EncoderBlisterOption,
  EncoderMemberTypeOption,
  EncoderPackageTypeOption,
} from "@/types/dailySales";

type DailySalesPackageDefinition = {
  label: string;
  originalPrice: number;
  bottleCount: number;
  bundledBlisterCount: number;
  defaultIsToBlister: EncoderBlisterOption;
};

export const dailySalesPackageCatalog: Record<
  EncoderPackageTypeOption,
  DailySalesPackageDefinition
> = {
  SILVER: {
    label: "Silver (1 bottle + 1 blister)",
    originalPrice: 4500,
    bottleCount: 1,
    bundledBlisterCount: 1,
    defaultIsToBlister: "0",
  },
  GOLD: {
    label: "Gold (3 bottles + 3 blisters)",
    originalPrice: 13500,
    bottleCount: 3,
    bundledBlisterCount: 3,
    defaultIsToBlister: "0",
  },
  PLATINUM: {
    label: "Platinum (10 bottles + 10 blisters)",
    originalPrice: 45000,
    bottleCount: 10,
    bundledBlisterCount: 10,
    defaultIsToBlister: "0",
  },
  USILVERGOLD: {
    label: "USilverGold (2 bottles + 2 blisters)",
    originalPrice: 9000,
    bottleCount: 2,
    bundledBlisterCount: 2,
    defaultIsToBlister: "0",
  },
  UGOLDPLATINUM: {
    label: "UGoldPlatinum (7 bottles + 7 blisters)",
    originalPrice: 31500,
    bottleCount: 7,
    bundledBlisterCount: 7,
    defaultIsToBlister: "0",
  },
  USILVERPLATINUM: {
    label: "USilverPlatinum (9 bottles + 9 blisters)",
    originalPrice: 40500,
    bottleCount: 9,
    bundledBlisterCount: 9,
    defaultIsToBlister: "0",
  },
  RETAIL: {
    label: "Retail (1 bottle)",
    originalPrice: 3800,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: "0",
  },
  BLISTER: {
    label: "Blister (1 blister pack)",
    originalPrice: 1299,
    bottleCount: 1,
    bundledBlisterCount: 0,
    defaultIsToBlister: "1",
  },
};

export const encoderPackageOptions = (
  Object.entries(dailySalesPackageCatalog) as Array<
    [EncoderPackageTypeOption, DailySalesPackageDefinition]
  >
).map(([value, config]) => ({
  value,
  label: config.label,
}));

export const dailySalesDiscountMatrix: Record<
  EncoderMemberTypeOption,
  Record<EncoderPackageTypeOption, number>
> = {
  DISTRIBUTOR: {
    SILVER: 0,
    GOLD: 0,
    PLATINUM: 0,
    USILVERGOLD: 0,
    UGOLDPLATINUM: 0,
    USILVERPLATINUM: 0,
    RETAIL: 1520,
    BLISTER: 520,
  },
  STOCKIST: {
    SILVER: 50,
    GOLD: 150,
    PLATINUM: 500,
    USILVERGOLD: 0,
    UGOLDPLATINUM: 0,
    USILVERPLATINUM: 0,
    RETAIL: 1710,
    BLISTER: 585,
  },
  CENTER: {
    SILVER: 80,
    GOLD: 240,
    PLATINUM: 800,
    USILVERGOLD: 0,
    UGOLDPLATINUM: 0,
    USILVERPLATINUM: 0,
    RETAIL: 1900,
    BLISTER: 650,
  },
  "NON-MEMBER": {
    SILVER: 0,
    GOLD: 0,
    PLATINUM: 0,
    USILVERGOLD: 0,
    UGOLDPLATINUM: 0,
    USILVERPLATINUM: 0,
    RETAIL: 0,
    BLISTER: 0,
  },
};

export function getDailySalesPackageConfig(packageType: EncoderPackageTypeOption) {
  return dailySalesPackageCatalog[packageType];
}

export function getDailySalesPackagePrice(packageType: EncoderPackageTypeOption) {
  return getDailySalesPackageConfig(packageType).originalPrice;
}

export function getDailySalesPackageBottleCount(
  packageType: EncoderPackageTypeOption,
  quantity: number,
) {
  return Math.max(quantity, 0) * getDailySalesPackageConfig(packageType).bottleCount;
}

export function hasBundledPackageBlisters(packageType: EncoderPackageTypeOption) {
  return getDailySalesPackageConfig(packageType).bundledBlisterCount > 0;
}

export function getDailySalesPackageBlisterCount(
  packageType: EncoderPackageTypeOption,
  quantity: number,
  isToBlister: EncoderBlisterOption,
) {
  const normalizedQuantity = Math.max(quantity, 0);
  const config = getDailySalesPackageConfig(packageType);

  if (config.bundledBlisterCount > 0) {
    return normalizedQuantity * config.bundledBlisterCount;
  }

  return isToBlister === "1" ? normalizedQuantity * 10 : 0;
}

export function getDailySalesDiscount(
  memberType: EncoderMemberTypeOption,
  packageType: EncoderPackageTypeOption,
) {
  return dailySalesDiscountMatrix[memberType][packageType];
}

export function getDailySalesNetPrice(
  memberType: EncoderMemberTypeOption,
  packageType: EncoderPackageTypeOption,
) {
  return Math.max(
    getDailySalesPackagePrice(packageType) - getDailySalesDiscount(memberType, packageType),
    0,
  );
}

export function normalizeDailySalesPackageType(
  value: string,
): EncoderPackageTypeOption | null {
  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("USILVERPLATINUM")) {
    return "USILVERPLATINUM";
  }

  if (normalized.includes("UGOLDPLATINUM")) {
    return "UGOLDPLATINUM";
  }

  if (normalized.includes("USILVERGOLD")) {
    return "USILVERGOLD";
  }

  if (normalized.includes("PLATINUM")) {
    return "PLATINUM";
  }

  if (normalized.includes("GOLD")) {
    return "GOLD";
  }

  if (normalized.includes("SILVER")) {
    return "SILVER";
  }

  if (normalized === "RETAIL" || normalized.includes("RETAIL")) {
    return "RETAIL";
  }

  if (normalized === "BLISTER" || normalized.includes("BLISTER")) {
    return "BLISTER";
  }

  return null;
}

