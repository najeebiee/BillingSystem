import { FormEvent, useEffect, useMemo, useState } from "react";
import { DailySalesDialog } from "@/components/daily-sales/DailySalesDialog";
import "@/components/daily-sales/DailySalesUsers.css";
import {
  defaultCodePaymentOptions,
  defaultZeroOneOptions,
  downloadExcel,
  matchesSearch,
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

  const loadData = async ({ showAccountUnavailableNotice = true } = {}) => {
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
      if (showAccountUnavailableNotice) {
        setNotice({
          title: "Info",
          message:
            "User accounts backend is unavailable. Wire the user_account table to persist changes.",
        });
      }
    }

    setIsLoading(false);
    return {
      usersLoaded: directoryResult.status === "fulfilled",
      accountsLoaded: accountResult.status === "fulfilled",
    };
  };

  useEffect(() => {
    void loadData();
  }, []);

  const usersRows = useMemo(() => buildUsersRows(directoryUsers, accountRows), [accountRows, directoryUsers]);
  const zeroOneOptions = useMemo(() => getZeroOneOptions(directoryUsers, accountRows), [accountRows, directoryUsers]);
  const usersWithNoZeroOneRows = useMemo(
    () => usersRows.filter((row) => !row.zeroOne.trim()),
    [usersRows],
  );

  useEffect(() => {
    if (!formState.zeroOne && zeroOneOptions.length > 0) {
      setFormState((current) => ({ ...current, zeroOne: zeroOneOptions[0] }));
    }
  }, [formState.zeroOne, zeroOneOptions]);

  const filteredUsersRows = useMemo(() => {
    return usersWithNoZeroOneRows.filter((row) =>
      matchesSearch([row.username, row.fullName, row.zeroOne, row.codePayment], usersSearchQuery),
    );
  }, [usersSearchQuery, usersWithNoZeroOneRows]);

  const filteredAccountRows = useMemo(() => {
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
        userAccountSearchQuery,
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

  const resetForm = () => {
    setFormState({
      username: "",
      fullName: "",
      zeroOne: zeroOneOptions[0] || "",
      codePayment: "PD",
    });
  };

  return (
    <>
      <section className="daily-sales-users">
        <div className="daily-sales-users__card">
          <h2 className="daily-sales-users__title">Users</h2>
          <form
            className="daily-sales-users__form"
            onSubmit={onSave}
            onReset={(event) => {
              event.preventDefault();
              resetForm();
            }}
          >
            <div className="daily-sales-users__field daily-sales-users__field--wide">
              <label className="daily-sales-users__label">Full Name</label>
              <input
                value={formState.fullName}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, fullName: event.target.value }))
                }
                placeholder="Enter full name"
                className="daily-sales-users__input"
              />
            </div>
            <div className="daily-sales-users__field">
              <label className="daily-sales-users__label">Zero One</label>
              <select
                value={formState.zeroOne}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, zeroOne: event.target.value }))
                }
                className="daily-sales-users__input"
              >
                {zeroOneOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="daily-sales-users__field">
              <label className="daily-sales-users__label">Code Payment</label>
              <select
                value={formState.codePayment}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    codePayment: normalizeCodePayment(event.target.value),
                  }))
                }
                className="daily-sales-users__input"
              >
                {defaultCodePaymentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="daily-sales-users__actions">
              <button
                type="submit"
                className="daily-sales-users__button daily-sales-users__button--primary"
              >
                Save Entry
              </button>
              <button type="reset" className="daily-sales-users__button">
                Clear Form
              </button>
              <button
                type="button"
                className="daily-sales-users__button"
                onClick={async () => {
                  const result = await loadData({ showAccountUnavailableNotice: false });
                  setNotice(
                    result.usersLoaded
                      ? { title: "Success", message: "Users synced from the current source." }
                      : { title: "Error", message: "Unable to sync users from the current source." },
                  );
                }}
              >
                Sync Users
              </button>
              <button
                type="button"
                className="daily-sales-users__button"
                onClick={async () => {
                  const result = await loadData({ showAccountUnavailableNotice: false });
                  setNotice(
                    result.accountsLoaded
                      ? { title: "Success", message: "Code payment data refreshed." }
                      : {
                          title: "Error",
                          message: "Unable to refresh code payment data from user accounts.",
                        },
                  );
                }}
              >
                Sync Codes
              </button>
            </div>
          </form>
        </div>

        <div className="daily-sales-users__card">
          <div className="daily-sales-users__header">
            <h3 className="daily-sales-users__header-title">Users With No Zero One</h3>
            <div className="daily-sales-users__header-actions">
              <input
                value={usersSearchQuery}
                onChange={(event) => setUsersSearchQuery(event.target.value)}
                placeholder="Search table..."
                className="daily-sales-users__input daily-sales-users__search"
              />
            </div>
          </div>
          <div className="daily-sales-users__table-wrap">
            <table className="daily-sales-users__table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Zero One</th>
                  <th>Code Payment</th>
                  <th>Created At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="daily-sales-users__empty">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsersRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="daily-sales-users__empty">
                      {usersWithNoZeroOneRows.length === 0
                        ? "All current users already have Zero One assignments."
                        : "No user rows matched your search."}
                    </td>
                  </tr>
                ) : (
                  filteredUsersRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.username}</td>
                      <td>{row.fullName || "-"}</td>
                      <td>{row.zeroOne || "-"}</td>
                      <td>{row.codePayment || "-"}</td>
                      <td>{row.createdAt ? new Date(row.createdAt).toLocaleString("en-PH") : "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="daily-sales-users__button daily-sales-users__button--small"
                          onClick={() =>
                            setFormState({
                              username: row.username,
                              fullName: row.fullName,
                              zeroOne: row.zeroOne || zeroOneOptions[0] || "",
                              codePayment: row.codePayment || "PD",
                            })
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="daily-sales-users__card">
          <div className="daily-sales-users__header">
            <h3 className="daily-sales-users__header-title">User Accounts</h3>
            <div className="daily-sales-users__header-actions">
              <input
                value={userAccountSearchQuery}
                onChange={(event) => setUserAccountSearchQuery(event.target.value)}
                placeholder="Search table..."
                className="daily-sales-users__input daily-sales-users__search"
              />
              <button
                type="button"
                className="daily-sales-users__button daily-sales-users__button--primary"
                onClick={() =>
                  void downloadExcel(
                    "daily-sales-user-accounts.xlsx",
                    "User Accounts",
                    [
                      "Full Name",
                      "Username",
                      "Sponsor",
                      "Placement",
                      "Group",
                      "Account Type",
                      "Zero One",
                      "Code Payment",
                      "City",
                      "Province",
                      "Region",
                      "Country",
                      "Date Created",
                      "Date Updated",
                    ],
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
                      row.dateUpdated,
                    ]),
                  )
                }
              >
                Excel
              </button>
            </div>
          </div>
          <div className="daily-sales-users__table-wrap">
            <table className="daily-sales-users__table daily-sales-users__table--wide">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Sponsor</th>
                  <th>Placement</th>
                  <th>Group</th>
                  <th>Account Type</th>
                  <th>Zero One</th>
                  <th>Code Payment</th>
                  <th>Barangay</th>
                  <th>City</th>
                  <th>Province</th>
                  <th>Region</th>
                  <th>Country</th>
                  <th>Date Created</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={14} className="daily-sales-users__empty">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredAccountRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="daily-sales-users__empty">
                      No user account rows found.
                    </td>
                  </tr>
                ) : (
                  filteredAccountRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.fullName}</td>
                      <td>{row.username}</td>
                      <td>{row.sponsor}</td>
                      <td>{row.placement}</td>
                      <td>{row.group}</td>
                      <td>{row.accountType}</td>
                      <td>{row.zeroOne}</td>
                      <td>{row.codePayment}</td>
                      <td>-</td>
                      <td>{row.city}</td>
                      <td>{row.province}</td>
                      <td>{row.region}</td>
                      <td>{row.country}</td>
                      <td>{row.dateCreated ? new Date(row.dateCreated).toLocaleString("en-PH") : "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <DailySalesDialog
        isOpen={Boolean(notice)}
        title={notice?.title ?? "Notice"}
        onClose={() => setNotice(null)}
      >
        {notice?.message ?? ""}
      </DailySalesDialog>
    </>
  );
}
