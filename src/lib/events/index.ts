// Domain Events — public API
export { domainEvents } from "./bus";
export { registerDomainEventHandlers } from "./handlers";
export type {
  DomainEventMap,
  DomainEventName,
  DomainEvent,
} from "./types";
