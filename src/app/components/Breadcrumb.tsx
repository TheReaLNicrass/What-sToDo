import React from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useApp } from '../contexts/AppContext';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumb: React.FC = () => {
  const { cards } = useApp();
  const { cardId } = useParams();
  const location = useLocation();

  // Pfad aufbauen
  const buildPath = (id: string): { id: string; title: string }[] => {
    const card = cards.find(c => c.id === id);
    if (!card) return [];
    
    if (card.parentId) {
      return [...buildPath(card.parentId), { id: card.id, title: card.title }];
    }
    return [{ id: card.id, title: card.title }];
  };

  const path = cardId ? buildPath(cardId) : [];

  return (
    <nav className="flex items-center gap-2 text-sm bg-white px-4 py-3 rounded-lg shadow-sm border border-gray-200">
      <Link
        to="/"
        className="flex items-center gap-1 hover:text-blue-600 transition-colors text-gray-700"
      >
        <Home className="w-4 h-4" />
        <span className="font-medium">Home</span>
      </Link>

      {path.map((item, index) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {index === path.length - 1 ? (
            <span className="text-gray-900 font-semibold">{item.title}</span>
          ) : (
            <Link
              to={`/todo/${item.id}`}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              {item.title}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
