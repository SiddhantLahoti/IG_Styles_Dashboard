import React, { useState, useEffect } from 'react';
import { 
  getAdminUsers, 
  createAdminUser, 
  deleteAdminUser, 
  updateUserPassword, 
  toggleUserStatus 
} from '../../services/api';

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Add User Form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [creating, setCreating] = useState(false);

  // Change Password Modal state
  const [resetModalUser, setResetModalUser] = useState(null); // username string when modal open
  const [updatedPassword, setUpdatedPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Handle Create User
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setError('Please provide both username and password.');
      return;
    }
    setError('');
    setActionSuccess('');
    setCreating(true);
    try {
      await createAdminUser(newUsername, newPassword, newRole);
      setActionSuccess(`User '${newUsername}' created successfully.`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Handle Status Toggle (Start / Stop Access)
  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active;
    const actionLabel = nextStatus ? 'restore access for' : 'suspend access for';
    if (!window.confirm(`Are you sure you want to ${actionLabel} '${user.username}'?`)) return;

    setError('');
    setActionSuccess('');
    try {
      await toggleUserStatus(user.username, nextStatus);
      setActionSuccess(
        `User '${user.username}' is now ${nextStatus ? 'ACTIVE' : 'SUSPENDED'}.`
      );
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle Password Reset Submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!updatedPassword.trim()) {
      setModalError('Password cannot be empty.');
      return;
    }
    setModalError('');
    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(resetModalUser, updatedPassword);
      setActionSuccess(`Password for '${resetModalUser}' has been updated.`);
      setResetModalUser(null);
      setUpdatedPassword('');
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Delete User
  const handleDelete = async (username) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete user '${username}'?`)) return;
    setError('');
    setActionSuccess('');
    try {
      await deleteAdminUser(username);
      setActionSuccess(`User '${username}' deleted.`);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">Team Access & User Management</h2>
          <p className="text-xs text-slate-500">
            Control login credentials, reset passwords, and toggle access states
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs cursor-pointer transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {actionSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
          {actionSuccess}
        </div>
      )}

      {/* Add New User Box */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs mb-8">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Add New Member</h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="e.g. rohit"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Password</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Assign a password"
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="user">User (Catalog Viewer)</option>
              <option value="admin">Admin (Can manage users)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all disabled:opacity-50 cursor-pointer h-[34px]"
          >
            {creating ? 'Adding...' : '+ Create Account'}
          </button>
        </form>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">Accounts ({users.length})</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading user list...</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3">Username</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isAdmin = u.role === 'admin';
                const isMasterAdmin = u.username.toLowerCase() === 'admin';
                const isActive = u.is_active;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 font-semibold text-slate-800">
                      {u.username}
                      {isMasterAdmin && (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Master
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isAdmin
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-400">{u.created_at || '-'}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle Access (Start/Stop) */}
                        {!isMasterAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                              isActive
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            }`}
                            title={isActive ? 'Stop access for this user' : 'Restore access'}
                          >
                            {isActive ? 'Suspend' : 'Activate'}
                          </button>
                        ) : null}

                        {/* Reset Password Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setResetModalUser(u.username);
                            setUpdatedPassword('');
                            setModalError('');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors cursor-pointer"
                          title="Set a new password for this user"
                        >
                          🔑 Password
                        </button>

                        {/* Delete User */}
                        {!isMasterAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(u.username)}
                            className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                            title="Delete this user permanently"
                          >
                            ✕
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Change Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-black text-slate-800">
              Update Password
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Setting new credentials for <span className="font-bold text-indigo-600">@{resetModalUser}</span>
            </p>

            {modalError && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  New Password
                </label>
                <input
                  type="text"
                  autoFocus
                  value={updatedPassword}
                  onChange={(e) => setUpdatedPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  disabled={isUpdatingPassword}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingPassword ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}