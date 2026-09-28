import axios from 'axios';
import API_URL from '../config';

let inFlight: Promise<boolean> | null = null;
let lastFocusAttempt = 0;

// Only user activity triggers this request; there is no periodic cloud timer.
export function syncBeforeRead(reason: 'focus' | 'search' = 'search'): Promise<boolean> {
  if (inFlight) return inFlight;
  if (!navigator.onLine) return Promise.resolve(false);
  if (reason === 'focus' && Date.now() - lastFocusAttempt < 30000) return Promise.resolve(false);
  lastFocusAttempt = Date.now();
  inFlight = (async () => {
    try {
      await axios.post(`${API_URL}/api/sync/retry`);
      const { data } = await axios.get(`${API_URL}/api/sync/status`);
      if (data.mode !== 'online') return false;
      window.dispatchEvent(new Event('bautisacrum-data-updated'));
      return true;
    } catch { return false; }
  })().finally(() => { inFlight = null; });
  return inFlight;
}
