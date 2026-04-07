import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppMode } from '@/contexts/AppModeContext';
import {
  LayoutDashboard,
  ArrowUpDown,
  CreditCard,
  Landmark,
  Target,
  PieChart,
  Tag,
  LogOut,
  Sun,
  Moon,
  Wallet,
  ChevronLeft,
  Menu,
  BarChart3,
  Building2,
  Receipt,
  ShoppingCart,
  Package,
  Settings as SettingsIcon,
  LineChart,
  User as UserIcon,
  Heart,
  TrendingUp,
  Bell,
  HandCoins,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import ModeSelector from '@/components/ModeSelector';

const personalNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/couple-dashboard', icon: Heart, label: 'Dashboard Casal' },
  { to: '/transactions', icon: ArrowUpDown, label: 'Transações' },
  { to: '/categories', icon: Tag, label: 'Categorias' },
  { to: '/accounts', icon: Landmark, label: 'Contas' },
  { to: '/credit-cards', icon: CreditCard, label: 'Cartões' },
  { to: '/budgets', icon: PieChart, label: 'Orçamentos' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/contas-a-receber', icon: HandCoins, label: 'Contas a Receber' },
  { to: '/contas-a-pagar', icon: CalendarClock, label: 'Contas a Pagar' },
  { to: '/notifications', icon: Bell, label: 'Notificações' },
  { to: '/settings', icon: SettingsIcon, label: 'Configurações' },
];

const businessNavItems = [
  { to: '/business', icon: Building2, label: 'Painel Empresa' },
  { to: '/business/expenses', icon: Receipt, label: 'Despesas' },
  { to: '/business/sales', icon: ShoppingCart, label: 'Vendas' },
  { to: '/business/products', icon: Package, label: 'Produtos' },
  { to: '/business/pricing', icon: TrendingUp, label: 'Precificação' },
  { to: '/business/dre', icon: LineChart, label: 'DRE' },
  { to: '/business/accounts', icon: Landmark, label: 'Contas' },
];


const AppSidebar = () => {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { mode } = useAppMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = mode === 'business' ? businessNavItems : personalNavItems;

  const modeLabel = mode === 'personal' ? 'Pessoal' : 'Empresa';

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-xl bg-card border border-border shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full bg-card border-r border-border z-50 flex flex-col transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        {/* Logo */}
        <div className={cn('flex items-center gap-3 p-4 border-b border-border', collapsed && 'justify-center')}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          {!collapsed && <span className="font-bold text-lg tracking-tight">InforControl</span>}
        </div>

        {/* Mode Selector */}
        {!collapsed && (
          <div className="px-3 pt-3">
            <ModeSelector />
          </div>
        )}

        {/* User identification */}
        {!collapsed && user && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-muted/50 border border-border/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Perfil</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-green-600">ONLINE</span>
              </div>
            </div>
            <p className="text-xs font-semibold truncate leading-tight">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1 opacity-80">
              <div className={`w-1.5 h-1.5 rounded-full ${user.user_metadata?.created_by ? 'bg-blue-500' : 'bg-green-500'}`} />
              <span className="text-[9px] font-bold text-muted-foreground uppercase">
                {user.user_metadata?.created_by ? 'PARCEIRO' : 'PRINCIPAL'}
              </span>
              <span className="text-[9px] text-muted-foreground/60">•</span>
              <span className="text-[9px] font-mono text-muted-foreground/60 select-all">{user.id}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{modeLabel}</p>
          )}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                location.pathname === to
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={toggleTheme}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground w-full transition-colors',
              collapsed && 'justify-center px-0'
            )}
          >
            {theme === 'light' ? <Moon className="h-5 w-5 shrink-0" /> : <Sun className="h-5 w-5 shrink-0" />}
            {!collapsed && (theme === 'light' ? 'Tema escuro' : 'Tema claro')}
          </button>
          <button
            onClick={signOut}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-colors',
              collapsed && 'justify-center px-0'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && 'Sair'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground w-full transition-colors justify-center"
          >
            <ChevronLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
