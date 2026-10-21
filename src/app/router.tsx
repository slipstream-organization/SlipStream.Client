// src/app/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { NotFound, RootLayout } from './RootLayout';
import { HomePage } from '../pages/home/HomePage';
import { SchedulePage } from '../pages/schedule/SchedulePage';
import { RacePage } from '../pages/race/RacePage';
import { StandingsPage } from '../pages/standings/StandingsPage';
import { GamePage } from '../pages/game/GamePage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { DriverPage } from '../pages/driver/DriverPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'races', element: <SchedulePage /> },
      { path: 'races/:round', element: <RacePage /> },
      { path: 'standings', element: <StandingsPage /> },
      { path: 'drivers/:code', element: <DriverPage /> },
      { path: 'game', element: <GamePage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
