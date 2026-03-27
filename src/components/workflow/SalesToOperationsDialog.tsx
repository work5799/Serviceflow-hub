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
import type { Project, Sale, Service, Team, User } from '@/types';

interface SalesToOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  services: Service[];
  teams: Team[];
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
  teams,
  teamMembers,
  existingProjectIds,
  onSubmit,
}: SalesToOperationsDialogProps) {
  const activeServices = useMemo(() => services.filter((service) => service.isActive), [services]);
  const activeMembers = useMemo(
    () => teamMembers.filter((member) => member.status === 'active'),
    [teamMembers],
  );

  const [assignedServiceId, setAssignedServiceId] = useState('');
  const [assignedTeamId, setAssignedTeamId] = useState('none');
  const [teamLeader, setTeamLeader] = useState('Unassigned');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [status, setStatus] = useState<Project['status']>('pending');

  const activeTeams = useMemo(
    () => teams.filter((team) => team.isActive && team.serviceId === assignedServiceId),
    [assignedServiceId, teams],
  );

  const activeService = activeServices.find((service) => service.id === assignedServiceId);
  const chosenTeam = activeTeams.find((team) => team.id === assignedTeamId);

  const leaders = useMemo(
    () =>
      activeMembers.filter((member) => {
        if (!leaderRoles.has(member.role)) {
          return false;
        }

        if (member.serviceId !== assignedServiceId) {
          return false;
        }

        if (assignedTeamId === 'none') {
          return true;
        }

        return member.teamId === assignedTeamId || member.role === 'project_manager';
      }),
    [activeMembers, assignedServiceId, assignedTeamId],
  );

  const selectableMembers = useMemo(
    () =>
      activeMembers.filter((member) => {
        if (!['team_member', 'call_leader', 'team_leader'].includes(member.role)) {
          return false;
        }

        if (member.serviceId !== assignedServiceId) {
          return false;
        }

        if (assignedTeamId === 'none') {
          return true;
        }

        return member.teamId === assignedTeamId;
      }),
    [activeMembers, assignedServiceId, assignedTeamId],
  );

  useEffect(() => {
    if (!sale) {
      return;
    }

    const initialService =
      activeServices.find((service) => service.name === sale.serviceType) ?? activeServices[0];

    if (!initialService) {
      return;
    }

    const initialTeam = teams.find(
      (team) => team.serviceId === initialService.id && team.isActive,
    );

    const nextLeader =
      activeMembers.find(
        (member) =>
          member.status === 'active' &&
          member.serviceId === initialService.id &&
          leaderRoles.has(member.role) &&
          (!initialTeam || member.teamId === initialTeam.id || member.role === 'project_manager'),
      )?.name ?? 'Unassigned';

    const nextMembers = activeMembers
      .filter(
        (member) =>
          member.status === 'active' &&
          member.serviceId === initialService.id &&
          (!initialTeam || member.teamId === initialTeam.id) &&
          ['team_member', 'call_leader'].includes(member.role),
      )
      .slice(0, 2)
      .map((member) => member.name);

    setAssignedServiceId(initialService.id);
    setAssignedTeamId(initialTeam?.id ?? 'none');
    setTeamLeader(nextLeader);
    setSelectedMembers(nextMembers);
    setStartDate(sale.incomingDate);
    setStatus(sale.status === 'in_progress' ? 'in_progress' : 'pending');
  }, [activeMembers, activeServices, sale, teams]);

  useEffect(() => {
    if (!activeTeams.find((team) => team.id === assignedTeamId)) {
      setAssignedTeamId(activeTeams[0]?.id ?? 'none');
    }
  }, [activeTeams, assignedTeamId]);

  useEffect(() => {
    if (!leaders.find((leader) => leader.name === teamLeader)) {
      setTeamLeader(leaders[0]?.name ?? 'Unassigned');
    }
  }, [leaders, teamLeader]);

  useEffect(() => {
    setSelectedMembers((prev) =>
      prev.filter((memberName) => selectableMembers.some((member) => member.name === memberName)),
    );
  }, [selectableMembers]);

  function toggleMember(memberName: string, checked: boolean) {
    setSelectedMembers((prev) =>
      checked ? Array.from(new Set([...prev, memberName])) : prev.filter((value) => value !== memberName),
    );
  }

  function handleSubmit() {
    if (!sale || !activeService) {
      return;
    }

    onSubmit(
      buildProjectFromSale(
        sale,
        {
          assignedService: activeService.name,
          assignedServiceId: activeService.id,
          assignedTeam: chosenTeam?.name ?? `${activeService.name} Service Pool`,
          assignedTeamId: chosenTeam?.id ?? null,
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
            Convert the sales order into an operations project with service, team, and member assignment.
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
                  value={assignedServiceId}
                  onChange={(event) => setAssignedServiceId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {activeServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Assigned Team</span>
                <select
                  value={assignedTeamId}
                  onChange={(event) => setAssignedTeamId(event.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="none">Service Only (No Team)</option>
                  {activeTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm">
                <span className="text-muted-foreground">Team Leader</span>
                <select
                  value={teamLeader}
                  onChange={(event) => setTeamLeader(event.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {(leaders.length ? leaders : [{ id: 'none', name: 'Unassigned' }]).map((leader) => (
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
                {selectableMembers.length > 0 ? (
                  selectableMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={selectedMembers.includes(member.name)}
                        onCheckedChange={(checked) => toggleMember(member.name, checked === true)}
                      />
                      <span className="text-foreground">{member.name}</span>
                      <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                        {member.role.replace('_', ' ')}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-secondary/20 px-3 py-4 text-sm text-muted-foreground">
                    No active members available for this service/team.
                  </div>
                )}
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
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!sale || !activeService || !startDate}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Confirm Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
