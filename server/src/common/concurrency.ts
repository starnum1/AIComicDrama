/**
 * 控制并发的批量执行器
 *
 * @param taskFactories - 工厂函数数组（() => Promise），而非 Promise 数组。
 *   如果直接传入 Promise 数组，所有任务会在 push 时立即启动，并发控制失效。
 * @param concurrency - 最大并发数
 * @param onProgress - 可选的进度回调，每完成一个任务调用一次
 */
export async function executeBatch(
  taskFactories: Array<() => Promise<void>>,
  concurrency: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  const total = taskFactories.length;
  let completed = 0;
  const executing = new Set<Promise<void>>();

  for (const factory of taskFactories) {
    const task = factory();
    const wrapped = task.then(
      () => {
        executing.delete(wrapped);
        completed++;
        onProgress?.(completed, total);
      },
      () => {
        executing.delete(wrapped);
        completed++;
        onProgress?.(completed, total);
      },
    );
    executing.add(wrapped);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}
