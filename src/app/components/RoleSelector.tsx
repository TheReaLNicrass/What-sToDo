import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Role } from '../types';
import { User, Shield, Eye } from 'lucide-react';

export const RoleSelector: React.FC = () => {
  const { currentRole, setRole } = useApp();

  const roles: { value: Role; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'admin', label: 'Admin', icon: <Shield className="w-4 h-4" />, color: 'bg-red-500' },
    { value: 'mitarbeiter', label: 'Mitarbeiter', icon: <User className="w-4 h-4" />, color: 'bg-blue-500' },
    { value: 'gast', label: 'Gast', icon: <Eye className="w-4 h-4" />, color: 'bg-gray-500' },
  ];

  return (
    <div className="flex gap-2 items-center bg-white rounded-lg shadow-sm border border-gray-200 p-1">
      {roles.map((role) => (
        <button
          key={role.value}
          onClick={() => setRole(role.value)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
            currentRole === role.value
              ? `${role.color} text-white shadow-sm`
              : 'bg-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          {role.icon}
          <span className="font-medium">{role.label}</span>
        </button>
      ))}
    </div>
  );
};
