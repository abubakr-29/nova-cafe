import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: requesterProfile } = await supabase
    .from("staff_profiles")
    .select("restaurant_id, role")
    .eq("id", user.id)
    .single();

  if (!requesterProfile || requesterProfile.role !== "owner") {
    return NextResponse.json(
      { error: "Only an owner can remove staff." },
      { status: 403 },
    );
  }

  if (id === user.id) {
    return NextResponse.json(
      { error: "You can't remove your own account." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Confirm the target actually belongs to the requester's own
  // restaurant before deleting anything — never trust the id alone.
  const { data: targetProfile } = await admin
    .from("staff_profiles")
    .select("restaurant_id")
    .eq("id", id)
    .single();

  if (
    !targetProfile ||
    targetProfile.restaurant_id !== requesterProfile.restaurant_id
  ) {
    return NextResponse.json(
      { error: "Staff member not found." },
      { status: 404 },
    );
  }

  // Deleting the auth user cascades to remove the staff_profiles row too.
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json(
      { error: "Could not remove staff member." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
