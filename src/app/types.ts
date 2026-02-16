// Typen für die Todo-Kartenverwaltung

export type Priority = 'critical' | 'high' | 'medium' | 'low' | 'nice-to-have';

export type Status = 'idea' | 'paused' | 'in-progress' | 'blocked' | 'done';

export type Role = 'admin' | 'mitarbeiter' | 'gast';

export interface TodoCard {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  deadline: string | null; // ISO Date String
  assignees: string[];
  createdBy: string;
  createdByRole: Role;
  ownerUserId: string | null; // Für Mitarbeiter-eigene Karten
  priority: Priority;
  status: Status;
  parentId: string | null; // null = Root-Ebene
  createdAt: string;
  updatedAt: string;
}

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  assignee: string;
  createdBy: string;
  status: Status | '';
  priorities: Priority[];
}

export type SortField = 'title' | 'deadline' | 'priority' | 'status';
export type SortDirection = 'asc' | 'desc';
