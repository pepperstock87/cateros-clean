"use client";

import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";

const COMMON_TIMES = [
  "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30",
  "21:00",
];

function to12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Parse loose user input like "4", "430", "4:30", "4p", "430pm" into HH:mm (24h) */
function parseTimeInput(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return null;

  let isPM: boolean | null = null;
  let cleaned = s;

  if (cleaned.endsWith("pm") || cleaned.endsWith("p")) {
    isPM = true;
    cleaned = cleaned.replace(/p(?:m)?$/, "");
  } else if (cleaned.endsWith("am") || cleaned.endsWith("a")) {
    isPM = false;
    cleaned = cleaned.replace(/a(?:m)?$/, "");
  }

  let hours: number;
  let minutes: number;

  if (cleaned.includes(":")) {
    const [hStr, mStr] = cleaned.split(":");
    hours = parseInt(hStr, 10);
    minutes = parseInt(mStr || "0", 10);
  } else {
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) return null;

    if (num >= 100) {
      // e.g. 430 → 4:30, 1130 → 11:30
      hours = Math.floor(num / 100);
      minutes = num % 100;
    } else {
      // e.g. 4 → 4:00
      hours = num;
      minutes = 0;
    }
  }

  if (isNaN(hours) || isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  // Apply AM/PM
  if (isPM !== null && hours <= 12) {
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
  } else if (isPM === null && hours >= 1 && hours <= 6) {
    // Default ambiguous 1-6 to PM (hospitality events are usually afternoon/evening)
    hours += 12;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

interface Props {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SmartTimeInput({ name, value, onChange, placeholder = "e.g. 5:00 PM", className }: Props) {
  const [displayValue, setDisplayValue] = useState(value ? to12(value) : "");
  const [hiddenValue, setHiddenValue] = useState(value || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (value !== undefined) {
      setHiddenValue(value);
      setDisplayValue(value ? to12(value) : "");
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function commitValue(time24: string) {
    setHiddenValue(time24);
    setDisplayValue(time24 ? to12(time24) : "");
    onChange?.(time24);
  }

  function handleBlur() {
    const parsed = parseTimeInput(displayValue);
    if (parsed) {
      commitValue(parsed);
    } else if (displayValue.trim() === "") {
      commitValue("");
    } else {
      // Revert to last valid value
      setDisplayValue(hiddenValue ? to12(hiddenValue) : "");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleBlur();
      setShowDropdown(false);
    } else if (e.key === "Escape") {
      setDisplayValue(hiddenValue ? to12(hiddenValue) : "");
      setShowDropdown(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" && !showDropdown) {
      setShowDropdown(true);
    }
  }

  function handleSelect(time24: string) {
    commitValue(time24);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={hiddenValue} />
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          value={displayValue}
          onChange={(e) => setDisplayValue(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => {
            // Delay to allow dropdown clicks to register
            setTimeout(() => {
              handleBlur();
              // Only close if focus left the wrapper
              if (!wrapperRef.current?.contains(document.activeElement)) {
                setShowDropdown(false);
              }
            }, 150);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className || "input pr-9"}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => { setShowDropdown(!showDropdown); inputRef.current?.focus(); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7A8BA8] hover:text-[#D4A373] transition-colors"
        >
          <Clock className="w-4 h-4" />
        </button>
      </div>
      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#111827] border border-[#2A3A5C] rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {COMMON_TIMES.map((t) => (
            <button
              key={t}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(t)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-950 hover:text-brand-300 transition-colors ${
                hiddenValue === t ? "text-brand-400 bg-brand-950/50" : "text-[#F4F1ED]"
              }`}
            >
              {to12(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
