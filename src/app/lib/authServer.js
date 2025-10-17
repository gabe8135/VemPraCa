import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";

function getSupabaseServer() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    "";
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name) {
        return cookies().get(name)?.value;
      },
      set(name, value, options) {
        try {
          cookies().set(name, value, options);
        } catch {}
      },
      remove(name, options) {
        try {
          cookies().set(name, "", { ...options, maxAge: 0 });
        } catch {}
      },
    },
  });
}

export async function requireAdmin() {
  const supabase = getSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect("/login");
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (error && error.code !== "PGRST116") {
    redirect("/");
  }
  const isAdmin = data?.role === "admin";
  if (!isAdmin) {
    redirect("/");
  }
  return { supabase, session };
}
