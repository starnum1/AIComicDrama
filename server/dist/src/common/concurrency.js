"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeBatch = executeBatch;
async function executeBatch(taskFactories, concurrency, onProgress) {
    const total = taskFactories.length;
    let completed = 0;
    const executing = new Set();
    for (const factory of taskFactories) {
        const task = factory();
        const wrapped = task.then(() => {
            executing.delete(wrapped);
            completed++;
            onProgress?.(completed, total);
        }, () => {
            executing.delete(wrapped);
            completed++;
            onProgress?.(completed, total);
        });
        executing.add(wrapped);
        if (executing.size >= concurrency) {
            await Promise.race(executing);
        }
    }
    await Promise.all(executing);
}
//# sourceMappingURL=concurrency.js.map