"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

export default function AdminGate({ children, redirectOnDenied = false }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        if (redirectOnDenied)
          router.push("/login?message=Acesso restrito a administradores.");
        setError("Acesso restrito a administradores. Faça login.");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        if (error && error.code !== "PGRST116") throw error;
        const ok = data?.role === "admin";
        if (!ok) {
          setIsAdmin(false);
          setError(
            "Acesso negado. Você não tem permissão para ver esta página."
          );
        } else {
          setIsAdmin(true);
        }
      } catch (e) {
        setError(`Falha ao validar permissões: ${e.message || e}`);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [router, redirectOnDenied]);

  if (loading)
    return <p className="text-sm text-gray-500">Verificando permissões…</p>;
  if (!isAdmin)
    return <p className="text-sm text-red-600">{error || "Acesso negado."}</p>;
  return typeof children === "function" ? children() : children;
}
