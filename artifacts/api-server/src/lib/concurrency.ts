import { env } from "./env";

/**
 * FIFO semaphore bounding how many yt-dlp processes run at once, so a burst
 * of downloads cannot fork the server into the ground. Requests that wait
 * longer than `ytdlpQueueTimeoutMs` fail fast with a 503-friendly error.
 */
export class QueueTimeoutError extends Error {
  constructor() {
    super("Download queue is busy");
    this.name = "QueueTimeoutError";
  }
}

type Waiter = {
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

let active = 0;
const waiters: Waiter[] = [];

export function activeSlots(): number {
  return active;
}

export function queuedSlots(): number {
  return waiters.length;
}

export async function acquireSlot(): Promise<() => void> {
  if (active < env.ytdlpMaxConcurrent) {
    active += 1;
    return releaseSlot;
  }

  return new Promise<void>((resolve, reject) => {
    const waiter: Waiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const index = waiters.indexOf(waiter);
        if (index !== -1) waiters.splice(index, 1);
        reject(new QueueTimeoutError());
      }, env.ytdlpQueueTimeoutMs),
    };
    waiters.push(waiter);
  }).then(() => releaseSlot);
}

function releaseSlot(): void {
  active = Math.max(0, active - 1);

  const next = waiters.shift();
  if (next) {
    // Hand the slot directly to the next waiter (active count stays the same).
    clearTimeout(next.timer);
    active += 1;
    next.resolve();
  }
}

/** Test helper: reset internal state. */
export function resetSlots(): void {
  active = 0;
  for (const waiter of waiters.splice(0)) {
    clearTimeout(waiter.timer);
    waiter.reject(new QueueTimeoutError());
  }
}
