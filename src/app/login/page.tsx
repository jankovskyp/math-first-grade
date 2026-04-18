'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePlayer, AvatarType } from '@/context/PlayerContext';
import { DeskButton } from '@/components/shared/DeskButton';
import { ChevronLeft, UserPlus, Info, ArrowRight, LogIn } from 'lucide-react';
import Image from 'next/image';

interface PlayerRow {
    id: string;
    username: string;
    avatar: string;
    pin: string;
    recovery_question: string;
}

export default function LoginScreen() {
    const router = useRouter();
    const { setPlayer } = usePlayer();

    const [usernameInput, setUsernameInput] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState<PlayerRow | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const [recoveryStep, setRecoveryStep] = useState<0 | 1 | 2>(0);
    const [recoveryAnswer, setRecoveryAnswer] = useState('');
    const [newPin, setNewPin] = useState('');

    const handleUsernameSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!usernameInput.trim()) return;
        setIsLoading(true);
        setError('');
        if (!supabase) { setError('Databáze není připojena.'); setIsLoading(false); return; }
        const { data, error: dbError } = await supabase
            .from('players')
            .select('id, username, avatar, pin, recovery_question')
            .ilike('username', usernameInput.trim())
            .maybeSingle();
        setIsLoading(false);
        if (dbError || !data) {
            setError('Hráč s tímto jménem nebyl nalezen.');
        } else {
            setSelectedPlayer(data);
            setUsernameInput('');
        }
    };

    const handleBackToSelection = () => {
        setSelectedPlayer(null);
        setPin('');
        setError('');
        setRecoveryStep(0);
        setRecoveryAnswer('');
        setNewPin('');
    };

    const appendPin = (num: string) => {
        if (pin.length < 4) {
            const updated = pin + num;
            setPin(updated);
            if (updated.length === 4) {
                if (updated === selectedPlayer?.pin) {
                    setPlayer({ id: selectedPlayer.id, username: selectedPlayer.username, avatar: selectedPlayer.avatar as AvatarType });
                    router.push('/');
                } else {
                    setError('Špatný PIN! Zkus to znovu.');
                    setPin('');
                }
            }
        }
    };

    const deletePin = () => setPin(p => p.slice(0, -1));

    const handleRecoveryAnswerSubmit = async () => {
        setError('');
        if (!selectedPlayer || !supabase) return;
        const { data } = await supabase.from('players').select('recovery_answer').eq('id', selectedPlayer.id).single();
        if (data?.recovery_answer === recoveryAnswer.trim().toLowerCase()) {
            setRecoveryStep(2);
        } else {
            setError('Špatná odpověď na otázku.');
        }
    };

    const handleNewPinSubmit = async () => {
        setError('');
        if (!selectedPlayer || !supabase) return;
        if (newPin.length !== 4) { setError('Nový PIN musí mít přesně 4 čísla.'); return; }
        const { error: updateError } = await supabase.from('players').update({ pin: newPin }).eq('id', selectedPlayer.id);
        if (!updateError) {
            setPlayer({ id: selectedPlayer.id, username: selectedPlayer.username, avatar: selectedPlayer.avatar as AvatarType });
            router.push('/');
        } else {
            setError('Nepodařilo se změnit PIN.');
        }
    };

    return (
        <main className="h-screen w-screen bg-white flex flex-col font-sans text-board-black">
            <div className="w-full h-full flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
                    {selectedPlayer && (
                        <button
                            onClick={handleBackToSelection}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-board-black transition-colors"
                            aria-label="Jiný hráč"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                    )}
                    <Image src="/icon.png" alt="Chytrý Školák" width={32} height={32} className="w-8 h-8 mix-blend-multiply" priority />
                    <span className="text-lg font-black italic">Chytrý Školák</span>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">

                    {!selectedPlayer ? (
                        // --- USERNAME ENTRY ---
                        <div className="w-full flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                            <h2 className="text-4xl font-black italic text-center">Kdo hraje?</h2>
                            {error && <div className="p-4 bg-red-100 text-red-600 rounded-2xl w-full text-center font-bold">{error}</div>}
                            <form onSubmit={handleUsernameSubmit} className="w-full flex flex-col gap-4">
                                <input
                                    type="text"
                                    className="w-full text-center text-xl font-black p-4 rounded-2xl border-4 border-slate-200 outline-none focus:border-class-green transition-colors text-board-black bg-slate-50"
                                    value={usernameInput}
                                    onChange={(e) => setUsernameInput(e.target.value)}
                                    placeholder="Tvoje přezdívka"
                                    autoFocus
                                />
                                <DeskButton size="md" variant="info" type="submit" disabled={isLoading} className="w-full py-4 text-lg">
                                    {isLoading ? 'Hledám...' : 'Přihlásit se'} <ArrowRight className="ml-2 w-5 h-5" />
                                </DeskButton>
                            </form>
                            <div className="flex gap-3 w-full">
                                <DeskButton size="md" variant="outline" onClick={() => router.push('/register')} className="flex-1 text-base border-slate-200">
                                    <UserPlus className="mr-2 w-4 h-4 text-slate-500" /> Přidat hráče
                                </DeskButton>
                                <DeskButton size="md" variant="outline" onClick={() => router.push('/about')} className="flex-1 text-base border-slate-200">
                                    <Info className="mr-2 w-4 h-4 text-slate-500" /> O aplikaci
                                </DeskButton>
                            </div>
                        </div>
                    ) : (
                        // --- PIN ENTRY & RECOVERY ---
                        <div className="w-full flex flex-col items-center animate-in fade-in zoom-in duration-300">
                            <div className="w-20 h-20 mb-3 relative drop-shadow-sm">
                                <Image src={`/avatars/${selectedPlayer.avatar}.png`} alt={selectedPlayer.username} fill className="object-contain mix-blend-multiply" />
                            </div>
                            <h2 className="text-3xl font-black mb-5 text-center">{selectedPlayer.username}</h2>
                            {error && <div className="p-4 bg-red-100 text-red-600 rounded-2xl w-full text-center mb-4 font-bold">{error}</div>}

                            {recoveryStep === 0 ? (
                                // PIN PAD
                                <div className="w-full flex flex-col items-center">
                                    <div className="flex gap-3 mb-6">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div key={i} className={`w-14 h-14 rounded-2xl border-4 flex items-center justify-center text-4xl font-black ${pin[i] ? 'border-class-green bg-class-green/10' : 'border-slate-200'}`}>
                                                {pin[i] ? '•' : ''}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mb-4 w-full max-w-[260px]">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                            <button key={num} onClick={() => appendPin(num.toString())}
                                                className="bg-slate-100 hover:bg-slate-200 active:bg-class-green active:text-white text-3xl font-black p-4 rounded-2xl transition-colors">
                                                {num}
                                            </button>
                                        ))}
                                        <div />
                                        <button onClick={() => appendPin('0')}
                                            className="bg-slate-100 hover:bg-slate-200 active:bg-class-green active:text-white text-3xl font-black p-4 rounded-2xl transition-colors">
                                            0
                                        </button>
                                        <button onClick={deletePin}
                                            className="bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 font-bold p-4 rounded-2xl flex items-center justify-center transition-colors">
                                            <ChevronLeft className="w-7 h-7" />
                                        </button>
                                    </div>
                                    <button onClick={() => { setRecoveryStep(1); setError(''); setPin(''); }}
                                        className="text-slate-400 font-bold text-base hover:text-class-green underline underline-offset-4">
                                        Zapomněl(a) jsem PIN
                                    </button>
                                </div>
                            ) : recoveryStep === 1 ? (
                                // RECOVERY STEP 1
                                <div className="w-full flex flex-col items-center gap-4 animate-in fade-in duration-300">
                                    <p className="text-base font-bold text-class-green text-center">Záchranná otázka:</p>
                                    <p className="text-base font-bold text-slate-400 text-center uppercase tracking-widest">{selectedPlayer.recovery_question}</p>
                                    <input
                                        type="text"
                                        className="w-full text-center text-2xl p-4 rounded-2xl border-4 border-slate-200 outline-none focus:border-class-green"
                                        value={recoveryAnswer}
                                        onChange={(e) => setRecoveryAnswer(e.target.value)}
                                        placeholder="Tvoje odpověď"
                                        autoFocus
                                    />
                                    <DeskButton size="md" variant="info" onClick={handleRecoveryAnswerSubmit} className="w-full py-4 text-lg">
                                        Ověřit odpověď <ArrowRight className="ml-2 w-5 h-5" />
                                    </DeskButton>
                                    <button onClick={() => { setRecoveryStep(0); setError(''); }}
                                        className="text-slate-400 font-bold hover:text-slate-600 underline underline-offset-4">
                                        Zrušit
                                    </button>
                                </div>
                            ) : (
                                // RECOVERY STEP 2
                                <div className="w-full flex flex-col items-center gap-4 animate-in fade-in duration-300">
                                    <p className="text-xl font-bold text-class-green text-center animate-bounce">Správně!</p>
                                    <p className="text-base font-bold text-slate-400">Nastav si nový PIN (4 čísla):</p>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        className="w-32 text-center text-4xl p-4 rounded-2xl border-4 border-slate-200 outline-none focus:border-class-green font-black tracking-widest text-class-green"
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                                        placeholder="••••"
                                        inputMode="numeric"
                                        autoFocus
                                    />
                                    <DeskButton size="md" variant="primary" onClick={handleNewPinSubmit} className="w-full py-4 text-lg">
                                        Uložit a přihlásit se <LogIn className="ml-2 w-5 h-5" />
                                    </DeskButton>
                                    <button onClick={() => { setRecoveryStep(0); setError(''); }}
                                        className="text-slate-400 font-bold hover:text-slate-600 underline underline-offset-4">
                                        Zrušit
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
