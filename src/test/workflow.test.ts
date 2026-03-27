import { describe, expect, it } from 'vitest';
import { demoAppData } from '@/data/mock';
import {
  getProjectDisplayStatus,
  normalizeAppData,
  upsertMemberAssignment,
  validateNewOrderId,
} from '@/lib/workflow';

describe('workflow utilities', () => {
  it('migrates legacy direct projects into linked sales records', () => {
    const migrated = normalizeAppData({
      ...demoAppData,
      sales: [],
      projects: [
        {
          id: 'P900',
          projectId: 'P900',
          orderId: '',
          name: 'Legacy Website',
          projectName: 'Legacy Website',
          client: 'Legacy Client',
          clientName: 'Legacy Client',
          service: 'WordPress Development',
          serviceType: 'WordPress Development',
          assignedService: 'WordPress Development',
          marketplace: 'Direct',
          assignedTeam: 'WordPress Team',
          teamLeader: 'Sarah K.',
          members: ['John D.'],
          startDate: '2026-03-10',
          deadline: '2026-03-20',
          deliveryDeadline: '2026-03-20',
          status: 'in_progress',
          revenue: 1000,
          createdFromSaleId: null,
          sourceModule: 'sales',
        },
      ],
    });

    expect(migrated.sales).toHaveLength(1);
    expect(migrated.sales[0].orderId).toContain('LEGACY-P900');
    expect(migrated.projects[0].orderId).toBe(migrated.sales[0].orderId);
  });

  it('blocks duplicate order ids', () => {
    expect(validateNewOrderId('FO-29481', demoAppData.sales)).toBe('Order ID already exists.');
    expect(validateNewOrderId('FO-99999', demoAppData.sales)).toBeNull();
  });

  it('marks overdue projects as late unless already completed', () => {
    const lateProject = {
      ...demoAppData.projects[0],
      deadline: '2026-03-20',
      deliveryDeadline: '2026-03-20',
      status: 'in_progress' as const,
    };

    const completedProject = {
      ...lateProject,
      status: 'completed' as const,
    };

    expect(getProjectDisplayStatus(lateProject, new Date('2026-03-27T12:00:00Z'))).toBe('late');
    expect(getProjectDisplayStatus(completedProject, new Date('2026-03-27T12:00:00Z'))).toBe('completed');
  });

  it('moves a member to a new team without duplicate membership', () => {
    const movedMembers = upsertMemberAssignment(
      demoAppData.teamMembers,
      {
        id: '5',
        serviceId: 'SV2',
        teamId: 'T003',
        role: 'team_member',
        status: 'active',
      },
      demoAppData.services,
      demoAppData.teams,
    );

    const movedMember = movedMembers.find((member) => member.id === '5');
    expect(movedMember?.serviceId).toBe('SV2');
    expect(movedMember?.teamId).toBe('T003');
    expect(movedMember?.teamName).toBe('Shopify Team A');
  });
});
