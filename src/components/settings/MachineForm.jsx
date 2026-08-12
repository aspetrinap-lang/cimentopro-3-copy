import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

const empty = {
  name: '',
  code: '',
  type: '',
  maintenance_intervals: { Lubrificação: 15, Hidráulico: 45, Pneumático: 45, Mecânico: 60, Elétrico: 60 },
  active: true,
};

const INTERVAL_TYPES = [
  { key: 'Lubrificação', label: 'Lubrificação', default: 15 },
  { key: 'Hidráulico', label: 'Hidráulico', default: 45 },
  { key: 'Pneumático', label: 'Pneumático', default: 45 },
  { key: 'Mecânico', label: 'Mecânico', default: 60 },
  { key: 'Elétrico', label: 'Elétrico', default: 60 },
];

function generateMachineCode(existingCodes) {
  const year = new Date().getFullYear().toString().slice(-2);
  const yearCodes = existingCodes
    .map(c => {
      const match = (c || '').match(/MQ(\d+)\/(\d+)/i);
      return match && match[2] === year ? parseInt(match[1]) : 0;
    })
    .filter(n => !isNaN(n));
  const nextSeq = (yearCodes.length > 0 ? Math.max(...yearCodes) : 0) + 1;
  return `MQ${String(nextSeq).padStart(4, '0')}/${year}`;
}

export default function MachineForm({ item, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (!item) return empty;
    return {
      ...item,
      maintenance_intervals: {
        ...Object.fromEntries(INTERVAL_TYPES.map(t => [t.key, t.default])),
        ...(item.maintenance_intervals || {}),
      },
    };
  });
  const [saving, setSaving] = useState(false);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  function setInterval(typeKey, val) {
    setForm(f => ({
      ...f,
      maintenance_intervals: { ...f.maintenance_intervals, [typeKey]: parseInt(val) || 0 },
    }));
  }

  useEffect(() => {
    if (!item) {
      base44.entities.Machine.list('name', 500).then(machines => {
        const code = generateMachineCode(machines.map(m => m.code));
        setForm(f => ({ ...f, code }));
      });
    }
  }, [item]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    if (item?.id) {
      await base44.entities.Machine.update(item.id, form);
    } else {
      await base44.entities.Machine.create(form);
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="font-semibold text-foreground">{item ? 'Editar Máquina' : 'Nova Máquina'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nome</label>
              <input className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Vibro-prensa 1" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Código {item ? '' : '(automático)'}</label>
              <input className="w-full border border-input rounded-lg px-3 py-2 text-sm font-mono bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring" value={form.code} onChange={e => set('code', e.target.value)} placeholder="MQ0001/26" required readOnly={!item} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Tipo de Equipamento</label>
            <input className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={form.type} onChange={e => set('type', e.target.value)} placeholder="Vibro-prensa, Betoneira..." />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Intervalos de Manutenção Preventiva (dias)</label>
            <p className="text-xs text-muted-foreground mb-2">Defina o período específico desta máquina para cada tipo.</p>
            <div className="grid grid-cols-2 gap-3">
              {INTERVAL_TYPES.map(t => (
                <div key={t.key}>
                  <label className="block text-xs text-muted-foreground mb-1">{t.label}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="1"
                      className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={form.maintenance_intervals?.[t.key] ?? t.default}
                      onChange={e => setInterval(t.key, e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">dias</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.active !== false} onChange={e => set('active', e.target.checked)} className="rounded" />
            <label htmlFor="active" className="text-sm text-foreground">Ativo</label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-border rounded-lg py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
              {saving ? 'Salvando...' : item ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}