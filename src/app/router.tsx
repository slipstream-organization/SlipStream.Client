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
import { ChampionshipPage } from '../pages/championship/ChampionshipPage';
import { LoginPage } from '../pages/login/LoginPage';
import { AuthCallbackPage } from '../pages/auth/AuthCallbackPage';
import { RequireAuth } from './RequireAuth';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'races', element: <SchedulePage /> },
      { path: 'races/:round', element: <RacePage /> },
      { path: 'standings', element: <StandingsPage /> },
      { path: 'championship', element: <ChampionshipPage /> },
      { path: 'drivers/:code', element: <DriverPage /> },
      { path: 'game', element: <GamePage /> },
      { path: 'profile', element: <RequireAuth><ProfilePage /></RequireAuth> },
      { path: 'login', element: <LoginPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
