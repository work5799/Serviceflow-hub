import { motion } from 'framer-motion';
import { useAppData } from '@/context/AppDataContext';
import { useNow } from '@/hooks/use-now';
import { cn } from '@/lib/utils';
import { getProjectDisplayStatus, getVisibleProjects } from '@/lib/workflow';

const statusStyles = {
  pending: 'bg-warning/10 text-warning',
  in_progress: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
  late: 'bg-destructive/10 text-destructive',
} as const;

export function RecentProjects() {
  const { appData } = useAppData();
  const now = useNow(1000);
  const visibleProjects = getVisibleProjects(appData.projects, appData.currentUser)
    .map((project) => ({
      ...project,
      displayStatus: getProjectDisplayStatus(project, now),
    }))
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="glass rounded-xl p-5"
    >
      <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Operations Projects</h3>
      <div className="space-y-3">
        {visibleProjects.map((project) => (
          <div key={project.projectId} className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{project.projectName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {project.orderId} • {project.clientName} • {project.assignedService}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                statusStyles[project.displayStatus],
              )}
            >
              {project.displayStatus.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
