export interface HealthStatus { status: string; }

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  totalSpent: number;
  visitCount: number;
  lastPurchaseDate?: string | null;
  createdAt: string;
}

export interface CampaignStats {
  campaignId: number;
  totalSent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
}

export interface CampaignWithStats {
  id: number;
  name: string;
  segmentQuery: string;
  message: string;
  channel: string;
  status: string;
  createdAt: string;
  sentByAi: boolean;
  stats?: CampaignStats;
}

export interface StatsOverview {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  totalCampaigns: number;
  deliveryRate: number;
  recentCampaigns?: CampaignWithStats[];
}

export interface SegmentPreview {
  count: number;
  sample: Customer[];
}

export interface Campaign {
  id: number;
  name: string;
  segmentQuery: string;
  message: string;
  channel: string;
  status: string;
  createdAt: string;
  sentByAi: boolean;
}

export interface CampaignInput {
  name: string;
  segmentQuery: string;
  message: string;
  channel: string;
  sentByAi?: boolean;
}

export interface SendResult {
  message: string;
  queued: number;
}

export interface AiChatMessage {
  role: string;
  content: string;
}

export interface AiReply {
  reply: string;
  action?: string | null;
  segmentQuery?: string | null;
  messageDraft?: string | null;
  channel?: string | null;
}
