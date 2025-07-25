/**
 * Safe JSON utilities to handle circular references and non-serializable objects
 */

/**
 * Safely stringify an object, handling circular references and React-specific properties
 * @param {any} obj - The object to stringify
 * @param {number} space - Number of spaces for indentation (optional)
 * @returns {string} - JSON string
 */
export function safeStringify(obj, space = 0) {
  const seen = new WeakSet();

  return JSON.stringify(obj, (key, value) => {
    // Skip React-specific properties first (before checking value type)
    if (key.startsWith('__reactFiber') ||
        key.startsWith('__reactInternalInstance') ||
        key.startsWith('_reactInternalFiber') ||
        key.startsWith('__reactEventHandlers') ||
        key.startsWith('__reactProps') ||
        key.startsWith('__reactContainer') ||
        key === '_owner' ||
        key === '_store' ||
        key === 'ref' ||
        key === 'key' ||
        key === 'stateNode' ||
        key === 'return' ||
        key === 'child' ||
        key === 'sibling' ||
        key === 'alternate' ||
        key === 'effectTag' ||
        key === 'nextEffect' ||
        key === 'firstEffect' ||
        key === 'lastEffect') {
      return undefined;
    }

    // Skip functions and undefined values
    if (typeof value === 'function' || value === undefined) {
      return undefined;
    }

    // Handle circular references and problematic objects
    if (typeof value === 'object' && value !== null) {
      // Check for circular references first
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);

      // Skip DOM elements and HTML elements more aggressively
      if (value instanceof Element ||
          value instanceof Node ||
          value instanceof HTMLElement ||
          value instanceof HTMLButtonElement ||
          value instanceof HTMLDivElement ||
          value instanceof HTMLSpanElement ||
          value instanceof EventTarget ||
          (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) ||
          (value.nodeType && typeof value.nodeType === 'number') ||
          (value.tagName && typeof value.tagName === 'string')) {
        return '[DOM Element]';
      }

      // Skip React synthetic events more aggressively
      if ((value.nativeEvent && value.currentTarget) ||
          (value.type && value.target && value.preventDefault) ||
          (value._reactName && value._targetInst)) {
        return '[React Event]';
      }

      // Skip React fiber nodes more aggressively
      if ((value.constructor && value.constructor.name === 'FiberNode') ||
          (value.tag !== undefined && value.type !== undefined && value.stateNode !== undefined) ||
          (value.elementType && value.pendingProps) ||
          (value.memoizedProps && value.memoizedState !== undefined)) {
        return '[React Fiber]';
      }

      // Skip objects that look like React components
      if (value.$$typeof ||
          (value._reactInternalFiber && !value.name && !value.title) ||
          (value.__reactInternalInstance && !value.name && !value.title) ||
          (value.props && value.state && value.setState) ||
          (value._reactInternalInstance && value.updater)) {
        return '[React Component]';
      }
    }

    return value;
  }, space);
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - The JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} - Parsed object or fallback
 */
export function safeParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON parse error:', error);
    return fallback;
  }
}

/**
 * Clean an object to ensure it only contains serializable properties
 * @param {any} obj - The object to clean
 * @returns {any} - Cleaned object
 */
export function cleanForSerialization(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanForSerialization);
  }

  const cleaned = {};

  for (const [key, value] of Object.entries(obj)) {
    // Skip React-specific properties more aggressively
    if (key.startsWith('__react') ||
        key.startsWith('_react') ||
        key.startsWith('__reactFiber') ||
        key.startsWith('__reactProps') ||
        key.startsWith('__reactContainer') ||
        key === '_owner' ||
        key === '_store' ||
        key === 'ref' ||
        key === 'key' ||
        key === 'stateNode' ||
        key === 'return' ||
        key === 'child' ||
        key === 'sibling' ||
        key === 'alternate' ||
        key === 'effectTag' ||
        key === 'nextEffect' ||
        key === 'firstEffect' ||
        key === 'lastEffect') {
      continue;
    }

    // Skip functions
    if (typeof value === 'function') {
      continue;
    }

    // Skip DOM elements and HTML elements more aggressively
    if (value instanceof Element ||
        value instanceof Node ||
        value instanceof HTMLElement ||
        value instanceof HTMLButtonElement ||
        value instanceof HTMLDivElement ||
        value instanceof HTMLSpanElement ||
        value instanceof EventTarget ||
        (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) ||
        (value && typeof value === 'object' && value.nodeType && typeof value.nodeType === 'number') ||
        (value && typeof value === 'object' && value.tagName && typeof value.tagName === 'string')) {
      continue;
    }

    // Skip React synthetic events more aggressively
    if (value && typeof value === 'object' &&
        ((value.nativeEvent && value.currentTarget) ||
         (value.type && value.target && value.preventDefault) ||
         (value._reactName && value._targetInst))) {
      continue;
    }

    // Skip React fiber nodes more aggressively
    if (value && typeof value === 'object' &&
        ((value.constructor && value.constructor.name === 'FiberNode') ||
         (value.tag !== undefined && value.type !== undefined && value.stateNode !== undefined) ||
         (value.elementType && value.pendingProps) ||
         (value.memoizedProps && value.memoizedState !== undefined))) {
      continue;
    }

    // Skip mock HTML elements (for testing)
    if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'HTMLButtonElement') {
      continue;
    }

    // Skip objects that look like React components
    if (value && typeof value === 'object' &&
        (value.$$typeof ||
         (value._reactInternalFiber && !value.name && !value.title) ||
         (value.__reactInternalInstance && !value.name && !value.title) ||
         (value.props && value.state && value.setState) ||
         (value._reactInternalInstance && value.updater))) {
      continue;
    }

    // Recursively clean nested objects
    if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanForSerialization(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Create a safe copy of watchlist item with only necessary properties
 * @param {object} item - The item to clean
 * @returns {object} - Clean watchlist item
 */
export function createSafeWatchlistItem(item) {
  return {
    id: typeof item.id === 'number' ? item.id : parseInt(item.id, 10),
    title: String(item.title || item.name || 'Unknown Title'),
    poster_path: item.poster_path ? String(item.poster_path) : null,
    poster_url: item.poster_url ? String(item.poster_url) : null,
    media_type: String(item.media_type || (item.title ? 'movie' : 'tv')),
    release_date: item.release_date || item.first_air_date || null,
    vote_average: typeof item.vote_average === 'number' ? item.vote_average : 0,
    overview: item.overview ? String(item.overview) : null,
    watched: Boolean(item.watched),
    added_at: item.added_at || new Date().toISOString(),
  };
}
