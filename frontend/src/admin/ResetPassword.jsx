import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { api } from "./api";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing. Please click the exact link from your email.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to reset password. The link may have expired or already been used.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-light px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy font-serif text-lg font-bold text-gold">
            K
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold text-navy">
            New Password
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a secure password for your admin account
          </p>
        </div>

        {!token ? (
          <div className="mt-6 text-center">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
              No reset token found in the URL. Please ensure you clicked the complete link sent to your Gmail inbox.
            </div>
            <div className="mt-6">
              <Link
                to="/admin/login"
                className="inline-block rounded-md bg-navy px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-navy-2"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="mt-6 text-center">
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-xs leading-relaxed text-green-900">
              Your password has been successfully updated! You can now sign in with your new credentials.
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => navigate("/admin/login", { replace: true })}
                className="w-full rounded-md bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-2"
              >
                Sign In Now
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="mt-8 space-y-4">
            <div>
              <input
                type="password"
                required
                minLength={6}
                placeholder="New Password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
              />
            </div>

            <div>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-2 disabled:opacity-60"
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/admin/login"
                className="text-xs font-semibold text-gray-500 hover:text-navy hover:underline focus:outline-none"
              >
                Cancel and Return to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
