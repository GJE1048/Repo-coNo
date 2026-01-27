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
  date: string; // ISO date string
  status: 'recording' | 'processing' | 'completed' | 'failed';
  createdAt: string; // ISO date string
}

export interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  activeDocuments: number;
  workspaceCount: number;
}
