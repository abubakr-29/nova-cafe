import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireOwner() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("restaurant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "owner") {
    return {
      error: NextResponse.json(
        { error: "Only an owner can manage staff." },
        { status: 403 },
      ),
    };
  }

  return { user, profile };
}

export async function GET() {
  const result = await requireOwner();
  if (result.error) return result.error;

  const admin = createAdminClient();

  const { data: staff, error } = await admin
    .from("staff_profiles")
    .select("id, full_name, role, created_at")
    .eq("restaurant_id", result.profile.restaurant_id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Could not load staff." },
      { status: 500 },
    );
  }

  const staffWithEmail = await Promise.all(
    (staff ?? []).map(async (member) => {
      const { data: authUser } = await admin.auth.admin.getUserById(member.id);
      return { ...member, email: authUser.user?.email ?? "" };
    }),
  );

  return NextResponse.json({ staff: staffWithEmail });
}

export async function POST(request: Request) {
  const result = await requireOwner();
  if (result.error) return result.error;

  const { fullName, email, password, role } = await request.json();

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "Missing fields." }, { status: 400 });
  }

  if (role !== "staff" && role !== "manager") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: userData, error: createUserError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createUserError || !userData.user) {
    return NextResponse.json(
      { error: createUserError?.message ?? "Could not create the account." },
      { status: 400 },
    );
  }

  // result.profile.restaurant_id comes from the OWNER'S OWN session —
  // never from client input — so a new account can only ever be
  // attached to the restaurant the owner actually belongs to.
  const { error: profileError } = await admin.from("staff_profiles").insert({
    id: userData.user.id,
    restaurant_id: result.profile.restaurant_id,
    full_name: fullName,
    role,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userData.user.id);
    return NextResponse.json(
      { error: "Could not set up the staff profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
