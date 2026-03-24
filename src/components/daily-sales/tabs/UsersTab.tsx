import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailySalesDialog } from "@/components/daily-sales/DailySalesDialog";
import {
  defaultCodePaymentOptions,
  defaultZeroOneOptions,
  downloadCsv,
  fieldClassName,
} from "@/components/daily-sales/shared";
import {
  fetchSalesDashboardUsers,
  type SalesDashboardUser,
} from "@/services/salesDashboard.service";
import {
  fetchUserAccounts,
  saveUserAccount,
  type UserAccountCodePayment,
  type UserAccountRow,
} from "@/services/userAccount.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UsersGridRow = {
  id: string;
  username: string;
  fullName: string;
  zeroOne: string;
  codePayment: "" | UserAccountCodePayment;
  createdAt: string;
};

function normalizeCodePayment(value: string | null): UserAccountCodePayment {
  return value?.toUpperCase() === "PD" ? "PD" : "FS";
}

function matchesSearch(values: Array<string | number>, search: string) {
  return values.join(" ").toLowerCase().includes(search);
}

function buildUsersRows(directoryUsers: SalesDashboardUser[], accountRows: UserAccountRow[]) {
  const accountByUsername = new Map(accountRows.map((row) => [row.username.trim().toLowerCase(), row] as const));
  const merged: UsersGridRow[] = directoryUsers.map((user) => {
    const matched = accountByUsername.get(user.username.trim().toLowerCase());
    return {
      id: user.id,
      username: user.username,
      fullName: matched?.fullName || user.member_name || "",
      zeroOne: matched?.zeroOne || "",
      codePayment: matched?.codePayment || "",
      createdAt: user.created_at,
    };
  });

  const seen = new Set(merged.map((row) => row.username.toLowerCase()));
  for (const row of accountRows) {
    if (seen.has(row.username.toLowerCase())) continue;
    merged.push({
      id: `account-${row.id}`,
      username: row.username,
      fullName: row.fullName,
      zeroOne: row.zeroOne,
      codePayment: row.codePayment,
      createdAt: row.dateCreated,
    });
  }

  return merged.sort((left, right) => left.username.localeCompare(right.username));
}

function getZeroOneOptions(directoryUsers: SalesDashboardUser[], accountRows: UserAccountRow[]) {
  const values = new Set<string>(defaultZeroOneOptions);
  for (const row of accountRows) {
    if (row.zeroOne) values.add(row.zeroOne);
    if (row.sponsor) values.add(row.sponsor);
    if (row.username) values.add(row.username);
  }
  for (const user of directoryUsers) {
    if (user.username) values.add(user.username);
  }
  return Array.from(values).sort((left, right) => left.localeCompare(right));
}

