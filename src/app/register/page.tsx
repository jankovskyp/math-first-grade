'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePlayer, AvatarType } from '@/context/PlayerContext';
import { DeskButton } from '@/components/shared/DeskButton';
import { ChevronLeft, ArrowRight, UserPlus } from 'lucide-react';
import Image from 'next/image';

const AVATARS: { id: AvatarType; label: string }[] = [
    { id: 'avatar_fox', label: 'Liška' },
    { id: 'avatar_bear', label: 'Medvěd' },
    { id: 'avatar_cat', label: 'Kočka' },
    { id: 'avatar_dog', label: 'Pejsek' },
    { id: 'avatar_bunny', label: 'Zajíček' },
    { id: 'avatar_tiger', label: 'Tygr' },
    { id: 'avatar_giraffe', label: 'Žirafa' },
    { id: 'avatar_crocodile', label: 'Krokodýl' },
    { id: 'avatar_monkey', label: 'Opice' },
    { id: 'avatar_dolphin', label: 'Delfín' },
];

const RECOVERY_QUESTIONS = [
    'Jaké je tvoje oblíbené zvíře?',
    'Jaká je tvoje oblíbená barva?',
    'Jaké je tvoje oblíbené jídlo?',
    'Jaká je tvoje oblíbená pohádka?',
];

