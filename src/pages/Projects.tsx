import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderKanban, Search, ShieldCheck } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeadlineIndicator } from '@/components/workflow/DeadlineIndicator';
import { SalesToOperationsDialog } from '@/components/workflow/SalesToOperationsDialog';
import { toast } from '@/components/ui/sonner';
import { useAppData } from '@/context/AppDataContext';
import { useNow } from '@/hooks/use-now';
import { cn } from '@/lib/utils';
import {
  createNotification,
  getProjectDisplayStatus,
  getVisibleProjects,
} from '@/lib/workflow';
import type { Project, Sale } from '@/types';

const statusStyles = {
  pending: 'bg-warning/10 text-warning',
  in_progress: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
  late: 'bg-destructive/10 text-destructive',
} as const;

const Operations = () => {
  const { appData, replaceSection, supabaseStatus } = useAppData();
  const now = useNow(1000);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | Project['status']>('all');
  const [orderLookup, setOrderLookup] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const visibleProjects = useMemo(
    () => getVisibleProjects(appData.projects, appData.currentUser),
    [appData.currentUser, appData.projects],
  );

  const projectsWithStatus = useMemo(
    () =>
      visibleProjects.map((project) => ({
        ...project,
        displayStatus: getProjectDisplayStatus(project, now),
      })),
    [now, visibleProjects],
  );

  const filtered = projectsWithStatus.filter((project) => {
    const searchValue = search.toLowerCase();
    const matchesSearch =
      project.orderId.toLowerCase().includes(searchValue) ||
      project.projectName.toLowerCase().includes(searchValue) ||
      project.clientName.toLowerCase().includes(searchValue) ||
      project.assignedTeam.toLowerCase().includes(searchValue) ||
      project.assignedService.toLowerCase().includes(searchValue);

    const matchesFilter = filter === 'all' || project.displayStatus === filter;
    return matchesSearch && matchesFilter;
  });

  const backlogSales = appData.sales.filter((sale) => !sale.projectId);
  const lateProjects = projectsWithStatus.filter((project) => project.displayStatus === 'late').length;
  const completedProjects = projectsWithStatus.filter((project) => project.displayStatus === 'completed').length;

  async function appendNotification(title: string, message: string, type: 'info' | 'success' | 'warning') {
    await replaceSection('notifications', [createNotification(title, message, type), ...appData.notifications]);
  }

  function handleLookupOrder() {
    const normalizedOrderId = orderLookup.trim().toUpperCase();

    if (!normalizedOrderId) {
      toast.error('Enter an Order ID from Sales to continue.');
      return;
    }

    const sale = appData.sales.find((entry) => entry.orderId === normalizedOrderId);

    if (!sale) {
      toast.error(`Order ID ${normalizedOrderId} does not exist in Sales.`);
      return;
    }

    if (sale.projectId) {
      toast.info(`Order ${normalizedOrderId} is already linked to project ${sale.projectId}.`);
      return;
    }

    setSelectedSale(sale);
    setDialogOpen(true);
  }

  async function handleMoveToOperations(project: Project) {
    if (!selectedSale) {
      return;
    }

    const updatedSales = appData.sales.map((sale) =>
      sale.id === selectedSale.id
        ? {
            ...sale,
            status:
              project.status === 'completed'
                ? 'delivered'
                : project.status === 'in_progress'
                  ? 'in_progress'
                  : sale.status,
            projectId: project.projectId,
            movedToOperationsAt: new Date().toISOString().slice(0, 10),
          }
        : sale,
    );

    await Promise.all([
      replaceSection('projects', [project, ...appData.projects]),
      replaceSection('sales', updatedSales),
      appendNotification(
        'Operations intake complete',
        `${project.projectId} is now linked to ${selectedSale.orderId}.`,
        'success',
      ),
    ]);

    toast.success(`Created project ${project.projectId} from ${selectedSale.orderId}.`);
    setDialogOpen(false);
    setSelectedSale(null);
    setOrderLookup('');
  }

  async function handleStatusChange(projectId: string, nextStatus: Project['status']) {
    const currentProject = appData.projects.find((project) => project.projectId === projectId);

    if (!currentProject) {
      return;
    }

    const updatedProjects = appData.projects.map((project) =>
      project.projectId === projectId ? { ...project, status: nextStatus } : project,
    );

    const updatedSales = appData.sales.map((sale) =>
      sale.orderId === currentProject.orderId
        ? {
            ...sale,
            status: nextStatus === 'completed' ? 'delivered' : nextStatus === 'in_progress' ? 'in_progress' : sale.status,
          }
        : sale,
    );

    await Promise.all([
      replaceSection('projects', updatedProjects),
      replaceSection('sales', updatedSales),
      appendNotification(
        'Project status updated',
        `${currentProject.projectName} is now ${nextStatus.replace('_', ' ')}.`,
        nextStatus === 'late' ? 'warning' : 'info',
      ),
    ]);

    toast.success(`Updated ${currentProject.projectName}.`);
  }

  return (
    <DashboardLayout title="Operations">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Active Projects</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {projectsWithStatus.filter((project) => project.displayStatus !== 'completed').length}
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Completed Projects</p>
            <p className="mt-1 text-2xl font-bold text-success">{completedProjects}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Late Projects</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{lateProjects}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Sales Awaiting Intake</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{backlogSales.length}</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr,0.7fr]">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Sales-First Intake</h2>
                <p className="text-sm text-muted-foreground">
                  Operations can only create projects from existing Sales orders. Direct project creation is blocked.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                <ShieldCheck className="w-3.5 h-3.5" />
                {supabaseStatus.connected ? 'Supabase synced' : 'Local cache'}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={orderLookup}
                onChange={(event) => setOrderLookup(event.target.value)}
                placeholder="Enter Order ID from Sales"
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={handleLookupOrder}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Convert Existing Order
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {backlogSales.slice(0, 4).map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => {
                    setSelectedSale(sale);
                    setDialogOpen(true);
                  }}
                  className="rounded-xl border border-border bg-secondary/35 p-4 text-left transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-foreground">{sale.orderId}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{sale.projectName}</p>
                    </div>
                    <FolderKanban className="w-4 h-4 text-primary shrink-0" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {sale.clientName} • {sale.serviceType}
                  </p>
                </button>
              ))}
              {backlogSales.length === 0 && (
                <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                  Every current sales order has already been moved into Operations.
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5">
            <h2 className="text-base font-semibold text-foreground">Visibility Rules</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Team members only see projects where they are explicitly assigned. Team leads and managers retain wider
              operational visibility.
            </p>
            <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-4">
              <p className="text-xs text-muted-foreground">Current view</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {appData.currentUser.name} • {appData.currentUser.role.replace('_', ' ')}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Showing {projectsWithStatus.length} visible project{projectsWithStatus.length === 1 ? '' : 's'} for
                this account.
              </p>
            </div>
          </motion.div>
        </div>

        <Tabs defaultValue="operations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="operations">Operations Board</TabsTrigger>
            <TabsTrigger value="tracking">Order Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="operations" className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search operations..."
                    className="w-full rounded-lg bg-secondary py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['all', 'All'],
                    ['pending', 'Pending'],
                    ['in_progress', 'In Progress'],
                    ['completed', 'Completed'],
                    ['late', 'Late'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value as 'all' | Project['status'])}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                        filter === value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-muted',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass overflow-hidden rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Project</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Team</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Timeline</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((project, index) => (
                      <motion.tr
                        key={project.projectId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium text-foreground">{project.projectName}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.projectId} • {project.orderId} • {project.clientName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {project.marketplace} • {project.assignedService}
                          </p>
                        </td>
                        <td className="hidden px-5 py-4 md:table-cell">
                          <p className="text-sm text-foreground">{project.assignedTeam}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.teamLeader} • {project.members.join(', ') || 'No members assigned'}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <DeadlineIndicator deadline={project.deadline} now={now} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                                statusStyles[project.displayStatus],
                              )}
                            >
                              {project.displayStatus.replace('_', ' ')}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {[
                                ['pending', 'Pending'],
                                ['in_progress', 'In Progress'],
                                ['completed', 'Completed'],
                              ].map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => handleStatusChange(project.projectId, value as Project['status'])}
                                  className={cn(
                                    'rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                                    project.status === value
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-secondary text-secondary-foreground hover:bg-muted',
                                  )}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-foreground">
                          ${project.revenue.toLocaleString()}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="tracking">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass overflow-hidden rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Order ID</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Client Name</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Project Name</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Assigned Member</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Delivery Date</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Service Type</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Marketplace/Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((project, index) => (
                      <motion.tr
                        key={`${project.projectId}-tracking`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50"
                      >
                        <td className="px-5 py-4 font-mono text-xs text-foreground">{project.orderId}</td>
                        <td className="px-5 py-4 text-foreground">{project.clientName}</td>
                        <td className="px-5 py-4">
                          <p className="text-foreground">{project.projectName}</p>
                          <p className="text-xs text-muted-foreground">{project.projectId}</p>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {project.members[0] ?? project.teamLeader ?? 'Unassigned'}
                        </td>
                        <td className="px-5 py-4">
                          <DeadlineIndicator deadline={project.deadline} now={now} compact />
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">{project.serviceType}</td>
                        <td className="px-5 py-4 text-muted-foreground">{project.marketplace}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

        <SalesToOperationsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          sale={selectedSale}
          services={appData.services}
          teams={appData.teams}
          teamMembers={appData.teamMembers}
          existingProjectIds={appData.projects.map((project) => project.projectId)}
          onSubmit={handleMoveToOperations}
        />
      </div>
    </DashboardLayout>
  );
};

export default Operations;
