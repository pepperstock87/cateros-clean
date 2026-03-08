import { AssistantPageClient } from "./AssistantPageClient";
import { getOrgEntitlements } from "@/lib/orgEntitlements";
import { FeatureGate } from "@/components/ui/FeatureGate";

export default async function AssistantPage() {
  const { plan } = await getOrgEntitlements();

  return (
    <FeatureGate feature="ai_assistant" plan={plan} requiredPlans={["pro"]}>
      <AssistantPageClient />
    </FeatureGate>
  );
}
