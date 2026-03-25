import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { mockProjects } from '@/data/mock';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Search, Plus, Calendar } from 'lucide-react';
import { useState } from 'react';

const statusStyles = {
  pending: 'bg-warning/10 text-warning',
  ongoing: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
};

const Projects = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filtered = mockProjects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || p.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout title="Projects">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..." className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-secondary outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'ongoing', 'completed'].map(s => (
              <button key={s} onClick={() => setFilter(s)} className={cn("text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors", filter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted')}>{s}</button>
            ))}
            <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>
        </div>

        {/* Table */}
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
                {filtered.map((p, i) => (
                  <motion.tr key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors cursor-pointer">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.client}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{p.service}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{p.teamLeader}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />{p.deadline}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium capitalize", statusStyles[p.status])}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-foreground">${p.revenue.toLocaleString()}</td>
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
