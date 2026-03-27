import {
  addDays,
  differenceInCalendarDays,
  differenceInMilliseconds,
  endOfDay,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';
import type {
  AppDataState,
  MemberStatus,
  Notification,
  Project,
  Sale,
  Service,
  Team,
  User,
  UserRole,
} from '@/types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MANAGER_ROLES: UserRole[] = ['developer', 'agm', 'project_manager'];
const RESTRICTED_PROJECT_ROLES: UserRole[] = ['team_member', 'call_leader'];
const GLOBAL_SERVICE_NAME = 'All Services';
const DEFAULT_SERVICE_COLORS = [
  'hsl(175 80% 45%)',
  'hsl(260 60% 60%)',
  'hsl(38 92% 55%)',
  'hsl(152 60% 42%)',
  'hsl(338 78% 60%)',
  'hsl(203 82% 56%)',
];

function toDate(value?: string | null, fallback = new Date()) {
  if (!value) {
    return fallback;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
}

function toIsoDate(value?: string | null, fallback = new Date()) {
  return toDate(value, fallback).toISOString().slice(0, 10);
}

function uniqueOrderId(base: string, used: Set<string>) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  let counter = 2;
  while (used.has(`${base}-${counter}`)) {
    counter += 1;
  }

  const nextValue = `${base}-${counter}`;
  used.add(nextValue);
  return nextValue;
}

function normalizeUserRole(role?: string | null): UserRole {
  switch (role) {
    case 'developer':
    case 'agm':
    case 'project_manager':
    case 'team_leader':
    case 'call_leader':
    case 'team_member':
      return role;
    case 'caller':
      return 'call_leader';
    case 'member':
      return 'team_member';
    default:
      return 'team_member';
  }
}

function normalizeMemberStatus(status?: string | null): MemberStatus {
  switch (status) {
    case 'disabled':
    case 'banned':
    case 'removed':
      return status;
    default:
      return 'active';
  }
}

function normalizeSaleStatus(status?: string | null): Sale['status'] {
  switch (status) {
    case 'completed':
    case 'delivered':
      return 'delivered';
    case 'ongoing':
    case 'in_progress':
    case 'in progress':
      return 'in_progress';
    case 'late':
      return 'late';
    case 'refunded':
      return 'refunded';
    default:
      return 'pending';
  }
}

function normalizeProjectStatus(status?: string | null): Project['status'] {
  switch (status) {
    case 'completed':
    case 'delivered':
      return 'completed';
    case 'ongoing':
    case 'in_progress':
    case 'in progress':
      return 'in_progress';
    case 'late':
      return 'late';
    default:
      return 'pending';
  }
}

function inferTeamName(serviceName: string) {
  return serviceName ? `${serviceName} Team` : 'Unassigned Team';
}

function findServiceByName(services: Service[], name?: string | null) {
  if (!name) {
    return undefined;
  }

  return services.find((service) => service.name.toLowerCase() === name.trim().toLowerCase());
}

export function generateSequentialId(prefix: string, existingIds: string[]) {
  const digits = existingIds
    .map((value) => Number.parseInt(value.replace(/^\D+/g, ''), 10))
    .filter((value) => Number.isFinite(value));
  const nextValue = (digits.length ? Math.max(...digits) : 0) + 1;
  return `${prefix}${String(nextValue).padStart(3, '0')}`;
}

export function getDeadlineMetrics(deadline: string, now = new Date()) {
  const deadlineDate = endOfDay(toDate(deadline));
  const deadlineDay = startOfDay(deadlineDate);
  const today = startOfDay(now);
  const remainingDays = differenceInCalendarDays(deadlineDay, today);
  const remainingMs = differenceInMilliseconds(deadlineDate, now);
  const overdueByMs = remainingMs < 0 ? Math.abs(remainingMs) : 0;

  return {
    deadlineDate,
    isOverdue: remainingMs < 0,
    remainingDays,
    remainingMs,
    overdueByMs,
  };
}

export function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function formatRelativeCountdown(deadline: string, now = new Date()) {
  const metrics = getDeadlineMetrics(deadline, now);

  if (metrics.isOverdue) {
    return `Overdue by ${formatCountdown(metrics.overdueByMs)}`;
  }

  return formatCountdown(metrics.remainingMs);
}

export function getRemainingDaysLabel(deadline: string, now = new Date()) {
  const metrics = getDeadlineMetrics(deadline, now);

  if (metrics.isOverdue) {
    return 'Overdue';
  }

  if (metrics.remainingDays === 0) {
    return 'Due today';
  }

  return `${metrics.remainingDays} day${metrics.remainingDays === 1 ? '' : 's'} left`;
}

export function getSaleDisplayStatus(sale: Sale, now = new Date()): Sale['status'] {
  if (sale.status === 'delivered' || sale.status === 'refunded') {
    return sale.status;
  }

  return getDeadlineMetrics(sale.deliveryDeadline, now).isOverdue ? 'late' : sale.status;
}

export function getProjectDisplayStatus(project: Project, now = new Date()): Project['status'] {
  if (project.status === 'completed') {
    return 'completed';
  }

  return getDeadlineMetrics(project.deadline, now).isOverdue ? 'late' : project.status;
}

export function canManageAssignments(user: User) {
  return user.status === 'active' && MANAGER_ROLES.includes(user.role);
}

export function canLogin(user: User) {
  return user.status === 'active';
}

export function getVisibleProjects(projects: Project[], currentUser: User) {
  if (!RESTRICTED_PROJECT_ROLES.includes(currentUser.role)) {
    return projects;
  }

  return projects.filter(
    (project) => project.members.includes(currentUser.name) || project.teamLeader === currentUser.name,
  );
}

export function createNotification(title: string, message: string, type: Notification['type']): Notification {
  return {
    id: `N-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    message,
    type,
    read: false,
    date: new Date().toISOString().slice(0, 10),
  };
}

function normalizeServiceRecord(rawService: Partial<Service>, index: number): Service {
  return {
    id: rawService.id?.trim() || `SV${index + 1}`,
    name: rawService.name?.trim() || `Service ${index + 1}`,
    manager: rawService.manager?.trim() || 'Unassigned',
    managerId: rawService.managerId?.trim() || null,
    description: rawService.description?.trim() || 'Managed delivery service',
    teamCount: Number(rawService.teamCount ?? 0),
    projectCount: Number(rawService.projectCount ?? 0),
    revenue: Number(rawService.revenue ?? 0),
    color: rawService.color?.trim() || DEFAULT_SERVICE_COLORS[index % DEFAULT_SERVICE_COLORS.length],
    isActive: rawService.isActive ?? true,
  };
}

function createSyntheticService(name: string, index: number): Service {
  return {
    id: `SV${String(index + 1).padStart(2, '0')}`,
    name,
    manager: 'Unassigned',
    managerId: null,
    description: `${name} service`,
    teamCount: 0,
    projectCount: 0,
    revenue: 0,
    color: DEFAULT_SERVICE_COLORS[index % DEFAULT_SERVICE_COLORS.length],
    isActive: true,
  };
}

function deriveServiceUniverse(rawData: Partial<AppDataState>) {
  const normalizedServices = (rawData.services ?? []).map((service, index) => normalizeServiceRecord(service, index));
  const serviceNames = new Set(normalizedServices.map((service) => service.name.toLowerCase()));

  const additionalNames = [
    ...(rawData.sales ?? []).map((sale) => sale.serviceType ?? sale.service),
    ...(rawData.projects ?? []).map((project) => project.assignedService ?? project.service ?? project.serviceType),
    ...(rawData.teams ?? []).map((team) => team.serviceName),
    ...(rawData.teamMembers ?? []).map((member) => member.serviceName),
  ]
    .filter(Boolean)
    .map((value) => value!.trim());

  additionalNames.forEach((serviceName) => {
    if (!serviceNames.has(serviceName.toLowerCase())) {
      serviceNames.add(serviceName.toLowerCase());
      normalizedServices.push(createSyntheticService(serviceName, normalizedServices.length));
    }
  });

  return normalizedServices;
}

function deriveTeamsFromProjects(rawProjects: Partial<Project>[], services: Service[]) {
  const teams: Team[] = [];
  const seen = new Set<string>();

  rawProjects.forEach((project) => {
    const teamName = (project.assignedTeam ?? '').trim();
    const serviceName = (project.assignedService ?? project.service ?? project.serviceType ?? '').trim();
    const service = findServiceByName(services, serviceName) ?? services[0];

    if (!teamName || !service) {
      return;
    }

    const key = `${service.id}:${teamName.toLowerCase()}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    teams.push({
      id: `T${String(teams.length + 1).padStart(3, '0')}`,
      name: teamName,
      serviceId: service.id,
      serviceName: service.name,
      description: `${teamName} delivery pod`,
      projectManagerId: null,
      projectManagerName: service.manager || 'Unassigned',
      teamLeaderId: null,
      teamLeaderName: project.teamLeader?.trim() || 'Unassigned',
      callerIds: [],
      memberCount: 0,
      isActive: true,
    });
  });

  return teams;
}

