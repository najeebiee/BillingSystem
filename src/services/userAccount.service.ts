import { supabase } from "../lib/supabaseClient";

export type UserAccountCodePayment = "PD" | "FS";

export type UserAccountRow = {
  id: string;
  username: string;
  fullName: string;
  sponsor: string;
  placement: string;
  group: string;
  accountType: string;
  zeroOne: string;
  codePayment: "" | UserAccountCodePayment;
  city: string;
  province: string;
  region: string;
  country: string;
  dateCreated: string;
  dateUpdated: string;
};

type UserAccountDbRow = {
  user_account_id: number | string | null;
  user_name: string | null;
  full_name: string | null;
  sponsor: string | null;
  placement: string | null;
  group: string | null;
  account_type: string | null;
  zero_one: string | null;
  code_payment: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string | null;
  date_created: string | null;
  date_updated: string | null;
};

type SaveUserAccountInput = {
  username: string;
  fullName: string;
  zeroOne: string;
  codePayment: UserAccountCodePayment;
};

const USER_ACCOUNT_TABLE = "user_account";
const USER_ACCOUNT_SELECT =
  "user_account_id,user_name,full_name,sponsor,placement,group,account_type,zero_one,code_payment,city,province,region,country,date_created,date_updated";
const USER_ACCOUNT_PAGE_SIZE = 1000;

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeSearchTerm(value: string): string {
  return value.replaceAll(",", " ").trim();
}

function normalizeCodePayment(value: unknown): "" | UserAccountCodePayment {
  const normalized = toText(value).toUpperCase();
  if (normalized === "PD" || normalized === "FS") return normalized;
  return "";
}

function mapUserAccountRow(row: UserAccountDbRow): UserAccountRow {
  return {
    id: String(row.user_account_id ?? ""),
    username: toText(row.user_name),
    fullName: toText(row.full_name),
    sponsor: toText(row.sponsor),
    placement: toText(row.placement),
    group: toText(row.group),
    accountType: toText(row.account_type),
    zeroOne: toText(row.zero_one),
    codePayment: normalizeCodePayment(row.code_payment),
    city: toText(row.city),
    province: toText(row.province),
    region: toText(row.region),
    country: toText(row.country),
    dateCreated: toText(row.date_created),
    dateUpdated: toText(row.date_updated)
  };
}

function clampLimit(value: number | undefined): number | null {
  if (value === undefined) return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.min(Math.floor(value), 1000);
}

export async function fetchUserAccounts(
  searchQuery = "",
  limit?: number
): Promise<UserAccountRow[]> {
  const resolvedLimit = clampLimit(limit);
  const search = sanitizeSearchTerm(searchQuery);
  const rows: UserAccountDbRow[] = [];
  let from = 0;

  while (true) {
    const remaining = resolvedLimit === null ? USER_ACCOUNT_PAGE_SIZE : resolvedLimit - rows.length;
    if (remaining <= 0) break;

    const batchSize = Math.min(USER_ACCOUNT_PAGE_SIZE, remaining);
    let query = supabase
      .from(USER_ACCOUNT_TABLE)
      .select(USER_ACCOUNT_SELECT)
      .order("date_updated", { ascending: false })
      .range(from, from + batchSize - 1);

    if (search) {
      query = query.or(
        [
          `user_name.ilike.%${search}%`,
          `full_name.ilike.%${search}%`,
          `sponsor.ilike.%${search}%`,
          `zero_one.ilike.%${search}%`,
          `code_payment.ilike.%${search}%`,
          `city.ilike.%${search}%`,
          `province.ilike.%${search}%`,
          `region.ilike.%${search}%`,
          `country.ilike.%${search}%`
        ].join(",")
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    const batch = (data as UserAccountDbRow[] | null) ?? [];
    rows.push(...batch);

    if (batch.length < batchSize) break;
    from += batchSize;
  }

  return rows.map(mapUserAccountRow);
}

export async function saveUserAccount(
  input: SaveUserAccountInput
): Promise<UserAccountRow> {
  const username = toText(input.username);
  if (!username) {
    throw new Error("Username is required.");
  }

  const payload = {
    user_name: username,
    full_name: toText(input.fullName) || null,
    zero_one: toText(input.zeroOne) || null,
    code_payment: input.codePayment,
    date_updated: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from(USER_ACCOUNT_TABLE)
    .upsert(payload, { onConflict: "user_name" })
    .select(USER_ACCOUNT_SELECT)
    .single();

  if (error) throw error;
  return mapUserAccountRow(data as UserAccountDbRow);
}
