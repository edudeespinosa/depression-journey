import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("notification_preferences")
    .select("email_notifications")
    .eq("user_id", user.id)
    .maybeSingle();

  // Default to true if the user has no row yet
  return NextResponse.json({ email_notifications: data?.email_notifications ?? true });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (typeof body.email_notifications !== "boolean") {
    return NextResponse.json({ error: "email_notifications must be a boolean" }, { status: 400 });
  }

  const { error } = await supabase
    .from("notification_preferences")
    .upsert({ user_id: user.id, email_notifications: body.email_notifications });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ email_notifications: body.email_notifications });
}
