import { AlertTriangle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeCountdown, getDeadlineMetrics, getRemainingDaysLabel } from '@/lib/workflow';

interface DeadlineIndicatorProps {
  deadline: string;
  now: Date;
  compact?: boolean;
}

export function DeadlineIndicator({ deadline, now, compact = false }: DeadlineIndicatorProps) {
  const metrics = getDeadlineMetrics(deadline, now);

  return (
    <div className={cn('flex items-start gap-2', compact && 'gap-1.5')}>
      {metrics.isOverdue ? (
        <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
      ) : (
        <Clock3 className="w-4 h-4 mt-0.5 text-info shrink-0" />
      )}
      <div className="min-w-0">
        <p className={cn('text-xs font-medium', metrics.isOverdue ? 'text-destructive' : 'text-foreground')}>
          {getRemainingDaysLabel(deadline, now)}
        </p>
        <p className="text-[11px] text-muted-foreground">{formatRelativeCountdown(deadline, now)}</p>
      </div>
    </div>
  );
}