export default function RegisterScreen() {
    const router = useRouter();
    const { setPlayer } = usePlayer();

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [username, setUsername] = useState('');
    const [avatar, setAvatar] = useState<AvatarType | null>(null);
    const [pin, setPin] = useState('');
    const [question, setQuestion] = useState(RECOVERY_QUESTIONS[0]);
    const [answer, setAnswer] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleNextStep = async () => {
        setError('');

        if (step === 1) {
            if (!username.trim()) {
                setError('Zadej prosím své jméno.');
                return;
            }
            if (!supabase) {
                setError('Pripojeni selhalo.');
                return;
            }
            // Check for duplicate username
            setIsLoading(true);
            const { data, error } = await supabase
                .from('players')
                .select('id')
                .ilike('username', username.trim())
                .single();

            if (error && error.code !== 'PGRST116') {
                // handle genuine errors if you wish
            }

            setIsLoading(false);

            if (data) {
                setError('Toto jméno už někdo používá. Zkus jiné!');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!avatar) {
                setError('Vyber si svého zvířecího kamaráda!');
                return;
            }
            setStep(3);
        } else if (step === 3) {
            if (pin.length !== 4) {
                setError('PIN musí mít přesně 4 čísla.');
                return;
            }
            setStep(4);
        } else if (step === 4) {
            if (!answer.trim()) {
                setError('Prosím, odpověz na tajnou otázku.');
                return;
            }
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!supabase) return;
        setIsLoading(true);
        setError('');
        try {
            const { data, error } = await supabase
                .from('players')
                .insert({
                    username: username.trim(),
                    pin, // Simple plain text PIN for MVP kids game
                    avatar,
                    recovery_question: question,
                    recovery_answer: answer.trim().toLowerCase(),
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                // Automatically log them in
                setPlayer({
                    id: data.id,
                    username: data.username,
                    avatar: data.avatar as AvatarType,
                });
                router.push('/');
            }
        } catch (err: unknown) {
            console.error(err);
            setError('Něco se pokazilo. Zkus to prosím znovu.');
        } finally {
            setIsLoading(false);
        }
    };

    const appendPin = (num: string) => {
        if (pin.length < 4) setPin(p => p + num);
    };
    const deletePin = () => setPin(p => p.slice(0, -1));

    return (
        <div className="h-screen w-screen bg-desk-white font-sans text-board-black p-6 flex flex-col items-center justify-center overflow-auto">
            <div className="absolute top-6 left-6">
                <DeskButton size="md" variant="outline" onClick={() => (step > 1 ? setStep(s => (s - 1) as 1 | 2 | 3 | 4) : router.back())}>
                    <ChevronLeft className="w-6 h-6 mr-2" /> Zpět
                </DeskButton>
            </div>

            <div className="flex items-center gap-4 mb-8">
                <Image src="/icon.png" alt="Sova" width={64} height={64} className="w-14 h-14 mix-blend-multiply" priority />
                <h1 className="text-4xl sm:text-5xl font-black italic">Chytrý Školák</h1>
            </div>
            <div className="w-full max-w-2xl bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-xl flex flex-col items-center">

                {/* Step Indicator */}
                <div className="flex justify-center gap-4 mb-8">
                    {[1, 2, 3, 4].map((s) => (
                        <div key={s} className={`h-3 w-16 rounded-full ${step >= s ? 'bg-[#38BDF8]' : 'bg-slate-200'}`} />
                    ))}
                </div>

                {error && <div className="p-4 bg-red-100 text-red-600 rounded-2xl w-full text-center mb-6 font-bold">{error}</div>}

                {/* STEP 1: USERNAME */}
                {step === 1 && (
                    <div className="w-full flex items-center flex-col animate-in fade-in slide-in-from-right-8 duration-300">
                        <h2 className="text-4xl font-black italic mb-8">Jak se jmenuješ?</h2>
                        <input
                            type="text"
                            className="w-full max-w-md text-center text-4xl p-6 rounded-3xl border-4 border-slate-200 outline-none focus:border-[#38BDF8] transition-colors mb-8"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.replace(/[^\p{L}\p{N}]/gu, ''))}
                            placeholder="Tvé jméno"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                        />
                        <DeskButton size="xl" variant="info" onClick={handleNextStep} disabled={isLoading}>
                            Pokračovat <ArrowRight className="ml-2 w-8 h-8" />
                        </DeskButton>
                    </div>
                )}

                {/* STEP 2: AVATAR */}
                {step === 2 && (
                    <div className="w-full flex items-center flex-col animate-in fade-in slide-in-from-right-8 duration-300">
                        <h2 className="text-4xl font-black italic mb-2 text-center">Vyber si profilovku</h2>
                        <p className="text-slate-400 font-bold mb-8">Tento obrázek uvidíš v žebříčku</p>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8 w-full">
                            {AVATARS.map((a) => (
                                <button
                                    key={a.id}
                                    onClick={() => setAvatar(a.id)}
                                    className={`relative p-3 rounded-3xl border-4 transition-all hover:scale-105 ${avatar === a.id ? 'border-[#38BDF8] bg-sky-50 shadow-lg scale-105' : 'border-slate-100 hover:border-slate-300'
                                        }`}
                                >
                                    <Image src={`/avatars/${a.id}.png`} alt={a.label} width={100} height={100} className="w-full h-auto aspect-square mix-blend-multiply" />
                                </button>
                            ))}
                        </div>

                        <DeskButton size="xl" variant="info" onClick={handleNextStep}>
                            Pokračovat <ArrowRight className="ml-2 w-8 h-8" />
                        </DeskButton>
                    </div>
                )}

                {/* STEP 3: PIN */}
                {step === 3 && (
                    <div className="w-full flex items-center flex-col animate-in fade-in slide-in-from-right-8 duration-300">
                        <h2 className="text-4xl font-black italic mb-2 text-center">Vytvoř si tajný PIN</h2>
                        <p className="text-slate-400 font-bold mb-8">Pomocí 4 čísel se budeš přihlašovat</p>

                        <div className="flex gap-4 mb-8">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className={`w-16 h-20 sm:w-20 sm:h-24 rounded-2xl border-4 flex items-center justify-center text-4xl font-black ${pin[i] ? 'border-[#38BDF8] bg-sky-50' : 'border-slate-200'}`}>
                                    {pin[i] || ''}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-[300px]">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => appendPin(num.toString())}
                                    className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-3xl font-black p-4 rounded-2xl transition-colors"
                                >
                                    {num}
                                </button>
                            ))}
                            <div />
                            <button
                                onClick={() => appendPin('0')}
                                className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-3xl font-black p-4 rounded-2xl transition-colors"
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

                        {pin.length === 4 && (
                            <DeskButton size="xl" variant="info" onClick={handleNextStep}>
                                Pokračovat <ArrowRight className="ml-2 w-8 h-8" />
                            </DeskButton>
                        )}
                    </div>
                )}

                {/* STEP 4: RECOVERY */}
                {step === 4 && (
                    <div className="w-full flex items-center flex-col animate-in fade-in slide-in-from-right-8 duration-300">
                        <h2 className="text-4xl font-black italic mb-2 text-center text-class-green">Záchranná otázka</h2>
                        <p className="text-slate-400 font-bold mb-8 text-center">Pokud zapomeneš PIN, tato odpověď tě zachrání.</p>

                        <select
                            className="w-full max-w-md p-4 rounded-2xl border-4 border-slate-200 text-xl font-bold text-board-black mb-4 outline-none focus:border-[#38BDF8]"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                        >
                            {RECOVERY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>

                        <input
                            type="text"
                            className="w-full max-w-md text-center text-3xl p-6 rounded-3xl border-4 border-slate-200 outline-none focus:border-[#38BDF8] transition-colors mb-8"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            placeholder="Tvoje odpověď"
                            onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                        />

                        <DeskButton size="xl" variant="primary" onClick={handleNextStep} disabled={isLoading}>
                            {isLoading ? 'Ukládám...' : 'Vytvořit účet!'} <UserPlus className="ml-3 w-8 h-8" />
                        </DeskButton>
                    </div>
                )}

            </div>
        </div>
    );
}
