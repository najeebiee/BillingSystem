import React, { useEffect, useMemo, useState } from "react";
import {
  fetchSalesDashboardUsers,
  type SalesDashboardUser
} from "../services/salesDashboard.service";

const containerStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: "8px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
  padding: "28px 32px"
};

const inputStyle: React.CSSProperties = {
  width: "320px",
  height: "38px",
  borderTop: "1px solid #ced4da",
  borderRight: "1px solid #ced4da",
  borderBottom: "1px solid #ced4da",
  borderLeft: "1px solid #ced4da",
  borderRadius: "4px",
  padding: "0 10px",
  fontSize: "14px",
  color: "#495057",
  outline: "none",
  backgroundColor: "#FFFFFF"
};

const headerCellStyle = (isLast = false): React.CSSProperties => ({
  padding: "10px 12px",
  textAlign: "left",
  fontSize: "13px",
  fontWeight: 600,
  color: "#495057",
  borderBottom: "2px solid #dee2e6",
  borderRight: isLast ? "none" : "1px solid #dee2e6",
  borderTop: "none",
  borderLeft: "none",
  whiteSpace: "nowrap"
});

const bodyCellStyle = (isLast = false): React.CSSProperties => ({
  padding: "10px 12px",
  fontSize: "14px",
  color: "#212529",
  borderBottom: "1px solid #dee2e6",
  borderRight: isLast ? "none" : "1px solid #dee2e6",
  borderTop: "none",
  borderLeft: "none",
  verticalAlign: "middle"
});

const formatDateTime = (value: string): string => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export function SalesDashboardUsersPage() {
  const [users, setUsers] = useState<SalesDashboardUser[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const rows = await fetchSalesDashboardUsers();
        setUsers(rows);
      } catch (error) {
        console.error("USERS PAGE FETCH ERROR", error);
        const message = error instanceof Error ? error.message : "Failed to load users.";
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const displayedUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((user) => {
      const username = user.username.toLowerCase();
      const memberName = (user.member_name ?? "").toLowerCase();
      return username.includes(query) || memberName.includes(query);
    });
  }, [users, search]);

  return (
    <div style={containerStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px"
        }}
      >
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 600, color: "#212529", marginBottom: "6px" }}>
            Users
          </h2>
          <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
            Connected usernames used by the Encoder.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search usernames..."
          style={inputStyle}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            borderTop: "1px solid #dee2e6",
            borderRight: "1px solid #dee2e6",
            borderBottom: "1px solid #dee2e6",
            borderLeft: "1px solid #dee2e6"
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f8f9fa" }}>
              <th style={headerCellStyle(false)}>Username</th>
              <th style={headerCellStyle(false)}>Member Name</th>
              <th style={headerCellStyle(true)}>Created At</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} style={{ ...bodyCellStyle(true), textAlign: "center", padding: "32px", color: "#6B7280" }}>
                  Loading users...
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td colSpan={3} style={{ ...bodyCellStyle(true), textAlign: "center", padding: "32px", color: "#B91C1C" }}>
                  {errorMessage}
                </td>
              </tr>
            ) : displayedUsers.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ ...bodyCellStyle(true), textAlign: "center", padding: "32px", color: "#9CA3AF" }}>
                  {users.length === 0
                    ? "No users saved yet. Save a sales entry to add usernames here."
                    : "No users match your search."}
                </td>
              </tr>
            ) : (
              displayedUsers.map((user, index) => (
                <tr key={user.id} style={{ backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#fafafa" }}>
                  <td style={bodyCellStyle(false)}>{user.username || "—"}</td>
                  <td style={bodyCellStyle(false)}>{user.member_name || "—"}</td>
                  <td style={bodyCellStyle(true)}>{formatDateTime(user.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && !errorMessage && displayedUsers.length > 0 ? (
        <div style={{ marginTop: "10px", fontSize: "12px", color: "#9CA3AF" }}>
          Showing {displayedUsers.length} user{displayedUsers.length > 1 ? "s" : ""}
        </div>
      ) : null}
    </div>
  );
}
