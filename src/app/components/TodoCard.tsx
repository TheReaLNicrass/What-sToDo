import React from 'react';
import { Link } from 'react-router';
import { TodoCard, Priority, Status } from '../types';
import { useApp } from '../contexts/AppContext';
import { permissions } from '../utils/permissions';
import {
  Calendar,
  Users,
  User,
  Trash2,
  Edit,
  FolderOpen,
  AlertCircle,
  Clock,
  CheckCircle,
  Circle,
  Pause,
  Ban,
  Lightbulb,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TodoCardProps {
  card: TodoCard;
  onEdit: (card: TodoCard) => void;
  hasChildren: boolean;
}

const priorityConfig: Record<Priority, { label: string; color: string; borderColor: string }> = {
  critical: { label: 'Critical', color: 'bg-red-600 text-white', borderColor: 'border-l-4 border-red-600' },
  high: { label: 'High', color: 'bg-orange-500 text-white', borderColor: 'border-l-4 border-orange-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500 text-white', borderColor: 'border-l-4 border-yellow-500' },
  low: { label: 'Low', color: 'bg-green-500 text-white', borderColor: 'border-l-4 border-green-500' },
  'nice-to-have': { label: 'Nice-to-have', color: 'bg-gray-500 text-white', borderColor: 'border-l-4 border-gray-500' },
};

const statusConfig: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  idea: { label: 'Idea', color: 'bg-purple-100 text-purple-800', icon: <Lightbulb className="w-3 h-3" /> },
  paused: { label: 'Paused', color: 'bg-gray-100 text-gray-800', icon: <Pause className="w-3 h-3" /> },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3" /> },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-800', icon: <Ban className="w-3 h-3" /> },
  done: { label: 'Done', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
};

export const TodoCardComponent: React.FC<TodoCardProps> = ({ card, onEdit, hasChildren }) => {
  const { currentRole, currentUserId, toggleComplete, deleteCard } = useApp();
  
  const canEdit = permissions.canEdit(card, currentRole, currentUserId);
  const canDelete = permissions.canDelete(card, currentRole, currentUserId);
  const canComplete = permissions.canComplete(currentRole);

  const handleToggleComplete = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (canComplete) {
      toggleComplete(card.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canDelete && confirm('Möchten Sie diese Karte und alle Unterkarten wirklich löschen?')) {
      deleteCard(card.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(card);
  };

  const isOverdue = card.deadline && new Date(card.deadline) < new Date() && !card.completed;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all ${
        priorityConfig[card.priority].borderColor
      } ${card.completed ? 'opacity-60' : ''}`}
    >
      <div className="p-4">
        {/* Header mit Checkbox und Titel */}
        <div className="flex items-start gap-3 mb-3">
          <input
            type="checkbox"
            checked={card.completed}
            onChange={handleToggleComplete}
            disabled={!canComplete}
            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex-1 min-w-0">
            <h3
              className={`text-lg font-semibold text-gray-900 ${
                card.completed ? 'line-through text-gray-500' : ''
              }`}
            >
              {card.title}
            </h3>
            {card.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{card.description}</p>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Priority Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${priorityConfig[card.priority].color}`}>
            <AlertCircle className="w-3 h-3" />
            {priorityConfig[card.priority].label}
          </span>

          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${statusConfig[card.status].color}`}>
            {statusConfig[card.status].icon}
            {statusConfig[card.status].label}
          </span>

          {/* Has Children Badge */}
          {hasChildren && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800">
              <FolderOpen className="w-3 h-3" />
              Unteraufgaben
            </span>
          )}
        </div>

        {/* Deadline */}
        {card.deadline && (
          <div className={`flex items-center gap-2 text-sm mb-2 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(card.deadline), 'dd.MM.yyyy HH:mm', { locale: de })}
              {isOverdue && ' (überfällig)'}
            </span>
          </div>
        )}

        {/* Assignees */}
        {card.assignees.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Users className="w-4 h-4" />
            <span>für: {card.assignees.join(', ')}</span>
          </div>
        )}

        {/* Created By */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <User className="w-4 h-4" />
          <span>von: {card.createdBy}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          {hasChildren && (
            <Link
              to={`/todo/${card.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Öffnen</span>
            </Link>
          )}

          {canEdit && (
            <button
              onClick={handleEdit}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              title="Bearbeiten"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
