"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  HOSTEL_LOGIN_ACCOUNTS,
  PLATFORM_NAME,
  resolveHostelLoginAccount,
} from "@/lib/appConfig";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const account = resolveHostelLoginAccount(username);
    if (!account) {
      setError(
        `Use an exact hostel name, e.g. "${HOSTEL_LOGIN_ACCOUNTS[0].displayName}".`
      );
      setLoading(false);
      return;
    }

    const { error: signInError } = await signIn(account.email, password);
    if (signInError) {
      setError("Invalid hostel name or password.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-[100dvh]">
      <div className="flex w-full flex-col justify-between bg-white px-4 py-6 sm:px-8 lg:w-1/2 lg:px-16 xl:px-24">
        <div>
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-blue-600">{PLATFORM_NAME}</span>
          </div>

          <div className="mx-auto max-w-md">
            <h1 className="text-2xl font-bold text-gray-900">Hostel login</h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in with your hostel name and password.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Hostel name (username)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Royal Girls Hostel 1"
                    required
                    autoComplete="username"
                    className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {HOSTEL_LOGIN_ACCOUNTS.map((a) => a.displayName).join(" · ")}
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-md items-center justify-center text-xs text-gray-400">
          <span>One account per hostel property</span>
        </div>
      </div>

      <div className="relative hidden lg:block lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80')] bg-cover bg-center opacity-30" />
        </div>
        <div className="relative flex h-full flex-col justify-end p-12">
          <div className="rounded-xl bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-lg font-medium italic text-white/90">
              &ldquo;Separate logins for each hostel — same management platform.&rdquo;
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-white/50">
              — {PLATFORM_NAME}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
