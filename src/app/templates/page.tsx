import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutTemplate, Users, CalendarDays, Trash2, ArrowRight } from "lucide-react";
import { DeleteTemplateButton } from "./DeleteTemplateButton";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: templates } = await supabase
    .from("event_templates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = templates ?? [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Event Templates</h1>
          <p className="text-sm text-[#9c8876] mt-1">
            Reusable templates to quickly create new events
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-16 text-center">
          <LayoutTemplate className="w-10 h-10 text-[#6b5a4a] mx-auto mb-4" />
          <h2 className="font-medium text-lg mb-2">No templates yet</h2>
          <p className="text-sm text-[#9c8876] mb-6">
            Save an event as a template from any event page.
          </p>
          <Link
            href="/events"
            className="btn-primary inline-flex items-center gap-2"
          >
            <CalendarDays className="w-4 h-4" />
            Go to Events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((template) => {
            const guestCount = template.guest_count;
            const createdDate = new Date(template.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            // Try to extract event type from pricing_data if available
            const pricingData = template.pricing_data as Record<string, unknown> | null;
            const eventType = pricingData?.event_type as string | undefined;

            return (
              <div
                key={template.id}
                className="card p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <h3 className="font-medium text-[#f5ede0] mb-1 truncate">
                    {template.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#9c8876] mt-2">
                    {guestCount && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {guestCount} guests
                      </span>
                    )}
                    {eventType && (
                      <span className="inline-flex items-center gap-1 capitalize">
                        <LayoutTemplate className="w-3.5 h-3.5" />
                        {eventType}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6b5a4a] mt-3">
                    Created {createdDate}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#2e271f]">
                  <Link
                    href={`/events/new?template=${template.id}`}
                    className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 flex-1 justify-center"
                  >
                    Use Template
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <DeleteTemplateButton templateId={template.id} templateName={template.name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
