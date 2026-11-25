import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  UserCog,
  HandHeart,
  LogOut,
  BarChart3,
  Settings,
  LogOut as SairIcon,
  Menu as MenuIcon,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui';

export type PageKey =
  | 'painel'
  | 'chamada'
  | 'adolescentes'
  | 'conselheiros'
  | 'atendimentos'
  | 'saidas'
  | 'relatorios'
  | 'config';

export const NAV_ITEMS: { key: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'painel', label: 'Painel', icon: LayoutDashboard },
  { key: 'chamada', label: 'Fazer chamada', icon: ClipboardCheck },
  { key: 'adolescentes', label: 'Adolescentes', icon: Users },
  { key: 'conselheiros', label: 'Conselheiros', icon: UserCog },
  { key: 'atendimentos', label: 'Atendimento', icon: HandHeart },
  { key: 'saidas', label: 'Saída FTU', icon: LogOut },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { key: 'config', label: 'Configurações', icon: Settings },
];

export default function Layout({
  page,
  onNavigate,
  children,
}: {
  page: PageKey;
  onNavigate: (p: PageKey) => void;
  children: ReactNode;
}) {
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (p: PageKey) => {
    onNavigate(p);
    setMenuOpen(false);
  };

  const navList = (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const active = key === page;
        return (
          <button
            key={key}
            onClick={() => go(key)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
              active
                ? 'bg-orange-100 text-orange-950'
                : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'text-orange-800' : 'text-gray-400'}`} />
            {label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[#f7f7f3]">
      {/* Top bar (mobile + desktop) */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-orange-800">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 h-16">
          <button
            className="md:hidden p-2 -ml-2 text-gray-600 rounded-lg hover:bg-gray-100"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <Logo />
            <div className="min-w-0">
              <p className="font-black text-gray-900 leading-tight tracking-tight">FTU Cotia</p>
              <span className="block h-0.5 w-8 bg-orange-800 rounded-full mt-0.5" />
              <p className="text-[11px] text-gray-500 leading-tight">Força Teen Universal</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="ml-auto flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            title="Sair da conta"
          >
            <SairIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:block w-60 shrink-0 py-6 pl-4">
          <div className="sticky top-24">{navList}</div>
        </aside>

        {/* Drawer (mobile) */}
        {menuOpen && (
          <div className="fixed inset-0 z-20 md:hidden" onClick={() => setMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 p-3 shadow-lg animate-in"
              onClick={(e) => e.stopPropagation()}
            >
              {navList}
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 px-4 py-6 pb-24">{children}</main>
      </div>
    </div>
  );
}
