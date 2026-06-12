import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import { Login } from "@/pages/Login";
import { LandingPage } from "@/pages/landing/LandingPage";
import { MyTeams } from "@/pages/MyTeams";
import { TeamDetail } from "@/pages/TeamDetail";
import { MatchSetup } from "@/pages/MatchSetup";
import { MatchLive } from "@/pages/MatchLive";
import { MatchSummary } from "@/pages/MatchSummary";
import { MatchHistory } from "@/pages/MatchHistory";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { UpgradePage } from "@/pages/UpgradePage";
import { SeasonStats } from "@/pages/SeasonStats";

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <Login /> },
  { path: "/privacy", element: <PrivacyPage /> },
  {
    path: "/upgrade",
    element: (
      <ProtectedRoute>
        <UpgradePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <MyTeams />
      </ProtectedRoute>
    ),
  },
  {
    path: "/teams/:teamId",
    element: (
      <ProtectedRoute>
        <TeamDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: "/teams/:teamId/matches/new",
    element: (
      <ProtectedRoute>
        <MatchSetup />
      </ProtectedRoute>
    ),
  },
  {
    path: "/matches/:matchId",
    element: (
      <ProtectedRoute>
        <MatchLive />
      </ProtectedRoute>
    ),
  },
  {
    path: "/teams/:teamId/matches",
    element: (
      <ProtectedRoute>
        <MatchHistory />
      </ProtectedRoute>
    ),
  },
  {
    path: "/matches/:matchId/summary",
    element: (
      <ProtectedRoute>
        <MatchSummary />
      </ProtectedRoute>
    ),
  },
  {
    path: "/teams/:teamId/stats",
    element: (
      <ProtectedRoute>
        <SeasonStats />
      </ProtectedRoute>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
