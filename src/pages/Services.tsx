import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, FolderKanban, Layers3, Plus, Trash2, Users } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { toast } from '@/components/ui/sonner';
import { useAppData } from '@/context/AppDataContext';
import {
  canManageAssignments,
  createNotification,
  generateSequentialId,
  getMembersForService,
  normalizeAppData,
} from '@/lib/workflow';

const emptyServiceForm = {
  id: '',
  name: '',
  color: 'hsl(175 80% 45%)',
  description: '',
};

const emptyTeamForm = {
  id: '',
  name: '',
  serviceId: '',
  description: '',
};

const Services = () => {
  const { appData, replaceSection } = useAppData();
  const canManage = canManageAssignments(appData.currentUser);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [teamForm, setTeamForm] = useState({
    ...emptyTeamForm,
    serviceId: appData.services[0]?.id ?? '',
  });

  const serviceViews = useMemo(
    () =>
      appData.services.map((service) => {
        const serviceTeams = appData.teams.filter((team) => team.serviceId === service.id && team.isActive);
        const serviceMembers = getMembersForService(service.id, appData.teamMembers);
        const serviceProjects = appData.projects.filter(
          (project) => project.assignedServiceId === service.id || project.assignedService === service.name,
        );

        return {
          ...service,
          teams: serviceTeams,
          members: serviceMembers,
          projects: serviceProjects,
        };
      }),
    [appData.projects, appData.services, appData.teamMembers, appData.teams],
  );

  useEffect(() => {
    if (appData.services.length > 0 && !appData.services.some((service) => service.id === teamForm.serviceId)) {
      setTeamForm((prev) => ({
        ...prev,
        serviceId: appData.services[0]?.id ?? '',
      }));
    }
  }, [appData.services, teamForm.serviceId]);

  async function persist(nextData: ReturnType<typeof normalizeAppData>, notificationMessage: string) {
    await Promise.all([
      replaceSection('services', nextData.services),
      replaceSection('teams', nextData.teams),
      replaceSection('teamMembers', nextData.teamMembers),
      replaceSection('projects', nextData.projects),
      replaceSection('sales', nextData.sales),
      replaceSection('currentUser', nextData.currentUser),
      replaceSection('notifications', [
        createNotification('Organization updated', notificationMessage, 'success'),
        ...appData.notifications,
      ]),
    ]);
  }

  async function handleSaveService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      toast.error('You do not have permission to manage services.');
      return;
    }

    if (!serviceForm.name.trim()) {
      toast.error('Service name is required.');
      return;
    }

    const existing = appData.services.find((service) => service.id === serviceForm.id);
    const duplicate = appData.services.find(
      (service) =>
        service.name.toLowerCase() === serviceForm.name.trim().toLowerCase() &&
        service.id !== serviceForm.id,
    );

    if (duplicate) {
      toast.error('Service name already exists.');
      return;
    }

    const nextServices = existing
      ? appData.services.map((service) =>
          service.id === existing.id
            ? {
                ...service,
                name: serviceForm.name.trim(),
                color: serviceForm.color,
                description: serviceForm.description.trim() || service.description,
              }
            : service,
        )
      : [
          ...appData.services,
          {
            id: generateSequentialId('SV', appData.services.map((service) => service.id)),
            name: serviceForm.name.trim(),
            manager: 'Unassigned',
            managerId: null,
            description: serviceForm.description.trim() || 'Managed delivery service',
            teamCount: 0,
            projectCount: 0,
            revenue: 0,
            color: serviceForm.color,
            isActive: true,
          },
        ];

    const nextTeams = appData.teams.map((team) =>
      existing && team.serviceId === existing.id
        ? { ...team, serviceName: serviceForm.name.trim() }
        : team,
    );
    const nextMembers = appData.teamMembers.map((member) =>
      existing && member.serviceId === existing.id
        ? { ...member, serviceName: serviceForm.name.trim() }
        : member,
    );
    const nextProjects = appData.projects.map((project) =>
      existing && (project.assignedServiceId === existing.id || project.assignedService === existing.name)
        ? {
            ...project,
            service: serviceForm.name.trim(),
            serviceType: serviceForm.name.trim(),
            assignedService: serviceForm.name.trim(),
          }
        : project,
    );
    const nextSales = appData.sales.map((sale) =>
      existing && sale.serviceType === existing.name
        ? { ...sale, serviceType: serviceForm.name.trim(), service: serviceForm.name.trim() }
        : sale,
    );

    const nextData = normalizeAppData({
      ...appData,
      services: nextServices,
      teams: nextTeams,
      teamMembers: nextMembers,
      projects: nextProjects,
      sales: nextSales,
    });

    await persist(nextData, existing ? `${serviceForm.name.trim()} service updated.` : `${serviceForm.name.trim()} service created.`);
    toast.success(existing ? 'Service updated.' : 'Service created.');
    setServiceForm(emptyServiceForm);
  }

  async function handleDeleteService(serviceId: string) {
    if (!canManage) {
      toast.error('You do not have permission to delete services.');
      return;
    }

    const service = appData.services.find((entry) => entry.id === serviceId);
    if (!service) {
      return;
    }

    const nextServices = appData.services.filter((entry) => entry.id !== serviceId);
    const removedTeams = appData.teams.filter((team) => team.serviceId === serviceId).map((team) => team.id);
    const nextTeams = appData.teams.filter((team) => team.serviceId !== serviceId);
    const nextMembers = appData.teamMembers.map((member) =>
      member.serviceId === serviceId || (member.teamId && removedTeams.includes(member.teamId))
        ? { ...member, serviceId: null, serviceName: null, teamId: null, teamName: null }
        : member,
    );
    const nextProjects = appData.projects.map((project) =>
      project.assignedServiceId === serviceId
        ? {
            ...project,
            assignedServiceId: null,
            assignedTeamId: removedTeams.includes(project.assignedTeamId ?? '') ? null : project.assignedTeamId,
            assignedTeam: removedTeams.includes(project.assignedTeamId ?? '') ? 'Service Pool' : project.assignedTeam,
          }
        : project,
    );

    const nextData = normalizeAppData({
      ...appData,
      services: nextServices,
      teams: nextTeams,
      teamMembers: nextMembers,
      projects: nextProjects,
    });

    await persist(nextData, `${service.name} service removed from management.`);
    toast.success('Service deleted.');
  }

  async function handleSaveTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) {
      toast.error('You do not have permission to manage teams.');
      return;
    }

    if (!teamForm.name.trim() || !teamForm.serviceId) {
      toast.error('Team name and service are required.');
      return;
    }

    const linkedService = appData.services.find((service) => service.id === teamForm.serviceId);
    if (!linkedService) {
      toast.error('Choose a valid service.');
      return;
    }

    const existing = appData.teams.find((team) => team.id === teamForm.id);
    const duplicate = appData.teams.find(
      (team) =>
        team.serviceId === teamForm.serviceId &&
        team.name.toLowerCase() === teamForm.name.trim().toLowerCase() &&
        team.id !== teamForm.id,
    );

    if (duplicate) {
      toast.error('This team name already exists under the selected service.');
      return;
    }

    const nextTeams = existing
      ? appData.teams.map((team) =>
          team.id === existing.id
            ? {
                ...team,
                name: teamForm.name.trim(),
                serviceId: linkedService.id,
                serviceName: linkedService.name,
                description: teamForm.description.trim() || team.description,
              }
            : team,
        )
      : [
          ...appData.teams,
          {
            id: generateSequentialId('T', appData.teams.map((team) => team.id)),
            name: teamForm.name.trim(),
            serviceId: linkedService.id,
            serviceName: linkedService.name,
            description: teamForm.description.trim() || 'Delivery team',
            projectManagerId: linkedService.managerId,
            projectManagerName: linkedService.manager,
            teamLeaderId: null,
            teamLeaderName: 'Unassigned',
            callerIds: [],
            memberCount: 0,
            isActive: true,
          },
        ];

    const nextMembers = appData.teamMembers.map((member) =>
      existing && member.teamId === existing.id
        ? {
            ...member,
            serviceId: linkedService.id,
            serviceName: linkedService.name,
            teamName: teamForm.name.trim(),
          }
        : member,
    );

    const nextProjects = appData.projects.map((project) =>
      existing && project.assignedTeamId === existing.id
        ? {
            ...project,
            assignedTeam: teamForm.name.trim(),
            assignedService: linkedService.name,
            assignedServiceId: linkedService.id,
            service: linkedService.name,
            serviceType: linkedService.name,
          }
        : project,
    );

    const nextData = normalizeAppData({
      ...appData,
      teams: nextTeams,
      teamMembers: nextMembers,
      projects: nextProjects,
    });

    await persist(nextData, existing ? `${teamForm.name.trim()} team updated.` : `${teamForm.name.trim()} team created.`);
    toast.success(existing ? 'Team updated.' : 'Team created.');
    setTeamForm({ ...emptyTeamForm, serviceId: appData.services[0]?.id ?? '' });
  }

  async function handleDeleteTeam(teamId: string) {
    if (!canManage) {
      toast.error('You do not have permission to delete teams.');
      return;
    }

    const team = appData.teams.find((entry) => entry.id === teamId);
    if (!team) {
      return;
    }

    const nextTeams = appData.teams.filter((entry) => entry.id !== teamId);
    const nextMembers = appData.teamMembers.map((member) =>
      member.teamId === teamId ? { ...member, teamId: null, teamName: null } : member,
    );
    const nextProjects = appData.projects.map((project) =>
      project.assignedTeamId === teamId
        ? { ...project, assignedTeamId: null, assignedTeam: `${project.assignedService} Service Pool` }
        : project,
    );

    const nextData = normalizeAppData({
      ...appData,
      teams: nextTeams,
      teamMembers: nextMembers,
      projects: nextProjects,
    });

    await persist(nextData, `${team.name} team removed from ${team.serviceName}.`);
    toast.success('Team deleted.');
  }

  return (
    <DashboardLayout title="Services">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Active Services</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{appData.services.filter((service) => service.isActive).length}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Teams</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{appData.teams.filter((team) => team.isActive).length}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Members Linked</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {appData.teamMembers.filter((member) => member.status !== 'removed' && member.serviceId).length}
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Access Mode</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{canManage ? 'Manage & Sync' : 'Read Only'}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSaveService} className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Service Management</h2>
                <p className="text-sm text-muted-foreground">Create, rename, and maintain service groups without rebuilding the current structure.</p>
              </div>
              <button
                type="submit"
                disabled={!canManage}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {serviceForm.id ? 'Update Service' : 'Add Service'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Service Name</span>
                <input
                  value={serviceForm.name}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  placeholder="WordPress Development"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Color</span>
                <input
                  value={serviceForm.color}
                  onChange={(event) => setServiceForm((prev) => ({ ...prev, color: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  placeholder="hsl(175 80% 45%)"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Description</span>
              <textarea
                value={serviceForm.description}
                onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                rows={3}
              />
            </label>
          </motion.form>

          <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSaveTeam} className="glass rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Team Management</h2>
                <p className="text-sm text-muted-foreground">Multiple teams per service, synced instantly to Supabase/local state.</p>
              </div>
              <button
                type="submit"
                disabled={!canManage || appData.services.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {teamForm.id ? 'Update Team' : 'Add Team'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Team Name</span>
                <input
                  value={teamForm.name}
                  onChange={(event) => setTeamForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  placeholder="WordPress Team A"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Service</span>
                <select
                  value={teamForm.serviceId}
                  onChange={(event) => setTeamForm((prev) => ({ ...prev, serviceId: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  disabled={appData.services.length === 0}
                >
                  {appData.services.length > 0 ? (
                    appData.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Create a service first</option>
                  )}
                </select>
              </label>
            </div>

            {appData.services.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                No services found yet. Add a service first, then teams can be created and synced here instantly.
              </div>
            )}

            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Description</span>
              <textarea
                value={teamForm.description}
                onChange={(event) => setTeamForm((prev) => ({ ...prev, description: event.target.value }))}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                rows={3}
              />
            </label>
          </motion.form>
        </div>

        {serviceViews.length === 0 ? (
          <div className="glass rounded-xl border border-dashed border-border p-8 text-center">
            <h3 className="text-base font-semibold text-foreground">No Services In Database</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This workspace is now database-driven. Create your first service to unlock team and member assignment.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {serviceViews.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="glass rounded-xl p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ background: service.color }} />
                    <h3 className="truncate text-base font-semibold text-foreground">{service.name}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Project Manager: {service.manager}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setServiceForm({
                        id: service.id,
                        name: service.name,
                        color: service.color,
                        description: service.description,
                      })
                    }
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => void handleDeleteService(service.id)}
                    className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                  >
                    <Trash2 className="inline h-3.5 w-3.5 mr-1" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg bg-secondary/40 p-3">
                  <p className="flex items-center gap-1.5 text-muted-foreground"><Layers3 className="w-3.5 h-3.5" /> Teams</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{service.teams.length}</p>
                </div>
                <div className="rounded-lg bg-secondary/40 p-3">
                  <p className="flex items-center gap-1.5 text-muted-foreground"><Users className="w-3.5 h-3.5" /> Members</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{service.members.length}</p>
                </div>
                <div className="rounded-lg bg-secondary/40 p-3">
                  <p className="flex items-center gap-1.5 text-muted-foreground"><FolderKanban className="w-3.5 h-3.5" /> Projects</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{service.projects.length}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Teams Under This Service</h4>
                  <span className="text-xs text-muted-foreground">${service.revenue.toLocaleString()} booked</span>
                </div>
                <div className="space-y-2">
                  {service.teams.map((team) => (
                    <div key={team.id} className="rounded-lg border border-border bg-background/30 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{team.name}</p>
                          <p className="text-xs text-muted-foreground">{team.description}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Leader: {team.teamLeaderName} | Co-Leaders: {team.callerIds.length} | Members: {team.memberCount}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setTeamForm({
                                id: team.id,
                                name: team.name,
                                serviceId: team.serviceId,
                                description: team.description,
                              })
                            }
                            className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={!canManage}
                            onClick={() => void handleDeleteTeam(team.id)}
                            className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {service.teams.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border bg-background/20 p-3 text-sm text-muted-foreground">
                      No teams created for this service yet.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Services;
