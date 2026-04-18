'use client';
import Image from 'next/image';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { useRouter } from 'next/navigation';

interface AppHeaderProps {
  /** First breadcrumb segment, e.g. "Matematika" */
  subject?: string;
  /** Second breadcrumb segment, e.g. "Trénink" */
  page?: string;
  /** If provided, renders a back arrow that calls this handler */
  onBack?: () => void;
  /** Show the player avatar + logout button (home page only) */
  showLogout?: boolean;
}

export function AppHeader({ subject, page, onBack, showLogout = false }: AppHeaderProps) {
  const { player, setPlayer } = usePlayer();
  const router = useRouter();

  return (
    <header className="flex items-center px-4 pt-4 pb-2 gap-2 shrink-0">
      {/* Left: optional back arrow + owl icon */}
      <div className="flex items-center gap-1 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-board-black transition-colors"
            aria-label="Zpět"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <Image
          src="/icon.png"
          alt="Chytrý Školák"
          width={32}
          height={32}
          className="w-8 h-8 mix-blend-multiply"
          priority
        />
      </div>

      {/* Centre: breadcrumb */}
      <div className="flex-1 flex items-center gap-1 min-w-0 px-1">
        {subject && (
          <span className="text-xs font-black uppercase tracking-widest text-class-green truncate">
            {subject}
          </span>
        )}
        {subject && page && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
        {page && (
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 truncate">
            {page}
          </span>
        )}
      </div>

      {/* Right: player avatar + logout (home only) */}
      {showLogout && player && (
        <div className="flex items-center gap-1.5 bg-slate-50 border-2 border-slate-100 rounded-xl pl-1.5 pr-1.5 py-1 shrink-0">
          <div className="w-7 h-7 relative shrink-0">
            <Image
              src={`/avatars/${player.avatar}.png`}
              alt={player.username}
              fill
              className="object-contain mix-blend-multiply"
            />
          </div>
          <span className="text-xs font-black leading-none max-w-[60px] truncate">
            {player.username}
          </span>
          <button
            onClick={() => { setPlayer(null); router.push('/login'); }}
            className="p-1 text-slate-300 hover:text-error hover:bg-red-50 rounded-lg transition-colors"
            title="Odhlásit se"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
}
