import { UserRole, Client, SatStatus, Message } from './types';

// Mock data has been removed and the application now connects to the Supabase database.
export const ADMIN_USERS: Record<string, { role: UserRole; isActive: boolean; password?: string; }> = {};
export const MOCK_CLIENTS: Client[] = [];
export const MOCK_MESSAGES: Message[] = [];
