import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { buildProjectFromSale } from '@/lib/workflow';
import type { Project, Sale, Service, User } from '@/types';

interface SalesToOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  services: Service[];
  teamMembers: User[];
  existingProjectIds: string[];
  onSubmit: (project: Project) => void;
}

const leaderRoles = new Set(['developer', 'agm', 'project_manager', 'team_leader']);

export function SalesToOperationsDialog({
  open,
  onOpenChange,
  sale,
  services,
  teamMembers,
  existingProjectIds,
  onSubmit,
}: SalesToOperationsDialogProps) {
  const leaders = useMemo(
    () => teamMembers.filter((member) => leaderRoles.has(member.role)),
    [teamMembers],
  );

  const members = useMemo(
    () => teamMembers.filter((member) => member.role === 'team_member'),
    [teamMembers],
  );

  const defaultLeader = leaders[0]?.name ?? 'Unassigned';
  const defaultMembers = members.slice(0, 2).map((member) => member.name);

  const [assignedService, setAssignedService] = useState('');
  const [assignedTeam, setAssignedTeam] = useState('');
  const [teamLeader, setTeamLeader] = useState(defaultLeader);
  const [selectedMembers, setSelectedMembers] = useState<string[]>(defaultMembers);
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState<Project['status']>('pending');

  useEffect(() => {
    if (!sale) {
      return;
    }

    const initialService = sale.serviceType;
    setAssignedService(initialService);
    setAssignedTeam(`${initialService} Team`);
    setTeamLeader(defaultLeader);
    setSelectedMembers(defaultMembers);
    setStartDate(sale.incomingDate);
    setStatus(sale.status === 'in_progress' ? 'in_progress' : 'pending');
  }, [defaultLeader, defaultMembers, sale]);

  function toggleMember(memberName: string, checked: boolean) {
    setSelectedMembers((prev) =>
      checked ? Array.from(new Set([...prev, memberName])) : prev.filter((value) => value !== memberName),
    );
  }

  function handleSubmit() {
    if (!sale) {
      return;
    }

    onSubmit(
      buildProjectFromSale(
        sale,
        {
          assignedService,
          assignedTeam,
          teamLeader,
          members: selectedMembers,
          startDate,
          status,
        },
        existingProjectIds,
      ),
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Move to Operations</DialogTitle>
          <DialogDescription>
            Convert the sales order into an operations project with team assignment and timeline ownership.
          </DialogDescription>
        </DialogHeader>

        {sale ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-xl border border-border bg-secondary/30 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="mt-1 font-mono text-sm text-foreground">{sale.orderId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="mt-1 text-sm text-foreground">{sale.clientName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Project</p>
                <p className="mt-1 text-sm text-foreground">{sale.projectName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deadline</p>
                <p className="mt-1 text-sm text-foreground">{sale.deliveryDeadline}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Assigned Service</span>
                <select
                  value={assignedService}
                  onChange={(event) => setAssignedService(event.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {[sale.serviceType, ...services.map((service) => service.name)]
                    .filter((value, index, array) => array.indexOf(value) === index)
                    .map((serviceName) => (
                      <option key={serviceName} value={serviceName}>
                        {serviceName}
                      </option>
                    ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Assigned Team</span>
                <input
                  value={assignedTeam}
                  onChange={(event) => setAssignedTeam(event.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Design Pod"
                />
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Team Leader</span>
                <select
                  value={teamLeader}
                  onChange={(event) => setTeamLeader(event.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {leaders.map((leader) => (
                    <option key={leader.id} value={leader.name}>
                      {leader.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Members</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {members.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.name)}
                      onCheckedChange={(checked) => toggleMember(member.name, checked === true)}
                    />
                    <span className="text-foreground">{member.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Initial Project Status</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['pending', 'Pending'],
                  ['in_progress', 'In Progress'],
                  ['completed', 'Completed'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value as Project['status'])}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      status === value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!sale || !assignedService || !assignedTeam || !startDate}>
            <ArrowRightLeft className="w-4 h-4" />
            Confirm Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
