import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DEFAULT_DOCTORS, DEFAULT_HOLIDAYS, DOCTOR_COLORS } from '../constants/defaults';
import { generateRota } from '../utils/rotaGenerator';

const RotaContext = createContext(null);

const STORAGE_KEY = 'duty-rota-data';

function getInitialState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.teams && parsed.activeTeamId) return parsed;
    }
  } catch { /* ignore */ }

  return {
    teams: {
      default: {
        id: 'default',
        name: 'Liver Transplant',
        doctors: DEFAULT_DOCTORS,
        holidays: DEFAULT_HOLIDAYS,
        leaveRequests: {},
        dutyRequests: {},
        dutyLimits: {},
        generatedRota: null,
        selectedMonth: new Date().getMonth(),
        selectedYear: new Date().getFullYear(),
      },
    },
    activeTeamId: 'default',
  };
}

export function RotaProvider({ children }) {
  const [state, setState] = useState(getInitialState);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeTeam = state.teams[state.activeTeamId];

  const setActiveTeam = useCallback((teamId) => {
    setState((prev) => ({ ...prev, activeTeamId: teamId }));
  }, []);

  const createTeam = useCallback((name) => {
    const id = `team_${Date.now()}`;
    setState((prev) => ({
      ...prev,
      teams: {
        ...prev.teams,
        [id]: {
          id,
          name,
          doctors: [],
          holidays: DEFAULT_HOLIDAYS,
          leaveRequests: {},
          dutyRequests: {},
          dutyLimits: {},
          generatedRota: null,
          selectedMonth: new Date().getMonth(),
          selectedYear: new Date().getFullYear(),
        },
      },
      activeTeamId: id,
    }));
    return id;
  }, []);

  const deleteTeam = useCallback((teamId) => {
    if (teamId === 'default') return;
    setState((prev) => {
      const { [teamId]: _, ...rest } = prev.teams;
      return {
        ...prev,
        teams: rest,
        activeTeamId: prev.activeTeamId === teamId ? 'default' : prev.activeTeamId,
      };
    });
  }, []);

  const renameTeam = useCallback((teamId, newName) => {
    setState((prev) => ({
      ...prev,
      teams: {
        ...prev.teams,
        [teamId]: { ...prev.teams[teamId], name: newName },
      },
    }));
  }, []);

  const updateTeam = useCallback((teamId, updates) => {
    setState((prev) => ({
      ...prev,
      teams: {
        ...prev.teams,
        [teamId]: { ...prev.teams[teamId], ...updates },
      },
    }));
  }, []);

  const addDoctor = useCallback((name, initials) => {
    const teamId = state.activeTeamId;
    const team = state.teams[teamId];
    const id = initials.toLowerCase() + '_' + Date.now();
    const colorIndex = team.doctors.length % DOCTOR_COLORS.length;
    const newDoctor = { id, name, initials: initials.toUpperCase(), color: DOCTOR_COLORS[colorIndex] };
    updateTeam(teamId, { doctors: [...team.doctors, newDoctor] });
  }, [state.activeTeamId, state.teams, updateTeam]);

  const removeDoctor = useCallback((doctorId) => {
    const teamId = state.activeTeamId;
    const team = state.teams[teamId];
    const { [doctorId]: _, ...restLeaves } = team.leaveRequests;
    const { [doctorId]: _d, ...restDutyReqs } = team.dutyRequests || {};
    const { [doctorId]: _l, ...restLimits } = team.dutyLimits || {};
    updateTeam(teamId, {
      doctors: team.doctors.filter((d) => d.id !== doctorId),
      leaveRequests: restLeaves,
      dutyRequests: restDutyReqs,
      dutyLimits: restLimits,
    });
  }, [state.activeTeamId, state.teams, updateTeam]);

  const setLeaveRequests = useCallback((doctorId, dates) => {
    const teamId = state.activeTeamId;
    const team = state.teams[teamId];
    updateTeam(teamId, {
      leaveRequests: { ...team.leaveRequests, [doctorId]: dates },
    });
  }, [state.activeTeamId, state.teams, updateTeam]);

  const setDutyRequests = useCallback((doctorId, dates) => {
    const teamId = state.activeTeamId;
    const team = state.teams[teamId];
    updateTeam(teamId, {
      dutyRequests: { ...(team.dutyRequests || {}), [doctorId]: dates },
    });
  }, [state.activeTeamId, state.teams, updateTeam]);

  const setDutyLimit = useCallback((doctorId, limit) => {
    const teamId = state.activeTeamId;
    const team = state.teams[teamId];
    const newLimits = { ...(team.dutyLimits || {}) };
    if (limit == null || limit === '') {
      delete newLimits[doctorId];
    } else {
      newLimits[doctorId] = Number(limit);
    }
    updateTeam(teamId, { dutyLimits: newLimits });
  }, [state.activeTeamId, state.teams, updateTeam]);

  const addHoliday = useCallback((date, name) => {
    const teamId = state.activeTeamId;
    const team = state.teams[teamId];
    if (team.holidays.some((h) => h.date === date)) return;
    updateTeam(teamId, { holidays: [...team.holidays, { date, name }] });
  }, [state.activeTeamId, state.teams, updateTeam]);

  const removeHoliday = useCallback((date) => {
    const teamId = state.activeTeamId;
    const team = state.teams[teamId];
    updateTeam(teamId, { holidays: team.holidays.filter((h) => h.date !== date) });
  }, [state.activeTeamId, state.teams, updateTeam]);

  const setMonthYear = useCallback((month, year) => {
    updateTeam(state.activeTeamId, { selectedMonth: month, selectedYear: year });
  }, [state.activeTeamId, updateTeam]);

  const generate = useCallback(() => {
    const team = state.teams[state.activeTeamId];
    const result = generateRota({
      year: team.selectedYear,
      month: team.selectedMonth,
      doctors: team.doctors,
      holidays: team.holidays,
      leaveRequests: team.leaveRequests,
      dutyRequests: team.dutyRequests || {},
      dutyLimits: team.dutyLimits || {},
    });
    updateTeam(state.activeTeamId, { generatedRota: result });
    return result;
  }, [state.activeTeamId, state.teams, updateTeam]);

  const exportData = useCallback(() => {
    const team = state.teams[state.activeTeamId];
    const blob = new Blob([JSON.stringify(team, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${team.name.replace(/\s+/g, '_')}_rota.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.activeTeamId, state.teams]);

  const importData = useCallback((jsonData) => {
    try {
      const team = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      if (!team.name || !team.doctors) throw new Error('Invalid data');
      const id = team.id || `imported_${Date.now()}`;
      setState((prev) => ({
        ...prev,
        teams: { ...prev.teams, [id]: { ...team, id } },
        activeTeamId: id,
      }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = {
    state,
    activeTeam,
    teams: state.teams,
    activeTeamId: state.activeTeamId,
    setActiveTeam,
    createTeam,
    deleteTeam,
    renameTeam,
    addDoctor,
    removeDoctor,
    setLeaveRequests,
    setDutyRequests,
    setDutyLimit,
    addHoliday,
    removeHoliday,
    setMonthYear,
    generate,
    exportData,
    importData,
  };

  return <RotaContext.Provider value={value}>{children}</RotaContext.Provider>;
}

export function useRota() {
  const ctx = useContext(RotaContext);
  if (!ctx) throw new Error('useRota must be used within RotaProvider');
  return ctx;
}
