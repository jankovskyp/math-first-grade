'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer, AvatarType } from '@/context/PlayerContext';
import { DeskButton } from '@/components/shared/DeskButton';
import { AppHeader } from '@/components/shared/AppHeader';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { updatePlayerProfile } from '@/app/actions/player';

const AVATARS: { id: AvatarType; label: string }[] = [
    { id: 'avatar_lion',     label: 'Lev' },
    { id: 'avatar_elephant', label: 'Slon' },
    { id: 'avatar_bear',     label: 'Medvěd' },
    { id: 'avatar_fox',      label: 'Liška' },
    { id: 'avatar_owl',      label: 'Sova' },
    { id: 'avatar_bunny',    label: 'Zajíček' },
    { id: 'avatar_monkey',   label: 'Opice' },
    { id: 'avatar_panda',    label: 'Panda' },
    { id: 'avatar_cat',      label: 'Kočka' },
    { id: 'avatar_dog',      label: 'Pejsek' },
];

export default function ProfilePage() {
    const router = useRouter();
    const { player, setPlayer } = usePlayer();

    const [username, setUsername] = useState(player?.username ?? '');
    const [avatar, setAvatar] = useState<AvatarType>(player?.avatar ?? 'avatar_lion');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        if (!player) return;
        setError('');
        setSaved(false);

        const newUsername = username.trim();
        if (!newUsername) { setError('Přezdívka nesmí být prázdná.'); return; }

        setIsLoading(true);
        const result = await updatePlayerProfile(player.id, newUsername, avatar);
        setIsLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            setPlayer({ ...player, username: newUsername, avatar });
            setSaved(true);
            setTimeout(() => router.push('/'), 900);
        }
    };

    return (
        <AuthGuard>
            <main className="h-screen w-screen bg-desk-white flex flex-col font-sans text-board-black">
                <div className="w-full h-full flex flex-col overflow-hidden">

                    <AppHeader page="Můj profil" onBack={() => router.push('/')} />

                    <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
                      <div className="w-full max-w-sm flex flex-col gap-5">

                        {/* Username */}
                        <div className="w-full flex flex-col gap-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Přezdívka</label>
                            <input
                                type="text"
                                className="w-full text-center text-xl font-black p-4 rounded-2xl border-4 border-slate-200 outline-none focus:border-class-green transition-colors bg-slate-50"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.replace(/[^\p{L}\p{N}]/gu, ''))}
                            />
                        </div>

                        {/* Avatar grid */}
                        <div className="w-full flex flex-col gap-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Profilovka</label>
                            <div className="grid grid-cols-5 gap-3 w-full">
                                {AVATARS.map((a) => (
                                    <button
                                        key={a.id}
                                        onClick={() => setAvatar(a.id)}
                                        className={`relative p-2 rounded-2xl border-4 transition-all hover:scale-105 ${
                                            avatar === a.id
                                                ? 'border-class-green bg-class-green/10 shadow-lg scale-105'
                                                : 'border-slate-100 hover:border-slate-300'
                                        }`}
                                    >
                                        <Image
                                            src={`/avatars/${a.id}.png`}
                                            alt={a.label}
                                            width={80}
                                            height={80}
                                            className="w-full h-auto aspect-square mix-blend-multiply"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 text-red-600 rounded-2xl w-full text-center font-bold text-sm animate-in slide-in-from-top-2 duration-200">
                                {error}
                            </div>
                        )}

                        {saved && (
                            <div className="p-3 bg-green-100 text-green-700 rounded-2xl w-full text-center font-bold text-sm flex items-center justify-center gap-2 animate-in zoom-in duration-200">
                                <CheckCircle className="w-4 h-4" /> Uloženo!
                            </div>
                        )}

                        <DeskButton
                            size="md"
                            variant="primary"
                            onClick={handleSave}
                            disabled={isLoading}
                            className="w-full py-4 text-lg mt-auto"
                        >
                            {isLoading
                                ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Ukládám...</>
                                : <><Save className="w-5 h-5 mr-2" /> Uložit změny</>
                            }
                        </DeskButton>

                      </div>
                    </div>
                </div>
            </main>
        </AuthGuard>
    );
}
