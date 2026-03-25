import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockNotifications } from '@/data/mock';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Info, CheckCircle, AlertTriangle } from 'lucide-react';

const typeIcons = { info: Info, success: CheckCircle, warning: AlertTriangle };
const typeStyles = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
};

const Notifications = () => {
  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-2xl space-y-3">
        {mockNotifications.map((n, i) => {
          const Icon = typeIcons[n.type];
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn("glass rounded-xl p-4 flex items-start gap-3", !n.read && "border-l-2 border-l-primary")}
            >
              <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", typeStyles[n.type])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">{n.date}</p>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
            </motion.div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
