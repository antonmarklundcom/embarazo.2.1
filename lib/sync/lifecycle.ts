/** Stop background work before a device wipe, then wait for every writer. */
export class SyncLifecycle {
  private paused = false;
  private active = new Set<{ controller: AbortController; done: Promise<void> }>();

  begin(): { signal: AbortSignal; finish: () => void } | null {
    if (this.paused) return null;
    const controller = new AbortController();
    let finish!: () => void;
    const done = new Promise<void>((resolve) => { finish = resolve; });
    const task = { controller, done };
    this.active.add(task);
    return {
      signal: controller.signal,
      finish: () => { this.active.delete(task); finish(); },
    };
  }

  async pause(): Promise<void> {
    this.paused = true;
    const tasks = [...this.active];
    for (const task of tasks) task.controller.abort();
    await Promise.all(tasks.map((task) => task.done));
  }

  resume(): void { this.paused = false; }
}
