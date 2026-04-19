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
  /** Optional content placed on the right side (e.g. step indicator) */
  rightContent?: React.ReactNode;
}

export function AppHeader({ subject, page, onBack, showLogout = false, rightContent }: AppHeaderProps) {
  const { player, setPlayer } = usePlayer();
  const router = useRouter();

  const isHome = showLogout;

  return (
    <header className={`flex items-center gap-3 shrink-0 ${isHome ? 'px-5 pt-5 pb-3' : 'px-5 pt-5 pb-3'}`}>
      {/* Left: optional back arrow + owl icon */}
      <div className="flex items-center gap-1 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-board-black transition-colors"
            aria-label="Zpět"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <Image
          src="/icon.png"
          alt="Chytrý Školák"
          width={isHome ? 52 : 44}
          height={isHome ? 52 : 44}
          className={`${isHome ? 'w-13 h-13' : 'w-11 h-11'} mix-blend-multiply`}
          priority
        />
      </div>

      {/* Centre: breadcrumb */}
      <div className="flex-1 flex items-center gap-1.5 min-w-0 px-1">
        {subject && (
          <span className="text-base font-black uppercase tracking-widest text-class-green truncate">
            {subject}
          </span>
        )}
        {subject && page && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
        {page && (
          <span className="text-base font-black uppercase tracking-widest text-slate-400 truncate">
            {page}
          </span>
        )}
      </div>

      {/* Right: custom content (e.g. step indicator) */}
      {rightContent && !showLogout && (
        <div className="shrink-0">{rightContent}</div>
      )}

      {/* Right: player avatar + logout (home only) */}
      {showLogout && player && (
        <div className={`flex items-center shrink-0 bg-slate-50 border-2 border-slate-100 rounded-2xl ${isHome ? 'gap-2 pl-2 pr-1.5 py-1.5' : 'gap-1.5 pl-1.5 pr-1 py-1 rounded-xl'}`}>
          <button
            onClick={() => router.push('/profile')}
            className="flex items-center gap-2 hover:opacity-75 transition-opacity"
            title="Upravit profil"
          >
            <div className={`relative shrink-0 ${isHome ? 'w-10 h-10' : 'w-7 h-7'}`}>
              <Image
                src={`/avatars/${player.avatar}.png`}
                alt={player.username}
                fill
                className="object-contain mix-blend-multiply"
              />
            </div>
            <span className={`font-black leading-none truncate ${isHome ? 'text-base max-w-[100px]' : 'text-xs max-w-[60px]'}`}>
              {player.username}
            </span>
          </button>
          <button
            onClick={() => { setPlayer(null); router.push('/login'); }}
            className={`text-slate-300 hover:text-error hover:bg-red-50 rounded-lg transition-colors ${isHome ? 'p-1.5' : 'p-1'}`}
            title="Odhlásit se"
          >
            <LogOut className={isHome ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          </button>
        </div>
      )}
    </header>
  );
}
