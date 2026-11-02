// D1 每条 SQL 最多只能有 100 个参数，一次写入多行时需要分批

/** 把数组按 size 个一组分开 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}
