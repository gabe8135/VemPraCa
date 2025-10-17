"use client";
import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminGate from "@/app/components/AdminGate";
import { supabase, isSupabaseConfigured } from "@/app/lib/supabaseClient";

export default function ClientAdminPage() {
  const searchParams = useSearchParams();
  const from = searchParams?.get("from") || "";
  const to = searchParams?.get("to") || "";
  const notaMin = searchParams?.get("notaMin") || "";
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (notaMin) qs.set("notaMin", notaMin);

  const qsStr = qs.toString();
  const avalUrl = qsStr
    ? `/api/eventos/festa-caicara/avaliacoes?${qsStr}`
    : "/api/eventos/festa-caicara/avaliacoes";
  const scansUrl = qsStr
    ? `/api/eventos/festa-caicara/scans?${qsStr}`
    : "/api/eventos/festa-caicara/scans";

  return (
    <AdminGate redirectOnDenied>
      <AdminContent
        avalUrl={avalUrl}
        scansUrl={scansUrl}
        from={from}
        to={to}
        notaMin={notaMin}
      />
    </AdminGate>
  );
}

async function fetchJSON(path) {
  try {
    let url = path;
    if (path.startsWith("/")) {
      if (typeof window !== "undefined") {
        url = `${window.location.origin}${path}`;
      } else {
        url = path;
      }
    }
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch (e) {
    return { error: String(e?.message || e) };
  }
}

function buildQS(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  return qs.toString();
}

function isWithin(nowIso, startIso, endIso) {
  const now = nowIso ? new Date(nowIso).getTime() : Date.now();
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  return now >= a && now < b;
}

function VisStatus({ vis, serverNow }) {
  if (!vis?.start || !vis?.end) return null;
  const within = serverNow ? isWithin(serverNow, vis.start, vis.end) : null;
  let status = "";
  if (vis.mode === "on") status = "Exibindo (forçado ON)";
  else if (vis.mode === "off") status = "Oculto (forçado OFF)";
  else status = within ? "Exibindo (janela ativa)" : "Oculto (fora da janela)";
  return (
    <div className="text-sm text-gray-700 mb-3">
      <span className="font-medium">Status agora:</span> {status}
      {serverNow && (
        <span className="ml-2 text-gray-500">
          (server: {new Date(serverNow).toLocaleString("pt-BR")})
        </span>
      )}
    </div>
  );
}

function RecentList({ from, to }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancel = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQS({ from, to, list: 1, limit: 50 });
        const url = qs
          ? `/api/eventos/festa-caicara/avaliacoes?${qs}`
          : "/api/eventos/festa-caicara/avaliacoes";
        const data = await fetchJSON(url);
        if (!cancel) {
          if (data?.error) {
            setError(data.error);
            setItems([]);
          } else {
            setItems(data?.items || []);
          }
        }
      } catch (e) {
        if (!cancel) setError(String(e?.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    run();
    return () => {
      cancel = true;
    };
  }, [from, to]);

  if (loading) return <p className="text-sm text-gray-500">Carregando…</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (!items.length)
    return <p className="text-sm text-gray-500">Sem avaliações no período.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-emerald-700">
            <th className="py-2 pr-4">Quando</th>
            <th className="py-2 pr-4">Estande</th>
            <th className="py-2 pr-4">Nota</th>
            <th className="py-2 pr-4">Nome</th>
            <th className="py-2 pr-4">Comentário</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t border-emerald-50">
              <td className="py-2 pr-4">
                {new Date(it.created_at).toLocaleString("pt-BR")}
              </td>
              <td className="py-2 pr-4">{it.estande_slug}</td>
              <td className="py-2 pr-4">{Number(it.nota).toFixed(1)}</td>
              <td className="py-2 pr-4">{it.nome || "Anônimo"}</td>
              <td className="py-2 pr-4 whitespace-pre-wrap max-w-[40ch]">
                {it.comentario || ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminContent({ avalUrl, scansUrl, from, to, notaMin }) {
  const DEFAULT_VIS_REF = React.useRef({
    mode: "auto",
    start: "2025-10-24T00:00:00-03:00",
    end: "2025-10-28T00:00:00-03:00",
  });
  const [aval, setAval] = React.useState(null);
  const [scans, setScans] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);
  const [vis, setVis] = React.useState(DEFAULT_VIS_REF.current);
  const [savingVis, setSavingVis] = React.useState(false);
  const [visMsg, setVisMsg] = React.useState("");
  const [serverNow, setServerNow] = React.useState(null);

  React.useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const [a, s] = await Promise.all([
          fetchJSON(avalUrl),
          fetchJSON(scansUrl),
        ]);
        // Busca settings direto no Supabase (padrão do projeto)
        let cfg = null;
        try {
          const { data: s1, error: e1 } = await supabase
            .from("app_settings")
            .select("value, updated_at")
            .eq("key", "festanca_visibility")
            .maybeSingle();
          if (!e1 && s1?.value)
            cfg = { ...s1.value, updated_at: s1.updated_at };
        } catch {}
        // Busca serverNow via API (opcional)
        let serverNowVal = null;
        try {
          const apiCfg = await fetchJSON("/api/eventos/festa-caicara/settings");
          if (!apiCfg?.error && apiCfg?.serverNow)
            serverNowVal = apiCfg.serverNow;
          if (!cfg && !apiCfg?.error)
            cfg = {
              mode: apiCfg.mode,
              start: apiCfg.start,
              end: apiCfg.end,
              updated_at: apiCfg.updated_at,
            };
        } catch {}
        if (!cancel) {
          setAval(a);
          setScans(s);
          const safe = cfg && !cfg.error ? cfg : DEFAULT_VIS_REF.current;
          setVis({
            mode: safe?.mode ?? DEFAULT_VIS_REF.current.mode,
            start: safe?.start ?? DEFAULT_VIS_REF.current.start,
            end: safe?.end ?? DEFAULT_VIS_REF.current.end,
          });
          setServerNow(serverNowVal);
        }
      } catch (e) {
        if (!cancel) setErr(String(e?.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    load();
    return () => {
      cancel = true;
    };
  }, [avalUrl, scansUrl]);

  if (loading) return <p className="text-sm text-gray-500">Carregando…</p>;
  if (err) return <p className="text-sm text-red-600">Erro: {err}</p>;

  return (
    <>
      <h1 className="text-2xl font-bold text-emerald-700 mb-4">
        Painel Festança Caiçara (Admin)
      </h1>

      <form className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div>
          <label className="block text-sm font-medium text-emerald-700">
            De (ISO)
          </label>
          <input
            name="from"
            defaultValue={from}
            type="datetime-local"
            className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-emerald-700">
            Até (ISO)
          </label>
          <input
            name="to"
            defaultValue={to}
            type="datetime-local"
            className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-emerald-700">
            Nota mínima
          </label>
          <input
            name="notaMin"
            defaultValue={notaMin}
            type="number"
            min="0"
            max="5"
            step="0.5"
            className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
          />
        </div>
        <div className="flex items-end">
          <button className="rounded-full bg-emerald-600 px-5 py-2 text-white">
            Aplicar filtros
          </button>
        </div>
      </form>

      <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4 mb-6">
        <h2 className="font-semibold text-emerald-700 mb-2">
          Visibilidade das avaliações/estandes
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          Controle global para abrir/fechar o conteúdo do evento. Modo
          &quot;auto&quot; respeita a janela de datas; &quot;on&quot; força a
          exibição; &quot;off&quot; oculta tudo. Acrescente ?preview=1 na URL
          para visualizar sem abrir publicamente.
        </p>
        <VisStatus vis={vis} serverNow={serverNow} />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-emerald-700">
              Modo
            </label>
            <select
              value={vis.mode}
              onChange={(e) => setVis((v) => ({ ...v, mode: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
            >
              <option value="auto">Auto (24-27/10)</option>
              <option value="on">Forçar ON</option>
              <option value="off">Forçar OFF</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-emerald-700">
              Início
            </label>
            <input
              type="datetime-local"
              value={vis.start?.slice(0, 16) || ""}
              onChange={(e) => setVis((v) => ({ ...v, start: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-emerald-700">
              Fim
            </label>
            <input
              type="datetime-local"
              value={vis.end?.slice(0, 16) || ""}
              onChange={(e) => setVis((v) => ({ ...v, end: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button
              type="button"
              onClick={() => setVis((v) => ({ ...v, mode: "on" }))}
              className="rounded-full bg-emerald-50 text-emerald-700 px-4 py-2 ring-1 ring-emerald-200"
            >
              Forçar ON
            </button>
            <button
              type="button"
              onClick={() => setVis((v) => ({ ...v, mode: "off" }))}
              className="rounded-full bg-rose-50 text-rose-700 px-4 py-2 ring-1 ring-rose-200"
            >
              Forçar OFF
            </button>
            <button
              onClick={async () => {
                setSavingVis(true);
                setVisMsg("");
                try {
                  // Normaliza timezone: se usuário não incluiu offset/Z, aplica -03:00
                  const normTZ = (s) => {
                    if (!s) return s;
                    if (/Z|[+-]\d{2}:?\d{2}$/.test(s)) return s; // já tem tz
                    return `${s}-03:00`;
                  };
                  const payload = {
                    ...vis,
                    start: normTZ(vis.start),
                    end: normTZ(vis.end),
                  };
                  // 1) Tenta salvar via Supabase client (padrão do site)
                  let saved = false;
                  let lastErr = null;
                  let diag = null;
                  try {
                    const { error: upErr } = await supabase
                      .from("app_settings")
                      .upsert(
                        { key: "festanca_visibility", value: payload },
                        { onConflict: "key" }
                      );
                    if (!upErr) saved = true;
                    else lastErr = upErr;
                  } catch (e) {
                    lastErr = e;
                  }

                  // 2) Se falhar, tenta API (pode usar service role se estiver configurado no servidor)
                  if (!saved) {
                    try {
                      let headers = { "Content-Type": "application/json" };
                      if (isSupabaseConfigured) {
                        try {
                          const { data: session } =
                            await supabase.auth.getSession();
                          const token = session?.session?.access_token;
                          if (token)
                            headers = {
                              ...headers,
                              Authorization: `Bearer ${token}`,
                            };
                        } catch {}
                      }
                      const res = await fetch(
                        "/api/eventos/festa-caicara/settings",
                        {
                          method: "POST",
                          headers,
                          body: JSON.stringify(payload),
                        }
                      );
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && !data?.error) {
                        saved = true;
                      } else {
                        lastErr = data?.error || res.statusText;
                        diag = data?.diag || null;
                      }
                    } catch (e) {
                      lastErr = e;
                    }
                  }

                  if (!saved) {
                    const msg =
                      typeof lastErr === "string"
                        ? lastErr
                        : lastErr?.message || JSON.stringify(lastErr);
                    const extra = diag
                      ? ` | diag: ${JSON.stringify(diag)}`
                      : "";
                    throw new Error(`Falha ao salvar settings: ${msg}${extra}`);
                  }
                  setVisMsg("Configuração salva.");
                } catch (e) {
                  setVisMsg("Erro ao salvar: " + String(e?.message || e));
                } finally {
                  setSavingVis(false);
                }
              }}
              disabled={savingVis}
              className="rounded-full bg-emerald-600 px-5 py-2 text-white"
            >
              {savingVis ? "Salvando…" : "Salvar visibilidade"}
            </button>
            {visMsg && (
              <span className="text-sm text-gray-600 self-center">
                {visMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {aval?.error || scans?.error ? (
        <p className="text-red-600 text-sm">
          Erro: {aval?.error || scans?.error}
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4">
            <h2 className="font-semibold text-emerald-700 mb-2">Visão Geral</h2>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>Total avaliações: {aval?.total ?? 0}</li>
              <li>Média geral: {(aval?.media ?? 0).toFixed(2)}</li>
              <li>Total scans: {scans?.total ?? 0}</li>
            </ul>
          </div>

          <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4 lg:col-span-2">
            <h2 className="font-semibold text-emerald-700 mb-2">
              Ranking por estande
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-emerald-700">
                    <th className="py-2 pr-4">Estande</th>
                    <th className="py-2 pr-4">Média</th>
                    <th className="py-2 pr-4">Avaliações</th>
                    <th className="py-2 pr-4">Scans</th>
                  </tr>
                </thead>
                <tbody>
                  {(aval?.ranking || []).map((r) => (
                    <tr key={r.slug} className="border-t border-emerald-50">
                      <td className="py-2 pr-4">{r.slug}</td>
                      <td className="py-2 pr-4">{r.media.toFixed(2)}</td>
                      <td className="py-2 pr-4">{r.total}</td>
                      <td className="py-2 pr-4">
                        {scans?.porEstande?.[r.slug] || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4 lg:col-span-3">
            <h2 className="font-semibold text-emerald-700 mb-2">
              Avaliações recentes
            </h2>
            <Suspense>
              {/* Client-side widget simples para paginação pode ser adicionado depois */}
              <RecentList from={from} to={to} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
