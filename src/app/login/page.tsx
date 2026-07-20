"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Building2, User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  HOSTEL_LOGIN_ACCOUNTS,
  PLATFORM_NAME,
  resolveHostelLoginAccount,
} from "@/lib/appConfig";
import { LOCAL_HERO_FALLBACK, resolveLoginHeroUrl } from "@/lib/publicAssets";

const COPYRIGHT_YEAR = 2026;

function LoginHeroImage({ className, sizes }: { className?: string; sizes: string }) {
  const primarySrc = useMemo(() => resolveLoginHeroUrl(), []);
  const [src, setSrc] = useState(primarySrc);

  return (
    <Image
      src={src}
      alt="Royal Girls Hostels — Sukkur"
      fill
      priority
      className={className ?? "object-cover object-center"}
      sizes={sizes}
      onError={() => {
        if (src !== LOCAL_HERO_FALLBACK) setSrc(LOCAL_HERO_FALLBACK);
      }}
    />
  );
}

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

    router.refresh();
    router.push("/dashboard");
  };

  const fillHostel = (displayName: string) => {
    setUsername(displayName);
    setError("");
  };

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      <div className="relative h-52 shrink-0 sm:h-64 lg:hidden">
        <LoginHeroImage sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-gray-900/20" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-lg font-bold text-white">{PLATFORM_NAME}</p>
          <p className="mt-1 text-sm text-white/85">Safe, modern accommodation in Sukkur</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between bg-white px-4 py-6 sm:px-8 lg:w-[min(100%,28rem)] lg:shrink-0 lg:px-10 xl:w-[32rem] xl:px-12">
        <div>
          <div className="mb-8 flex items-center gap-3 lg:mb-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-600/25">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="block text-lg font-bold text-gray-900">{PLATFORM_NAME}</span>
              <span className="text-xs font-medium text-gray-400">Admin portal</span>
            </div>
          </div>

          <div className="mx-auto max-w-md lg:mx-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
              Sign in with your hostel name and password to manage students, rooms, fees, and
              expenses.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {HOSTEL_LOGIN_ACCOUNTS.map((account) => (
                <button
                  key={account.hostelSlug}
                  type="button"
                  onClick={() => fillHostel(account.displayName)}
                  className="rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  {account.displayName}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
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
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-10 pr-10 text-sm text-gray-900 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-md text-center text-xs text-gray-400 lg:mx-0 lg:text-left">
          © {COPYRIGHT_YEAR} {PLATFORM_NAME}. All rights reserved.
        </p>
      </div>

      <div className="relative hidden min-h-[100dvh] flex-1 lg:block">
        <LoginHeroImage sizes="(min-width: 1024px) 60vw" />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/75 via-blue-950/55 to-gray-900/80" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="max-w-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200/90">
              Sukkur · Pakistan
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-white xl:text-4xl">
              A trusted home for students
            </h2>
          </div>

          <div className="max-w-xl space-y-6">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
              <p className="text-[15px] leading-relaxed text-white/95">
                Secure girls&apos; hostel management in Sukkur — comfortable stays, clear fees, and
                a private admin login for each property.
              </p>
            </div>

            <p className="text-xs font-medium text-white/50">
              © {COPYRIGHT_YEAR} {PLATFORM_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
