import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAppData } from '@/context/AppDataContext';
import { motion } from 'framer-motion';
import { Calendar, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const statusStyles = {
  pending: 'bg-warning/10 text-warning',
  ongoing: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
};

const Projects = () => {
  const { appData, firebaseStatus } = useAppData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filtered = appData.projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.client.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || project.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout title="Projects">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {['all', 'pending', 'ongoing', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors',
                  filter === status ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted',
                )}
                type="button"
              >
                {status}
              </button>
            ))}
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground font-medium">
              <Plus className="w-3.5 h-3.5" />
              {firebaseStatus.connected ? 'Firestore synced' : 'Local cache'}
            </span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Project</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden md:table-cell">Service</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden lg:table-cell">Leader</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium hidden sm:table-cell">Deadline</th>
                  <th className="text-left px-5 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-5 py-3 text-muted-foreground font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project, index) => (
                  <motion.tr
                    key={project.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.client}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{project.service}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{project.teamLeader}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {project.deadline}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize', statusStyles[project.status])}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-foreground">${project.revenue.toLocaleString()}</td>
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

export default Projects;
