import { TrendingDown, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import { INSUMO_KEYS, INSUMO_FIELDS } from '@/lib/insumos';

function DeviationPill({ planned, actual }) {
  if (!planned || !actual) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = ((actual - planned) / planned) * 100;
  const isGain = pct <= 0;
  const Icon = isGain ? TrendingDown : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
      isGain ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      <Icon className="w-3 h-3" />
      {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  );
}

const STATUS_COLORS = {
  'Em Andamento': 'bg-amber-100 text-amber-700',
  'Concluída': 'bg-green-100 text-green-700',
  'Cancelada': 'bg-slate-100 text-slate-500',
};

export default function OrderRow({ order, onEdit, onDelete, names }) {
  // Show only insumos that have planned or actual data
  const activeInsumos = INSUMO_KEYS.filter(key => {
    const { planned, actual } = INSUMO_FIELDS[key];
    return order[planned] || order[actual];
  });

  return (
    <tr className="group border-b border-border hover:bg-muted/30 transition-colors">
      <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/30 px-4 py-3 text-sm font-medium text-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">{order.order_number}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{order.production_date}</td>
      <td className="px-4 py-3 text-sm text-foreground">{order.product_type_name || '—'}</td>
      <td className="px-4 py-3 text-sm text-right">{(order.planned_quantity || 0).toLocaleString('pt-BR')}</td>
      <td className="px-4 py-3 text-sm text-right">{order.actual_quantity != null ? order.actual_quantity.toLocaleString('pt-BR') : '—'}</td>
      {INSUMO_KEYS.map(key => {
        const { planned, actual } = INSUMO_FIELDS[key];
        return (
          <td key={key} className="px-4 py-3 text-center">
            <DeviationPill planned={order[planned]} actual={order[actual]} />
          </td>
        );
      })}
      <td className="px-4 py-3 text-center">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-muted text-muted-foreground'}`}>
          {order.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => onEdit(order)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(order)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}