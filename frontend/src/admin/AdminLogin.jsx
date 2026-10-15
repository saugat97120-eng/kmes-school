import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useUser, SignInButton } from "@clerk/react";
import { api, setSession, isAuthenticated } from "./api";
import { API_BASE } from "../config";

const HAS_CLERK = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function ClerkLoginSection({ onSyncSuccess, onError }) {
  const { user: clerkUser, isSignedIn } = useUser();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (isSignedIn && clerkUser && !syncingRef.current) {
      const email = clerkUser.primaryEmailAddress?.emailAddress;
      const name = clerkUser.fullName || clerkUser.firstName || "School Admin";
      const clerkUserId = clerkUser.id;
      if (email) {
        syncingRef.current = true;
        fetch(`${API_BASE}/auth/clerk-sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, clerkUserId }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.token) {
              onSyncSuccess(data.token, data.user);
            } else {
              onError(data.message || "Failed to sync account");
              syncingRef.current = false;
            }
          })
          .catch((err) => {
            onError(err.message || "Network error during Clerk sync");
            syncingRef.current = false;
          });
      }
    }
  }, [isSignedIn, clerkUser, onSyncSuccess, onError]);

  return (
    <div className="mt-6">
      <SignInButton mode="modal">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 focus:outline-none cursor-pointer"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {syncing ? "Connecting with Clerk..." : "Sign in with Google / Clerk"}
        </button>
      </SignInButton>
      <div className="relative my-4 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <span className="relative bg-white px-2 text-xs uppercase tracking-wider text-gray-400">
          Or with password
        </span>
      </div>
    </div>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() =>
    new URLSearchParams(window.location.search).get("expired") ? "Your session expired. Please sign in again." : ""
  );
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
        "If that email address is registered, a password reset link has been sent to that address. Please check your inbox and spam folder."
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

        {HAS_CLERK && !isForgot && (
          <ClerkLoginSection
            onSyncSuccess={(token, user) => {
              setSession(token, user);
              const redirectTo = location.state?.from || "/admin";
              navigate(redirectTo, { replace: true });
            }}
            onError={(msg) => setError(msg)}
          />
        )}

        {isForgot ? (
          <form onSubmit={handleForgotPassword} className="mt-8 space-y-4">
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
            />

            {forgotSuccess && (
              <div className="space-y-2">
                <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs leading-relaxed text-green-800">
                  {forgotSuccess}
                </div>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-800">
                  <span className="font-semibold">Didn&apos;t receive it?</span> Check your spam folder. If real Gmail delivery is not yet enabled on your server, administrators can also view the generated link directly in the Render backend logs.
                </div>
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
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-navy"
            />
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
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
