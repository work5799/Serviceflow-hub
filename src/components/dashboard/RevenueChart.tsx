import { useAppData } from '@/context/AppDataContext';
import { motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function RevenueChart() {
  const { appData } = useAppData();

  const monthlyRevenue = appData.sales
    .filter((sale) => sale.status === 'completed')
    .reduce<Record<string, number>>((acc, sale) => {
      const key = sale.date.slice(0, 7);
      acc[key] = (acc[key] ?? 0) + sale.amount;
      return acc;
    }, {});

  const chartData = Object.entries(monthlyRevenue)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, revenue]) => ({
      month: new Date(`${monthKey}-01T00:00:00`).toLocaleString('en-US', { month: 'short' }),
      revenue,
    }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass rounded-xl p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Overview</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(175 80% 45%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(175 80% 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 18% 16%)" />
            <XAxis dataKey="month" tick={{ fill: 'hsl(220 10% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(220 10% 55%)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: 'hsl(225 20% 9%)', border: '1px solid hsl(225 18% 16%)', borderRadius: 8, color: 'hsl(220 15% 90%)' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
            <Area type="monotone" dataKey="revenue" stroke="hsl(175 80% 45%)" strokeWidth={2} fill="url(#revenueGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
