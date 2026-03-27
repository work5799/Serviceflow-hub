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
import type { AppDataState, Notification, Project, Sale, User } from '@/types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

export function getVisibleProjects(projects: Project[], currentUser: User) {
  if (currentUser.role !== 'team_member') {
    return projects;
  }

  return projects.filter((project) => project.members.includes(currentUser.name));
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

function normalizeProjectRecord(rawProject: Partial<Project>, salesByOrderId: Map<string, Sale>, index: number): Project {
  const orderId = rawProject.orderId?.trim();
  const linkedSale = orderId ? salesByOrderId.get(orderId) : undefined;
  const assignedService = (rawProject.assignedService ?? rawProject.service ?? linkedSale?.serviceType ?? 'General Service').trim();
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
    marketplace: rawProject.marketplace?.trim() || linkedSale?.marketplace || 'Direct',
    assignedTeam: rawProject.assignedTeam?.trim() || inferTeamName(assignedService),
    teamLeader: rawProject.teamLeader?.trim() || 'Unassigned',
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

export function normalizeAppData(rawData: AppDataState): AppDataState {
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
  const normalizedProjects = projectSource.map((project, index) => normalizeProjectRecord(project, mergedSalesByOrderId, index));

  const linkedProjectIds = new Map(normalizedProjects.map((project) => [project.orderId, project.projectId]));
  const linkedSales = mergedSales.map((sale) => ({
    ...sale,
    projectId: sale.projectId || linkedProjectIds.get(sale.orderId) || null,
  }));

  return {
    ...rawData,
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
    assignedTeam: string;
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
    marketplace: sale.marketplace,
    assignedTeam: assignment.assignedTeam,
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
