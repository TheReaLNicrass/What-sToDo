import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Priority, Status, SortField, SortDirection } from '../types';
import {
  Filter,
  X,
  ArrowUpDown,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { filter, setFilter, resetFilters, sortField, sortDirection, setSort } = useApp();
  const [sortExpanded, setSortExpanded] = useState(true);
  const [filterExpanded, setFilterExpanded] = useState(true);

  const priorities: Priority[] = ['critical', 'high', 'medium', 'low', 'nice-to-have'];
  const statuses: Status[] = ['idea', 'paused', 'in-progress', 'blocked', 'done'];

  const priorityLabels: Record<Priority, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    'nice-to-have': 'Nice-to-have',
  };

  const statusLabels: Record<Status, string> = {
    idea: 'Idea',
    paused: 'Paused',
    'in-progress': 'In Progress',
    blocked: 'Blocked',
    done: 'Done',
  };

  const sortFields: { value: SortField; label: string }[] = [
    { value: 'title', label: 'Name' },
    { value: 'deadline', label: 'Deadline' },
    { value: 'priority', label: 'Priorität' },
    { value: 'status', label: 'Status' },
  ];

  const togglePriority = (priority: Priority) => {
    const current = filter.priorities;
    if (current.includes(priority)) {
      setFilter({ priorities: current.filter(p => p !== priority) });
    } else {
      setFilter({ priorities: [...current, priority] });
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSort(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field, 'asc');
    }
  };

  const hasActiveFilters = 
    filter.dateFrom || 
    filter.dateTo || 
    filter.assignee || 
    filter.createdBy || 
    filter.status || 
    filter.priorities.length > 0;

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
      {/* Sortierung */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setSortExpanded(!sortExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-gray-700" />
            <span className="font-semibold text-gray-900">Sortierung</span>
          </div>
          {sortExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {sortExpanded && (
          <div className="px-4 pb-4 space-y-2">
            {sortFields.map((field) => (
              <button
                key={field.value}
                onClick={() => handleSort(field.value)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                  sortField === field.value
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="font-medium">{field.label}</span>
                {sortField === field.value && (
                  <span className="text-xs">
                    {sortDirection === 'asc' ? '↑ A→Z' : '↓ Z→A'}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex-1">
        <div className="border-b border-gray-200">
          <button
            onClick={() => setFilterExpanded(!filterExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-700" />
              <span className="font-semibold text-gray-900">Filter</span>
              {hasActiveFilters && (
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  aktiv
                </span>
              )}
            </div>
            {filterExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        {filterExpanded && (
          <div className="p-4 space-y-4">
            {/* Zeitraum */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4" />
                Deadline (Von - Bis)
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filter.dateFrom}
                  onChange={(e) => setFilter({ dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={filter.dateTo}
                  onChange={(e) => setFilter({ dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4" />
                Zugewiesen an
              </label>
              <input
                type="text"
                value={filter.assignee}
                onChange={(e) => setFilter({ assignee: e.target.value })}
                placeholder="Name eingeben..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Created By */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4" />
                Erstellt von
              </label>
              <input
                type="text"
                value={filter.createdBy}
                onChange={(e) => setFilter({ createdBy: e.target.value })}
                placeholder="Name eingeben..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <CheckCircle className="w-4 h-4" />
                Status
              </label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ status: e.target.value as Status | '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Alle</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>

            {/* Priorität */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <AlertCircle className="w-4 h-4" />
                Priorität
              </label>
              <div className="space-y-1">
                {priorities.map((priority) => (
                  <label
                    key={priority}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filter.priorities.includes(priority)}
                      onChange={() => togglePriority(priority)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{priorityLabels[priority]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="font-medium">Filter zurücksetzen</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
