"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Calendar, ArrowRight } from "lucide-react";
import { safeParseDate } from "@/lib/utils";

export interface VenueBooking {
  id: string;
  title: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  space_name: string;
}

interface VenueUpcomingBookingsProps {
  bookings: VenueBooking[];
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  hold: { bg: "bg-yellow-950/40", text: "text-yellow-400", label: "Hold" },
  pending: {
    bg: "bg-yellow-950/40",
    text: "text-yellow-400",
    label: "Pending",
  },
  confirmed: {
    bg: "bg-green-950/40",
    text: "text-green-400",
    label: "Confirmed",
  },
  canceled: { bg: "bg-red-950/40", text: "text-red-400", label: "Canceled" },
  tentative: {
    bg: "bg-blue-950/40",
    text: "text-blue-400",
    label: "Tentative",
  },
};

export function VenueUpcomingBookings({
  bookings,
}: VenueUpcomingBookingsProps) {
  if (bookings.length === 0) {
    return (
      <div className="card p-8 flex flex-col items-center justify-center text-center">
        <Calendar className="w-10 h-10 text-[#7A8BA8] mb-3 opacity-50" />
        <h3 className="font-medium text-[#F4F1ED] mb-2">No upcoming bookings</h3>
        <p className="text-xs text-[#7A8BA8] mb-4 max-w-xs">
          Your booking schedule is empty. Check your availability settings.
        </p>
        <Link
          href="/availability"
          className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 transition-colors"
        >
          Manage availability
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 md:p-5 border-b border-[#2A3A5C]">
        <h2 className="font-medium text-sm text-[#D4A373] uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Upcoming Bookings
        </h2>
      </div>
      <div className="divide-y divide-[#2A3A5C]">
        {bookings.map((booking) => {
          const bookingDate = safeParseDate(booking.booking_date);
          const statusInfo = statusStyles[booking.status] || statusStyles.hold;

          return (
            <Link
              key={booking.id}
              href={`/events/${booking.id}`}
              className="p-3 md:p-4 hover:bg-[#182030] transition-colors group"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-[#F4F1ED] truncate group-hover:text-brand-400 transition-colors">
                    {booking.title}
                  </h3>
                  <p className="text-xs text-[#7A8BA8] mt-0.5">
                    {format(bookingDate, "MMM d, yyyy")} •{" "}
                    {booking.start_time
                      ? format(
                          new Date(
                            `2024-01-01T${booking.start_time}`
                          ),
                          "h:mm a"
                        )
                      : "All day"}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${statusInfo.bg} ${statusInfo.text}`}
                >
                  {statusInfo.label}
                </span>
              </div>
              <div className="text-xs text-[#D4A373] bg-[#182030] inline-block px-2 py-1 rounded mt-2">
                {booking.space_name}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
