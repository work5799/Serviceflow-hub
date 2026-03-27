import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { toast } from '@/components/ui/sonner';
import { useAppData } from '@/context/AppDataContext';
import { motion } from 'framer-motion';
import { Download, Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const statusStyles = {
  completed: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  refunded: 'bg-destructive/10 text-destructive',
};

const Sales = () => {
  const { appData } = useAppData();
  const [search, setSearch] = useState('');
  const filtered = appData.sales.filter(
    (sale) =>
      sale.orderId.toLowerCase().includes(search.toLowerCase()) ||
      sale.service.toLowerCase().includes(search.toLowerCase()),
  );
  const completedSales = appData.sales.filter((sale) => sale.status === 'completed');
  const totalRevenue = completedSales.reduce((sum, sale) => sum + sale.amount, 0);
  const averageOrder = completedSales.length ? Math.round(totalRevenue / completedSales.length) : 0;

  const exportSales = () => {
    const headers = ['Order ID', 'Service', 'Date', 'Status', 'Amount'];
    const rows = filtered.map((sale) => [sale.orderId, sale.service, sale.date, sale.status, sale.amount]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'serviceflow-sales.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Sales exported successfully.');
  };

  return (
    <DashboardLayout title="Sales & Revenue">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-foreground mt-1">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold text-foreground mt-1">{appData.sales.length}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Avg. Order</p>
            <p className="text-2xl font-bold text-foreground mt-1">${averageOrder.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <button
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-muted transition-colors"
            onClick={exportSales}
            type="button"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Order ID</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Service</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Date</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale, index) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-foreground">{sale.orderId}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{sale.service}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{sale.date}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize', statusStyles[sale.status])}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-foreground">${sale.amount.toLocaleString()}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default Sales;
