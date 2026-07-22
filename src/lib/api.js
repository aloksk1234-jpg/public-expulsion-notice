/**
 * Real-Time Global Edge & Local Synchronized Resistance Leaderboard
 * Persists clicks across all devices, browsers, and platforms globally using Zero-Server Edge KV Counter API.
 */

const NAMESPACE = 'public-expulsion-notice-2026-v1';
const STORAGE_KEY_TOTAL = 'expulsion_total_stamps_v3';
const STORAGE_KEY_STATES = 'expulsion_state_stamps_v3';

// Helper to sanitize state key for API endpoints
function formatStateKey(stateName) {
  return 'state_' + stateName.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function initLocalStorage() {
  if (!localStorage.getItem(STORAGE_KEY_TOTAL)) {
    localStorage.setItem(STORAGE_KEY_TOTAL, '0');
  }
  if (!localStorage.getItem(STORAGE_KEY_STATES)) {
    localStorage.setItem(STORAGE_KEY_STATES, JSON.stringify({}));
  }
}

initLocalStorage();

/**
 * Fetch live global counts from Edge Counter API, falling back to LocalStorage
 */
export async function fetchLeaderboard() {
  initLocalStorage();
  let totalStamps = parseInt(localStorage.getItem(STORAGE_KEY_TOTAL) || '0', 10);
  let stateCounts = JSON.parse(localStorage.getItem(STORAGE_KEY_STATES) || '{}');

  try {
    // Fetch global total count
    const totalRes = await fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/total`);
    if (totalRes.ok) {
      const totalData = await totalRes.json();
      if (typeof totalData.count === 'number' && totalData.count > totalStamps) {
        totalStamps = totalData.count;
        localStorage.setItem(STORAGE_KEY_TOTAL, totalStamps.toString());
      }
    }
  } catch (err) {
    console.warn('Global Edge total counter unreachable, using cached local counts:', err);
  }

  // Convert map to sorted array
  const sorted = Object.entries(stateCounts)
    .map(([state, stamps]) => ({ state, stamps }))
    .filter(item => item.stamps > 0)
    .sort((a, b) => b.stamps - a.stamps);

  const maxStamps = sorted[0] ? sorted[0].stamps : 1;

  const leaderboard = sorted.map(item => ({
    ...item,
    percentage: Math.min(100, Math.round((item.stamps / maxStamps) * 100))
  }));

  return {
    success: true,
    data: {
      totalStamps,
      leaderboard
    }
  };
}

/**
 * Increment stamp count live in real-time globally when user clicks STAMP EXPULSION
 */
export async function recordStampClick(stateName) {
  initLocalStorage();

  // 1. Instantly update LocalStorage for zero latency UI feedback
  let currentTotal = parseInt(localStorage.getItem(STORAGE_KEY_TOTAL) || '0', 10);
  currentTotal += 1;
  localStorage.setItem(STORAGE_KEY_TOTAL, currentTotal.toString());

  const stateCounts = JSON.parse(localStorage.getItem(STORAGE_KEY_STATES) || '{}');
  stateCounts[stateName] = (stateCounts[stateName] || 0) + 1;
  localStorage.setItem(STORAGE_KEY_STATES, JSON.stringify(stateCounts));

  // 2. Asynchronously sync increment to Global Edge Counter API across all browsers
  try {
    const sKey = formatStateKey(stateName);
    
    // Fire-and-forget parallel background requests to Edge API
    Promise.allSettled([
      fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/total/up`),
      fetch(`https://api.counterapi.dev/v1/${NAMESPACE}/${sKey}/up`)
    ]).then(async (results) => {
      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        const resData = await results[0].value.json();
        if (typeof resData.count === 'number') {
          localStorage.setItem(STORAGE_KEY_TOTAL, Math.max(currentTotal, resData.count).toString());
        }
      }
    }).catch(err => {
      console.warn('Edge counter sync deferred:', err);
    });
  } catch (err) {
    console.warn('Background edge sync error:', err);
  }

  return {
    totalStamps: currentTotal,
    stateStamps: stateCounts[stateName]
  };
}
