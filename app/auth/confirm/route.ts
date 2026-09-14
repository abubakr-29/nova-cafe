import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mirrors the auth-js EmailOtpType union — not importing it directly since
// it isn't re-exported from the top-level @supabase/supabase-js package we
// actually depend on.
type EmailOtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type) {
    return redirectWithError(
      request,
      "/login",
      "That confirmation link is invalid or has expired.",
    );
  }

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (verifyError) {
    return redirectWithError(
      request,
      "/login",
      "That confirmation link is invalid or has expired.",
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectWithError(
      request,
      "/login",
      "Something went wrong confirming your account. Please try signing in.",
    );
  }

  // Only provision a restaurant the first time — if this account already
  // has one (e.g. the confirmation link was opened twice), just sign them
  // in normally instead of trying again.
  const { data: existingProfile } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const pendingName = user.user_metadata?.pending_restaurant_name as
      | string
      | undefined;
    const pendingSlug = user.user_metadata?.pending_slug as string | undefined;

    if (pendingName && pendingSlug) {
      const { error: provisionError } = await supabase.rpc(
        "provision_restaurant",
        { p_name: pendingName, p_slug: pendingSlug },
      );

      if (provisionError) {
        const message = provisionError.message.includes("slug_taken")
          ? "That restaurant URL was taken while you were confirming your email. Please sign up again with a different one."
          : "We couldn't finish setting up your restaurant. Please try signing up again.";

        return redirectWithError(request, "/signup", message);
      }
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = "/dashboard";
  url.search = "";
  return NextResponse.redirect(url);
}

function redirectWithError(
  request: NextRequest,
  pathname: string,
  message: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}
