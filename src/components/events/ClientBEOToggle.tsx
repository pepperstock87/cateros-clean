"use client";

type Props = {
  onToggle: (isClientView: boolean) => void;
  isClientView: boolean;
};

export function ClientBEOToggle({ onToggle, isClientView }: Props) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[#2e271f] overflow-hidden">
      <button
        onClick={() => onToggle(false)}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          !isClientView
            ? "bg-[#d4801f] text-white"
            : "bg-[#1a1714] text-[#9c8876] hover:text-[#f5ede0]"
        }`}
      >
        Internal View
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          isClientView
            ? "bg-[#d4801f] text-white"
            : "bg-[#1a1714] text-[#9c8876] hover:text-[#f5ede0]"
        }`}
      >
        Client View
      </button>
    </div>
  );
}
