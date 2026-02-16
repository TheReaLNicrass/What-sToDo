import React, { useState, useEffect } from 'react';
import { TodoCard, Priority, Status } from '../types';
import { useApp } from '../contexts/AppContext';
import { X, Calendar, Users, User, AlertCircle, CheckCircle } from 'lucide-react';

interface CardModalProps {
  card: TodoCard | null;
  parentId: string | null;
  onClose: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ card, parentId, onClose }) => {
  const { addCard, updateCard, currentRole, currentUserId } = useApp();
  const isEdit = !!card;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    assignees: '',
    createdBy: '',
    priority: 'medium' as Priority,
    status: 'idea' as Status,
  });

  useEffect(() => {
    if (card) {
      setFormData({
        title: card.title,
        description: card.description,
        deadline: card.deadline ? card.deadline.slice(0, 16) : '',
        assignees: card.assignees.join(', '),
        createdBy: card.createdBy,
        priority: card.priority,
        status: card.status,
      });
    }
  }, [card]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('Titel ist ein Pflichtfeld!');
      return;
    }

    const assigneesArray = formData.assignees
      .split(',')
      .map(a => a.trim())
      .filter(a => a.length > 0);

    if (isEdit && card) {
      updateCard(card.id, {
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline || null,
        assignees: assigneesArray,
        createdBy: formData.createdBy,
        priority: formData.priority,
        status: formData.status,
      });
    } else {
      addCard({
        title: formData.title,
        description: formData.description,
        completed: false,
        deadline: formData.deadline || null,
        assignees: assigneesArray,
        createdBy: formData.createdBy || 'Unbekannt',
        createdByRole: currentRole,
        ownerUserId: currentRole === 'mitarbeiter' ? currentUserId : null,
        priority: formData.priority,
        status: formData.status,
        parentId: parentId,
      });
    }

    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Karte bearbeiten' : 'Neue Karte erstellen'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Titel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Titel der Aufgabe..."
              required
            />
          </div>

          {/* Beschreibung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Beschreibung der Aufgabe..."
              rows={4}
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4" />
              Deadline
            </label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Assignees */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4" />
              Zugewiesen an (Komma-getrennt)
            </label>
            <input
              type="text"
              value={formData.assignees}
              onChange={(e) => setFormData({ ...formData, assignees: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="z.B. Maria Schmidt, Tom Weber"
            />
          </div>

          {/* Created By */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4" />
              Erstellt von
            </label>
            <input
              type="text"
              value={formData.createdBy}
              onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ihr Name..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <AlertCircle className="w-4 h-4" />
              Priorität
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="nice-to-have">Nice-to-have</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <CheckCircle className="w-4 h-4" />
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="idea">Idea</option>
              <option value="paused">Paused</option>
              <option value="in-progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-semibold"
            >
              {isEdit ? 'Speichern' : 'Erstellen'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors font-semibold"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
