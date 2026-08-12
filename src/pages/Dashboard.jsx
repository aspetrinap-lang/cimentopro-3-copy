import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import SummaryCards from '@/components/dashboard/SummaryCards';
import TrendChart from '@/components/dashboard/TrendChart';
import ProductComparison from '@/components/dashboard/ProductComparison';

import MachineEfficiencyChart from '@/components/dashboard/MachineEfficiencyChart.jsx';
import MachineCyclesChart from '@/components/dashboard/MachineCyclesChart.jsx';
import UnitConsumptionChart from '@/components/dashboard/UnitConsumptionChart.jsx';
import UnitCostCard from '@/components/dashboard/UnitCostCard';
import RawMaterialCostChart from '@/components/dashboard/RawMaterialCostChart';
import ProductionLossCard from '@/components/dashboard/ProductionLossCard';
import ExportButtons from '@/components/ExportButtons';
import { exportCSV, exportTablePDF } from '@/lib/exportUtils';
import { RefreshCw } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { useInsumoNames } from '@/hooks/useInsumoNames';
import { INSUMO_KEYS, INSUMO_FIELDS } from '@/lib/insumos';

const PERIODS = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '180 dias', days: 180 },
  { label: '1 ano', days: 365 },
];

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(7);
  const { names } = useInsumoNames();

  async function load() {
    setLoading(true);
    const data = await base44.entities.ProductionOrder.list('-production_date', 500);
    setOrders(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const cutoff = format(subDays(new Date(), period), 'yyyy-MM-dd');
  const filteredOrders = orders.filter(o => o.production_date >= cutoff);
  const concluded = filteredOrders.filter(o => o.status === 'Concluída');

  function exportIndicatorsCSV() {
    const rows = concluded.map(o => {
      const row = {
        'Data': o.production_date, 'Ordem': o.order_number,
        'Artefato': o.product_type_name, 'Máquina': o.machine_name || '',
        'Qtd. Planejada': o.planned_quantity, 'Qtd. Real': o.actual_quantity || '',
      };
      INSUMO_KEYS.forEach(key => {
        const { planned, actual, unit } = INSUMO_FIELDS[key];
        row[`${names[key]} Plan. (${unit})`] = o[planned] || '';
        row[`${names[key]} Real (${unit})`] = o[actual] || '';
      });
      return row;
    });
    exportCSV(`indicadores_${period}d.csv`, rows);
  }

  function exportIndicatorsPDF() {
    const headers = ['Data', 'Ordem', 'Artefato', 'Qtd. Plan.', 'Qtd. Real', ...INSUMO_KEYS.map(k => names[k])];
    const rows = concluded.map(o => [
      o.production_date, o.order_number, o.product_type_name,
      o.planned_quantity, o.actual_quantity || '—',
      ...INSUMO_KEYS.map(key => {
        const { actual, unit } = INSUMO_FIELDS[key];
        return o[actual] ? `${o[actual]} ${unit}` : '—';
      })
    ]);
    exportTablePDF(`Indicadores — últimos ${period} dias`, headers, rows, `indicadores_${period}d`);
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Indicadores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButtons onCSV={exportIndicatorsCSV} onPDF={exportIndicatorsPDF} disabled={loading || concluded.length === 0} />
          <div className="flex bg-muted rounded-lg p-1 gap-1">
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p.days ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <SummaryCards orders={filteredOrders} periodLabel={`${period} dias`} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TrendChart orders={filteredOrders} />
            <ProductComparison orders={filteredOrders} />
          </div>
          <MachineEfficiencyChart orders={filteredOrders} />
          <MachineCyclesChart orders={filteredOrders} />
          <UnitConsumptionChart orders={filteredOrders} />
          <UnitCostCard orders={filteredOrders} />
          <ProductionLossCard orders={filteredOrders} />
          <RawMaterialCostChart orders={filteredOrders} />
        </>
      )}
    </div>
  );
}