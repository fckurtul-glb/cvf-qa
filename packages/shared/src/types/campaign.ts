// ── Campaign Types ──
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';

export interface Campaign {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  moduleConfig: import('./survey').ModuleCode[];
  targetGroups: import('./auth').StakeholderGroup[];
  startedAt: Date | null;
  closesAt: Date | null;
  createdBy: string;
  reminderSchedule: ReminderConfig;
}

export interface CampaignStats {
  totalInvited: number;
  totalStarted: number;
  totalCompleted: number;
  responseRate: number;
  avgCompletionTime: number;
}

export interface ReminderConfig {
  enabled: boolean;
  intervalDays: number;
  maxReminders: number;
  channels: ('email' | 'sms')[];
}
