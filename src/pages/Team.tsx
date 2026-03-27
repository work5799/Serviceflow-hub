import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ROLE_COLORS, ROLE_LABELS } from '@/types';

const Team = () => {
  const { appData } = useAppData();

  return (
    <DashboardLayout title="Team">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {appData.teamMembers.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className="glass rounded-xl p-5 hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {member.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
            </div>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[member.role])}>
              {ROLE_LABELS[member.role]}
            </span>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Team;
