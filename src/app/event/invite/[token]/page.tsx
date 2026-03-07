import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, Users, MapPin, ChefHat, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { InviteResponseClient } from "./InviteResponseClient";

const RELATIONSHIP_LABELS: Record<string, string> = {
  caterer: "Caterer",
  venue: "Venue",
  planner: "Planner",
  rental_vendor: "Rental Company",
  florist: "Florist",
  entertainment_vendor: "Entertainment",
  other_vendor: "Vendor",
};

type Props = { params: Promise<{ token: string }> };

export default async function EventInvitePage({ params }: Props) {
  const { token } = await params;

  // Use service role to bypass RLS (public page)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invite } = await supabase
    .from("event_invites")
    .select("*")
    .eq("invite_token", token)
    .single();

  if (!invite) notFound();

  // Check if expired by date
  const isExpiredByDate = invite.expires_at && new Date(invite.expires_at) < new Date();
  const effectiveStatus = isExpiredByDate && invite.status === "pending" ? "expired" : invite.status;

  // Fetch event basic info
  const { data: event } = await supabase
    .from("events")
    .select("id, name, event_date, start_time, end_time, venue, guest_count, client_name")
    .eq("id", invite.event_id)
    .single();

  // Fetch inviter's business settings for branding
  const { data: settings } = await supabase
    .from("business_settings")
    .select("business_name, logo_url, phone, email, brand_color")
    .eq("user_id", invite.created_by)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, full_name")
    .eq("id", invite.created_by)
    .single();

  const companyName = settings?.business_name || profile?.company_name || "A Cateros user";
  const inviterName = profile?.full_name || companyName;
  const roleLabel = RELATIONSHIP_LABELS[invite.relationship_type] || "Vendor";

  // Non-pending statuses get a simple status page
  if (effectiveStatus !== "pending") {
    return (
      <div className="min-h-screen bg-[#0f0d0b] flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-semibold">Cateros</span>
          </div>

          <div className="card p-8">
            {effectiveStatus === "accepted" && (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h1 className="font-display text-xl font-semibold mb-2">Invite Accepted</h1>
                <p className="text-sm text-[#9c8876]">
                  This invite has already been accepted. You can access the event from your dashboard.
                </p>
              </>
            )}
            {effectiveStatus === "declined" && (
              <>
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h1 className="font-display text-xl font-semibold mb-2">Invite Declined</h1>
                <p className="text-sm text-[#9c8876]">This invite was declined.</p>
              </>
            )}
            {effectiveStatus === "expired" && (
              <>
                <Clock className="w-12 h-12 text-[#6b5a4a] mx-auto mb-4" />
                <h1 className="font-display text-xl font-semibold mb-2">Invite Expired</h1>
                <p className="text-sm text-[#9c8876]">
                  This invite has expired. Please contact the event organizer for a new invite.
                </p>
              </>
            )}
            {effectiveStatus === "revoked" && (
              <>
                <AlertTriangle className="w-12 h-12 text-[#6b5a4a] mx-auto mb-4" />
                <h1 className="font-display text-xl font-semibold mb-2">Invite Revoked</h1>
                <p className="text-sm text-[#9c8876]">
                  This invite has been revoked by the event organizer.
                </p>
              </>
            )}
          </div>

          <p className="text-xs text-[#6b5a4a] mt-6">Powered by Cateros</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0d0b]">
      {/* Header */}
      <div className="border-b border-[#2e271f]">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              {settings?.logo_url && (
                <img src={settings.logo_url} alt="" className="h-10 mb-3 object-contain" />
              )}
              <h1 className="font-display text-xl font-semibold">{companyName}</h1>
              {(settings?.phone || settings?.email) && (
                <p className="text-xs text-[#9c8876] mt-1">
                  {[settings?.phone, settings?.email].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-1">
                Event Invite
              </div>
              <div className="text-xs text-[#9c8876]">
                {invite.expires_at && (
                  <>Expires {format(new Date(invite.expires_at), "MMM d, yyyy")}</>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Invitation message */}
        <div className="card p-6 text-center">
          <h2 className="font-display text-2xl font-semibold mb-2">
            You&apos;re Invited
          </h2>
          <p className="text-sm text-[#9c8876]">
            <span className="text-[#f5ede0] font-medium">{inviterName}</span> has invited you to join
            {event ? (
              <> the event <span className="text-[#f5ede0] font-medium">&ldquo;{event.name}&rdquo;</span></>
            ) : (
              " an event"
            )} as a <span className="text-brand-300 font-medium">{invite.role_label || roleLabel}</span>.
          </p>
          {invite.invited_name && (
            <p className="text-xs text-[#6b5a4a] mt-2">
              Invited: {invite.invited_name}
              {invite.invited_email && ` (${invite.invited_email})`}
            </p>
          )}
          {invite.notes && (
            <div className="mt-4 p-3 rounded-lg bg-[#1a1714] border border-[#2e271f]">
              <p className="text-xs text-[#9c8876] italic">&ldquo;{invite.notes}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Event details */}
        {event && (
          <div>
            <h3 className="text-xs font-medium text-brand-400 uppercase tracking-wider mb-3">
              Event Details
            </h3>
            <div className="card p-5">
              <h4 className="font-display text-lg font-semibold mb-1">{event.name}</h4>
              <p className="text-sm text-[#9c8876] mb-4">Client: {event.client_name}</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#1a1714] border border-[#2e271f] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CalendarDays className="w-3.5 h-3.5 text-[#9c8876]" />
                    <span className="text-xs text-[#9c8876]">Date</span>
                  </div>
                  <div className="text-sm font-medium">
                    {format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}
                  </div>
                  {(event.start_time || event.end_time) && (
                    <div className="text-xs text-[#6b5a4a] mt-0.5">
                      {event.start_time && event.start_time}
                      {event.start_time && event.end_time && " - "}
                      {event.end_time && event.end_time}
                    </div>
                  )}
                </div>

                <div className="bg-[#1a1714] border border-[#2e271f] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-3.5 h-3.5 text-[#9c8876]" />
                    <span className="text-xs text-[#9c8876]">Guests</span>
                  </div>
                  <div className="text-sm font-medium">{event.guest_count}</div>
                </div>

                {event.venue && (
                  <div className="bg-[#1a1714] border border-[#2e271f] rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-[#9c8876]" />
                      <span className="text-xs text-[#9c8876]">Venue</span>
                    </div>
                    <div className="text-sm font-medium truncate">{event.venue}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Response actions */}
        <InviteResponseClient inviteToken={token} eventId={event?.id ?? null} />

        {/* Footer */}
        <div className="text-center text-xs text-[#6b5a4a] pt-4 pb-8">
          Powered by Cateros
        </div>
      </div>
    </div>
  );
}
