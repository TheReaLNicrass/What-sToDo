import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TodoCard, Role, FilterState, SortField, SortDirection, Priority, Status } from '../types';
import { storage } from '../utils/storage';

interface AppContextType {
  cards: TodoCard[];
  currentRole: Role;
  currentUserId: string;
  filter: FilterState;
  sortField: SortField;
  sortDirection: SortDirection;
  
  // Actions
  addCard: (card: Omit<TodoCard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCard: (id: string, updates: Partial<TodoCard>) => void;
  deleteCard: (id: string) => void;
  toggleComplete: (id: string) => void;
  setRole: (role: Role) => void;
  setFilter: (filter: Partial<FilterState>) => void;
  resetFilters: () => void;
  setSort: (field: SortField, direction: SortDirection) => void;
  resetData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialFilter: FilterState = {
  dateFrom: '',
  dateTo: '',
  assignee: '',
  createdBy: '',
  status: '',
  priorities: [],
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cards, setCards] = useState<TodoCard[]>([]);
  const [currentRole, setCurrentRole] = useState<Role>('mitarbeiter');
  const [currentUserId] = useState<string>(storage.loadUserId());
  const [filter, setFilterState] = useState<FilterState>(initialFilter);
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Initial laden
  useEffect(() => {
    const loadedCards = storage.loadCards();
    const loadedRole = storage.loadRole();
    setCards(loadedCards);
    setCurrentRole(loadedRole);
  }, []);

  // Bei Änderungen speichern
  useEffect(() => {
    if (cards.length > 0) {
      storage.saveCards(cards);
    }
  }, [cards]);

  const addCard = (cardData: Omit<TodoCard, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCard: TodoCard = {
      ...cardData,
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCards([...cards, newCard]);
  };

  const updateCard = (id: string, updates: Partial<TodoCard>) => {
    setCards(cards.map(card => 
      card.id === id 
        ? { ...card, ...updates, updatedAt: new Date().toISOString() }
        : card
    ));
  };

  const deleteCard = (id: string) => {
    // Rekursiv alle Unterkarten löschen
    const deleteRecursive = (parentId: string): string[] => {
      const children = cards.filter(c => c.parentId === parentId);
      const childIds = children.map(c => c.id);
      const grandChildIds = childIds.flatMap(childId => deleteRecursive(childId));
      return [parentId, ...childIds, ...grandChildIds];
    };

    const idsToDelete = deleteRecursive(id);
    setCards(cards.filter(card => !idsToDelete.includes(card.id)));
  };

  const toggleComplete = (id: string) => {
    setCards(cards.map(card => 
      card.id === id 
        ? { 
            ...card, 
            completed: !card.completed,
            status: !card.completed ? 'done' : card.status === 'done' ? 'in-progress' : card.status,
            updatedAt: new Date().toISOString() 
          }
        : card
    ));
  };

  const setRole = (role: Role) => {
    setCurrentRole(role);
    storage.saveRole(role);
  };

  const setFilter = (newFilter: Partial<FilterState>) => {
    setFilterState({ ...filter, ...newFilter });
  };

  const resetFilters = () => {
    setFilterState(initialFilter);
  };

  const setSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const resetData = () => {
    storage.resetAll();
    setCards(storage.loadCards());
    setFilterState(initialFilter);
  };

  return (
    <AppContext.Provider
      value={{
        cards,
        currentRole,
        currentUserId,
        filter,
        sortField,
        sortDirection,
        addCard,
        updateCard,
        deleteCard,
        toggleComplete,
        setRole,
        setFilter,
        resetFilters,
        setSort,
        resetData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