function normalizeTeamRecord(rawTeam: Partial<Team>, services: Service[], index: number): Team {
  const linkedService =
    services.find((service) => service.id === rawTeam.serviceId) ??
    findServiceByName(services, rawTeam.serviceName) ??
    services[0];

  return {
    id: rawTeam.id?.trim() || `T${String(index + 1).padStart(3, '0')}`,
    name: rawTeam.name?.trim() || `Team ${index + 1}`,
    serviceId: linkedService?.id ?? '',
    serviceName: linkedService?.name ?? rawTeam.serviceName?.trim() ?? 'Unassigned Service',
    description: rawTeam.description?.trim() || 'Delivery team',
    projectManagerId: rawTeam.projectManagerId?.trim() || null,
    projectManagerName: rawTeam.projectManagerName?.trim() || 'Unassigned',
    teamLeaderId: rawTeam.teamLeaderId?.trim() || null,
    teamLeaderName: rawTeam.teamLeaderName?.trim() || 'Unassigned',
    callerIds: Array.isArray(rawTeam.callerIds) ? rawTeam.callerIds.filter(Boolean) : [],
    memberCount: Number(rawTeam.memberCount ?? 0),
    isActive: rawTeam.isActive ?? true,
  };
}

function normalizeMemberRecord(rawMember: Partial<User>, services: Service[], teams: Team[]): User {
  const status = normalizeMemberStatus(rawMember.status);
  const linkedTeam =
    teams.find((team) => team.id === rawMember.teamId) ??
    teams.find((team) => team.name.toLowerCase() === rawMember.teamName?.trim().toLowerCase());
  const linkedService =
    services.find((service) => service.id === rawMember.serviceId) ??
    findServiceByName(services, rawMember.serviceName) ??
    (linkedTeam ? services.find((service) => service.id === linkedTeam.serviceId) : undefined);

  const role = normalizeUserRole(rawMember.role);
  const isGlobalAgm = role === 'agm' && status !== 'removed';

  return {
    id: rawMember.id?.trim() || crypto.randomUUID(),
    name: rawMember.name?.trim() || 'Unnamed Member',
    email: rawMember.email?.trim() || 'unknown@example.com',
    phoneNumber: rawMember.phoneNumber?.trim() || 'N/A',
    role,
    status,
    serviceId: isGlobalAgm ? null : status === 'removed' ? null : linkedService?.id ?? null,
    serviceName: isGlobalAgm
      ? GLOBAL_SERVICE_NAME
      : status === 'removed'
        ? null
        : linkedService?.name ?? rawMember.serviceName?.trim() ?? null,
    teamId: isGlobalAgm ? null : status === 'removed' ? null : linkedTeam?.id ?? null,
    teamName: isGlobalAgm ? null : status === 'removed' ? null : linkedTeam?.name ?? rawMember.teamName?.trim() ?? null,
    bio: rawMember.bio?.trim() || '',
    workSummary: rawMember.workSummary?.trim() || '',
    department: rawMember.department?.trim() || '',
    clerkUserId: rawMember.clerkUserId ?? null,
    avatar: rawMember.avatar,
    lastMovedAt: rawMember.lastMovedAt ?? null,
  };
}

