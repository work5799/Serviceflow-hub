import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Download, Plus, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SalesToOperationsDialog } from '@/components/workflow/SalesToOperationsDialog';
import { DeadlineIndicator } from '@/components/workflow/DeadlineIndicator';
import { toast } from '@/components/ui/sonner';
import { useNow } from '@/hooks/use-now';
import { cn } from '@/lib/utils';
import {
  createNotification,
  generateSequentialId,
  getRemainingDaysLabel,
  getSaleDisplayStatus,
  validateNewOrderId,
} from '@/lib/workflow';
import { useAppData } from '@/context/AppDataContext';
import type { Project, Sale } from '@/types';

const statusStyles = {
  pending: 'bg-warning/10 text-warning',
  in_progress: 'bg-info/10 text-info',
  delivered: 'bg-success/10 text-success',
  late: 'bg-destructive/10 text-destructive',
  refunded: 'bg-muted text-muted-foreground',
} as const;

const initialForm = {
  orderId: '',
  projectName: '',
  clientName: '',
  serviceType: '',
  marketplace: 'Fiverr',
  incomingDate: new Date().toISOString().slice(0, 10),
  deliveryDeadline: '',
  revenueAmount: '',
};

const Sales = () => {
  const { appData, replaceSection } = useAppData();
  const now = useNow(1000);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Sale['status']>('all');
  const [formState, setFormState] = useState(initialForm);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const salesWithStatus = useMemo(
    () =>
      appData.sales.map((sale) => ({
        ...sale,
        displayStatus: getSaleDisplayStatus(sale, now),
      })),
    [appData.sales, now],
  );

  const filtered = salesWithStatus.filter((sale) => {
    const searchValue = search.toLowerCase();
    const matchesSearch =
      sale.orderId.toLowerCase().includes(searchValue) ||
      sale.projectName.toLowerCase().includes(searchValue) ||
      sale.clientName.toLowerCase().includes(searchValue) ||
      sale.serviceType.toLowerCase().includes(searchValue) ||
      sale.marketplace.toLowerCase().includes(searchValue);

    const matchesStatus = statusFilter === 'all' || sale.displayStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const revenueTotal = appData.sales
    .filter((sale) => sale.status !== 'refunded')
    .reduce((sum, sale) => sum + sale.revenueAmount, 0);
  const lateOrders = salesWithStatus.filter((sale) => sale.displayStatus === 'late').length;
  const readyForOperations = appData.sales.filter((sale) => !sale.projectId).length;

  async function appendNotifications(messages: ReturnType<typeof createNotification>[]) {
    await replaceSection('notifications', [...messages, ...appData.notifications]);
  }

  async function handleCreateSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const duplicateError = validateNewOrderId(formState.orderId, appData.sales);
    if (duplicateError) {
      toast.error(duplicateError);
      return;
    }

    if (
      !formState.projectName ||
      !formState.clientName ||
      !formState.serviceType ||
      !formState.marketplace ||
      !formState.incomingDate ||
      !formState.deliveryDeadline ||
      !formState.revenueAmount
    ) {
      toast.error('Complete all required sales fields before saving.');
      return;
    }

    const saleId = generateSequentialId('S', appData.sales.map((sale) => sale.id));
    const newSale: Sale = {
      id: saleId,
      orderId: formState.orderId.trim().toUpperCase(),
      projectName: formState.projectName.trim(),
      clientName: formState.clientName.trim(),
      serviceType: formState.serviceType.trim(),
      service: formState.serviceType.trim(),
      marketplace: formState.marketplace.trim(),
      incomingDate: formState.incomingDate,
      date: formState.incomingDate,
      deliveryDeadline: formState.deliveryDeadline,
      revenueAmount: Number(formState.revenueAmount),
      amount: Number(formState.revenueAmount),
      status: 'pending',
      projectId: null,
      movedToOperationsAt: null,
    };

    await Promise.all([
      replaceSection('sales', [newSale, ...appData.sales]),
      appendNotifications([
        createNotification(
          'New sales order created',
          `${newSale.orderId} for ${newSale.clientName} has been added to Sales.`,
          'success',
        ),
      ]),
    ]);

    toast.success('Sales order created successfully.');
    setFormState(initialForm);
  }

  function openMoveDialog(sale: Sale) {
    if (sale.projectId) {
      toast.info(`Order ${sale.orderId} is already linked to project ${sale.projectId}.`);
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
      appendNotifications([
        createNotification(
          'Moved to Operations',
          `${selectedSale.orderId} is now active as project ${project.projectId}.`,
          'success',
        ),
      ]),
    ]);

    toast.success(`Order ${selectedSale.orderId} moved to Operations.`);
    setDialogOpen(false);
    setSelectedSale(null);
  }

  const exportSales = () => {
    const headers = [
      'Order ID',
      'Project Name',
      'Client Name',
      'Service Type',
      'Marketplace/Profile',
      'Incoming Date',
      'Delivery Deadline',
      'Timeline',
      'Status',
      'Revenue Amount',
      'Project ID',
    ];

    const rows = filtered.map((sale) => [
      sale.orderId,
      sale.projectName,
      sale.clientName,
      sale.serviceType,
      sale.marketplace,
      sale.incomingDate,
      sale.deliveryDeadline,
      getRemainingDaysLabel(sale.deliveryDeadline, now),
      sale.displayStatus,
      sale.revenueAmount,
      sale.projectId ?? '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'serviceflow-sales-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Sales orders exported successfully.');
  };

  return (
    <DashboardLayout title="Sales">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{appData.sales.length}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Revenue Summary</p>
            <p className="mt-1 text-2xl font-bold text-foreground">${revenueTotal.toLocaleString()}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Ready for Operations</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{readyForOperations}</p>
          </div>
          <div className="glass rounded-xl p-5">
            <p className="text-sm text-muted-foreground">Late Orders</p>
            <p className="mt-1 text-2xl font-bold text-destructive">{lateOrders}</p>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreateSale}
          className="glass rounded-xl p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">New Sales Order</h2>
              <p className="text-sm text-muted-foreground">
                Every project must begin here. Order IDs are validated before anything can move into Operations.
              </p>
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Save Order
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ['Order ID', 'orderId', 'FO-30021', 'text'],
              ['Project Name', 'projectName', 'Website Refresh', 'text'],
              ['Client Name', 'clientName', 'Acme Co.', 'text'],
              ['Service Type', 'serviceType', 'WordPress Development', 'text'],
              ['Marketplace/Profile', 'marketplace', 'Fiverr', 'text'],
              ['Incoming Date', 'incomingDate', '', 'date'],
              ['Delivery Deadline', 'deliveryDeadline', '', 'date'],
              ['Revenue Amount', 'revenueAmount', '2500', 'number'],
            ].map(([label, key, placeholder, type]) => (
              <label key={key} className="space-y-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <input
                  type={type}
                  required
                  value={formState[key as keyof typeof formState]}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      [key]: event.target.value,
                    }))
                  }
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            ))}
          </div>
        </motion.form>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by order, client, service..."
                className="w-full rounded-lg bg-secondary py-2 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'All'],
                ['pending', 'Pending'],
                ['in_progress', 'In Progress'],
                ['delivered', 'Delivered'],
                ['late', 'Late'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value as 'all' | Sale['status'])}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                    statusFilter === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-muted"
            onClick={exportSales}
            type="button"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Order</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Client</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">Service</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Timeline</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale, index) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border last:border-0 transition-colors hover:bg-secondary/50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-mono text-xs text-foreground">{sale.orderId}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{sale.projectName}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.marketplace} • {sale.incomingDate}
                      </p>
                    </td>
                    <td className="hidden px-5 py-4 lg:table-cell">
                      <p className="text-sm text-foreground">{sale.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.projectId ? `Project ${sale.projectId}` : 'Waiting for Operations'}
                      </p>
                    </td>
                    <td className="hidden px-5 py-4 xl:table-cell text-muted-foreground">{sale.serviceType}</td>
                    <td className="px-5 py-4">
                      <DeadlineIndicator deadline={sale.deliveryDeadline} now={now} />
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', statusStyles[sale.displayStatus])}>
                        {sale.displayStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-foreground">
                      ${sale.revenueAmount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openMoveDialog(sale)}
                        disabled={Boolean(sale.projectId)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                          sale.projectId
                            ? 'bg-secondary text-muted-foreground'
                            : 'bg-primary/10 text-primary hover:bg-primary/20',
                        )}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        {sale.projectId ? 'In Operations' : 'Move to Operations'}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

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

export default Sales;
