import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockSales } from '@/data/mock';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Search, Download } from 'lucide-react';
import { useState } from 'react';

const statusStyles = {
  completed: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  refunded: 'bg-destructive/10 text-destructive',
};

const Sales = () => {
  const [search, setSearch] = useState('');
  const filtered = mockSales.filter(s => s.orderId.toLowerCase().includes(search.toLowerCase()) || s.service.toLowerCase().includes(search.toLowerCase()));
  const totalRevenue = mockSales.filter(s => s.status === 'completed').reduce((a, b) => a + b.amount, 0);

  return (
    <DashboardLayout title="Sales & Revenue">
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-foreground mt-1">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold text-foreground mt-1">{mockSales.length}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Avg. Order</p>
            <p className="text-2xl font-bold text-foreground mt-1">${Math.round(totalRevenue / mockSales.filter(s => s.status === 'completed').length).toLocaleString()}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground" />
          </div>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>

        {/* Table */}
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
                {filtered.map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-xs text-foreground">{s.orderId}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{s.service}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{s.date}</td>
                    <td className="px-5 py-3.5"><span className={cn("text-xs px-2.5 py-1 rounded-full font-medium capitalize", statusStyles[s.status])}>{s.status}</span></td>
                    <td className="px-5 py-3.5 text-right font-medium text-foreground">${s.amount.toLocaleString()}</td>
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