function hydrateMembersFromLegacyProjects(members: User[], projects: Project[], services: Service[], teams: Team[]) {
  return members.map((member) => {
    if (member.status === 'removed') {
      return member;
    }

    if (member.serviceId || member.teamId || member.role === 'project_manager') {
      return member;
    }

    const teamLeadershipProject = projects.find((project) => project.teamLeader === member.name);
    if (teamLeadershipProject) {
      const linkedTeam = teams.find((team) => team.name === teamLeadershipProject.assignedTeam);
      const linkedService = services.find((service) => service.name === teamLeadershipProject.assignedService);
      return {
        ...member,
        role: member.role === 'team_member' ? 'team_leader' : member.role,
        serviceId: linkedService?.id ?? member.serviceId,
        serviceName: linkedService?.name ?? member.serviceName,
        teamId: linkedTeam?.id ?? member.teamId,
        teamName: linkedTeam?.name ?? member.teamName,
      };
    }

    const assignedProject = projects.find((project) => project.members.includes(member.name));
    if (!assignedProject) {
      const serviceManager = services.find((service) => service.manager === member.name);
      if (serviceManager) {
        return {
          ...member,
          role: member.role === 'team_member' ? 'project_manager' : member.role,
          serviceId: serviceManager.id,
          serviceName: serviceManager.name,
        };
      }

      return member;
    }

    const linkedTeam = teams.find((team) => team.name === assignedProject.assignedTeam);
    const linkedService = services.find((service) => service.name === assignedProject.assignedService);

    return {
      ...member,
      serviceId: linkedService?.id ?? member.serviceId,
      serviceName: linkedService?.name ?? member.serviceName,
      teamId: linkedTeam?.id ?? member.teamId,
      teamName: linkedTeam?.name ?? member.teamName,
    };
  });
}

