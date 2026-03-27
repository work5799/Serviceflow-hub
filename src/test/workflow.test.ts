import { describe, expect, it } from 'vitest';
import { defaultAppData } from '@/data/mock';
import {
  getProjectDisplayStatus,
  normalizeAppData,
  validateNewOrderId,
} from '@/lib/workflow';

describe('workflow utilities', () => {
  it('migrates legacy direct projects into linked sales records', () => {
    const migrated = normalizeAppData({
      ...defaultAppData,
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
    expect(validateNewOrderId('FO-29481', defaultAppData.sales)).toBe('Order ID already exists.');
    expect(validateNewOrderId('FO-99999', defaultAppData.sales)).toBeNull();
  });

  it('marks overdue projects as late unless already completed', () => {
    const lateProject = {
      ...defaultAppData.projects[0],
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
});
