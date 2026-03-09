export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-pulse">
      <div className="h-4 w-24 bg-[#1A2538] rounded mb-3" />
      <div className="h-8 w-56 bg-[#1A2538] rounded mb-8" />
      <div className="h-48 bg-[#1A2538] rounded-lg mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="h-20 bg-[#1A2538] rounded-lg" />
        <div className="h-20 bg-[#1A2538] rounded-lg" />
        <div className="h-20 bg-[#1A2538] rounded-lg" />
        <div className="h-20 bg-[#1A2538] rounded-lg" />
      </div>
      <div className="space-y-4">
        <div className="h-40 bg-[#1A2538] rounded-lg" />
        <div className="h-32 bg-[#1A2538] rounded-lg" />
      </div>
    </div>
  );
}
