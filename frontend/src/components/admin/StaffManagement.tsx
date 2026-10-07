import { useCallback, useEffect, useState } from "react";
import type { Session } from "../../types/auth";
import type { ManagedUser, ManagedUserRole, ManagedUserStatus } from "../../types/staff";
import {
  createStaff,
  fetchUsers,
  resetUserPassword,
  updateUserRole,
  updateUserStatus,
} from "../../services/staffApi";

interface StaffManagementProps {
  session: Session;
}

function formatCreatedAt(value: string): string {
  if (!value) return "—";
  const parsed = new Date(value.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-IN");
}

export default function StaffManagement({ session }: StaffManagementProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<ManagedUserRole | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<ManagedUserStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffPasswordConfirm, setStaffPasswordConfirm] = useState("");
  const [savingStaff, setSavingStaff] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await fetchUsers(session.token, {
        search,
        role: roleFilter,
        status: statusFilter,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [session.token, search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadUsers();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  function clearForm() {
    setStaffName("");
    setStaffEmail("");
    setStaffPassword("");
    setStaffPasswordConfirm("");
  }

  async function handleCreateStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (staffPassword !== staffPasswordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setSavingStaff(true);
    try {
      await createStaff(session.token, {
        fullName: staffName.trim(),
        email: staffEmail.trim(),
        password: staffPassword,
      });
      clearForm();
      setShowAddStaff(false);
      setMessage("Staff account created successfully.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create staff account.");
    } finally {
      setSavingStaff(false);
    }
  }

  async function handleStatusChange(user: ManagedUser) {
    if (user.userId === session.userId) return;

    const nextActive = user.status === "INACTIVE";
    const confirmed = window.confirm(
      nextActive
        ? `Activate ${user.fullName}'s account?`
        : `Deactivate ${user.fullName}'s account? They will no longer be able to log in.`,
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await updateUserStatus(session.token, user.userId, nextActive ? "Y" : "N");
      setMessage(nextActive ? "Account activated." : "Account deactivated.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update account status.");
    }
  }

  async function handleRoleChange(user: ManagedUser, nextRole: "STUDENT" | "STAFF") {
    if (user.userId === session.userId || user.role === nextRole) return;

    const confirmed = window.confirm(
      `Change ${user.fullName}'s role from ${user.role} to ${nextRole}?`,
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await updateUserRole(session.token, user.userId, nextRole);
      setMessage(`Role changed to ${nextRole}.`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update user role.");
    }
  }

  async function handlePasswordReset(user: ManagedUser) {
    if (user.userId === session.userId) return;

    const password = window.prompt(
      `Enter a new password for ${user.fullName} (minimum 6 characters):`,
    );
    if (password === null) return;
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const confirmed = window.confirm(`Reset ${user.fullName}'s password?`);
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await resetUserPassword(session.token, user.userId, password);
      setMessage("Password reset successfully. The password itself is never displayed or stored in the UI.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    }
  }

  return (
    <section className="admin-section user-management-section">
      <div className="section-heading">
        <div>
          <span className="section-kicker">ACCESS CONTROL</span>
          <h2>User &amp; Staff Management</h2>
        </div>
        <div className="section-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setError("");
              setMessage("");
              setShowAddStaff(true);
            }}
          >
            Add Staff
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={loadUsers}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="admin-card user-management-card">
        <p className="admin-card-description">
          Manage student and staff access. Passwords are never shown. Your own account cannot be disabled or have its role changed.
        </p>

        <div className="user-filter-grid">
          <label>
            Search
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or email"
            />
          </label>

          <label>
            Role
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as ManagedUserRole | "ALL")}>
              <option value="ALL">All roles</option>
              <option value="STUDENT">Student</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>

          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ManagedUserStatus | "ALL")}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
        </div>

        {message && <div className="admin-message user-inline-message">{message}</div>}
        {error && <div className="admin-message report-error user-inline-message">{error}</div>}

        <div className="report-table user-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="user-empty-cell">No users match the selected filters.</td>
                </tr>
              )}

              {users.map((user) => {
                const isSelf = user.userId === session.userId;
                const canChangeRole = !isSelf && user.role !== "ADMIN";
                const canChangeStatus = !isSelf;

                return (
                  <tr key={user.userId}>
                    <td>{user.userId}</td>
                    <td>
                      <div className="user-name-cell">
                        <strong>{user.fullName}</strong>
                        {isSelf && <small>Current account</small>}
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      {canChangeRole ? (
                        <select
                          className="user-role-select"
                          value={user.role}
                          onChange={(event) => handleRoleChange(user, event.target.value as "STUDENT" | "STAFF")}
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="STAFF">STAFF</option>
                        </select>
                      ) : (
                        <span className="user-role-badge">{user.role}</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${user.status === "ACTIVE" ? "published" : "unavailable"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td>{formatCreatedAt(user.createdAt)}</td>
                    <td>
                      <div className="table-actions user-actions">
                        <button
                          type="button"
                          className={user.status === "ACTIVE" ? "danger-button compact-button" : "primary-button compact-button"}
                          disabled={!canChangeStatus}
                          onClick={() => handleStatusChange(user)}
                        >
                          {user.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="secondary-button compact-button"
                          disabled={isSelf}
                          onClick={() => handlePasswordReset(user)}
                        >
                          Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddStaff && (
        <div className="user-modal-backdrop" role="presentation">
          <div className="user-modal" role="dialog" aria-modal="true" aria-labelledby="add-staff-title">
            <div className="user-modal-header">
              <div>
                <span className="section-kicker">STAFF ACCOUNT</span>
                <h3 id="add-staff-title">Add Staff</h3>
              </div>
              <button type="button" className="secondary-button compact-button" onClick={() => { clearForm(); setShowAddStaff(false); }}>
                Close
              </button>
            </div>

            <form onSubmit={handleCreateStaff}>
              <label>
                Full Name
                <input value={staffName} onChange={(event) => setStaffName(event.target.value)} maxLength={100} required />
              </label>
              <label>
                Email
                <input type="email" value={staffEmail} onChange={(event) => setStaffEmail(event.target.value)} maxLength={150} required />
              </label>
              <label>
                Initial Password
                <input type="password" value={staffPassword} onChange={(event) => setStaffPassword(event.target.value)} minLength={6} autoComplete="new-password" required />
              </label>
              <label>
                Confirm Password
                <input type="password" value={staffPasswordConfirm} onChange={(event) => setStaffPasswordConfirm(event.target.value)} minLength={6} autoComplete="new-password" required />
              </label>

              <p className="user-password-note">
                The password is hashed by the backend and is never returned to the frontend.
              </p>

              <div className="user-modal-actions">
                <button type="button" className="secondary-button" onClick={() => { clearForm(); setShowAddStaff(false); }}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={savingStaff}>
                  {savingStaff ? "Creating..." : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
