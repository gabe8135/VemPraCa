// src/app/components/AcessosChart.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabaseClient'; // Ajuste o caminho se necessário
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const periodosDisponiveis = [
  { label: 'Últimos 7 dias', value: 7 },
  { label: 'Últimos 30 dias', value: 30 },
  { label: 'Últimos 90 dias', value: 90 },
];

export default function AcessosChart({ negocioId }) {
  const [chartData, setChartData] = useState([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [errorChart, setErrorChart] = useState(null);
  const [periodoSelecionado, setPeriodoSelecionado] = useState(periodosDisponiveis[0].value); // Padrão 7 dias

  const fetchChartData = useCallback(async (id, dias) => {
    if (!id) return;
    setLoadingChart(true);
    setErrorChart(null);
    try {
      const { data, error } = await supabase.rpc('get_negocio_acessos_grafico_diario', {
        p_negocio_id: id,
        p_dias: dias,
      });

      if (error) throw error;
      setChartData(data || []);
    } catch (err) {
      console.error('Erro ao buscar dados para o gráfico:', err);
      setErrorChart('Não foi possível carregar os dados do gráfico.');
      setChartData([]); // Limpa os dados em caso de erro
    } finally {
      setLoadingChart(false);
    }
  }, []);

  useEffect(() => {
    fetchChartData(negocioId, periodoSelecionado);
  }, [negocioId, periodoSelecionado, fetchChartData]);

  if (loadingChart) {
    return <p className="text-center text-gray-500 py-8">Carregando gráfico de acessos...</p>;
  }

  if (errorChart) {
    return <p className="text-center text-red-500 py-8">{errorChart}</p>;
  }

  if (chartData.length === 0 && !loadingChart) {
    return <p className="text-center text-gray-500 py-8">Sem dados de acesso para exibir no período selecionado.</p>;
  }

  return (
    <div className="mt-8 p-4 md:p-6 bg-white rounded-lg shadow border border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
        <h3 className="text-lg font-semibold text-gray-700">Acessos Diários</h3>
        <div className="flex gap-2">
          {periodosDisponiveis.map((periodo) => (
            <button
              key={periodo.value}
              onClick={() => setPeriodoSelecionado(periodo.value)}
              disabled={loadingChart}
              className={`px-3 py-1 text-xs sm:text-sm rounded-md transition-colors
                ${periodoSelecionado === periodo.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }
                ${loadingChart ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {periodo.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: 300 }}> {/* Container com altura definida */}
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 20, // Aumentado para dar espaço para rótulos do YAxis à direita se necessário
              left: -20, // Ajustado para aproximar o YAxis
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="dia"
              tick={{ fontSize: 10, fill: '#666' }}
              angle={-35} // Rotaciona os rótulos para evitar sobreposição em mobile
              textAnchor="end" // Alinha o texto rotacionado
              height={50} // Aumenta a altura para acomodar rótulos rotacionados
              interval="preserveStartEnd" // Tenta mostrar o primeiro e o último, ajustando os intermediários
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: '#666' }}
              // domain={['auto', dataMax => Math.max(5, dataMax + 1)]} // Garante um mínimo de 5 no eixo Y
              // label={{ value: 'Acessos', angle: -90, position: 'insideLeft', offset: 0, style: {fontSize: 12, fill: '#666'} }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', borderColor: '#ccc' }}
              labelStyle={{ fontWeight: 'bold', color: '#333' }}
              itemStyle={{ color: '#059669' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="acessos_no_dia"
              name="Acessos"
              stroke="#059669" // Verde
              strokeWidth={2}
              dot={{ r: 3, strokeWidth: 1, fill: '#059669' }}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: '#047857' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
