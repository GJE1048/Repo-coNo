export interface User {
  id: string;
  username: string;
  clerkId: string;
  imageUrl: string;
  createdAt: string; // ISO date string
}

export interface Document {
  id: string;
  title: string;
  ownerId: string;
  workspaceId?: string | null;
  isArchived: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface AIShorthandRecord {
  id: string;
  userId: string;
  title: string;
  date: string | Date; // ISO date string
  duration: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  audioUrl?: string | null;
  transcript?: string | null;
  summary?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  user?: {
    id: string | null;
    username: string | null;
    clerkId: string | null;
  } | null;
}

export interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  activeDocuments: number;
  workspaceCount: number;
}