function normalizeSaleRecord(rawSale: Partial<Sale>, usedOrderIds: Set<string>, index: number): Sale {
  const incomingDate = toIsoDate(rawSale.incomingDate ?? rawSale.date, new Date());
  const serviceType = (rawSale.serviceType ?? rawSale.service ?? 'General Service').trim();
  const orderId = uniqueOrderId(
    (rawSale.orderId?.trim() || `ORD-${String(index + 1).padStart(4, '0')}`).toUpperCase(),
    usedOrderIds,
  );

  return {
    id: rawSale.id?.trim() || `S${String(index + 1).padStart(3, '0')}`,
    orderId,
    projectName: rawSale.projectName?.trim() || `${serviceType} Delivery`,
    clientName: rawSale.clientName?.trim() || 'Legacy Client',
    serviceType,
    service: serviceType,
    marketplace: rawSale.marketplace?.trim() || 'Direct',
    incomingDate,
    date: incomingDate,
    deliveryDeadline: toIsoDate(rawSale.deliveryDeadline, addDays(toDate(incomingDate), 7)),
    revenueAmount: Number(rawSale.revenueAmount ?? rawSale.amount ?? 0),
    amount: Number(rawSale.amount ?? rawSale.revenueAmount ?? 0),
    status: normalizeSaleStatus(rawSale.status),
    projectId: rawSale.projectId?.trim() || null,
    movedToOperationsAt: rawSale.movedToOperationsAt ?? null,
  };
}

