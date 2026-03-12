// Connector Registry
//
// Central registry of all available distributor connectors.
// Connectors self-register on import. Look up by connector type.

import type { ConnectorType } from "./types";
import type { DistributorConnector } from "./connector";

const connectors = new Map<ConnectorType, DistributorConnector>();

export function registerConnector(connector: DistributorConnector): void {
  connectors.set(connector.connectorType, connector);
}

export function getConnector(type: ConnectorType): DistributorConnector | null {
  return connectors.get(type) ?? null;
}

export function listConnectors(): Array<{
  type: ConnectorType;
  displayName: string;
  supportedTransports: string[];
}> {
  return Array.from(connectors.values()).map((c) => ({
    type: c.connectorType,
    displayName: c.displayName,
    supportedTransports: [...c.supportedTransports],
  }));
}
