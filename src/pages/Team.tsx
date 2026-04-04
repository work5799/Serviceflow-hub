import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Ban,
  Eye,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  SquarePen,
  UserCog,
  Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { useAppData } from '@/context/AppDataContext';
import { cn } from '@/lib/utils';
import {
  canManageAssignments,
  createNotification,
  generateSequentialId,
  getMemberProjectLinks,
  normalizeAppData,
  upsertMemberAssignment,
} from '@/lib/workflow';
import {
  MEMBER_STATUS_COLORS,
  MEMBER_STATUS_LABELS,
  ROLE_COLORS,
  ROLE_LABELS,
  type MemberStatus,
  type User,
  type UserRole,
} from '@/types';

const statusOptions: MemberStatus[] = ['active', 'disabled', 'banned'];
const roleOptions: UserRole[] = ['agm', 'project_manager', 'call_leader', 'team_leader', 'team_member'];
const rolePriority: Record<UserRole, number> = {
  developer: 0,
  agm: 1,
  project_manager: 2,
  call_leader: 3,
  team_leader: 4,
  team_member: 5,
};

const emptyMemberForm = {
  id: '',
  name: '',
  email: '',
  phoneNumber: '',
  role: 'team_member' as UserRole,
  status: 'active' as MemberStatus,
  serviceId: '',
  teamId: 'none',
  bio: '',
  workSummary: '',
  department: '',
};

function createFormFromMember(member: User) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phoneNumber: member.phoneNumber,
    role: member.role,
    status: member.status === 'removed' ? 'disabled' : member.status,
    serviceId: member.serviceId ?? '',
    teamId: member.teamId ?? 'none',
    bio: member.bio,
    workSummary: member.workSummary,
    department: member.department,
  };
}

function getServiceLabel(member: Pick<User, 'role' | 'serviceName'>) {
  if (member.role === 'agm') {
    return 'All Services';
  }

  return member.serviceName ?? 'Unassigned';
}

function getTeamLabel(member: Pick<User, 'role' | 'teamName'>) {
  if (member.role === 'agm') {
    return 'Global Access';
  }

  return member.teamName ?? 'Service only';
}

