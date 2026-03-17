'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { player, isLoading } = usePlayer();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !player) {
            router.replace('/login');
        }
    }, [player, isLoading, router]);

    if (isLoading || !player) {
        return (
            <div className="h-screen w-screen bg-desk-white flex items-center justify-center font-sans">
                <span className="text-slate-400 text-2xl font-black animate-pulse">Načítám...</span>
            </div>
        );
    }

    return <>{children}</>;
}
