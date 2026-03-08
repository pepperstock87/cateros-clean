export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-pulse">
      <div className="h-8 w-64 bg-[#1c1814] rounded mb-6" />
      <div className="space-y-4">
        <div className="h-48 bg-[#1c1814] rounded-lg" />
        <div className="h-32 bg-[#1c1814] rounded-lg" />
        <div className="h-32 bg-[#1c1814] rounded-lg" />
      </div>
    </div>
  );
}
