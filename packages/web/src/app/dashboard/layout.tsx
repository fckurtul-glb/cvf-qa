import { Sidebar } from '../../components/dashboard/sidebar';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 pl-64 transition-all duration-300">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold tracking-tight text-slate-800 uppercase">Dashboard</h2>
            <div className="h-4 w-[1px] bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">Panel v1.2</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-2 w-2 items-center justify-center rounded-full bg-emerald-500 shadow-sm" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistem Aktif</span>
            </div>
            
            <div className="h-8 w-[1px] bg-slate-100" />
            
            <button className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#b2ac88' }} />
              Yeni Kampanya
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
