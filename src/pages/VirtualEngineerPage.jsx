import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useInsumoNames } from '@/hooks/useInsumoNames';
import { useInsumoCosts } from '@/hooks/useInsumoCosts';
import VirtualEngineer from '@/components/analysis/VirtualEngineer';
import OrderAnalysis from '@/components/analysis/OrderAnalysis';

export default function VirtualEngineerPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { names } = useInsumoNames();
  const { costs } = useInsumoCosts();

  useEffect(() => {
    base44.entities.ProductionOrder.filter({ status: 'Concluída' }, '-production_date', 500)
      .then(data => { setOrders(data); setLoading(false); });
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Engenheiro Virtual</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Análise inteligente de eficiência, consumo, custos, paradas e produção</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : orders.length > 0 ? (
        <>
          <VirtualEngineer orders={orders} costs={costs} names={names} />
          <OrderAnalysis orders={orders} costs={costs} names={names} />
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
          Nenhuma ordem concluída encontrada para análise.
        </div>
      )}
    </div>
  );
}