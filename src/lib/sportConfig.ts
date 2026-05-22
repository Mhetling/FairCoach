import type { SportId } from "@/types/database";

export interface SportPosition {
  id: string;
  label: string;
}

export interface SportConfig {
  name: string;
  icon: string;
  isActive: boolean;
  positions: SportPosition[];
  playersOnFieldOptions: number[];
  defaultPlayersOnField: number;
  periodLengthOptions: { label: string; seconds: number }[];
  defaultPeriodLengthSeconds: number;
  periodCountOptions: number[];
  defaultPeriodCount: number;
  hasFormations: boolean;
  trackGoalsDefault: boolean;
}

const CUSTOM: { label: string; seconds: number } = { label: "Annet", seconds: -1 };

export const SPORT_CONFIGS: Record<SportId, SportConfig> = {
  soccer: {
    name: "Fotball",
    icon: "⚽",
    isActive: true,
    positions: [
      { id: "GK",    label: "Keeper" },
      { id: "L-DEF", label: "V. back" },
      { id: "DEF",   label: "Back" },
      { id: "R-DEF", label: "H. back" },
      { id: "L-MID", label: "V. midt" },
      { id: "MID",   label: "Midtbane" },
      { id: "R-MID", label: "H. midt" },
      { id: "L-FWD", label: "V. angrep" },
      { id: "FWD",   label: "Angrep" },
      { id: "R-FWD", label: "H. angrep" },
    ],
    playersOnFieldOptions: [3, 5, 7, 9, 11],
    defaultPlayersOnField: 7,
    periodLengthOptions: [
      { label: "15 min", seconds: 900 },
      { label: "20 min", seconds: 1200 },
      { label: "25 min", seconds: 1500 },
      { label: "30 min", seconds: 1800 },
      { label: "45 min", seconds: 2700 },
      CUSTOM,
    ],
    defaultPeriodLengthSeconds: 1500,
    periodCountOptions: [1, 2],
    defaultPeriodCount: 2,
    hasFormations: true,
    trackGoalsDefault: false,
  },
  handball: {
    name: "Håndball",
    icon: "🤾",
    isActive: true,
    positions: [
      { id: "GK",     label: "Keeper" },
      { id: "L-WING", label: "V. kant" },
      { id: "R-WING", label: "H. kant" },
      { id: "L-BACK", label: "V. back" },
      { id: "CB",     label: "Midtback" },
      { id: "R-BACK", label: "H. back" },
      { id: "PIVOT",  label: "Strek" },
    ],
    playersOnFieldOptions: [3, 4, 5, 6, 7],
    defaultPlayersOnField: 7,
    periodLengthOptions: [
      { label: "15 min", seconds: 900 },
      { label: "20 min", seconds: 1200 },
      { label: "25 min", seconds: 1500 },
      { label: "30 min", seconds: 1800 },
      CUSTOM,
    ],
    defaultPeriodLengthSeconds: 1200,
    periodCountOptions: [1, 2],
    defaultPeriodCount: 2,
    hasFormations: false,
    trackGoalsDefault: true,
  },
  basketball: {
    name: "Basketball",
    icon: "🏀",
    isActive: true,
    positions: [
      { id: "PG", label: "Point guard" },
      { id: "SG", label: "Shooting guard" },
      { id: "SF", label: "Small forward" },
      { id: "PF", label: "Power forward" },
      { id: "C",  label: "Center" },
    ],
    playersOnFieldOptions: [3, 4, 5],
    defaultPlayersOnField: 5,
    periodLengthOptions: [
      { label: "8 min", seconds: 480 },
      { label: "10 min", seconds: 600 },
      { label: "12 min", seconds: 720 },
      CUSTOM,
    ],
    defaultPeriodLengthSeconds: 600,
    periodCountOptions: [2, 4],
    defaultPeriodCount: 4,
    hasFormations: false,
    trackGoalsDefault: true,
  },
  hockey: {
    name: "Hockey",
    icon: "🏒",
    isActive: true,
    positions: [
      { id: "GK",     label: "Keeper" },
      { id: "L-DEF",  label: "V. forsvar" },
      { id: "R-DEF",  label: "H. forsvar" },
      { id: "CENTER", label: "Senter" },
      { id: "L-FWD",  label: "V. wing" },
      { id: "R-FWD",  label: "H. wing" },
    ],
    playersOnFieldOptions: [3, 4, 5, 6],
    defaultPlayersOnField: 5,
    periodLengthOptions: [
      { label: "15 min", seconds: 900 },
      { label: "20 min", seconds: 1200 },
      CUSTOM,
    ],
    defaultPeriodLengthSeconds: 1200,
    periodCountOptions: [2, 3],
    defaultPeriodCount: 3,
    hasFormations: false,
    trackGoalsDefault: true,
  },
};

export function getSportConfig(sportId: SportId): SportConfig {
  return SPORT_CONFIGS[sportId] ?? SPORT_CONFIGS.soccer;
}

export const ALL_SPORTS = (Object.keys(SPORT_CONFIGS) as SportId[]).map((id) => ({
  id,
  name: SPORT_CONFIGS[id].name,
  icon: SPORT_CONFIGS[id].icon,
  isActive: SPORT_CONFIGS[id].isActive,
}));
