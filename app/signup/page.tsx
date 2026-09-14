"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidSlug, slugify } from "@/lib/slug";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const linkError = searchParams.get("error");

  const [restaurantName, setRestaurantName] = useState("");
  const [manualSlug, setManualSlug] = useState<string | null>(null);
  const slug = manualSlug ?? slugify(restaurantName);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Debounced availability check — anon already has SELECT-only access
  // everywhere, so this is a plain, cheap read, not a privileged call.
  useEffect(() => {
    if (!isValidSlug(slug)) {
      return;
    }

    let ignore = false;

    const timer = setTimeout(async () => {
      setCheckingSlug(true);

      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!ignore) {
        setSlugAvailable(!data);
        setCheckingSlug(false);
      }
    }, 400);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [slug]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isValidSlug(slug)) {
      setError(
        "That restaurant URL isn't valid — use lowercase letters, numbers, and hyphens only.",
      );
      return;
    }

    if (slugAvailable === false) {
      setError("That restaurant URL is already taken.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();

    // The restaurant + owner row are NOT created here — only once the
    // email is confirmed (app/auth/confirm/route.ts), so a fake/mistyped
    // email can never create real tenant data. The name/slug travel along
    // as user metadata on the still-unconfirmed auth account so they're
    // available again when the confirmation link is opened, even on a
    // different device.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          pending_restaurant_name: restaurantName,
          pending_slug: slug,
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    setSubmitting(false);

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "An account with that email already exists."
          : "Something went wrong creating your account. Please try again.",
      );
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-5 text-center text-[#f5f2ea]">
        <div className="w-full max-w-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Almost there
          </p>

          <h1 className="mt-2 text-2xl font-medium tracking-[-0.02em]">
            Check your email
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/50">
            We sent a confirmation link to <strong>{email}</strong>. Open it to
            activate your account and set up{" "}
            {restaurantName || "your restaurant"}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0d] px-5 py-12 text-[#f5f2ea]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/2.5 p-8"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Get started
        </p>

        <h1 className="mt-2 text-2xl font-medium tracking-[-0.02em]">
          Set up your restaurant
        </h1>

        <div className="mt-6 space-y-3">
          <input
            required
            value={restaurantName}
            onChange={(event) => setRestaurantName(event.target.value)}
            placeholder="Restaurant name"
            className="w-full rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-white/20"
          />

          <div>
            <div className="flex items-center rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm focus-within:border-white/20">
              <span className="shrink-0 text-white/30">/menu/</span>

              <input
                required
                value={slug}
                onChange={(event) => setManualSlug(slugify(event.target.value))}
                placeholder="your-restaurant"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/25"
              />
            </div>

            {slug && isValidSlug(slug) && (
              <p
                className={`mt-1.5 px-1 text-xs ${
                  checkingSlug
                    ? "text-white/30"
                    : slugAvailable
                      ? "text-emerald-400/70"
                      : "text-red-300/70"
                }`}
              >
                {checkingSlug
                  ? "Checking availability..."
                  : slugAvailable
                    ? "Available"
                    : "Already taken"}
              </p>
            )}
          </div>

          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-white/20"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password (min. 8 characters)"
              className="w-full rounded-xl border border-white/10 bg-white/2.5 px-4 py-3 pr-12 text-sm outline-none placeholder:text-white/25 focus:border-white/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-white/35 transition hover:text-white/70"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        {(error || linkError) && (
          <p className="mt-3 text-xs text-red-300/80">{error ?? linkError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 h-12 w-full rounded-full bg-[#f5f2ea] text-sm font-medium text-[#0b0b0d] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className="mt-5 text-center text-xs text-white/30">
          Already have an account?{" "}
          <Link href="/login" className="text-white/60 hover:text-white">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
