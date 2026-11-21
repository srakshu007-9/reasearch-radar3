import { apiFetch } from './apiClient';

export const searchPapers = (params) => apiFetch('/papers', params);
export const getPaperById = (id) => apiFetch(`/papers/${id}`);
export const getFilters = () => apiFetch('/papers/filters');
export const getStats = () => apiFetch('/stats');