function normalizeProjectRecord(
  rawProject: Partial<Project>,
  salesByOrderId: Map<string, Sale>,
  services: Service[],
  teams: Team[],
  index: number,
): Project {
  const orderId = rawProject.orderId?.trim();
  const linkedSale = orderId ? salesByOrderId.get(orderId) : undefined;
  const assignedService = (rawProject.assignedService ?? rawProject.service ?? linkedSale?.serviceType ?? 'General Service').trim();
  const assignedTeam = rawProject.assignedTeam?.trim() || inferTeamName(assignedService);
  const linkedService =
    services.find((service) => service.id === rawProject.assignedServiceId) ??
    findServiceByName(services, assignedService);
  const linkedTeam =
    teams.find((team) => team.id === rawProject.assignedTeamId) ??
    teams.find((team) => team.name.toLowerCase() === assignedTeam.toLowerCase());
  const projectId = rawProject.projectId?.trim() || rawProject.id?.trim() || `P${String(index + 1).padStart(3, '0')}`;
  const startDate = toIsoDate(rawProject.startDate ?? linkedSale?.incomingDate, new Date());
  const deadline = toIsoDate(rawProject.deadline ?? linkedSale?.deliveryDeadline, addDays(toDate(startDate), 7));

  return {
    id: projectId,
    projectId,
    orderId: orderId || linkedSale?.orderId || `LEGACY-${projectId}`,
    name: rawProject.name?.trim() || linkedSale?.projectName || `Project ${projectId}`,
    projectName: rawProject.projectName?.trim() || rawProject.name?.trim() || linkedSale?.projectName || `Project ${projectId}`,
    client: rawProject.client?.trim() || linkedSale?.clientName || 'Legacy Client',
    clientName: rawProject.clientName?.trim() || rawProject.client?.trim() || linkedSale?.clientName || 'Legacy Client',
    service: assignedService,
    serviceType: rawProject.serviceType?.trim() || linkedSale?.serviceType || assignedService,
    assignedService,
    assignedServiceId: linkedService?.id ?? rawProject.assignedServiceId?.trim() ?? null,
    marketplace: rawProject.marketplace?.trim() || linkedSale?.marketplace || 'Direct',
    assignedTeam,
    assignedTeamId: linkedTeam?.id ?? rawProject.assignedTeamId?.trim() ?? null,
    teamLeader: rawProject.teamLeader?.trim() || linkedTeam?.teamLeaderName || 'Unassigned',
    members: Array.isArray(rawProject.members) ? rawProject.members.filter(Boolean) : [],
    startDate,
    deadline,
    deliveryDeadline: deadline,
    status: normalizeProjectStatus(rawProject.status),
    revenue: Number(rawProject.revenue ?? linkedSale?.revenueAmount ?? 0),
    createdFromSaleId: rawProject.createdFromSaleId?.trim() || linkedSale?.id || null,
    sourceModule: 'sales',
  };
}

