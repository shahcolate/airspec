/**
 * Token counting with tiktoken and character-based fallback.
 */

let tiktokenEncoder: { encode: (text: string) => { length: number } } | null = null;
let tiktokenLoaded = false;

/**
 * Attempt to load tiktoken encoder. Falls back to char-based estimation.
 */
async function loadEncoder(): Promise<void> {
  if (tiktokenLoaded) return;
  tiktokenLoaded = true;
  try {
    const tiktoken = await import('tiktoken');
    tiktokenEncoder = tiktoken.encoding_for_model('gpt-4o');
  } catch {
    // Fallback to character-based estimation
    tiktokenEncoder = null;
  }
}

/**
 * Count tokens in a string.
 * Uses tiktoken cl100k_base if available, otherwise chars / 4.
 */
export async function countTokens(text: string): Promise<number> {
  await loadEncoder();
  if (tiktokenEncoder) {
    try {
      return tiktokenEncoder.encode(text).length;
    } catch {
      // Fall back to char estimation if encoding fails (e.g. special tokens)
      return Math.ceil(text.length / 4);
    }
  }
  return Math.ceil(text.length / 4);
}

/**
 * Synchronous token count using char-based estimation.
 * Use when async is not convenient and precision is not critical.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
