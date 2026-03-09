import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LayoutTemplate, Sparkles, Users, ArrowRight } from "lucide-react";
import { getUserEntitlements } from "@/lib/entitlements";
import { UpgradePrompt } from "@/components/ui/UpgradePrompt";
import { getCurrentOrg } from "@/lib/organizations";
import { DEFAULT_TEMPLATES } from "@/lib/defaultTemplates";
import { TemplatesClient } from "./TemplatesClient";
import type { EventTemplate, TemplateCategory } from "@/types";
import Link from "next/link";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const org = await getCurrentOrg();

  const { isPro } = await getUserEntitlements();

  let templatesQuery = supabase.from("event_templates").select("*").eq("user_id", user.id);
  if (org?.orgId) templatesQuery = templatesQuery.eq("organization_id", org.orgId);
  const { data: templates } = await templatesQuery.order("created_at", { ascending: false });

  // Map DB rows to EventTemplate type, providing defaults for new fields
  const items: EventTemplate[] = (templates ?? []).map((t: any) => ({
    id: t.id,
    user_id: t.user_id,
    name: t.name,
    description: t.description ?? null,
    category: (t.category as TemplateCategory) ?? "pricing",
    template_data: t.template_data ?? t.pricing_data ?? {},
    tags: t.tags ?? [],
    organization_id: t.organization_id ?? null,
    created_at: t.created_at,
    updated_at: t.updated_at ?? t.created_at,
  }));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-semibold">Template Library</h1>
          <p className="text-sm text-[#D4A373] mt-1">
            Save and reuse menus, pricing configs, pack lists, and timelines
          </p>
        </div>
      </div>

      {!isPro ? (
        <UpgradePrompt
          message="Event templates are a Pro feature. Upgrade to save and reuse event configurations."
          plan="pro"
        />
      ) : (
        <>
          <TemplatesClient templates={items} />

          {/* Starter Templates */}
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#D4A373]" />
              <h2 className="font-medium text-sm text-[#D4A373] uppercase tracking-wider">Starter Templates</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEFAULT_TEMPLATES.map((dt, idx) => (
                <div
                  key={idx}
                  className="p-5 flex flex-col justify-between gap-4 rounded-lg border border-dashed border-[#2A3A5C] bg-[#182030]/50"
                >
                  <div>
                    <h3 className="font-medium text-[#F4F1ED] mb-1 truncate">
                      {dt.name}
                    </h3>
                    <p className="text-xs text-[#D4A373] leading-snug mt-1">
                      {dt.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#D4A373] mt-3">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {dt.template_data.guest_count} guests
                      </span>
                      <span className="inline-flex items-center gap-1 capitalize">
                        <LayoutTemplate className="w-3.5 h-3.5" />
                        {dt.template_data.event_type}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#2A3A5C]">
                    <Link
                      href={`/events/new?defaultTemplate=${idx}`}
                      className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 w-full justify-center"
                    >
                      Use Template
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
