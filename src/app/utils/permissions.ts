import { TodoCard, Role } from '../types';

export const permissions = {
  canEdit: (card: TodoCard, currentRole: Role, currentUserId: string): boolean => {
    if (currentRole === 'admin') return true;
    if (currentRole === 'gast') return false;
    
    // Mitarbeiter kann eigene Karten bearbeiten
    if (currentRole === 'mitarbeiter') {
      return card.createdByRole === 'mitarbeiter' && card.ownerUserId === currentUserId;
    }
    
    return false;
  },

  canDelete: (card: TodoCard, currentRole: Role, currentUserId: string): boolean => {
    if (currentRole === 'admin') return true;
    if (currentRole === 'gast') return false;
    
    // Mitarbeiter kann nur eigene Karten löschen
    if (currentRole === 'mitarbeiter') {
      return card.createdByRole === 'mitarbeiter' && card.ownerUserId === currentUserId;
    }
    
    return false;
  },

  canComplete: (currentRole: Role): boolean => {
    // Alle außer Gast können Karten abhaken
    return currentRole !== 'gast';
  },

  canCreate: (currentRole: Role): boolean => {
    // Admin und Mitarbeiter können Karten erstellen
    return currentRole === 'admin' || currentRole === 'mitarbeiter';
  },
};