export function UsersTab() {
  const [directoryUsers, setDirectoryUsers] = useState<SalesDashboardUser[]>([]);
  const [accountRows, setAccountRows] = useState<UserAccountRow[]>([]);
  const [usersSearchQuery, setUsersSearchQuery] = useState("");
  const [userAccountSearchQuery, setUserAccountSearchQuery] = useState("");
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formState, setFormState] = useState({
    username: "",
    fullName: "",
    zeroOne: "",
    codePayment: "PD" as UserAccountCodePayment,
  });

  const loadData = async () => {
    setIsLoading(true);
    const [directoryResult, accountResult] = await Promise.allSettled([
      fetchSalesDashboardUsers(),
      fetchUserAccounts(),
    ]);

    if (directoryResult.status === "fulfilled") {
      setDirectoryUsers(directoryResult.value);
    } else {
      setDirectoryUsers([]);
    }

    if (accountResult.status === "fulfilled") {
      setAccountRows(accountResult.value);
    } else {
      setAccountRows([]);
      setNotice({
        title: "Info",
        message: "The user_account table is missing or inaccessible. Apply supabase/user_account.sql to create and backfill it.",
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const usersRows = useMemo(() => buildUsersRows(directoryUsers, accountRows), [accountRows, directoryUsers]);
  const zeroOneOptions = useMemo(() => getZeroOneOptions(directoryUsers, accountRows), [accountRows, directoryUsers]);

  useEffect(() => {
    if (!formState.zeroOne && zeroOneOptions.length > 0) {
      setFormState((current) => ({ ...current, zeroOne: zeroOneOptions[0] }));
    }
  }, [formState.zeroOne, zeroOneOptions]);

  const filteredUsersRows = useMemo(() => {
    const search = usersSearchQuery.trim().toLowerCase();
    if (!search) return usersRows;
    return usersRows.filter((row) => matchesSearch([row.username, row.fullName, row.zeroOne, row.codePayment], search));
  }, [usersRows, usersSearchQuery]);

  const filteredAccountRows = useMemo(() => {
    const search = userAccountSearchQuery.trim().toLowerCase();
    if (!search) return accountRows;
    return accountRows.filter((row) =>
      matchesSearch(
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
          row.dateUpdated,
        ],
        search,
      ),
    );
  }, [accountRows, userAccountSearchQuery]);

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.username || !formState.fullName || !formState.zeroOne || !formState.codePayment) {
      setNotice({ title: "Warning!", message: "Please select a user row and complete the required fields." });
      return;
    }

    try {
      const savedRow = await saveUserAccount({
        username: formState.username,
        fullName: formState.fullName,
        zeroOne: formState.zeroOne,
        codePayment: formState.codePayment,
      });

      setAccountRows((current) => {
        const index = current.findIndex((row) => row.username.toLowerCase() === savedRow.username.toLowerCase());
        if (index === -1) return [savedRow, ...current];
        const next = [...current];
        next[index] = savedRow;
        return next;
      });
      setNotice({ title: "Success", message: "User zero-one updated successfully." });
    } catch (error) {
      setNotice({ title: "Error", message: error instanceof Error ? error.message : "Failed to update user account." });
    }
  };

  return (
    <>
      <section className="mt-4 space-y-4">
        <Card className="gap-0 border-slate-200 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold text-slate-900">Users</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form className="grid gap-3 md:grid-cols-5" onSubmit={onSave} onReset={(event) => {
              event.preventDefault();
              setFormState({
                username: "",
                fullName: "",
                zeroOne: zeroOneOptions[0] || "",
                codePayment: "PD",
              });
            }}>
              <label className="text-xs font-medium text-slate-700">Full Name<input value={formState.fullName} readOnly className={`${fieldClassName} bg-slate-50`} /></label>
              <label className="text-xs font-medium text-slate-700">Zero One
                <select value={formState.zeroOne} onChange={(event) => setFormState((current) => ({ ...current, zeroOne: event.target.value }))} className={fieldClassName}>
                  {zeroOneOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-700">Code Payment
                <select value={formState.codePayment} onChange={(event) => setFormState((current) => ({ ...current, codePayment: normalizeCodePayment(event.target.value) }))} className={fieldClassName}>
                  {defaultCodePaymentOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <div className="flex items-end gap-2">
                <Button type="submit">Save Entry</Button>
                <Button type="reset" variant="secondary">Clear Form</Button>
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" variant="secondary" onClick={() => void loadData()}>Sync Users</Button>
                <Button type="button" variant="secondary" onClick={() => void loadData()}>Sync Codes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="gap-0 overflow-hidden border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Users With No Zero One</h3>
            <input value={usersSearchQuery} onChange={(event) => setUsersSearchQuery(event.target.value)} placeholder="Search table..." className="h-9 w-full max-w-xs rounded border border-slate-300 px-3 text-sm" />
          </div>
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Zero One</TableHead>
                <TableHead>Code Payment</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">Loading users...</TableCell></TableRow>
              ) : filteredUsersRows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500">No user rows found.</TableCell></TableRow>
              ) : (
                filteredUsersRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.username}</TableCell>
                    <TableCell>{row.fullName || "-"}</TableCell>
                    <TableCell>{row.zeroOne || "-"}</TableCell>
                    <TableCell>{row.codePayment || "-"}</TableCell>
                    <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleString("en-PH") : "-"}</TableCell>
                    <TableCell>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setFormState({ username: row.username, fullName: row.fullName, zeroOne: row.zeroOne || zeroOneOptions[0] || "", codePayment: row.codePayment || "PD" })}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="gap-0 overflow-hidden border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">User Accounts</h3>
            <div className="flex w-full max-w-xl items-center gap-2">
              <input value={userAccountSearchQuery} onChange={(event) => setUserAccountSearchQuery(event.target.value)} placeholder="Search table..." className="h-9 flex-1 rounded border border-slate-300 px-3 text-sm" />
              <Button
                size="sm"
                onClick={() =>
                  downloadCsv(
                    "daily-sales-user-accounts.csv",
                    ["Full Name", "Username", "Sponsor", "Placement", "Group", "Account Type", "Zero One", "Code Payment", "City", "Province", "Region", "Country", "Date Created"],
                    filteredAccountRows.map((row) => [
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
                    ]),
                  )
                }
              >
                Export CSV
              </Button>
            </div>
          </div>
          <Table className="min-w-[1400px]">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Zero One</TableHead>
                <TableHead>Code Payment</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Date Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={13} className="py-8 text-center text-slate-500">Loading user accounts...</TableCell></TableRow>
              ) : filteredAccountRows.length === 0 ? (
                <TableRow><TableCell colSpan={13} className="py-8 text-center text-slate-500">No user account rows found.</TableCell></TableRow>
              ) : (
                filteredAccountRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.fullName}</TableCell>
                    <TableCell>{row.username}</TableCell>
                    <TableCell>{row.sponsor}</TableCell>
                    <TableCell>{row.placement}</TableCell>
                    <TableCell>{row.group}</TableCell>
                    <TableCell>{row.accountType}</TableCell>
                    <TableCell>{row.zeroOne}</TableCell>
                    <TableCell>{row.codePayment}</TableCell>
                    <TableCell>{row.city}</TableCell>
                    <TableCell>{row.province}</TableCell>
                    <TableCell>{row.region}</TableCell>
                    <TableCell>{row.country}</TableCell>
                    <TableCell>{row.dateCreated ? new Date(row.dateCreated).toLocaleString("en-PH") : "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      <DailySalesDialog isOpen={Boolean(notice)} title={notice?.title ?? "Notice"} onClose={() => setNotice(null)}>
        {notice?.message ?? ""}
      </DailySalesDialog>
    </>
  );
}
