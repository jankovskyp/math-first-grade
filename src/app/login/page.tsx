'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePlayer, AvatarType } from '@/context/PlayerContext';
import { DeskButton } from '@/components/shared/DeskButton';
import { ChevronLeft, UserPlus, Info, ArrowRight, X, LogIn } from 'lucide-react';
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

    // Login State
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    // Recovery State
    const [recoveryStep, setRecoveryStep] = useState<0 | 1 | 2>(0); // 0=none, 1=answering, 2=new pin
    const [recoveryAnswer, setRecoveryAnswer] = useState('');
    const [newPin, setNewPin] = useState('');

    const handleUsernameSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!usernameInput.trim()) return;

        setIsLoading(true);
        setError('');
        if (!supabase) {
            setError('Databáze není připojena.');
            setIsLoading(false);
            return;
        }

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
            const updatedPin = pin + num;
            setPin(updatedPin);

            if (updatedPin.length === 4) {
                if (updatedPin === selectedPlayer?.pin) {
                    setPlayer({
                        id: selectedPlayer.id,
                        username: selectedPlayer.username,
                        avatar: selectedPlayer.avatar as AvatarType,
                    });
                    router.push('/');
                } else {
                    setError('Špatný PIN! Zkus to znovu.');
                    setPin(''); // Reset on failure
                }
            }
        }
    };

    const deletePin = () => setPin(p => p.slice(0, -1));

    const handleRecoveryAnswerSubmit = async () => {
        setError('');
        if (!selectedPlayer || !supabase) return;

        const { data } = await supabase
            .from('players')
            .select('recovery_answer')
            .eq('id', selectedPlayer.id)
            .single();

        if (data?.recovery_answer === recoveryAnswer.trim().toLowerCase()) {
            setRecoveryStep(2);
        } else {
            setError('Špatná odpověď na otázku.');
        }
    };

    const handleNewPinSubmit = async () => {
        setError('');
        if (!selectedPlayer || !supabase) return;

        if (newPin.length !== 4) {
            setError('Nový PIN musí mít přesně 4 čísla.');
            return;
        }

        const { error: updateError } = await supabase
            .from('players')
            .update({ pin: newPin })
            .eq('id', selectedPlayer.id);

        if (!updateError) {
            setPlayer({
                id: selectedPlayer.id,
                username: selectedPlayer.username,
                avatar: selectedPlayer.avatar as AvatarType,
            });
            router.push('/');
        } else {
            setError('Nepodařilo se změnit PIN.');
        }
    };

    return (
        <div className="min-h-screen w-screen bg-desk-white font-sans text-board-black p-6 flex flex-col items-center justify-center overflow-auto sm:overflow-hidden relative pb-12 sm:pb-6">
            <div className="absolute top-6 left-6 z-10 w-full flex justify-between pr-12">
                {selectedPlayer ? (
                    <DeskButton size="md" variant="outline" onClick={handleBackToSelection}>
                        <ChevronLeft className="w-6 h-6 mr-2" /> Jiny hráč
                    </DeskButton>
                ) : (
                    <span />
                )}
            </div>

            <div className="w-full max-w-5xl items-center flex flex-col relative z-0 mt-8 sm:mt-0">
                <div className="flex items-center gap-6 mb-10 w-full justify-center">
                    <Image src="/icon.png" alt="Sova" width={64} height={64} className="w-14 h-14 mix-blend-multiply" priority />
                    <h1 className="text-4xl sm:text-5xl font-black italic drop-shadow-sm text-center">Chytrý Školák</h1>
                </div>

                {!selectedPlayer ? (
                    // --- PROFILE SELECTION ---
                    <div className="w-full max-w-md flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <form onSubmit={handleUsernameSubmit} className="w-full bg-white rounded-[2.5rem] p-8 shadow-xl flex flex-col items-center border-4 border-slate-50 mb-6">
                            <h2 className="text-3xl font-black italic mb-6 text-slate-800 text-center">Kdo hraje?</h2>
                            {error && <div className="p-4 bg-red-100 text-red-600 rounded-2xl w-full text-center mb-6 font-bold">{error}</div>}
                            <input
                                type="text"
                                className="w-full text-center text-3xl font-black p-5 rounded-3xl border-4 border-slate-200 outline-none focus:border-class-green transition-colors mb-6 text-board-black"
                                value={usernameInput}
                                onChange={(e) => setUsernameInput(e.target.value)}
                                placeholder="Tvé jméno"
                            />
                            <DeskButton size="lg" variant="info" type="submit" disabled={isLoading} className="w-full py-5 text-xl">
                                {isLoading ? 'Hledám...' : 'Přihlásit se'} <ArrowRight className="ml-2 w-7 h-7" />
                            </DeskButton>
                        </form>

                        <div className="flex gap-4 w-full">
                            <DeskButton size="md" variant="outline" onClick={() => router.push('/register')} className="flex-1 bg-white border-slate-200">
                                <UserPlus className="mr-2 w-5 h-5 text-slate-500" /> Přidat hráče
                            </DeskButton>
                            <DeskButton size="md" variant="outline" onClick={() => router.push('/about')} className="flex-1 bg-white border-slate-200">
                                <Info className="mr-2 w-5 h-5 text-slate-500" /> O aplikaci
                            </DeskButton>
                        </div>
                    </div>
                ) : (
                    // --- PIN ENTRY & RECOVERY ---
                    <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl flex flex-col items-center animate-in slide-in-from-bottom-8 duration-300 relative border-4 border-slate-50">
                        <button onClick={handleBackToSelection} className="absolute top-6 right-6 p-2 text-slate-300 hover:bg-slate-100 rounded-full transition-colors">
                            <X className="w-8 h-8" />
                        </button>

                        <div className="w-24 h-24 mb-4 relative drop-shadow-sm">
                            <Image src={`/avatars/${selectedPlayer.avatar}.png`} alt={selectedPlayer.username} fill className="object-contain mix-blend-multiply" />
                        </div>
                        <h2 className="text-4xl font-black mb-8 text-center">{selectedPlayer.username}</h2>

                        {error && <div className="p-4 bg-red-100 text-red-600 rounded-2xl w-full text-center mb-6 font-bold">{error}</div>}

                        {recoveryStep === 0 ? (
                            // PIN PAD
                            <div className="w-full flex flex-col items-center">
                                <div className="flex gap-4 mb-8">
                                    {[0, 1, 2, 3].map((i) => (
                                        <div key={i} className={`w-14 h-18 sm:w-16 sm:h-20 rounded-2xl border-4 flex items-center justify-center text-4xl font-black ${pin[i] ? 'border-class-green bg-class-green/10' : 'border-slate-200'}`}>
                                            {pin[i] ? '•' : ''}
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-[280px]">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                        <button
                                            key={num}
                                            onClick={() => appendPin(num.toString())}
                                            className="bg-slate-100 hover:bg-slate-200 active:bg-class-green active:text-white text-3xl font-black p-4 rounded-2xl transition-colors"
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <div />
                                    <button
                                        onClick={() => appendPin('0')}
                                        className="bg-slate-100 hover:bg-slate-200 active:bg-class-green active:text-white text-3xl font-black p-4 rounded-2xl transition-colors"
                                    >
                                        0
                                    </button>
                                    <button
                                        onClick={deletePin}
                                        className="bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 font-bold p-4 rounded-2xl flex items-center justify-center transition-colors"
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </button>
                                </div>

                                <button
                                    onClick={() => { setRecoveryStep(1); setError(''); setPin(''); }}
                                    className="text-slate-400 font-bold text-lg hover:text-class-green underline underline-offset-4 mt-2"
                                >
                                    Zapomněl(a) jsem PIN
                                </button>
                            </div>
                        ) : recoveryStep === 1 ? (
                            // RECOVERY STEP 1: QUESTION
                            <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
                                <p className="text-xl font-bold text-class-green text-center mb-1">Záchranná otázka:</p>
                                <p className="text-xl font-bold text-slate-400 text-center uppercase tracking-widest">{selectedPlayer.recovery_question || 'Zadejte odpověď'}</p>

                                <input
                                    type="text"
                                    className="w-full text-center text-2xl p-4 rounded-2xl border-4 border-slate-200 outline-none focus:border-class-green mb-6 mt-6"
                                    value={recoveryAnswer}
                                    onChange={(e) => setRecoveryAnswer(e.target.value)}
                                    placeholder="Tvoje odpověď"
                                />

                                <DeskButton size="lg" variant="info" onClick={handleRecoveryAnswerSubmit} className="w-full">
                                    Ověřit odpověď <ArrowRight className="ml-2 w-6 h-6" />
                                </DeskButton>
                                <button onClick={() => { setRecoveryStep(0); setError(''); }} className="mt-6 text-slate-400 font-bold hover:text-slate-600 underline underline-offset-4">
                                    Zrušit
                                </button>
                            </div>
                        ) : (
                            // RECOVERY STEP 2: NEW PIN
                            <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
                                <p className="text-xl font-bold text-class-green text-center mb-2 animate-bounce">Správně!</p>
                                <p className="text-lg font-bold text-slate-400 mb-6">Nastav si nový PIN (4 čísla):</p>

                                <input
                                    type="password"
                                    maxLength={4}
                                    className="w-32 text-center text-4xl p-4 rounded-2xl border-4 border-slate-200 outline-none focus:border-class-green mb-8 font-black tracking-widest text-class-green"
                                    value={newPin}
                                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                                    placeholder="••••"
                                    inputMode="numeric"
                                    autoFocus
                                />

                                <DeskButton size="lg" variant="primary" onClick={handleNewPinSubmit} className="w-full">
                                    Uložit a Přihlásit se <LogIn className="ml-2 w-6 h-6" />
                                </DeskButton>
                                <button onClick={() => { setRecoveryStep(0); setError(''); }} className="mt-6 text-slate-400 font-bold hover:text-slate-600 underline underline-offset-4">
                                    Zrušit
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
