import { useAppData } from '@/context/AppDataContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const statusStyles = {
  pending: 'bg-warning/10 text-warning',
  ongoing: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
};

export function RecentProjects() {
  const { appData } = useAppData();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="glass rounded-xl p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">Recent Projects</h3>
      <div className="space-y-3">
        {appData.projects.slice(0, 5).map((project) => (
          <div key={project.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
              <p className="text-xs text-muted-foreground truncate">{project.client} - {project.service}</p>
            </div>
            <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize shrink-0', statusStyles[project.status])}>
              {project.status}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
