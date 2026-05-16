import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import { Login } from "@/pages/Login";
import { MyTeams } from "@/pages/MyTeams";
import { TeamDetail } from "@/pages/TeamDetail";
import { MatchSetup } from "@/pages/MatchSetup";
import { MatchLive } from "@/pages/MatchLive";
import { MatchSummary } from "@/pages/MatchSummary";
import { MatchHistory } from "@/pages/MatchHistory";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
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
  { path: "*", element: <Navigate to="/" replace /> },
]);
