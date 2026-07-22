/**
 * Real-Time Global Edge & Local Synchronized Resistance Leaderboard
 * Persists clicks across all devices, browsers, and platforms globally using KeyValue.immanuel.co REST API.
 */

const APP_KEY = '1lxq1tje';
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
 * Helper to fetch a key's value with fallback
 */
async function getApiValue(key, fallback = '') {
  try {
    const res = await fetch(`https://keyvalue.immanuel.co/api/KeyVal/GetValue/${APP_KEY}/${key}`);
    if (res.ok) {
      const val = await res.json();
      return val !== null && val !== undefined ? val.trim() : fallback;
    }
  } catch (e) {
    console.warn(`Error fetching key ${key}:`, e);
  }
  return fallback;
}

/**
 * Helper to increment a key or initialize to 1 if it doesn't exist/is empty
 */
async function incrementOrInitKey(key) {
  try {
    const val = await getApiValue(key, '');
    if (val === '') {
      // Key does not exist or is empty, initialize to 1
      await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${APP_KEY}/${key}/1`, {
        method: 'POST',
        body: ''
      });
    } else {
      // Key exists, increment atomically
      await fetch(`https://keyvalue.immanuel.co/api/KeyVal/ActOnValue/${APP_KEY}/${key}/increment`, {
        method: 'POST',
        body: ''
      });
    }
  } catch (e) {
    console.warn(`Error incrementing/initializing key ${key}:`, e);
  }
}

/**
 * Fetch live global counts from Edge Counter API, falling back to LocalStorage
 */
export async function fetchLeaderboard() {
  initLocalStorage();
  let totalStamps = parseInt(localStorage.getItem(STORAGE_KEY_TOTAL) || '0', 10);
  let stateCounts = JSON.parse(localStorage.getItem(STORAGE_KEY_STATES) || '{}');

  try {
    // 1. Fetch global active states list
    const activeStatesStr = await getApiValue('active_states', '');
    const activeStates = activeStatesStr ? activeStatesStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    // 2. Fetch global total count
    const totalCountStr = await getApiValue('total_count', '0');
    const apiTotal = parseInt(totalCountStr, 10) || 0;
    if (apiTotal > totalStamps) {
      totalStamps = apiTotal;
      localStorage.setItem(STORAGE_KEY_TOTAL, totalStamps.toString());
    }

    // 3. Fetch counts for each active state in parallel
    if (activeStates.length > 0) {
      const statePromises = activeStates.map(async (stateName) => {
        const key = formatStateKey(stateName);
        const countStr = await getApiValue(key, '0');
        const count = parseInt(countStr, 10) || 0;
        return { stateName, count };
      });

      const results = await Promise.all(statePromises);
      results.forEach(({ stateName, count }) => {
        if (count > (stateCounts[stateName] || 0)) {
          stateCounts[stateName] = count;
        }
      });
      localStorage.setItem(STORAGE_KEY_STATES, JSON.stringify(stateCounts));
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
    
    // Perform increments in background
    (async () => {
      // Increment total count
      await incrementOrInitKey('total_count');
      
      // Increment state count
      await incrementOrInitKey(sKey);
      
      // Update active_states list
      const activeStatesStr = await getApiValue('active_states', '');
      const activeStates = activeStatesStr ? activeStatesStr.split(',').map(s => s.trim()).filter(Boolean) : [];
      if (!activeStates.includes(stateName)) {
        activeStates.push(stateName);
        await fetch(`https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${APP_KEY}/active_states/${encodeURIComponent(activeStates.join(','))}`, {
          method: 'POST',
          body: ''
        });
      }
    })();
  } catch (err) {
    console.warn('Background edge sync error:', err);
  }

  return {
    totalStamps: currentTotal,
    stateStamps: stateCounts[stateName]
  };
}
