'use client';
import { usePathname } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';
import Image from 'next/image';
import { LogOut } from 'lucide-react';

export function GlobalHeader() {
    const pathname = usePathname();
    const { player, setPlayer } = usePlayer();

    const isGameplay = pathname === '/math' || pathname === '/english';
    if (!player || pathname === '/login' || pathname === '/register' || isGameplay) return null;

    return (
        <div className="absolute top-6 left-0 right-0 z-50 flex justify-between items-start px-6 pointer-events-none">
            <div className="w-1/3" />

            <div className="w-1/3 flex justify-center items-center pointer-events-auto">
                <div className="flex items-center gap-4">
                    <Image src="/icon.png" alt="Sova" width={64} height={64} className="w-12 h-12 sm:w-16 sm:h-16 mix-blend-multiply" priority />
                    <h1 className="text-3xl sm:text-5xl font-black italic drop-shadow-sm text-board-black pt-2">Chytrý Školák</h1>
                </div>
            </div>

            <div className="w-1/3 flex justify-end items-center pointer-events-auto">
                <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full shadow-sm border-4 border-slate-100 hidden sm:flex">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 relative">
                        <Image src={`/avatars/${player.avatar}.png`} alt={player.username} fill className="object-contain drop-shadow-sm mix-blend-multiply" />
                    </div>
                    <div className="flex flex-col mr-1">
                        <span className="font-black text-lg sm:text-xl leading-none">{player.username}</span>
                    </div>
                    <button
                        onClick={() => setPlayer(null)}
                        className="ml-1 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Odhlásit se"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
