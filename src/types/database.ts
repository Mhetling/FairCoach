// Hand-written types matching supabase/migrations/0001_schema.sql.
// After connecting Supabase you can regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type SportId = "soccer" | "handball" | "basketball" | "hockey";
export type MatchStatus = "pending" | "live" | "paused" | "finished";
export type SoccerPosition = "GK" | "DEF" | "MID" | "FWD";

export type Sport = {
  id: SportId;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export type Team = {
  id: string;
  user_id: string;
  sport_id: SportId;
  name: string;
  created_at: string;
};

export type Player = {
  id: string;
  team_id: string;
  name: string;
  jersey_number: number | null;
  position: SoccerPosition | string | null;
  created_at: string;
};

export type Match = {
  id: string;
  user_id: string;
  team_id: string;
  opponent: string | null;
  starts_at: string | null;
  players_on_field: number;
  period_length_seconds: number;
  period_count: number;
  status: MatchStatus;
  current_period: number;
  elapsed_seconds: number;
  created_at: string;
};

export type MatchPlayer = {
  match_id: string;
  player_id: string;
  selected: boolean;
  on_field: boolean;
  current_position: string | null;
  total_play_seconds: number;
};

export type MatchEventType =
  | "on"
  | "off"
  | "goal"
  | "period_start"
  | "period_end"
  | "pause"
  | "resume";

export type MatchEvent = {
  id: string;
  match_id: string;
  player_id: string | null;
  event_type: MatchEventType;
  position: string | null;
  at_seconds: number;
  meta: Record<string, unknown> | null;
  created_at: string;
};

// Supabase JS generic — Tables/Views/Functions all required by GenericSchema.
// Row/Insert/Update must each satisfy Record<string, unknown>, which means
// using `type` aliases (not `interface`) at every level.
export type Database = {
  public: {
    Tables: {
      sports: {
        Row: Sport;
        Insert: Partial<Sport> & Pick<Sport, "id" | "name">;
        Update: Partial<Sport>;
        Relationships: [];
      };
      teams: {
        Row: Team;
        Insert: {
          id?: string;
          user_id: string;
          sport_id: SportId;
          name: string;
          created_at?: string;
        };
        Update: Partial<Omit<Team, "id">>;
        Relationships: [];
      };
      players: {
        Row: Player;
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          jersey_number?: number | null;
          position?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Player, "id">>;
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: {
          id?: string;
          user_id: string;
          team_id: string;
          opponent?: string | null;
          starts_at?: string | null;
          players_on_field?: number;
          period_length_seconds?: number;
          period_count?: number;
          status?: MatchStatus;
          current_period?: number;
          elapsed_seconds?: number;
          created_at?: string;
        };
        Update: Partial<Omit<Match, "id">>;
        Relationships: [];
      };
      match_players: {
        Row: MatchPlayer;
        Insert: {
          match_id: string;
          player_id: string;
          selected?: boolean;
          on_field?: boolean;
          current_position?: string | null;
          total_play_seconds?: number;
        };
        Update: Partial<MatchPlayer>;
        Relationships: [];
      };
      match_events: {
        Row: MatchEvent;
        Insert: {
          id?: string;
          match_id: string;
          player_id?: string | null;
          event_type: MatchEventType;
          position?: string | null;
          at_seconds: number;
          meta?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Omit<MatchEvent, "id">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
