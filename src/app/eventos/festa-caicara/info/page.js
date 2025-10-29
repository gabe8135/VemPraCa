// src/app/eventos/festa-caicara/info/page.js
import EventCharts from "@/app/components/EventCharts";
import FestaCaicaraAdminNav from "@/app/components/FestaCaicaraAdminNav";
import AdminGate from "@/app/components/AdminGate";

export const dynamic = "force-dynamic";

export default function FestaInfoPage() {
  return (
    <section className="container mx-auto mt-20 px-4 py-8">
      <FestaCaicaraAdminNav />
      <AdminGate redirectOnDenied>
        <h1 className="text-2xl font-bold text-emerald-700 mb-2">
          Informações da Festança Caiçara
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Gráficos representativos de avaliações e interações por período do
          evento.
        </p>
        <EventCharts />
      </AdminGate>
    </section>
  );
}
