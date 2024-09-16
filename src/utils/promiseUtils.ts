/**
 * Process a number of promises in chunks to optimize performance and avoid too many requests in parallel.
 * Returns the same results as Promise.allSettled()
 **/
export async function processPromisesInChunks<T>(
  promises: Promise<T>[],
  chunkSize: number,
): Promise<PromiseSettledResult<T>[]> {
  const chunkArray = <U>(array: U[], size: number): U[][] => {
    const chunks: U[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const promiseChunks = chunkArray(promises, chunkSize);
  const results: PromiseSettledResult<T>[] = [];

  for (const chunk of promiseChunks) {
    const chunkResults = await Promise.allSettled(chunk);
    results.push(...chunkResults);
  }

  return results;
}
