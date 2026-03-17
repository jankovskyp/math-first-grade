'use client';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { useRouter } from 'next/navigation';

interface SubjectHeaderProps {
    subject?: string;
    subjectColor?: string;
}

export function SubjectHeader({ subject, subjectColor = '#38BDF8' }: SubjectHeaderProps) {
    const { player, setPlayer } = usePlayer();
    const router = useRouter();

    return (
        <div className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center px-6 pt-6 pointer-events-none">
            {/* Left spacer */}
            <div className="w-1/3" />

            {/* Center: logo + optional subject */}
            <div className="w-1/3 flex justify-center pointer-events-auto">
                <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-3">
                        <Image src="/icon.png" alt="Sova" width={56} height={56} className="w-12 h-12 mix-blend-multiply" priority />
                        <h1 className="text-3xl sm:text-4xl font-black italic text-board-black">Chytrý Školák</h1>
                    </div>
                    {subject && (
                        <span
                            className="text-sm sm:text-base font-black uppercase tracking-widest"
                            style={{ color: subjectColor }}
                        >
                            {subject}
                        </span>
                    )}
                </div>
            </div>

            {/* Right: user badge */}
            {player && (
                <div className="w-1/3 flex justify-end items-center pointer-events-auto">
                    <div className="flex items-center gap-2 bg-white p-2 pr-3 rounded-full shadow-sm border-4 border-slate-100 hidden sm:flex">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 relative">
                            <Image
                                src={`/avatars/${player.avatar}.png`}
                                alt={player.username}
                                fill
                                className="object-contain mix-blend-multiply"
                            />
                        </div>
                        <span className="font-black text-base sm:text-lg leading-none">{player.username}</span>
                        <button
                            onClick={() => { setPlayer(null); router.push('/login'); }}
                            className="ml-1 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Odhlásit se"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
