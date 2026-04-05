"use client";

import { CalendarDays, Clock, FileText, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface VenueDashboardCardsProps {
  todayBookings: number;
  weekBookings: number;
  pendingQuotes: number;
  monthlyRevenue: number;
}

export function VenueDashboardCards({
  todayBookings,
  weekBookings,
  pendingQuotes,
  monthlyRevenue,
}: VenueDashboardCardsProps) {
  const stats = [
    {
      icon: CalendarDays,
      label: "Today's Bookings",
      value: todayBookings,
      color: "text-brand-400",
      isNumeric: true,
    },
    {
      icon: Clock,
      label: "This Week",
      value: weekBookings,
      color: "text-brand-400",
      isNumeric: true,
    },
    {
      icon: FileText,
      label: "Pending Quotes",
      value: pendingQuotes,
      color: "text-[#D4A373]",
      isNumeric: true,
    },
    {
      icon: DollarSign,
      label: "Monthly Revenue",
      value: monthlyRevenue,
      color: "text-green-400",
      isNumeric: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {stats.map(({ icon: Icon, label, value, color, isNumeric }) => (
        <div key={label} className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className="stat-label text-xs md:text-sm">{label}</span>
          </div>
          <div className={`text-xl md:text-2xl font-semibold font-display`}>
            {isNumeric ? value : formatCurrency(value as number)}
          </div>
        </div>
      ))}
    </div>
  );
}
