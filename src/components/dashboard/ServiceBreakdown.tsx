import { useAppData } from '@/context/AppDataContext';
import { motion } from 'framer-motion';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export function ServiceBreakdown() {
  const { appData } = useAppData();

  const serviceChartData = appData.services.map((service) => ({
    name: service.name,
    value: service.revenue,
    fill: service.color,
  }));

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
              {serviceChartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
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
        {serviceChartData.map((service) => (
          <div key={service.name} className="flex items-center justify-between text-sm gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: service.fill }} />
              <span className="text-muted-foreground truncate">{service.name}</span>
            </div>
            <span className="font-medium text-foreground shrink-0">${service.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
