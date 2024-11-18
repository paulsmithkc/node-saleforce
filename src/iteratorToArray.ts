export async function iteratorToArray<T>(itr: AsyncGenerator<T>): Promise<T[]> {
  const arr: T[] = [];
  for await (const item of itr) {
    arr.push(item);
  }
  return arr;
}
