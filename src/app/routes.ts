import { createBrowserRouter } from 'react-router';
import { TodoLevel } from './pages/TodoLevel';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: TodoLevel,
  },
  {
    path: '/todo/:cardId',
    Component: TodoLevel,
  },
]);
