import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { api, setSession, isAuthenticated } from "./api";

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      setSession(data.token, data.user);
      const redirectTo = location.state?.from || "/admin";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setForgotSuccess("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setForgotSuccess(
        "If that email address is registered, a password reset link has been sent to your Gmail inbox. Please check your inbox and spam folder."
      );
    } catch (err) {
      setError(err.message || "Failed to send reset email");
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
            {isForgot ? "Reset Password" : "KMES Admin"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isForgot
              ? "Enter your admin email to receive a reset link"
              : "Sign in to manage the website"}
          </p>
        </div>

        {isForgot ? (
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
            <input
              type="email"
              required
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
            />

            {forgotSuccess && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs leading-relaxed text-green-800">
                {forgotSuccess}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-2 disabled:opacity-60"
            >
              {loading ? "Sending Link..." : "Send Reset Link"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgot(false);
                  setError("");
                  setForgotSuccess("");
                }}
                className="text-xs font-semibold text-gray-500 hover:text-navy hover:underline focus:outline-none"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-navy-2 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgot(true);
                  setError("");
                  setForgotSuccess("");
                }}
                className="text-xs font-semibold text-navy hover:underline focus:outline-none"
              >
                Forgot your password?
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminLogin;
