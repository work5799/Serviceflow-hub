import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, ROLE_COLORS, type UserRole } from '@/types';

const teamMembers = [
  { id: '1', name: 'Alex Morgan', email: 'alex@agency.com', role: 'developer' as UserRole },
  { id: '2', name: 'Sarah K.', email: 'sarah@agency.com', role: 'project_manager' as UserRole },
  { id: '3', name: 'David L.', email: 'david@agency.com', role: 'project_manager' as UserRole },
  { id: '4', name: 'Lisa M.', email: 'lisa@agency.com', role: 'team_leader' as UserRole },
  { id: '5', name: 'John D.', email: 'john@agency.com', role: 'team_member' as UserRole },
  { id: '6', name: 'Emma S.', email: 'emma@agency.com', role: 'team_member' as UserRole },
  { id: '7', name: 'Tom W.', email: 'tom@agency.com', role: 'team_member' as UserRole },
  { id: '8', name: 'Mike R.', email: 'mike@agency.com', role: 'team_member' as UserRole },
  { id: '9', name: 'Anna B.', email: 'anna@agency.com', role: 'agm' as UserRole },
  { id: '10', name: 'Chris P.', email: 'chris@agency.com', role: 'team_member' as UserRole },
];

const Team = () => {
  return (
    <DashboardLayout title="Team">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {teamMembers.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            className="glass rounded-xl p-5 hover:scale-[1.02] transition-transform duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              </div>
            </div>
            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[member.role])}>
              {ROLE_LABELS[member.role]}
            </span>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Team;
