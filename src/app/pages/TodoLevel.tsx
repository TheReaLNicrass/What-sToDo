import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp } from '../contexts/AppContext';
import { permissions } from '../utils/permissions';
import { TodoCard, Priority } from '../types';
import { Breadcrumb } from '../components/Breadcrumb';
import { TodoCardComponent } from '../components/TodoCard';
import { CardModal } from '../components/CardModal';
import { Plus, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

const priorityOrder: Record<Priority, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  'nice-to-have': 1,
};

export const TodoLevel: React.FC = () => {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const {
    cards,
    currentRole,
    currentUserId,
    filter,
    sortField,
    sortDirection,
  } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<TodoCard | null>(null);
  const [showFinished, setShowFinished] = useState(true);

  const currentCard = cardId ? cards.find(c => c.id === cardId) : null;
  const canCreate = permissions.canCreate(currentRole);

  // Filtere Karten für diese Ebene
  const levelCards = cards.filter(c => c.parentId === (cardId || null));

  // Filter anwenden
  const filteredCards = useMemo(() => {
    return levelCards.filter(card => {
      // Deadline Filter
      if (filter.dateFrom && card.deadline) {
        if (new Date(card.deadline) < new Date(filter.dateFrom)) return false;
      }
      if (filter.dateTo && card.deadline) {
        if (new Date(card.deadline) > new Date(filter.dateTo)) return false;
      }

      // Assignee Filter
      if (filter.assignee) {
        const assigneeMatch = card.assignees.some(a =>
          a.toLowerCase().includes(filter.assignee.toLowerCase())
        );
        if (!assigneeMatch) return false;
      }

      // Created By Filter
      if (filter.createdBy) {
        if (!card.createdBy.toLowerCase().includes(filter.createdBy.toLowerCase())) {
          return false;
        }
      }

      // Status Filter
      if (filter.status && card.status !== filter.status) {
        return false;
      }

      // Priority Filter
      if (filter.priorities.length > 0) {
        if (!filter.priorities.includes(card.priority)) {
          return false;
        }
      }

      return true;
    });
  }, [levelCards, filter]);

  // Sortierung anwenden
  const sortedCards = useMemo(() => {
    const sorted = [...filteredCards];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'deadline':
          if (!a.deadline && !b.deadline) comparison = 0;
          else if (!a.deadline) comparison = 1;
          else if (!b.deadline) comparison = -1;
          else comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
        case 'priority':
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredCards, sortField, sortDirection]);

  // Aufteilen in aktiv und erledigt
  const activeCards = sortedCards.filter(c => !c.completed);
  const completedCards = sortedCards.filter(c => c.completed);

  // Prüfe ob Karte Unterkarten hat
  const hasChildren = (cardId: string): boolean => {
    return cards.some(c => c.parentId === cardId);
  };

  const handleOpenModal = (card?: TodoCard) => {
    if (card) {
      setEditingCard(card);
    } else {
      setEditingCard(null);
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCard(null);
  };

  const handleBack = () => {
    if (currentCard && currentCard.parentId) {
      navigate(`/todo/${currentCard.parentId}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-3">
        <Breadcrumb />
        
        <div className="flex items-center gap-3">
          {cardId && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zurück</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Neue Karte</span>
            </button>
          )}
        </div>
      </div>

      {/* Karten Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Aktive Karten */}
        {activeCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {activeCards.map(card => (
              <TodoCardComponent
                key={card.id}
                card={card}
                onEdit={handleOpenModal}
                hasChildren={hasChildren(card.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {filteredCards.length === 0 && levelCards.length > 0 ? (
              <p>Keine Karten entsprechen den aktiven Filtern.</p>
            ) : (
              <p>Noch keine Karten auf dieser Ebene. Erstellen Sie eine neue Karte!</p>
            )}
          </div>
        )}

        {/* Finish Area */}
        {completedCards.length > 0 && (
          <div className="mt-8 border-t-2 border-gray-300 pt-6">
            <button
              onClick={() => setShowFinished(!showFinished)}
              className="flex items-center gap-2 text-lg font-semibold text-gray-700 hover:text-gray-900 mb-4"
            >
              {showFinished ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
              <span>Erledigte Aufgaben ({completedCards.length})</span>
            </button>

            {showFinished && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedCards.map(card => (
                  <TodoCardComponent
                    key={card.id}
                    card={card}
                    onEdit={handleOpenModal}
                    hasChildren={hasChildren(card.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <CardModal
          card={editingCard}
          parentId={cardId || null}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