const Team = () => {
  const { appData, replaceSection } = useAppData();
  const canManage = canManageAssignments(appData.currentUser);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [memberForm, setMemberForm] = useState({
    ...emptyMemberForm,
    serviceId: appData.services[0]?.id ?? '',
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view');
  const [detailForm, setDetailForm] = useState(emptyMemberForm);

  const activeServices = appData.services.filter((service) => service.isActive);
  const hasActiveServices = activeServices.length > 0;
  const isMemberFormAgm = memberForm.role === 'agm';
  const isDetailFormAgm = detailForm.role === 'agm';
  const filteredTeams = appData.teams.filter(
    (team) => team.isActive && (serviceFilter === 'all' || team.serviceId === serviceFilter),
  );

  const memberViews = useMemo(
    () =>
      appData.teamMembers
        .map((member) => ({
          ...member,
          projects: getMemberProjectLinks(member.name, appData.projects),
        }))
        .sort((left, right) => {
          const roleDifference = rolePriority[left.role] - rolePriority[right.role];
          if (roleDifference !== 0) {
            return roleDifference;
          }
          return left.name.localeCompare(right.name);
        }),
    [appData.projects, appData.teamMembers],
  );

  const filteredMembers = useMemo(
    () =>
      memberViews.filter((member) => {
        const searchValue = search.toLowerCase();
        const matchesSearch =
          member.name.toLowerCase().includes(searchValue) ||
          member.email.toLowerCase().includes(searchValue) ||
          member.phoneNumber.toLowerCase().includes(searchValue) ||
          (member.serviceName ?? '').toLowerCase().includes(searchValue) ||
          (member.teamName ?? '').toLowerCase().includes(searchValue);

        const matchesService = serviceFilter === 'all' || member.serviceId === serviceFilter;
        const matchesTeam = teamFilter === 'all' || member.teamId === teamFilter;
        const matchesRole = roleFilter === 'all' || member.role === roleFilter;

        return matchesSearch && matchesService && matchesTeam && matchesRole;
      }),
    [memberViews, roleFilter, search, serviceFilter, teamFilter],
  );

  const selectedMember =
    selectedMemberId === null
      ? null
      : memberViews.find((member) => member.id === selectedMemberId) ?? null;

  const visibleDetailTeams = appData.teams.filter(
    (team) => team.isActive && (!detailForm.serviceId || team.serviceId === detailForm.serviceId),
  );

  useEffect(() => {
    if (isMemberFormAgm) {
      setMemberForm((prev) =>
        prev.serviceId || prev.teamId !== 'none'
          ? { ...prev, serviceId: '', teamId: 'none' }
          : prev,
      );
      return;
    }

    if (hasActiveServices && !activeServices.some((service) => service.id === memberForm.serviceId)) {
      setMemberForm((prev) => ({
        ...prev,
        serviceId: activeServices[0]?.id ?? '',
        teamId: 'none',
      }));
    }
  }, [activeServices, hasActiveServices, isMemberFormAgm, memberForm.serviceId]);

  useEffect(() => {
    if (!detailOpen) {
      return;
    }

    if (isDetailFormAgm) {
      setDetailForm((prev) =>
        prev.serviceId || prev.teamId !== 'none'
          ? { ...prev, serviceId: '', teamId: 'none' }
          : prev,
      );
      return;
    }

    if (hasActiveServices && !activeServices.some((service) => service.id === detailForm.serviceId)) {
      setDetailForm((prev) => ({
        ...prev,
        serviceId: activeServices[0]?.id ?? '',
        teamId: 'none',
      }));
    }
  }, [activeServices, detailForm.serviceId, detailOpen, hasActiveServices, isDetailFormAgm]);

  async function persist(nextData: ReturnType<typeof normalizeAppData>, notificationMessage: string) {
    await Promise.all([
      replaceSection('teamMembers', nextData.teamMembers),
      replaceSection('services', nextData.services),
      replaceSection('teams', nextData.teams),
      replaceSection('currentUser', nextData.currentUser),
      replaceSection('notifications', [
        createNotification('Member sync updated', notificationMessage, 'success'),
        ...appData.notifications,
      ]),
    ]);
  }

  async function saveMember(form: typeof emptyMemberForm, mode: 'create' | 'edit') {
    if (!canManage) {
      toast.error('You do not have permission to manage members.');
      return false;
    }

    if (!form.name.trim() || !form.email.trim() || !form.phoneNumber.trim()) {
      toast.error('Full name, email, and phone number are required.');
      return false;
    }

    const duplicateEmail = appData.teamMembers.find(
      (member) => member.email.toLowerCase() === form.email.trim().toLowerCase() && member.id !== form.id,
    );

    if (duplicateEmail) {
      toast.error('A member with this email already exists.');
      return false;
    }

    const isGlobalAgm = form.role === 'agm';
    const linkedTeam = isGlobalAgm ? undefined : appData.teams.find((team) => team.id === form.teamId);
    const linkedService = isGlobalAgm
      ? undefined
      : activeServices.find((service) => service.id === form.serviceId) ??
        (linkedTeam ? activeServices.find((service) => service.id === linkedTeam.serviceId) : undefined);

    if (!isGlobalAgm && !linkedService) {
      toast.error('Select a valid service.');
      return false;
    }

    const nextMembers =
      mode === 'edit'
        ? upsertMemberAssignment(
            appData.teamMembers,
            {
              id: form.id,
              name: form.name.trim(),
              email: form.email.trim(),
              phoneNumber: form.phoneNumber.trim(),
              role: form.role,
              status: form.status,
              serviceId: isGlobalAgm ? null : linkedService?.id ?? null,
              teamId: isGlobalAgm ? null : form.teamId === 'none' ? null : linkedTeam?.id ?? null,
              bio: form.bio.trim(),
              workSummary: form.workSummary.trim(),
              department: form.department.trim(),
            },
            appData.services,
            appData.teams,
          )
        : [
            ...appData.teamMembers,
            {
              id: generateSequentialId('M', appData.teamMembers.map((member) => member.id)),
              name: form.name.trim(),
              email: form.email.trim(),
              phoneNumber: form.phoneNumber.trim(),
              role: form.role,
              status: form.status,
              serviceId: isGlobalAgm ? null : linkedService?.id ?? null,
              serviceName: isGlobalAgm ? 'All Services' : linkedService?.name ?? null,
              teamId: isGlobalAgm ? null : form.teamId === 'none' ? null : linkedTeam?.id ?? null,
              teamName: isGlobalAgm ? null : form.teamId === 'none' ? null : linkedTeam?.name ?? null,
              bio: form.bio.trim(),
              workSummary: form.workSummary.trim(),
              department: form.department.trim(),
              clerkUserId: null,
              lastMovedAt: new Date().toISOString().slice(0, 10),
            },
          ];

    const nextData = normalizeAppData({
      ...appData,
      teamMembers: nextMembers,
    });

    await persist(
      nextData,
      mode === 'edit'
        ? `${form.name.trim()} member profile updated.`
        : `${form.name.trim()} member added to the organization.`,
    );

    toast.success(mode === 'edit' ? 'Member updated.' : 'Member added.');
    return true;
  }

  async function handleCreateMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await saveMember(memberForm, 'create');
    if (success) {
      setMemberForm({
        ...emptyMemberForm,
        serviceId: activeServices[0]?.id ?? '',
      });
    }
  }

  async function handleSaveDetails() {
    if (!selectedMember) {
      return;
    }

    const success = await saveMember(detailForm, 'edit');
    if (success) {
      setDetailMode('view');
    }
  }

  async function handleStatusChange(member: User, status: MemberStatus) {
    if (!canManage) {
      toast.error('You do not have permission to update member status.');
      return;
    }

    const nextMembers = upsertMemberAssignment(
      appData.teamMembers,
      {
        id: member.id,
        status,
        serviceId: member.serviceId,
        teamId: member.teamId,
      },
      appData.services,
      appData.teams,
    );

    const nextData = normalizeAppData({
      ...appData,
      teamMembers: nextMembers,
    });

    await persist(nextData, `${member.name} marked as ${status}.`);
    toast.success(`${member.name} is now ${MEMBER_STATUS_LABELS[status].toLowerCase()}.`);
  }

  function openProfile(member: User, mode: 'view' | 'edit') {
    setSelectedMemberId(member.id);
    setDetailMode(mode);
    setDetailForm(createFormFromMember(member));
    setDetailOpen(true);
  }

  const tabConfigs = [
    { key: 'all', label: 'All Members', filter: () => true },
    { key: 'project_manager', label: 'Project Managers', filter: (member: User) => member.role === 'project_manager' },
    { key: 'team_leader', label: 'Team Leaders', filter: (member: User) => member.role === 'team_leader' },
    { key: 'call_leader', label: 'Co-Leaders', filter: (member: User) => member.role === 'call_leader' },
  ] as const;

  return (
    <DashboardLayout title="Team">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Active Members</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {appData.teamMembers.filter((member) => member.status === 'active').length}
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Leadership Roles</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {appData.teamMembers.filter((member) =>
                ['agm', 'project_manager', 'call_leader', 'team_leader'].includes(member.role),
              ).length}
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Assigned Teams</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {appData.teamMembers.filter((member) => member.teamId && member.status !== 'removed').length}
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Access Mode</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {canManage ? 'Authorized Manager' : 'Read Only'}
            </p>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreateMember}
          className="glass rounded-xl p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Add Member</h2>
              <p className="text-sm text-muted-foreground">
                Compact assignment form for new members. Detailed bio and work notes can be refined from the member
                profile view.
              </p>
            </div>
            <Button type="submit" disabled={!canManage || (!isMemberFormAgm && !hasActiveServices)}>
              <Plus className="h-4 w-4" />
              Add Member
            </Button>
          </div>

          {!isMemberFormAgm && !hasActiveServices && (
            <div className="mb-4 rounded-xl border border-dashed border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
              No services found in Supabase yet. Create a service first, then member assignment will become available here instantly.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Full Name</span>
              <input
                value={memberForm.name}
                onChange={(event) => setMemberForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Email</span>
              <input
                value={memberForm.email}
                onChange={(event) => setMemberForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Phone Number</span>
              <input
                value={memberForm.phoneNumber}
                onChange={(event) => setMemberForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Role</span>
              <select
                value={memberForm.role}
                onChange={(event) =>
                  setMemberForm((prev) => ({
                    ...prev,
                    role: event.target.value as UserRole,
                    serviceId: event.target.value === 'agm' ? '' : prev.serviceId,
                    teamId: 'none',
                  }))
                }
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground">Status</span>
              <select
                value={memberForm.status}
                onChange={(event) =>
                  setMemberForm((prev) => ({ ...prev, status: event.target.value as MemberStatus }))
                }
                className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {MEMBER_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            {isMemberFormAgm ? (
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground">
                <p className="font-medium">Service Scope</p>
                <p className="mt-1 text-muted-foreground">
                  AGM is assigned to <span className="font-medium text-foreground">All Services</span> automatically and is not attached to a specific team.
                </p>
              </div>
            ) : (
              <>
                <label className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <select
                    value={memberForm.serviceId}
                    onChange={(event) =>
                      setMemberForm((prev) => ({ ...prev, serviceId: event.target.value, teamId: 'none' }))
                    }
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                    disabled={!hasActiveServices}
                  >
                    {hasActiveServices ? (
                      activeServices.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No services available</option>
                    )}
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="text-muted-foreground">Team</span>
                  <select
                    value={memberForm.teamId}
                    onChange={(event) => setMemberForm((prev) => ({ ...prev, teamId: event.target.value }))}
                    className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                    disabled={!hasActiveServices}
                  >
                    <option value="none">Service only</option>
                    {appData.teams
                      .filter((team) => team.isActive && team.serviceId === memberForm.serviceId)
                      .map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            )}
          </div>
        </motion.form>

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, phone, service, team..."
                className="w-full rounded-lg bg-secondary py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={serviceFilter}
              onChange={(event) => {
                setServiceFilter(event.target.value);
                setTeamFilter('all');
              }}
              className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Services</option>
              {activeServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
            <select
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Teams</option>
              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}
              className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground">
            <UserCog className="h-3.5 w-3.5" />
            View for full profile. Edit for transfer, role updates, and detailed bio data.
          </div>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            {tabConfigs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabConfigs.map((tab) => {
            const members = filteredMembers.filter(tab.filter);

            return (
              <TabsContent key={tab.key} value={tab.key}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass overflow-hidden rounded-xl"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-5 py-3 text-left font-medium text-muted-foreground">Member</th>
                          <th className="px-5 py-3 text-left font-medium text-muted-foreground">Role</th>
                          <th className="hidden px-5 py-3 text-left font-medium text-muted-foreground lg:table-cell">Phone</th>
                          <th className="hidden px-5 py-3 text-left font-medium text-muted-foreground md:table-cell">Team</th>
                          <th className="hidden px-5 py-3 text-left font-medium text-muted-foreground xl:table-cell">Service</th>
                          <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((member, index) => (
                          <motion.tr
                            key={member.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-secondary/40"
                            onClick={() => openProfile(member, 'view')}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                  {member.name
                                    .split(' ')
                                    .map((part) => part[0])
                                    .join('')}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-foreground">{member.name}</p>
                                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className={cn('rounded-full px-2 py-1 text-[10px] font-medium', ROLE_COLORS[member.role])}>
                                {ROLE_LABELS[member.role]}
                              </span>
                            </td>
                            <td className="hidden px-5 py-4 text-muted-foreground lg:table-cell">{member.phoneNumber}</td>
                            <td className="hidden px-5 py-4 md:table-cell text-foreground">{getTeamLabel(member)}</td>
                            <td className="hidden px-5 py-4 text-muted-foreground xl:table-cell">{getServiceLabel(member)}</td>
                            <td className="px-5 py-4">
                              <span className={cn('rounded-full px-2 py-1 text-[10px] font-medium', MEMBER_STATUS_COLORS[member.status])}>
                                {MEMBER_STATUS_LABELS[member.status]}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openProfile(member, 'view');
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openProfile(member, 'edit');
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                                >
                                  <SquarePen className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={!canManage}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleStatusChange(member, member.status === 'disabled' ? 'active' : 'disabled');
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/20 disabled:opacity-50"
                                >
                                  <BadgeCheck className="h-3.5 w-3.5" />
                                  {member.status === 'disabled' ? 'Activate' : 'Disable'}
                                </button>
                                <button
                                  type="button"
                                  disabled={!canManage}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void handleStatusChange(member, member.status === 'banned' ? 'active' : 'banned');
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  {member.status === 'banned' ? 'Unban' : 'Ban'}
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>

                {members.length === 0 && (
                  <div className="glass rounded-xl p-6 text-sm text-muted-foreground">
                    No members match the selected filters.
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detailMode === 'edit' ? 'Edit Member' : 'Member Profile'}</DialogTitle>
              <DialogDescription>
                {detailMode === 'edit'
                  ? 'Update team assignment, role, status, and member bio data in one place.'
                  : 'Professional member detail view with overview, project load, and current activity summary.'}
              </DialogDescription>
            </DialogHeader>

            {selectedMember ? (
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="projects">Projects</TabsTrigger>
                  <TabsTrigger value="activity">Activity / Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-[280px,1fr]">
                    <div className="glass rounded-xl p-5">
                      <div className="flex flex-col items-center text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                          {selectedMember.name
                            .split(' ')
                            .map((part) => part[0])
                            .join('')}
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-foreground">{selectedMember.name}</h3>
                        <span
                          className={cn(
                            'mt-2 rounded-full px-3 py-1 text-xs font-medium',
                            ROLE_COLORS[selectedMember.role],
                          )}
                        >
                          {ROLE_LABELS[selectedMember.role]}
                        </span>
                        <span
                          className={cn(
                            'mt-2 rounded-full px-3 py-1 text-xs font-medium',
                            MEMBER_STATUS_COLORS[selectedMember.status],
                          )}
                        >
                          {MEMBER_STATUS_LABELS[selectedMember.status]}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3 text-sm">
                        <div className="rounded-lg bg-secondary/50 p-3">
                          <p className="text-xs text-muted-foreground">Phone Number</p>
                          <p className="mt-1 flex items-center gap-2 text-foreground">
                            <Phone className="h-4 w-4 text-primary" />
                            {selectedMember.phoneNumber}
                          </p>
                        </div>
                        <div className="rounded-lg bg-secondary/50 p-3">
                          <p className="text-xs text-muted-foreground">Assigned Service</p>
                          <p className="mt-1 text-foreground">{getServiceLabel(selectedMember)}</p>
                        </div>
                        <div className="rounded-lg bg-secondary/50 p-3">
                          <p className="text-xs text-muted-foreground">Assigned Team</p>
                          <p className="mt-1 text-foreground">{getTeamLabel(selectedMember)}</p>
                        </div>
                        <div className="rounded-lg bg-secondary/50 p-3">
                          <p className="text-xs text-muted-foreground">Branch / Department</p>
                          <p className="mt-1 text-foreground">{selectedMember.department || 'Not added yet'}</p>
                        </div>
                      </div>
                    </div>

                    {detailMode === 'edit' ? (
                      <div className="glass rounded-xl p-5">
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="space-y-2 text-sm">
                            <span className="text-muted-foreground">Full Name</span>
                            <input
                              value={detailForm.name}
                              onChange={(event) =>
                                setDetailForm((prev) => ({ ...prev, name: event.target.value }))
                              }
                              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                            />
                          </label>
                          <label className="space-y-2 text-sm">
                            <span className="text-muted-foreground">Email</span>
                            <input
                              value={detailForm.email}
                              onChange={(event) =>
                                setDetailForm((prev) => ({ ...prev, email: event.target.value }))
                              }
                              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                            />
                          </label>
                          <label className="space-y-2 text-sm">
                            <span className="text-muted-foreground">Phone Number</span>
                            <input
                              value={detailForm.phoneNumber}
                              onChange={(event) =>
                                setDetailForm((prev) => ({ ...prev, phoneNumber: event.target.value }))
                              }
                              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                            />
                          </label>
                          <label className="space-y-2 text-sm">
                            <span className="text-muted-foreground">Role</span>
                            <select
                              value={detailForm.role}
                              onChange={(event) =>
                                setDetailForm((prev) => ({
                                  ...prev,
                                  role: event.target.value as UserRole,
                                  serviceId: event.target.value === 'agm' ? '' : prev.serviceId,
                                  teamId: 'none',
                                }))
                              }
                              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-2 text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <select
                              value={detailForm.status}
                              onChange={(event) =>
                                setDetailForm((prev) => ({
                                  ...prev,
                                  status: event.target.value as MemberStatus,
                                }))
                              }
                              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                            >
                              {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {MEMBER_STATUS_LABELS[status]}
                                </option>
                              ))}
                            </select>
                          </label>
                          {isDetailFormAgm ? (
                            <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground md:col-span-2">
                              <p className="font-medium">Service Scope</p>
                              <p className="mt-1 text-muted-foreground">
                                AGM keeps global access and is automatically mapped to <span className="font-medium text-foreground">All Services</span>.
                              </p>
                            </div>
                          ) : (
                            <>
                              <label className="space-y-2 text-sm">
                                <span className="text-muted-foreground">Service</span>
                                <select
                                  value={detailForm.serviceId}
                                  onChange={(event) =>
                                    setDetailForm((prev) => ({
                                      ...prev,
                                      serviceId: event.target.value,
                                      teamId: 'none',
                                    }))
                                  }
                                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                                  disabled={!hasActiveServices}
                                >
                                  {hasActiveServices ? (
                                    activeServices.map((service) => (
                                      <option key={service.id} value={service.id}>
                                        {service.name}
                                      </option>
                                    ))
                                  ) : (
                                    <option value="">No services available</option>
                                  )}
                                </select>
                              </label>
                              <label className="space-y-2 text-sm">
                                <span className="text-muted-foreground">Team</span>
                                <select
                                  value={detailForm.teamId}
                                  onChange={(event) =>
                                    setDetailForm((prev) => ({ ...prev, teamId: event.target.value }))
                                  }
                                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                                  disabled={!hasActiveServices}
                                >
                                  <option value="none">Service only</option>
                                  {visibleDetailTeams.map((team) => (
                                    <option key={team.id} value={team.id}>
                                      {team.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </>
                          )}
                          <label className="space-y-2 text-sm">
                            <span className="text-muted-foreground">Branch / Department</span>
                            <input
                              value={detailForm.department}
                              onChange={(event) =>
                                setDetailForm((prev) => ({ ...prev, department: event.target.value }))
                              }
                              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                            />
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4">
                          <label className="space-y-2 text-sm">
                            <span className="text-muted-foreground">Member Description / Bio</span>
                            <textarea
                              rows={4}
                              value={detailForm.bio}
                              onChange={(event) =>
                                setDetailForm((prev) => ({ ...prev, bio: event.target.value }))
                              }
                              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                            />
                          </label>
                          <label className="space-y-2 text-sm">
                            <span className="text-muted-foreground">What Work They Do</span>
                            <textarea
                              rows={4}
                              value={detailForm.workSummary}
                              onChange={(event) =>
                                setDetailForm((prev) => ({ ...prev, workSummary: event.target.value }))
                              }
                              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        <div className="glass rounded-xl p-5">
                          <h4 className="text-sm font-semibold text-foreground">Basic Info</h4>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div className="rounded-lg bg-secondary/40 p-4">
                              <p className="text-xs text-muted-foreground">Role / Position</p>
                              <p className="mt-1 text-sm font-medium text-foreground">
                                {ROLE_LABELS[selectedMember.role]}
                              </p>
                            </div>
                            <div className="rounded-lg bg-secondary/40 p-4">
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="mt-1 text-sm font-medium text-foreground">{selectedMember.email}</p>
                            </div>
                            <div className="rounded-lg bg-secondary/40 p-4">
                              <p className="text-xs text-muted-foreground">Assigned Service</p>
                              <p className="mt-1 text-sm font-medium text-foreground">{getServiceLabel(selectedMember)}</p>
                            </div>
                            <div className="rounded-lg bg-secondary/40 p-4">
                              <p className="text-xs text-muted-foreground">Assigned Team</p>
                              <p className="mt-1 text-sm font-medium text-foreground">{getTeamLabel(selectedMember)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="glass rounded-xl p-5">
                          <h4 className="text-sm font-semibold text-foreground">Bio Data</h4>
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div className="rounded-lg bg-secondary/40 p-4">
                              <p className="text-xs text-muted-foreground">Member Description / Bio</p>
                              <p className="mt-2 text-sm leading-6 text-foreground">
                                {selectedMember.bio || 'No bio added yet.'}
                              </p>
                            </div>
                            <div className="rounded-lg bg-secondary/40 p-4">
                              <p className="text-xs text-muted-foreground">What Work They Do</p>
                              <p className="mt-2 text-sm leading-6 text-foreground">
                                {selectedMember.workSummary || 'No work summary added yet.'}
                              </p>
                            </div>
                            <div className="rounded-lg bg-secondary/40 p-4 lg:col-span-2">
                              <p className="text-xs text-muted-foreground">Branch / Department</p>
                              <p className="mt-2 text-sm leading-6 text-foreground">
                                {selectedMember.department || 'No department added yet.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="projects">
                  <div className="glass overflow-hidden rounded-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Project ID</th>
                            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Project Name</th>
                            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Client Name</th>
                            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                            <th className="px-5 py-3 text-left font-medium text-muted-foreground">Deadline</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMember.projects.map((project) => (
                            <tr key={project.id} className="border-b border-border last:border-0">
                              <td className="px-5 py-4 font-mono text-xs text-foreground">{project.id}</td>
                              <td className="px-5 py-4 text-foreground">{project.name}</td>
                              <td className="px-5 py-4 text-muted-foreground">{project.clientName}</td>
                              <td className="px-5 py-4">
                                <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-medium text-secondary-foreground">
                                  {project.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-muted-foreground">{project.deadline}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {selectedMember.projects.length === 0 && (
                      <div className="p-5 text-sm text-muted-foreground">
                        This member is not linked to any active projects yet.
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="activity">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="glass rounded-xl p-5">
                      <p className="text-xs text-muted-foreground">Current Access</p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {selectedMember.status === 'active' ? 'Login Enabled' : 'Access Restricted'}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Disabled and banned members are blocked from entering the ERP.
                      </p>
                    </div>
                    <div className="glass rounded-xl p-5">
                      <p className="text-xs text-muted-foreground">Last Transfer / Update</p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {selectedMember.lastMovedAt || 'No transfer yet'}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Reflects the latest service or team reassignment sync.
                      </p>
                    </div>
                    <div className="glass rounded-xl p-5">
                      <p className="text-xs text-muted-foreground">Project Load</p>
                      <p className="mt-2 flex items-center gap-2 text-base font-semibold text-foreground">
                        <Users className="h-4 w-4 text-primary" />
                        {selectedMember.projects.length} linked project
                        {selectedMember.projects.length === 1 ? '' : 's'}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Use this view to track delivery responsibility and workload.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
              {selectedMember && detailMode === 'view' ? (
                <Button type="button" onClick={() => openProfile(selectedMember, 'edit')} disabled={!canManage}>
                  <SquarePen className="h-4 w-4" />
                  Edit Member
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleSaveDetails()}
                  disabled={!canManage || (!isDetailFormAgm && !hasActiveServices)}
                >
                  <BadgeCheck className="h-4 w-4" />
                  Save Changes
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Team;
