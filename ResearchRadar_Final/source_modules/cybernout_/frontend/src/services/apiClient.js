/**
 * Centralized API Client for ResearchHub
 * Dynamically resolves the API host so cross-origin requests always match
 * the browser's current hostname (localhost vs 127.0.0.1 vs LAN IP).
 */

function getBaseApiUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/+$/, '');
  }

  // Dynamic resolution matching current hostname
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    return `http://${hostname}:5000/api`;
  }

  return 'http://127.0.0.1:5000/api';
}

export async function apiFetch(path, params = {}) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getBaseApiUrl();
  const url = new URL(`${baseUrl}${cleanPath}`);

  // Append query parameters
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  });

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      let errMsg = `Server returned HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch {
        // Fallback
      }
      throw new Error(errMsg);
    }

    return await res.json();
  } catch (err) {
    console.error(`[ResearchHub API Error] ${url.toString()}:`, err);
    throw err;
  }
}
