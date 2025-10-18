"use client";

import { useEffect, useMemo, useState } from "react";
import { stands as datasetStands } from "@/data/festaCaicaraStands";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

function ymd(date) {
  try {
    return new Date(date).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function groupByDay(items, field = "created_at") {
  const map = new Map();
  items.forEach((it) => {
    const d = new Date(it[field]);
    if (isNaN(d)) return;
    const key = ymd(d);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

function toLocalLabel(isoDay) {
  try {
    const d = new Date(isoDay + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return isoDay;
  }
}

export default function FestaCaicaraCharts() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [serverNow, setServerNow] = useState("");
  const [ratings, setRatings] = useState([]);
  const [scans, setScans] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [stats, setStats] = useState({ total: 0, media: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carrega janela padrão do evento
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/eventos/festa-caicara/settings", {
          cache: "no-store",
        });
        const j = await r.json();
        const start = j?.start || "2025-10-24T00:00:00-03:00";
        const end = j?.end || "2025-10-28T00:00:00-03:00";
        if (alive) {
          setFrom(start);
          setTo(end);
          setServerNow(j?.serverNow || new Date().toISOString());
        }
      } catch {
        setFrom("2025-10-24T00:00:00-03:00");
        setTo("2025-10-28T00:00:00-03:00");
        setServerNow(new Date().toISOString());
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Carrega dados conforme filtros
  async function loadData(f, t) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (f) qs.set("from", f);
      if (t) qs.set("to", t);
      const qsStr = qs.toString();
      const baseAval = "/api/eventos/festa-caicara/avaliacoes";
      const baseScans = "/api/eventos/festa-caicara/scans";

      const [rList, rAgg, sList] = await Promise.all([
        fetch(`${baseAval}?list=1&limit=1000${qsStr ? `&${qsStr}` : ""}`),
        fetch(`${baseAval}${qsStr ? `?${qsStr}` : ""}`),
        fetch(`${baseScans}?list=1&limit=5000${qsStr ? `&${qsStr}` : ""}`),
      ]);

      const [jList, jAgg, jScans] = await Promise.all([
        rList.json(),
        rAgg.json(),
        sList.json(),
      ]);

      if (!rList.ok)
        throw new Error(jList?.error || "Falha avaliações (lista)");
      if (!rAgg.ok)
        throw new Error(jAgg?.error || "Falha avaliações (métricas)");
      if (!sList.ok) throw new Error(jScans?.error || "Falha scans (lista)");

      setRatings(Array.isArray(jList?.items) ? jList.items : []);
      setRanking(Array.isArray(jAgg?.ranking) ? jAgg.ranking : []);
      setStats({ total: jAgg?.total || 0, media: jAgg?.media || 0 });
      setScans(Array.isArray(jScans?.items) ? jScans.items : []);
    } catch (e) {
      setError(String(e?.message || e));
      setRatings([]);
      setRanking([]);
      setStats({ total: 0, media: 0 });
      setScans([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!from || !to) return;
    loadData(from, to);
  }, [from, to]);

  const ratingsByDay = useMemo(() => groupByDay(ratings), [ratings]);
  const scansByDay = useMemo(() => groupByDay(scans), [scans]);

  const festaDias = useMemo(() => {
    // Gera dias entre from e to-1
    try {
      const a = new Date(from);
      const b = new Date(to);
      const out = [];
      for (let d = new Date(a); d < b; d.setDate(d.getDate() + 1)) {
        const key = ymd(d);
        out.push({ key, label: toLocalLabel(key) });
      }
      return out;
    } catch {
      return [];
    }
  }, [from, to]);

  const festaPieData = useMemo(() => {
    const counts = new Map(festaDias.map((d) => [d.key, 0]));
    ratings.forEach((r) => {
      const k = ymd(r.created_at);
      if (counts.has(k)) counts.set(k, (counts.get(k) || 0) + 1);
    });
    return festaDias.map((d) => ({
      dia: d.label,
      count: counts.get(d.key) || 0,
    }));
  }, [ratings, festaDias]);

  const scansTotal = scans.length;
  const mediaFormatted = stats.media ? Number(stats.media).toFixed(2) : "0.00";

  const slugToName = useMemo(() => {
    const map = new Map();
    (datasetStands || []).forEach((s) => map.set(s.slug, s.nome));
    return map;
  }, []);

  const rankingDisplay = useMemo(() => {
    return (ranking || []).map((r) => ({
      ...r,
      name: slugToName.get(r.slug) || r.slug.replaceAll("-", " "),
    }));
  }, [ranking, slugToName]);

  const colors = [
    "#10b981",
    "#34d399",
    "#93c5fd",
    "#fbbf24",
    "#f43f5e",
    "#6366f1",
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="grow">
            <label className="block text-sm font-medium text-emerald-700">
              De
            </label>
            <input
              type="datetime-local"
              value={from ? from.slice(0, 16) : ""}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
            />
          </div>
          <div className="grow">
            <label className="block text-sm font-medium text-emerald-700">
              Até
            </label>
            <input
              type="datetime-local"
              value={to ? to.slice(0, 16) : ""}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-200 p-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadData(from, to)}
              className="rounded-full bg-emerald-600 px-5 py-2 text-white"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => {
                // Reset para janela padrão
                setFrom("2025-10-24T00:00:00-03:00");
                setTo("2025-10-28T00:00:00-03:00");
              }}
              className="rounded-full bg-white ring-1 ring-emerald-200 px-5 py-2 text-emerald-700"
            >
              Resetar janela
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Agora (server):{" "}
          {new Date(serverNow || Date.now()).toLocaleString("pt-BR")} |{" "}
          {ratings.length} avaliações, {scansTotal} scans
        </p>
        {error && (
          <p className="text-sm text-red-600 mt-2">
            Erro ao carregar dados: {error}
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4">
          <p className="text-sm text-gray-500">Total de avaliações</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.total}</p>
        </div>
        <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4">
          <p className="text-sm text-gray-500">Média geral</p>
          <p className="text-2xl font-bold text-emerald-700">
            {mediaFormatted} ⭐
          </p>
        </div>
        <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4">
          <p className="text-sm text-gray-500">Total de scans</p>
          <p className="text-2xl font-bold text-emerald-700">{scansTotal}</p>
        </div>
        <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4">
          <p className="text-sm text-gray-500">Estandes no ranking</p>
          <p className="text-2xl font-bold text-emerald-700">
            {rankingDisplay.length}
          </p>
        </div>
      </div>

      {/* Avaliações por dia */}
      <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4">
        <h3 className="font-semibold text-emerald-700 mb-3">
          Avaliações por dia
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ratingsByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={toLocalLabel} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={toLocalLabel} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#10b981"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scans por dia */}
      <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4">
        <h3 className="font-semibold text-emerald-700 mb-3">Scans por dia</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scansByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={toLocalLabel} />
              <YAxis allowDecimals={false} />
              <Tooltip labelFormatter={toLocalLabel} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#34d399"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ranking barras */}
      <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4">
        <h3 className="font-semibold text-emerald-700 mb-3">
          Ranking (barras)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankingDisplay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="media" name="Média" fill="#93c5fd" />
              <Bar dataKey="total" name="Avaliações" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pizza avaliações por dia da festa */}
      <div className="rounded-2xl ring-1 ring-emerald-100 bg-white p-4">
        <h3 className="font-semibold text-emerald-700 mb-3">
          Avaliações por dia da festa
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={festaPieData}
                dataKey="count"
                nameKey="dia"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {festaPieData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={["#10b981", "#34d399", "#93c5fd", "#fbbf24"][i % 4]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
