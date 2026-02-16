import { TodoCard, Role } from '../types';
import { seedData } from './seedData';

const STORAGE_KEY = 'todo-cards-data';
const ROLE_KEY = 'user-role';
const USER_ID_KEY = 'user-id';

export const storage = {
  // Karten speichern und laden
  saveCards: (cards: TodoCard[]): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (error) {
      console.error('Error saving cards:', error);
    }
  },

  loadCards: (): TodoCard[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // Beim ersten Start: Seed-Daten laden
      storage.saveCards(seedData);
      return seedData;
    } catch (error) {
      console.error('Error loading cards:', error);
      return seedData;
    }
  },

  // Rolle speichern und laden
  saveRole: (role: Role): void => {
    localStorage.setItem(ROLE_KEY, role);
  },

  loadRole: (): Role => {
    const stored = localStorage.getItem(ROLE_KEY);
    return (stored as Role) || 'mitarbeiter'; // Default: Mitarbeiter
  },

  // User ID
  loadUserId: (): string => {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user-${Date.now()}`;
      localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  },

  // Alles zurücksetzen
  resetAll: (): void => {
    storage.saveCards(seedData);
  },
};
