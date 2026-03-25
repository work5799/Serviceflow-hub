import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { serviceChartData } from '@/data/mock';
import { motion } from 'framer-motion';

export function ServiceBreakdown() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="glass rounded-xl p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Revenue by Service</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={serviceChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4}>
              {serviceChartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'hsl(225 20% 9%)', border: '1px solid hsl(225 18% 16%)', borderRadius: 8, color: 'hsl(220 15% 90%)' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 mt-2">
        {serviceChartData.map((s) => (
          <div key={s.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
              <span className="text-muted-foreground">{s.name}</span>
            </div>
            <span className="font-medium text-foreground">${s.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
