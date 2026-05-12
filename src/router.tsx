import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/pages/ProtectedRoute";
import { Login } from "@/pages/Login";
import { SportPicker } from "@/pages/SportPicker";
import { TeamList } from "@/pages/TeamList";
import { TeamDetail } from "@/pages/TeamDetail";
import { MatchSetup } from "@/pages/MatchSetup";
import { MatchLive } from "@/pages/MatchLive";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <SportPicker />
      </ProtectedRoute>
    ),
  },
  {
    path: "/sport/:sportId/teams",
    element: (
      <ProtectedRoute>
        <TeamList />
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
  { path: "*", element: <Navigate to="/" replace /> },
]);
