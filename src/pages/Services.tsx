import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockServices } from '@/data/mock';
import { motion } from 'framer-motion';
import { FolderKanban, Users, DollarSign } from 'lucide-react';

const Services = () => {
  return (
    <DashboardLayout title="Services">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockServices.map((service, i) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-5 hover:scale-[1.02] transition-transform duration-200 cursor-pointer group"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: service.color }} />
              <h3 className="font-semibold text-foreground text-sm">{service.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Managed by {service.manager}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="w-3.5 h-3.5" /> Teams</span>
                <span className="font-medium text-foreground">{service.teamCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><FolderKanban className="w-3.5 h-3.5" /> Projects</span>
                <span className="font-medium text-foreground">{service.projectCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><DollarSign className="w-3.5 h-3.5" /> Revenue</span>
                <span className="font-medium text-foreground">${service.revenue.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Services;
