// Internal Domain Event Bus
//
// In-process, type-safe event bus for decoupled communication between modules.
// Handlers run async and non-blocking — a handler failure never blocks the emitter.
// This is the foundation for wiring CAIN, QuickBooks, payroll, and notifications
// without coupling those systems to core business logic.

import type { DomainEventMap, DomainEventName, DomainEvent } from "./types";

type Handler<T extends DomainEventName> = (
  event: DomainEvent<T>
) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Set<Handler<any>>>();
  private globalHandlers = new Set<Handler<any>>();

  /**
   * Subscribe to a specific domain event.
   * Returns an unsubscribe function.
   */
  on<T extends DomainEventName>(name: T, handler: Handler<T>): () => void {
    if (!this.handlers.has(name)) {
      this.handlers.set(name, new Set());
    }
    this.handlers.get(name)!.add(handler);
    return () => this.handlers.get(name)?.delete(handler);
  }

  /**
   * Subscribe to ALL domain events. Useful for logging, analytics, or CAIN context.
   */
  onAny(handler: Handler<DomainEventName>): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  /**
   * Emit a domain event. All handlers run async and errors are caught per-handler.
   * The emitter is never blocked by handler failures.
   */
  async emit<T extends DomainEventName>(
    name: T,
    payload: DomainEventMap[T],
    source: string
  ): Promise<void> {
    const event: DomainEvent<T> = {
      id: crypto.randomUUID(),
      name,
      payload,
      timestamp: new Date().toISOString(),
      source,
    };

    const handlers = this.handlers.get(name);
    const promises: Promise<void>[] = [];

    if (handlers) {
      for (const handler of handlers) {
        promises.push(
          Promise.resolve()
            .then(() => handler(event))
            .catch((err) => {
              console.error(
                `[event-bus] Handler error for "${name}" from "${source}":`,
                err instanceof Error ? err.message : err
              );
            })
        );
      }
    }

    for (const handler of this.globalHandlers) {
      promises.push(
        Promise.resolve()
          .then(() => handler(event as DomainEvent<DomainEventName>))
          .catch((err) => {
            console.error(
              `[event-bus] Global handler error for "${name}":`,
              err instanceof Error ? err.message : err
            );
          })
      );
    }

    // Fire-and-forget: don't await handlers by default.
    // Callers can await if they need to ensure handlers complete.
    await Promise.allSettled(promises);
  }

  /**
   * Remove all handlers. Useful for testing.
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers.clear();
  }
}

// Singleton instance — shared across the application
export const domainEvents = new EventBus();