function syncOrganizationStructure(
  services: Service[],
  teams: Team[],
  teamMembers: User[],
  projects: Project[],
  sales: Sale[],
) {
  const serviceMap = new Map(services.map((service) => [service.id, service]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const normalizedMembers = teamMembers.map((member) => {
    const status = normalizeMemberStatus(member.status);
    const linkedTeam = member.teamId ? teamMap.get(member.teamId) : undefined;
    const linkedService = member.serviceId
      ? serviceMap.get(member.serviceId)
      : linkedTeam
        ? serviceMap.get(linkedTeam.serviceId)
        : undefined;

    const role = normalizeUserRole(member.role);
    const isGlobalAgm = role === 'agm' && status !== 'removed';

    return {
      ...member,
      role,
      status,
      serviceId: isGlobalAgm ? null : status === 'removed' ? null : linkedService?.id ?? null,
      serviceName: isGlobalAgm
        ? GLOBAL_SERVICE_NAME
        : status === 'removed'
          ? null
          : linkedService?.name ?? null,
      teamId: isGlobalAgm ? null : status === 'removed' ? null : linkedTeam?.id ?? null,
      teamName: isGlobalAgm ? null : status === 'removed' ? null : linkedTeam?.name ?? null,
    };
  });

  const updatedTeams = teams.map((team) => {
    const membersForTeam = normalizedMembers.filter(
      (member) => member.teamId === team.id && member.status !== 'removed',
    );
    const leader = membersForTeam.find((member) => member.role === 'team_leader');
    const callers = membersForTeam.filter((member) => member.role === 'call_leader');
    const projectManager =
      normalizedMembers.find(
        (member) =>
          member.serviceId === team.serviceId &&
          member.role === 'project_manager' &&
          member.status !== 'removed',
      ) ?? null;

    return {
      ...team,
      serviceName: serviceMap.get(team.serviceId)?.name ?? team.serviceName,
      projectManagerId: projectManager?.id ?? null,
      projectManagerName: projectManager?.name ?? 'Unassigned',
      teamLeaderId: leader?.id ?? null,
      teamLeaderName: leader?.name ?? 'Unassigned',
      callerIds: callers.map((member) => member.id),
      memberCount: membersForTeam.length,
    };
  });

  const updatedServices = services.map((service) => {
    const serviceMembers = normalizedMembers.filter(
      (member) => member.serviceId === service.id && member.status !== 'removed',
    );
    const manager =
      serviceMembers.find((member) => member.role === 'project_manager') ?? null;
    const teamCount = updatedTeams.filter((team) => team.serviceId === service.id && team.isActive).length;
    const projectCount = projects.filter(
      (project) => project.assignedServiceId === service.id || project.assignedService === service.name,
    ).length;
    const revenue = sales
      .filter((sale) => sale.serviceType === service.name && sale.status !== 'refunded')
      .reduce((sum, sale) => sum + sale.revenueAmount, 0);

    return {
      ...service,
      manager: manager?.name ?? 'Unassigned',
      managerId: manager?.id ?? null,
      teamCount,
      projectCount,
      revenue,
    };
  });

  return {
    services: updatedServices,
    teams: updatedTeams,
    teamMembers: normalizedMembers,
  };
}

export function normalizeAppData(rawData: AppDataState): AppDataState {
  const baseServices = deriveServiceUniverse(rawData);
  const baseTeams =
    rawData.teams && rawData.teams.length > 0
      ? rawData.teams.map((team, index) => normalizeTeamRecord(team, baseServices, index))
      : deriveTeamsFromProjects(rawData.projects ?? [], baseServices);

  const baseMembers = (rawData.teamMembers ?? []).map((member) =>
    normalizeMemberRecord(member, baseServices, baseTeams),
  );

  const usedOrderIds = new Set<string>();
  const normalizedSales = (rawData.sales ?? []).map((sale, index) => normalizeSaleRecord(sale, usedOrderIds, index));
  const salesByOrderId = new Map(normalizedSales.map((sale) => [sale.orderId, sale]));

  const projectSource = rawData.projects ?? [];
  const syntheticSales: Sale[] = [];

  projectSource.forEach((project, index) => {
    const existingOrderId = project.orderId?.trim();
    const existingSale = existingOrderId ? salesByOrderId.get(existingOrderId) : undefined;

    if (existingSale) {
      return;
    }

    const projectId = project.projectId?.trim() || project.id?.trim() || `P${String(index + 1).padStart(3, '0')}`;
    const fallbackService = (project.assignedService ?? project.service ?? 'General Service').trim();
    const syntheticOrderId = uniqueOrderId(existingOrderId || `LEGACY-${projectId}`, usedOrderIds);
    const syntheticSale: Sale = {
      id: `S-LEGACY-${projectId}`,
      orderId: syntheticOrderId,
      projectName: project.projectName?.trim() || project.name?.trim() || `Legacy ${projectId}`,
      clientName: project.clientName?.trim() || project.client?.trim() || 'Legacy Client',
      serviceType: project.serviceType?.trim() || fallbackService,
      service: project.serviceType?.trim() || fallbackService,
      marketplace: project.marketplace?.trim() || 'Legacy Import',
      incomingDate: toIsoDate(project.startDate, new Date()),
      date: toIsoDate(project.startDate, new Date()),
      deliveryDeadline: toIsoDate(project.deadline, addDays(new Date(), 7)),
      revenueAmount: Number(project.revenue ?? 0),
      amount: Number(project.revenue ?? 0),
      status: project.status === 'completed' ? 'delivered' : normalizeSaleStatus(project.status),
      projectId,
      movedToOperationsAt: project.startDate ?? new Date().toISOString().slice(0, 10),
    };

    syntheticSales.push(syntheticSale);
    salesByOrderId.set(syntheticOrderId, syntheticSale);
  });

  const mergedSales = [...normalizedSales, ...syntheticSales]
    .map((sale, index) => ({
      ...sale,
      id: sale.id || `S${String(index + 1).padStart(3, '0')}`,
    }))
    .sort((left, right) => right.incomingDate.localeCompare(left.incomingDate));

  const mergedSalesByOrderId = new Map(mergedSales.map((sale) => [sale.orderId, sale]));
  const normalizedProjects = projectSource.map((project, index) =>
    normalizeProjectRecord(project, mergedSalesByOrderId, baseServices, baseTeams, index),
  );

  const linkedProjectIds = new Map(normalizedProjects.map((project) => [project.orderId, project.projectId]));
  const linkedSales = mergedSales.map((sale) => ({
    ...sale,
    projectId: sale.projectId || linkedProjectIds.get(sale.orderId) || null,
  }));

  const hydratedMembers = hydrateMembersFromLegacyProjects(baseMembers, normalizedProjects, baseServices, baseTeams);
  const syncedOrg = syncOrganizationStructure(baseServices, baseTeams, hydratedMembers, normalizedProjects, linkedSales);

  const currentUserFromMembers =
    syncedOrg.teamMembers.find((member) => member.id === rawData.currentUser.id) ??
    normalizeMemberRecord(rawData.currentUser, syncedOrg.services, syncedOrg.teams);

  return {
    ...rawData,
    currentUser: currentUserFromMembers,
    teamMembers: syncedOrg.teamMembers,
    services: syncedOrg.services,
    teams: syncedOrg.teams,
    sales: linkedSales,
    projects: normalizedProjects,
  };
}

export function validateNewOrderId(orderId: string, sales: Sale[], currentOrderId?: string) {
  const normalized = orderId.trim().toUpperCase();

  if (!normalized) {
    return 'Order ID is required.';
  }

  const duplicate = sales.some((sale) => sale.orderId === normalized && sale.orderId !== currentOrderId);

  if (duplicate) {
    return 'Order ID already exists.';
  }

  return null;
}

export function buildProjectFromSale(
  sale: Sale,
  assignment: {
    assignedService: string;
    assignedServiceId?: string | null;
    assignedTeam: string;
    assignedTeamId?: string | null;
    teamLeader: string;
    members: string[];
    startDate: string;
    status: Project['status'];
  },
  existingProjectIds: string[],
): Project {
  const projectId = generateSequentialId('P', existingProjectIds);

  return {
    id: projectId,
    projectId,
    orderId: sale.orderId,
    name: sale.projectName,
    projectName: sale.projectName,
    client: sale.clientName,
    clientName: sale.clientName,
    service: assignment.assignedService,
    serviceType: sale.serviceType,
    assignedService: assignment.assignedService,
    assignedServiceId: assignment.assignedServiceId ?? null,
    marketplace: sale.marketplace,
    assignedTeam: assignment.assignedTeam,
    assignedTeamId: assignment.assignedTeamId ?? null,
    teamLeader: assignment.teamLeader,
    members: assignment.members,
    startDate: assignment.startDate,
    deadline: sale.deliveryDeadline,
    deliveryDeadline: sale.deliveryDeadline,
    status: assignment.status,
    revenue: sale.revenueAmount,
    createdFromSaleId: sale.id,
    sourceModule: 'sales',
  };
}

export function createDerivedDeadlineNotifications(appData: AppDataState, now = new Date()) {
  const alerts: Notification[] = [];
  const alertThresholdMs = 3 * DAY_IN_MS;

  appData.sales.forEach((sale) => {
    const status = getSaleDisplayStatus(sale, now);
    const metrics = getDeadlineMetrics(sale.deliveryDeadline, now);

    if (status === 'late') {
      alerts.push(
        createNotification(
          'Sales order overdue',
          `${sale.orderId} for ${sale.clientName} is overdue and needs attention.`,
          'warning',
        ),
      );
      return;
    }

    if (status !== 'delivered' && metrics.remainingMs <= alertThresholdMs) {
      alerts.push(
        createNotification(
          'Sales deadline approaching',
          `${sale.orderId} is due ${formatDistanceToNowStrict(metrics.deadlineDate, { addSuffix: true })}.`,
          'info',
        ),
      );
    }
  });

  appData.projects.forEach((project) => {
    const status = getProjectDisplayStatus(project, now);
    const metrics = getDeadlineMetrics(project.deadline, now);

    if (status === 'late') {
      alerts.push(
        createNotification(
          'Project overdue',
          `${project.projectName} (${project.orderId}) missed its delivery deadline.`,
          'warning',
        ),
      );
      return;
    }

    if (status !== 'completed' && metrics.remainingMs <= alertThresholdMs) {
      alerts.push(
        createNotification(
          'Project deadline alert',
          `${project.projectName} is due ${formatDistanceToNowStrict(metrics.deadlineDate, { addSuffix: true })}.`,
          'info',
        ),
      );
    }
  });

  return alerts.slice(0, 8);
}

export function getMembersForTeam(teamId: string | null, members: User[]) {
  return members.filter((member) => member.teamId === teamId && member.status !== 'removed');
}

export function getMembersForService(serviceId: string | null, members: User[]) {
  return members.filter((member) => member.serviceId === serviceId && member.status !== 'removed');
}

export function getMemberProjectLinks(memberName: string, projects: Project[]) {
  return projects.filter(
    (project) => project.teamLeader === memberName || project.members.includes(memberName),
  );
}

export function upsertMemberAssignment(
  members: User[],
  memberUpdate: Partial<User> & Pick<User, 'id'>,
  services: Service[],
  teams: Team[],
) {
  const nextMembers = members.map((member) => {
    if (member.id !== memberUpdate.id) {
      return member;
    }

    const nextStatus = normalizeMemberStatus(memberUpdate.status ?? member.status);
    const nextRole = normalizeUserRole(memberUpdate.role ?? member.role);
    const linkedTeam =
      teams.find((team) => team.id === (memberUpdate.teamId ?? member.teamId)) ?? null;
    const linkedService =
      services.find((service) => service.id === (memberUpdate.serviceId ?? member.serviceId)) ??
      (linkedTeam ? services.find((service) => service.id === linkedTeam.serviceId) : null);
    const isGlobalAgm = nextRole === 'agm' && nextStatus !== 'removed';

    return {
      ...member,
      ...memberUpdate,
      role: nextRole,
      status: nextStatus,
      serviceId: isGlobalAgm ? null : nextStatus === 'removed' ? null : linkedService?.id ?? null,
      serviceName: isGlobalAgm
        ? GLOBAL_SERVICE_NAME
        : nextStatus === 'removed'
          ? null
          : linkedService?.name ?? null,
      teamId: isGlobalAgm ? null : nextStatus === 'removed' ? null : linkedTeam?.id ?? null,
      teamName: isGlobalAgm ? null : nextStatus === 'removed' ? null : linkedTeam?.name ?? null,
      lastMovedAt: new Date().toISOString().slice(0, 10),
    };
  });

  return nextMembers;
}
