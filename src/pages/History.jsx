import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useInsumoNames } from '@/hooks/useInsumoNames';
import { INSUMO_KEYS, INSUMO_FIELDS } from '@/lib/insumos';

function DeviationCell({ planned, actual }) {
  if (!planned || !actual) return <td className="px-3 py-3 text-center text-muted-foreground text-xs">—</td>;
  const pct = ((actual - planned) / planned) * 100;
  const isGain = pct <= 0;
  const Icon = isGain ? TrendingDown : TrendingUp;
  return (
    <td className="px-3 py-3 text-center">
      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isGain ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        <Icon className="w-3 h-3" />{pct > 0 ? '+' : ''}{pct.toFixed(1)}%
      </span>
    </td>
  );
}

function exportCSV(orders, names) {
  const insumoHeaders = INSUMO_KEYS.flatMap(key => {
    const { unit } = INSUMO_FIELDS[key];
    return [`${names[key]} Plan (${unit})`, `${names[key]} Real (${unit})`, `Desvio ${names[key]} %`];
  });
  const headers = ['Ordem', 'Data', 'Artefato', 'Qtd Plan', 'Qtd Real', ...insumoHeaders, 'Status'];

  const rows = orders.map(o => {
    const dev = (p, r) => p && r ? (((r - p) / p) * 100).toFixed(1) + '%' : '';
    const insumoVals = INSUMO_KEYS.flatMap(key => {
      const { planned, actual } = INSUMO_FIELDS[key];
      return [o[planned] ?? '', o[actual] ?? '', dev(o[planned], o[actual])];
    });
    return [o.order_number, o.production_date, o.product_type_name, o.planned_quantity, o.actual_quantity, ...insumoVals, o.status]
      .map(v => (v == null ? '' : v));
  });

  const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `historico_producao_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function History() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [productTypes, setProductTypes] = useState([]);
  const { names } = useInsumoNames();

  async function load() {
    setLoading(true);
    const [o, p] = await Promise.all([
      base44.entities.ProductionOrder.filter({ status: 'Concluída' }, '-production_date', 500),
      base44.entities.ProductType.list('name'),
    ]);
    setOrders(o); setProductTypes(p); setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => {
    if (dateFrom && o.production_date < dateFrom) return false;
    if (dateTo && o.production_date > dateTo) return false;
    if (productFilter && o.product_type_id !== productFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-5 max-w-full mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ordens concluídas com análise de desvio</p>
        </div>
        <button onClick={() => exportCSV(filtered, names)}
          className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">De</label>
          <input type="date" className="border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Até</label>
          <input type="date" className="border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Artefato</label>
          <select className="border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={productFilter} onChange={e => setProductFilter(e.target.value)}>
            <option value="">Todos</option>
            {productTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {(dateFrom || dateTo || productFilter) && (
          <div className="self-end">
            <button onClick={() => { setDateFrom(''); setDateTo(''); setProductFilter(''); }} className="text-xs text-primary hover:underline">Limpar filtros</button>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Ordem</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Data</th>
                  <th className="px-3 py-3 text-left font-semibold whitespace-nowrap">Artefato</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Qtd. Plan.</th>
                  <th className="px-3 py-3 text-right font-semibold whitespace-nowrap">Qtd. Real</th>
                  {INSUMO_KEYS.map(key => (
                    <th key={key} className="px-3 py-3 text-center font-semibold whitespace-nowrap">
                      {names[key]}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5 + INSUMO_KEYS.length + 1} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : filtered.map(o => (
                  <tr key={o.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-3 font-medium whitespace-nowrap">{o.order_number}</td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{o.production_date}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{o.product_type_name || '—'}</td>
                    <td className="px-3 py-3 text-right">{(o.planned_quantity || 0).toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-3 text-right">{o.actual_quantity != null ? o.actual_quantity.toLocaleString('pt-BR') : '—'}</td>
                    {INSUMO_KEYS.map(key => {
                      const { planned, actual } = INSUMO_FIELDS[key];
                      return <DeviationCell key={key} planned={o[planned]} actual={o[actual]} />;
                    })}
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        o.status === 'Concluída' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} registro(s) encontrado(s)</p>
    </div>
  );
}