import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { useNow } from '@/hooks/use-now';
import { cn } from '@/lib/utils';
import { createDerivedDeadlineNotifications } from '@/lib/workflow';

const typeIcons = { info: Info, success: CheckCircle, warning: AlertTriangle };
const typeStyles = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
};

const Notifications = () => {
  const { appData } = useAppData();
  const now = useNow(1000);
  const notifications = [...createDerivedDeadlineNotifications(appData, now), ...appData.notifications];

  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-2xl space-y-3">
        {notifications.map((notification, index) => {
          const Icon = typeIcons[notification.type];

          return (
            <motion.div
              key={`${notification.id}-${index}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn('glass flex items-start gap-3 rounded-xl p-4', !notification.read && 'border-l-2 border-l-primary')}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', typeStyles[notification.type])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{notification.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{notification.message}</p>
                <p className="mt-1.5 text-[10px] text-muted-foreground">{notification.date}</p>
              </div>
              {!notification.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </motion.div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
