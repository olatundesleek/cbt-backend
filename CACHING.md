# Caching Implementation Guide

## Overview

The application implements an in-memory caching layer with automatic TTL (Time-To-Live) expiration and fallback mechanisms to prevent database overload from repeated requests.

## Architecture

### Cache Manager (`src/utils/cache.js`)

A singleton in-memory cache with:

- **Automatic expiration**: Values automatically expire after TTL
- **Error handling**: Safe degradation if caching fails
- **Works on**: Both local development and production (Render)
- **No external dependencies**: Pure Node.js implementation

#### Key Methods

```javascript
// Set cache with TTL (milliseconds)
cacheManager.set(key, value, ttl);

// Get cached value (returns null if expired/missing)
cacheManager.get(key);

// Invalidate specific cache
cacheManager.invalidate(key);

// Invalidate all cache
cacheManager.invalidateAll();

// Cached retrieval with automatic fallback
getCachedOrFetch(cacheKey, fetchFn, ttl);
```

## Current Implementations

### 1. System Settings Cache

**File**: `src/services/systemSettings.service.js`

**Cache Key**: `system_settings`  
**TTL**: 1 hour (3,600,000 ms) - Settings rarely change

**Usage**:

```javascript
export const getSettingsService = () => {
  return getCachedOrFetch(
    "system_settings",
    () => prisma.systemSettings.findUnique({ where: { id: 1 } }),
    60 * 60 * 1000 // 1 hour
  );
};
```

**Cache Invalidation**:

- Automatically invalidated when settings are updated
- Called in `updateSettingsService()`

### 2. Questions Cache

**File**: `src/services/question.service.js`

**Cache Keys**:

- `all_questions` - All questions
- `questions_bank_{bankId}` - Questions by bank
- `all_question_banks` - All question banks

**TTL**: 30 minutes (1,800,000 ms)

**Cache Invalidation**:

- When questions are created (`createQuestion()`)
- When questions are updated (`updateQuestion()`)
- When questions are deleted (`deleteQuestion()`)
- When questions are imported from CSV (`uploadQuestionsFromCsv()`)

#### Setup Functions

```javascript
// Invalidate question-related caches
const invalidateQuestionCaches = (bankId = null) => {
  try {
    cacheManager.invalidate("all_questions");
    if (bankId) {
      cacheManager.invalidate(`questions_bank_${bankId}`);
    }
    cacheManager.invalidate("all_question_banks");
  } catch (err) {
    console.warn("Could not invalidate question caches:", err.message);
  }
};
```

## How It Works

### On Cache Hit

1. Request comes in
2. `getCachedOrFetch()` checks cache first
3. If found and not expired → **Immediate response** (no DB query)
4. Logging: `[Cache] Hit: {key} (Age: 5s)`

### On Cache Miss

1. Cache not found or expired
2. Calls the `fetchFn()` to get fresh data from database
3. Stores result in cache with TTL
4. Returns data to client
5. Logging: `[Cache] Fetching fresh data for: {key}`

### On Cache Error

- If caching fails → Data is still returned from the database
- If fetching fails → Error is thrown (expected behavior)
- Caching failures are **non-blocking** (logged as warnings only)

## Features

### Fallback Mechanism

```javascript
try {
  // Try cache first
  const cached = cacheManager.get(cacheKey);
  if (cached !== null) return cached;

  // Fallback to fresh fetch
  const data = await fetchFn();

  // Try to cache (non-blocking)
  try {
    cacheManager.set(cacheKey, data, ttl);
  } catch (err) {
    // If caching fails, still return data
    console.warn("Caching failed, but returning data");
  }

  return data;
} catch (err) {
  // If fetch fails, throw error
  throw err;
}
```

### Environment Compatibility

- Works on **local development** (Node.js in-memory)
- Works on **Render.com** (each dyno gets its own cache)
- Works on **any Node.js environment**

### Monitoring

```javascript
// Check cache stats
const stats = cacheManager.getStats();
// Returns: { size: 3, keys: ['system_settings', ...] }
```

### ✅ Console Logging

Cache operations are logged for debugging:

```
[Cache] Set: system_settings (TTL: 3600000ms)
[Cache] Hit: system_settings (Age: 245s)
[Cache] Miss: all_questions
[Cache] Fetching fresh data for: all_questions
[Cache] Expired: questions_bank_5
[Cache] Invalidated: system_settings
```

## Adding More Caches

To add caching to another endpoint:

```javascript
// Step 1: Import at top of service file
import { getCachedOrFetch } from "../utils/cache.js";
import cacheManager from "../utils/cache.js";

// Step 2: Wrap your fetch function
export const getSomethingService = () => {
  return getCachedOrFetch(
    "my_cache_key",
    () => prisma.something.findMany(),
    30 * 60 * 1000 // 30 minutes TTL
  );
};

// Step 3: Add invalidation on create/update/delete
const invalidateSomethingCache = () => {
  try {
    cacheManager.invalidate("my_cache_key");
  } catch (err) {
    console.warn("Could not invalidate cache:", err.message);
  }
};

// Then call invalidateSomethingCache() after mutations
```

## Performance Impact

### Without Caching

- 100 requests/minute → 100 database queries
- High database load, slower response times

### With Caching (1 hour TTL)

- 100 requests/minute → 1 database query (per hour)
- 99% fewer queries, ~100x faster responses from cache
- Significantly reduced database load

## TTL Recommendations

| Data Type       | TTL         | Reason                          |
| --------------- | ----------- | ------------------------------- |
| System Settings | 1 hour      | Very rarely changes             |
| Questions       | 30 minutes  | Teachers may add/edit regularly |
| Tests           | 15 minutes  | Created/modified by teachers    |
| Student Data    | 5 minutes   | Frequently updated              |
| Real-time Data  | 1-2 minutes | Updated frequently              |

## Troubleshooting

### Cache not updating after changes

- Check if `invalidate()` is being called after mutations
- Verify cache key matches between get and invalidate

### Memory growing indefinitely

- Ensure TTL is set on all cached items (auto-expiration)
- Use `cacheManager.getStats()` to monitor cache size
- All timers are automatically cleaned up after expiration

### Always getting "stale" data

- Reduce TTL for more frequent updates
- Call `invalidate()` immediately after mutations

## Production Considerations

### Single Instance (Recommended)

- Current setup works perfectly for single instance
- Use on Render with 1 dyno

### Multiple Instances

- Each instance maintains its own cache
- Changes on one instance don't invalidate cache on others
- **Solution**: Use Redis for distributed caching (future enhancement)

### Memory Usage

- Average object: ~1KB in cache
- 1000 cached items: ~1MB
- Monitor with `cacheManager.getStats()`

## Future Enhancements

1. **Redis Integration**: For distributed caching across multiple instances
2. **Cache Warming**: Pre-load frequently accessed data at startup
3. **Conditional Caching**: Different TTLs based on data freshness requirements
4. **Cache Invalidation Webhooks**: Immediate invalidation across instances
