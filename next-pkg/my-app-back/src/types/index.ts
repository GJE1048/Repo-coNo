// This file defines TypeScript types used throughout the application.

export interface User {
  id: string;
  username: string;
  clerkId: string;
  imageUrl: string;
  createdAt: string;
}

export interface Document {
  id: string;
  title: string;
  ownerId: string;
  workspaceId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIShorthandRecord {
  id: string;
  userId: string;
  title: string;
  date: string;
  status: 'completed' | 'processing';
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  activeDocuments: number;
  workspaceCount: number;
}