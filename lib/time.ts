
// lib/time.ts

/**
 * Returns seconds from current time.
 * @param seconds Number of seconds from now.
 */
export function secondsFromNow(seconds: number): number {
  return Math.floor(Date.now() / 1000) + seconds;
}
