import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center p-6 text-[#3E4A3D]">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-light tracking-tight">Phantom Prophet</h1>
        
        <p className="text-lg leading-relaxed text-slate-600">
          Change is intimidating—especially when you're already fighting an uphill battle. 
          We're building a gentle companion for your journey, at your pace.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8">
          <div className="p-4 bg-white border border-sage-100 rounded-xl shadow-sm">
            <span className="block text-2xl mb-2">🌿</span>
            <h3 className="font-medium">Gentle Habits</h3>
          </div>
          <div className="p-4 bg-white border border-sage-100 rounded-xl shadow-sm">
            <span className="block text-2xl mb-2">✍️</span>
            <h3 className="font-medium">Safe Journaling</h3>
          </div>
          <div className="p-4 bg-white border border-sage-100 rounded-xl shadow-sm">
            <span className="block text-2xl mb-2">🍲</span>
            <h3 className="font-medium">Healthy Ideas</h3>
          </div>
        </div>

        <div className="pt-12">
          <p className="text-sm uppercase tracking-widest text-slate-400 mb-4">Coming Soon</p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Your email" 
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sage-400"
            />
            <button className="bg-[#7C9082] text-white px-6 py-2 rounded-lg hover:bg-[#6A7C70] transition">
              Join the Journey
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}