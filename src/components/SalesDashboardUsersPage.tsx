import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "./ui/table";
import {
  fetchSalesDashboardUsers,
  type SalesDashboardUser
} from "../services/salesDashboard.service";
import {
  fetchUserAccounts,
  saveUserAccount,
  type UserAccountCodePayment,
  type UserAccountRow
} from "../services/userAccount.service";

type UsersGridRow = {
  id: string;
  username: string;
  fullName: string;
  zeroOne: string;
  codePayment: "" | UserAccountCodePayment;
  createdAt: string;
};

type UsersFormState = {
  username: string;
  fullName: string;
  zeroOne: string;
  codePayment: UserAccountCodePayment;
};

const CODE_PAYMENT_OPTIONS: UserAccountCodePayment[] = ["PD", "FS"];

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function formatDateTime(value: string): string {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function buildExportFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `user_accounts_${yyyy}${mm}${dd}_${hh}${min}${ss}.xlsx`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    if (/user_account/i.test(error.message)) {
      return `${fallback} The user_account table is missing or inaccessible. Apply supabase/user_account.sql first.`;
    }
    return error.message;
  }

  if (error && typeof error === "object") {
    const maybeError = error as { message?: string; details?: string; hint?: string };
    const joined = [maybeError.message, maybeError.details, maybeError.hint]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ");
    if (joined) {
      if (/user_account/i.test(joined)) {
        return `${fallback} The user_account table is missing or inaccessible. Apply supabase/user_account.sql first.`;
      }
      return joined;
    }
  }

  return fallback;
}

async function exportUserAccountsToExcel(rows: UserAccountRow[]): Promise<void> {
  const [{ saveAs }, XLSX] = await Promise.all([import("file-saver"), import("xlsx")]);

  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) => ({
      "Full Name": row.fullName,
      Username: row.username,
      Sponsor: row.sponsor,
      Placement: row.placement,
      Group: row.group,
      "Account Type": row.accountType,
      "Zero One": row.zeroOne,
      "Code Payment": row.codePayment,
      City: row.city,
      Province: row.province,
      Region: row.region,
      Country: row.country,
      "Date Created": row.dateCreated ? formatDateTime(row.dateCreated) : "",
      "Date Updated": row.dateUpdated ? formatDateTime(row.dateUpdated) : ""
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "User Accounts");
  const output = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array"
  });

  saveAs(
    new Blob([output], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }),
    buildExportFileName()
  );
}

const initialFormState: UsersFormState = {
  username: "",
  fullName: "",
  zeroOne: "",
  codePayment: "PD"
};

