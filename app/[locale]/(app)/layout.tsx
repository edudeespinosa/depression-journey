import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#FDFCF8] text-[#2D3B35]">
      <Sidebar />
      {/* Desktop: offset by sidebar width. Mobile: pad top (header) + bottom (tabs). */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-56 pt-11 pb-14 lg:pt-0 lg:pb-0">
        {children}
      </div>
    </div>
  );
}
