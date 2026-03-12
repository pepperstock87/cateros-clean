// Register all distributor connectors
import { registerConnector } from "../registry";
import { PFGConnector } from "./pfg";

export function registerAllConnectors() {
  registerConnector(new PFGConnector());
  // Future:
  // registerConnector(new SyscoConnector());
  // registerConnector(new USFoodsConnector());
  // registerConnector(new BaldorConnector());
}

// Auto-register on import
registerAllConnectors();
