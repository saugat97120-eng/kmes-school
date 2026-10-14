import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { api, getUser } from "./api";

const uid = (u) => u?.id ?? u?._id;

function UsersManager() {
  const currentUser = getUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "editor" });

  const load = () => {
    api
      .getUsers()
      .then((data) => setUsers(data.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.createUser(form);
      setFormOpen(false);
      setForm({ name: "", email: "", password: "", role: "editor" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await api.updateUser(id, { role });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnlock = async (id) => {
    try {
      await api.updateUser(id, { unlock: true });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this user's access? They will no longer be able to log in.")) return;
    try {
      await api.deleteUser(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-navy">Users & Access</h1>
          <p className="mt-1 text-sm text-gray-500">
            Administrators have full access. Editors can create and edit content but cannot manage users, permanently delete items, or change settings.
          </p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-2"
        >
          <Plus size={16} /> New User
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-500">Loading...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={uid(u)}>
                  <td className="px-5 py-3 text-navy">
                    <div className="font-medium">
                      {u.name} {uid(u) === currentUser?.id && <span className="text-xs text-gray-400">(you)</span>}
                    </div>
                    {u.isLocked && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                          Locked (Cool-down)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUnlock(uid(u))}
                          className="text-xs font-semibold text-navy hover:underline"
                        >
                          Unlock Now
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(uid(u), e.target.value)}
                      disabled={uid(u) === currentUser?.id}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold outline-none focus:border-navy disabled:opacity-50"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(uid(u))}
                      disabled={uid(u) === currentUser?.id}
                      className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      aria-label="Remove user"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-navy">New User</h2>
              <button onClick={() => setFormOpen(false)} aria-label="Close">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Name</label>
                <input
                  id="user-form-name"
                  name="name"
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Email</label>
                <input
                  id="user-form-email"
                  name="email"
                  autoComplete="email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Password</label>
                <input
                  id="user-form-password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Role</label>
                <select
                  id="user-form-role"
                  name="role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-md px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
                >
                  {saving ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersManager;
