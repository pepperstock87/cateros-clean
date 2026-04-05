"use client";

import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import type { VenueSpace, VenueBooking } from "@/types";
import {
  createBookingAction,
  updateBookingAction,
  cancelBookingAction,
} from "@/lib/actions/bookings";

const SPACE_COLORS = [
  "#4F8CF7",
  "#F7B84F",
  "#4FF78C",
  "#F74F8C",
  "#8C4FF7",
  "#F7584F",
  "#4FC4F7",
  "#C4F74F",
];

type SelectedDay = {
  date: Date;
  bookings: VenueBooking[];
} | null;

type NewBookingForm = {
  spaceId: string;
  title: string;
  clientName: string;
  clientEmail: string;
  startTime: string;
  endTime: string;
  notes: string;
};

type EditingBooking = {
  id: string;
  title: string;
  clientName: string;
  clientEmail: string;
  startTime: string;
  endTime: string;
  notes: string;
};

export function VenueCalendar({
  spaces,
  bookings: initialBookings,
  onBookingsChange,
}: {
  spaces: VenueSpace[];
  bookings: VenueBooking[];
  onBookingsChange: (bookings: VenueBooking[]) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<SelectedDay>(null);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState<EditingBooking | null>(
    null
  );
  const [bookings, setBookings] = useState(initialBookings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newBooking, setNewBooking] = useState<NewBookingForm>({
    spaceId: spaces[0]?.id || "",
    title: "",
    clientName: "",
    clientEmail: "",
    startTime: "09:00",
    endTime: "17:00",
    notes: "",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get space color
  const getSpaceColor = (spaceId: string) => {
    const index = spaces.findIndex((s) => s.id === spaceId);
    return SPACE_COLORS[index % SPACE_COLORS.length];
  };

  // Get space name
  const getSpaceName = (spaceId: string) => {
    return spaces.find((s) => s.id === spaceId)?.name || "Unknown Space";
  };

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Get bookings for a day
  const getBookingsForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return bookings.filter((b) => b.booking_date === dateStr);
  };

  // Month navigation
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Handle new booking submission
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;

    setLoading(true);
    setError(null);

    try {
      const dateStr = selectedDay.date.toISOString().split("T")[0];
      const result = await createBookingAction({
        space_id: newBooking.spaceId,
        title: newBooking.title,
        client_name: newBooking.clientName || undefined,
        client_email: newBooking.clientEmail || undefined,
        booking_date: dateStr,
        start_time: newBooking.startTime,
        end_time: newBooking.endTime,
        notes: newBooking.notes || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setBookings([...bookings, result.data]);
        onBookingsChange([...bookings, result.data]);
        setNewBooking({
          spaceId: spaces[0]?.id || "",
          title: "",
          clientName: "",
          clientEmail: "",
          startTime: "09:00",
          endTime: "17:00",
          notes: "",
        });
        setShowNewBooking(false);
        // Update selected day
        setSelectedDay({
          date: selectedDay.date,
          bookings: [...selectedDay.bookings, result.data],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle booking update
  const handleUpdateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    setLoading(true);
    setError(null);

    try {
      const result = await updateBookingAction(editingBooking.id, {
        title: editingBooking.title,
        client_name: editingBooking.clientName || undefined,
        client_email: editingBooking.clientEmail || undefined,
        start_time: editingBooking.startTime,
        end_time: editingBooking.endTime,
        notes: editingBooking.notes || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        const updated: VenueBooking[] = bookings.map((b) =>
          b.id === editingBooking.id ? result.data! : b
        );
        setBookings(updated);
        onBookingsChange(updated);
        setEditingBooking(null);

        // Update selected day
        if (selectedDay) {
          const updatedDayBookings: VenueBooking[] = updated.filter(
            (b) =>
              b.booking_date === selectedDay.date.toISOString().split("T")[0]
          );
          setSelectedDay({ date: selectedDay.date, bookings: updatedDayBookings });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Cancel this booking?")) return;

    setLoading(true);
    setError(null);

    try {
      const result = await cancelBookingAction(bookingId);

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        const updated: VenueBooking[] = bookings.map((b) =>
          b.id === bookingId ? result.data! : b
        );
        setBookings(updated);
        onBookingsChange(updated);

        // Update selected day
        if (selectedDay) {
          const updatedDayBookings: VenueBooking[] = updated.filter(
            (b) =>
              b.booking_date === selectedDay.date.toISOString().split("T")[0]
          );
          setSelectedDay({ date: selectedDay.date, bookings: updatedDayBookings });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const monthName = new Date(year, month, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Month Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#F4F1ED]">{monthName}</h2>
        <div className="flex gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 hover:bg-[#182030] rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-[#D4A373]" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-[#182030] rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-[#D4A373]" />
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Calendar Grid */}
        <div className="flex-1">
          {/* Space Legend */}
          <div className="mb-4 flex flex-wrap gap-2">
            {spaces.map((space) => (
              <div key={space.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getSpaceColor(space.id) }}
                />
                <span className="text-sm text-[#7A8BA8]">{space.name}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="bg-[#182030] rounded-lg border border-[#2A3A5C] p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-[#7A8BA8]"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, idx) => {
                const dayBookings = day ? getBookingsForDay(day) : [];
                const isToday =
                  day &&
                  day.toDateString() === new Date().toDateString();
                const isSelected =
                  day && selectedDay?.date.toDateString() === day.toDateString();

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (day) {
                        setSelectedDay({
                          date: day,
                          bookings: dayBookings,
                        });
                        setShowNewBooking(false);
                        setEditingBooking(null);
                      }
                    }}
                    className={`min-h-24 p-2 rounded-lg border cursor-pointer transition-colors ${
                      day
                        ? isToday
                          ? "bg-[#1A2538] border-[#D4A373]"
                          : isSelected
                            ? "bg-[#1A2538] border-brand-400"
                            : "bg-[#0C1220] border-[#2A3A5C] hover:border-[#3A4A6C]"
                        : ""
                    }`}
                  >
                    {day && (
                      <>
                        <div
                          className={`text-sm font-medium mb-1 ${
                            isToday
                              ? "text-[#D4A373]"
                              : "text-[#F4F1ED]"
                          }`}
                        >
                          {day.getDate()}
                        </div>
                        <div className="flex flex-col gap-1">
                          {dayBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="text-xs px-1.5 py-0.5 rounded text-white truncate"
                              style={{
                                backgroundColor: getSpaceColor(
                                  booking.space_id
                                ),
                                opacity: booking.status === "canceled" ? 0.5 : 1,
                                textDecoration:
                                  booking.status === "canceled"
                                    ? "line-through"
                                    : "none",
                              }}
                              title={booking.title}
                            >
                              {booking.title}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-[#182030] rounded-lg border border-[#2A3A5C] p-4 h-fit sticky top-20">
          {selectedDay ? (
            <>
              <div className="mb-4">
                <h3 className="font-semibold text-[#F4F1ED] mb-2">
                  {selectedDay.date.toLocaleDateString("default", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </h3>

                {selectedDay.bookings.length === 0 && !showNewBooking && (
                  <p className="text-sm text-[#7A8BA8] mb-4">No bookings</p>
                )}

                {/* Bookings List */}
                <div className="space-y-2 mb-4">
                  {selectedDay.bookings
                    .filter((b) => b.status !== "canceled")
                    .map((booking) => (
                      <div
                        key={booking.id}
                        className="bg-[#0C1220] rounded border border-[#2A3A5C] p-3"
                      >
                        {editingBooking?.id === booking.id ? (
                          <form
                            onSubmit={handleUpdateBooking}
                            className="space-y-2"
                          >
                            <input
                              type="text"
                              value={editingBooking.title}
                              onChange={(e) =>
                                setEditingBooking({
                                  ...editingBooking,
                                  title: e.target.value,
                                })
                              }
                              className="w-full bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-1 text-sm border border-[#2A3A5C]"
                              placeholder="Title"
                            />
                            <input
                              type="text"
                              value={editingBooking.clientName}
                              onChange={(e) =>
                                setEditingBooking({
                                  ...editingBooking,
                                  clientName: e.target.value,
                                })
                              }
                              className="w-full bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-1 text-sm border border-[#2A3A5C]"
                              placeholder="Client name"
                            />
                            <div className="flex gap-2">
                              <input
                                type="time"
                                value={editingBooking.startTime}
                                onChange={(e) =>
                                  setEditingBooking({
                                    ...editingBooking,
                                    startTime: e.target.value,
                                  })
                                }
                                className="flex-1 bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-1 text-sm border border-[#2A3A5C]"
                              />
                              <input
                                type="time"
                                value={editingBooking.endTime}
                                onChange={(e) =>
                                  setEditingBooking({
                                    ...editingBooking,
                                    endTime: e.target.value,
                                  })
                                }
                                className="flex-1 bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-1 text-sm border border-[#2A3A5C]"
                              />
                            </div>
                            <textarea
                              value={editingBooking.notes}
                              onChange={(e) =>
                                setEditingBooking({
                                  ...editingBooking,
                                  notes: e.target.value,
                                })
                              }
                              className="w-full bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-1 text-sm border border-[#2A3A5C]"
                              placeholder="Notes"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded px-2 py-1 text-sm font-medium disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBooking(null)}
                                className="flex-1 bg-[#2A3A5C] hover:bg-[#3A4A6C] text-[#F4F1ED] rounded px-2 py-1 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-semibold text-[#F4F1ED]">
                                  {booking.title}
                                </div>
                                <div className="text-xs text-[#7A8BA8]">
                                  {getSpaceName(booking.space_id)}
                                </div>
                              </div>
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: getSpaceColor(
                                    booking.space_id
                                  ),
                                }}
                              />
                            </div>
                            <div className="text-sm text-[#D4A373] mb-1">
                              {booking.start_time} - {booking.end_time}
                            </div>
                            {booking.client_name && (
                              <div className="text-xs text-[#7A8BA8] mb-1">
                                {booking.client_name}
                              </div>
                            )}
                            <div
                              className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-2"
                              style={{
                                backgroundColor:
                                  booking.status === "confirmed"
                                    ? "#4FF78C"
                                    : "#F7B84F",
                                color: "#000",
                              }}
                            >
                              {booking.status}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  setEditingBooking({
                                    id: booking.id,
                                    title: booking.title,
                                    clientName: booking.client_name || "",
                                    clientEmail: booking.client_email || "",
                                    startTime: booking.start_time,
                                    endTime: booking.end_time,
                                    notes: booking.notes || "",
                                  })
                                }
                                className="flex-1 text-xs bg-[#2A3A5C] hover:bg-[#3A4A6C] text-[#D4A373] rounded px-2 py-1"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={loading}
                                className="flex-1 text-xs bg-red-900 hover:bg-red-800 text-red-100 rounded px-2 py-1 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>

                {/* New Booking Form */}
                {showNewBooking ? (
                  <form onSubmit={handleCreateBooking} className="space-y-3">
                    <select
                      value={newBooking.spaceId}
                      onChange={(e) =>
                        setNewBooking({
                          ...newBooking,
                          spaceId: e.target.value,
                        })
                      }
                      className="w-full bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-2 text-sm border border-[#2A3A5C]"
                    >
                      {spaces.map((space) => (
                        <option key={space.id} value={space.id}>
                          {space.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={newBooking.title}
                      onChange={(e) =>
                        setNewBooking({
                          ...newBooking,
                          title: e.target.value,
                        })
                      }
                      className="w-full bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-2 text-sm border border-[#2A3A5C]"
                      placeholder="Booking title"
                      required
                    />
                    <input
                      type="text"
                      value={newBooking.clientName}
                      onChange={(e) =>
                        setNewBooking({
                          ...newBooking,
                          clientName: e.target.value,
                        })
                      }
                      className="w-full bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-2 text-sm border border-[#2A3A5C]"
                      placeholder="Client name (optional)"
                    />
                    <input
                      type="email"
                      value={newBooking.clientEmail}
                      onChange={(e) =>
                        setNewBooking({
                          ...newBooking,
                          clientEmail: e.target.value,
                        })
                      }
                      className="w-full bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-2 text-sm border border-[#2A3A5C]"
                      placeholder="Client email (optional)"
                    />
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={newBooking.startTime}
                        onChange={(e) =>
                          setNewBooking({
                            ...newBooking,
                            startTime: e.target.value,
                          })
                        }
                        className="flex-1 bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-2 text-sm border border-[#2A3A5C]"
                        required
                      />
                      <input
                        type="time"
                        value={newBooking.endTime}
                        onChange={(e) =>
                          setNewBooking({
                            ...newBooking,
                            endTime: e.target.value,
                          })
                        }
                        className="flex-1 bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-2 text-sm border border-[#2A3A5C]"
                        required
                      />
                    </div>
                    <textarea
                      value={newBooking.notes}
                      onChange={(e) =>
                        setNewBooking({
                          ...newBooking,
                          notes: e.target.value,
                        })
                      }
                      className="w-full bg-[#1A2538] text-[#F4F1ED] rounded px-2 py-2 text-sm border border-[#2A3A5C]"
                      placeholder="Notes (optional)"
                      rows={3}
                    />
                    {error && (
                      <div className="text-xs text-red-400 bg-red-900/20 rounded px-2 py-1">
                        {error}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
                      >
                        Add Booking
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewBooking(false)}
                        className="flex-1 bg-[#2A3A5C] hover:bg-[#3A4A6C] text-[#F4F1ED] rounded px-3 py-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setShowNewBooking(true);
                      setEditingBooking(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white rounded px-3 py-2 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Booking
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center text-[#7A8BA8] text-sm">
              Select a day to view or add bookings
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
