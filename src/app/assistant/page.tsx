import { AssistantPageClient } from "./AssistantPageClient";
import { getUserEntitlements } from "@/lib/entitlements";
import { UpgradePrompt } from "@/components/ui/UpgradePrompt";

export default async function AssistantPage() {
  const { isPro } = await getUserEntitlements();

  if (!isPro) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
        <UpgradePrompt
          message="AI Assistant is a Pro feature. Upgrade to get business insights and automate tasks."
          plan="pro"
        />
      </div>
    );
  }

  return <AssistantPageClient />;
}
