import { useAppMode, AppMode } from '@/contexts/AppModeContext';
import { User, Building2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const modes: { value: AppMode; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'personal', label: 'Pessoal', icon: User, color: 'bg-primary' },
  { value: 'business', label: 'Empresa', icon: Building2, color: 'bg-primary' },
  { value: 'couple', label: 'Casal', icon: Heart, color: 'bg-[hsl(330,80%,55%)]' },
];

const ModeSelector = () => {
  const { mode, setMode } = useAppMode();

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/80 w-full">
      {modes.map(({ value, label, icon: Icon, color }) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-1 rounded-lg text-xs font-medium transition-all',
            mode === value
              ? `${color} text-white shadow-sm`
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline truncate tooltip-trigger">{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;