export function SalesDashboardUsersPage() {
  const [directoryUsers, setDirectoryUsers] = useState<SalesDashboardUser[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccountRow[]>([]);
  const [formState, setFormState] = useState<UsersFormState>(initialFormState);
  const [usersSearchQuery, setUsersSearchQuery] = useState("");
  const [accountsSearchQuery, setAccountsSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const [directoryResult, accountResult] = await Promise.allSettled([
      fetchSalesDashboardUsers(),
      fetchUserAccounts()
    ]);

    const errors: string[] = [];

    if (directoryResult.status === "fulfilled") {
      setDirectoryUsers(directoryResult.value);
    } else {
      setDirectoryUsers([]);
      console.error("USERS DIRECTORY FETCH ERROR", directoryResult.reason);
      errors.push(getErrorMessage(directoryResult.reason, "Failed to load users directory."));
    }

    if (accountResult.status === "fulfilled") {
      setUserAccounts(accountResult.value);
    } else {
      setUserAccounts([]);
      console.error("USER ACCOUNT FETCH ERROR", accountResult.reason);
      errors.push(getErrorMessage(accountResult.reason, "Failed to load user accounts."));
    }

    setErrorMessage(errors.length > 0 ? errors.join(" ") : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const usersRows = useMemo<UsersGridRow[]>(() => {
    const accountByUsername = new Map(
      userAccounts.map((row) => [normalizeLookupKey(row.username), row] as const)
    );

    const mergedRows: UsersGridRow[] = directoryUsers.map((user) => {
      const username = toText(user.username);
      const matchedAccount = accountByUsername.get(normalizeLookupKey(username));

      return {
        id: user.id,
        username,
        fullName: matchedAccount?.fullName || toText(user.member_name),
        zeroOne: matchedAccount?.zeroOne ?? "",
        codePayment: matchedAccount?.codePayment ?? "",
        createdAt: toText(user.created_at)
      };
    });

    const usernamesInDirectory = new Set(mergedRows.map((row) => normalizeLookupKey(row.username)));

    for (const accountRow of userAccounts) {
      const key = normalizeLookupKey(accountRow.username);
      if (usernamesInDirectory.has(key)) continue;

      mergedRows.push({
        id: `account-${accountRow.id}`,
        username: accountRow.username,
        fullName: accountRow.fullName,
        zeroOne: accountRow.zeroOne,
        codePayment: accountRow.codePayment,
        createdAt: accountRow.dateCreated
      });
    }

    return mergedRows.sort((left, right) => left.username.localeCompare(right.username));
  }, [directoryUsers, userAccounts]);

  const zeroOneOptions = useMemo(() => {
    const values = new Set<string>();

    for (const row of userAccounts) {
      if (row.zeroOne) values.add(row.zeroOne);
      if (row.sponsor) values.add(row.sponsor);
      if (row.username) values.add(row.username);
    }

    for (const row of directoryUsers) {
      const username = toText(row.username);
      if (username) values.add(username);
    }

    return [...values].sort((left, right) => left.localeCompare(right));
  }, [directoryUsers, userAccounts]);

  useEffect(() => {
    if (!formState.zeroOne && zeroOneOptions.length > 0) {
      setFormState((current) => ({
        ...current,
        zeroOne: zeroOneOptions[0]
      }));
    }
  }, [formState.zeroOne, zeroOneOptions]);

  const filteredUsersRows = useMemo(() => {
    const query = usersSearchQuery.trim().toLowerCase();
    if (!query) return usersRows;

    return usersRows.filter((row) =>
      [row.username, row.fullName, row.zeroOne, row.codePayment]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [usersRows, usersSearchQuery]);

  const filteredUserAccounts = useMemo(() => {
    const query = accountsSearchQuery.trim().toLowerCase();
    if (!query) return userAccounts;

    return userAccounts.filter((row) =>
      [
        row.fullName,
        row.username,
        row.sponsor,
        row.placement,
        row.group,
        row.accountType,
        row.zeroOne,
        row.codePayment,
        row.city,
        row.province,
        row.region,
        row.country,
        row.dateCreated,
        row.dateUpdated
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [accountsSearchQuery, userAccounts]);

  const handleEditRow = (row: UsersGridRow) => {
    const nextZeroOne = row.zeroOne || zeroOneOptions[0] || "";
    setFormState({
      username: row.username,
      fullName: row.fullName,
      zeroOne: nextZeroOne,
      codePayment: row.codePayment || "PD"
    });
  };

  const handleClearForm = () => {
    setFormState({
      ...initialFormState,
      zeroOne: zeroOneOptions[0] || ""
    });
  };

  const handleSave = async () => {
    if (!formState.username || !formState.fullName || !formState.zeroOne || !formState.codePayment) {
      await Swal.fire({
        title: "Missing fields",
        text: "Select a user row first, then complete Zero One and Code Payment.",
        icon: "warning",
        confirmButtonColor: "#2563eb"
      });
      return;
    }

    setIsSaving(true);
    try {
      const savedRow = await saveUserAccount(formState);

      setUserAccounts((current) => {
        const nextRows = [...current];
        const targetIndex = nextRows.findIndex(
          (row) => normalizeLookupKey(row.username) === normalizeLookupKey(savedRow.username)
        );

        if (targetIndex >= 0) {
          nextRows[targetIndex] = {
            ...nextRows[targetIndex],
            ...savedRow
          };
        } else {
          nextRows.unshift(savedRow);
        }

        return nextRows;
      });

      await Swal.fire({
        title: "Saved",
        text: "User account details were saved successfully.",
        icon: "success",
        confirmButtonColor: "#2563eb"
      });
    } catch (error) {
      console.error("USER ACCOUNT SAVE ERROR", error);
      await Swal.fire({
        title: "Save failed",
        text: getErrorMessage(error, "Failed to save the user account."),
        icon: "error",
        confirmButtonColor: "#dc2626"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncUsers = async () => {
    await loadData();
    toast.success("Users synced.");
  };

  const handleSyncCodes = async () => {
    await loadData();
    toast.success("Codes synced.");
  };

  const handleExport = async () => {
    if (filteredUserAccounts.length === 0) {
      toast.error("There are no user account rows to export.");
      return;
    }

    setIsExporting(true);
    try {
      await exportUserAccountsToExcel(filteredUserAccounts);
      toast.success(`Exported ${filteredUserAccounts.length} user account record(s).`);
    } catch (error) {
      console.error("USER ACCOUNT EXPORT ERROR", error);
      toast.error(getErrorMessage(error, "Failed to export user accounts."));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-300 shadow-sm">
        <CardHeader className="px-5 pt-5 pb-0">
          <CardTitle className="text-sm font-semibold text-slate-900">Users</CardTitle>
          <CardDescription className="hidden">User form</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pt-4 pb-5">
          {errorMessage ? (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid items-end gap-3 xl:grid-cols-[minmax(230px,1.55fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto_auto_auto_auto]">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="users-full-name" className="text-xs font-medium text-slate-800">
                Full Name
              </Label>
              <Input
                id="users-full-name"
                value={formState.fullName}
                readOnly
                placeholder="Select a user row"
                className="h-10 border-slate-300 bg-white text-sm text-slate-900"
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="users-zero-one" className="text-xs font-medium text-slate-800">
                Zero One
              </Label>
              <Select
                value={formState.zeroOne}
                onValueChange={(value: string) =>
                  setFormState((current) => ({
                    ...current,
                    zeroOne: value
                  }))
                }
                disabled={zeroOneOptions.length === 0}
              >
                <SelectTrigger id="users-zero-one" className="h-10 border-slate-300 bg-white text-sm">
                  <SelectValue placeholder="Select Zero One" />
                </SelectTrigger>
                <SelectContent>
                  {zeroOneOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="users-code-payment" className="text-xs font-medium text-slate-800">
                Code Payment
              </Label>
              <Select
                value={formState.codePayment}
                onValueChange={(value: string) =>
                  setFormState((current) => ({
                    ...current,
                    codePayment: value as UserAccountCodePayment
                  }))
                }
              >
                <SelectTrigger id="users-code-payment" className="h-10 border-slate-300 bg-white text-sm">
                  <SelectValue placeholder="Select code payment" />
                </SelectTrigger>
                <SelectContent>
                  {CODE_PAYMENT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button type="button" onClick={handleSave} disabled={isSaving} className="h-10 px-4 text-sm">
                {isSaving ? "Saving..." : "Save Entry"}
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearForm}
                disabled={isSaving}
                className="h-10 border-slate-300 bg-white px-4 text-sm text-slate-800"
              >
                Clear Form
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSyncUsers()}
                disabled={isLoading}
                className="h-10 border-slate-300 bg-white px-4 text-sm text-slate-800"
              >
                Sync Users
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSyncCodes()}
                disabled={isLoading}
                className="h-10 border-slate-300 bg-white px-4 text-sm text-slate-800"
              >
                Sync Codes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-300 shadow-sm">
        <CardHeader className="flex flex-col gap-4 pb-0 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold text-slate-900">Users With No Zero One</CardTitle>
            <CardDescription className="hidden">Users grid</CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <Label htmlFor="users-table-search" className="sr-only">
              Search users table
            </Label>
            <Input
              id="users-table-search"
              value={usersSearchQuery}
              onChange={(event) => setUsersSearchQuery(event.target.value)}
              placeholder="Search table..."
              className="h-10 border-slate-300 bg-white"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <TableHeader className="bg-slate-100/80">
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Username
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Name
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Zero One
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Code Payment
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Created At
                </TableHead>
                <TableHead className="h-9 px-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsersRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                    {usersRows.length === 0
                      ? "No users are available yet."
                      : "No users matched your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsersRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.username || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.fullName || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.zeroOne || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.codePayment || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">
                      {row.createdAt ? formatDateTime(row.createdAt) : "-"}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-slate-300 bg-white"
                        onClick={() => handleEditRow(row)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-300 shadow-sm">
        <CardHeader className="flex flex-col gap-4 pb-0 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold text-slate-900">User Accounts</CardTitle>
            <CardDescription className="hidden">User accounts grid</CardDescription>
          </div>
          <div className="flex w-full max-w-xl flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <Label htmlFor="user-accounts-search" className="sr-only">
                Search user accounts
              </Label>
              <Input
                id="user-accounts-search"
                value={accountsSearchQuery}
                onChange={(event) => setAccountsSearchQuery(event.target.value)}
                placeholder="Search table..."
                className="h-10 border-slate-300 bg-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadData()}
                disabled={isLoading}
                className="h-10 border-slate-300 px-5"
              >
                Refresh
              </Button>
              <Button type="button" onClick={() => void handleExport()} disabled={isExporting} className="h-10 px-5">
                {isExporting ? "Exporting..." : "Excel"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <Table className="min-w-[1200px]">
            <TableHeader className="bg-slate-100/80">
              <TableRow>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Full Name
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Username
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Sponsor
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Placement
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Group
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Account Type
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Zero One
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Code Payment
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  City
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Province
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Region
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Country
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Date Created
                </TableHead>
                <TableHead className="h-9 px-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Date Updated
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={14} className="py-8 text-center text-slate-500">
                    Loading user accounts...
                  </TableCell>
                </TableRow>
              ) : filteredUserAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="py-8 text-center text-slate-500">
                    {userAccounts.length === 0
                      ? "No user account rows found. Apply supabase/user_account.sql if this table does not exist yet."
                      : "No user account rows matched your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUserAccounts.map((row) => (
                  <TableRow key={row.id || row.username}>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.fullName || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.username || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.sponsor || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.placement || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.group || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.accountType || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.zeroOne || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.codePayment || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.city || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.province || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.region || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">{row.country || "-"}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">
                      {row.dateCreated ? formatDateTime(row.dateCreated) : "-"}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-900">
                      {row.dateUpdated ? formatDateTime(row.dateUpdated) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
