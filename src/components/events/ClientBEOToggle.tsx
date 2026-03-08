"use client";

type Props = {
  onToggle: (isClientView: boolean) => void;
  isClientView: boolean;
};

export function ClientBEOToggle({ onToggle, isClientView }: Props) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[#2A3A5C] overflow-hidden">
      <button
        onClick={() => onToggle(false)}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          !isClientView
            ? "bg-[#d4801f] text-white"
            : "bg-[#182030] text-[#D4A373] hover:text-[#F4F1ED]"
        }`}
      >
        Internal View
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          isClientView
            ? "bg-[#d4801f] text-white"
            : "bg-[#182030] text-[#D4A373] hover:text-[#F4F1ED]"
        }`}
      >
        Client View
      </button>
    </div>
  );
}
