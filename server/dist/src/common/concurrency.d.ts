export declare function executeBatch(taskFactories: Array<() => Promise<void>>, concurrency: number, onProgress?: (completed: number, total: number) => void): Promise<void>;
