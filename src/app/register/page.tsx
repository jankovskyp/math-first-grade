'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePlayer, AvatarType } from '@/context/PlayerContext';
import { DeskButton } from '@/components/shared/DeskButton';
import { AppHeader } from '@/components/shared/AppHeader';
import { ChevronLeft, ArrowRight, UserPlus } from 'lucide-react';
import Image from 'next/image';

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

    const goBack = () => {
        if (step > 1) setStep(s => (s - 1) as 1 | 2 | 3 | 4);
        else router.back();
    };

    const handleNextStep = async () => {
        setError('');
        if (step === 1) {
            if (!username.trim()) { setError('Zadej prosím svoji přezdívku.'); return; }
            if (!supabase) { setError('Připojení selhalo.'); return; }
            setIsLoading(true);
            const { data, error: dbErr } = await supabase.from('players').select('id').ilike('username', username.trim()).single();
            setIsLoading(false);
            if (dbErr && dbErr.code !== 'PGRST116') { /* genuine error, allow to continue */ }
            if (data) { setError('Tato přezdívka už někdo používá. Zkus jinou!'); return; }
            setStep(2);
        } else if (step === 2) {
            if (!avatar) { setError('Vyber si svého zvířecího kamaráda!'); return; }
            setStep(3);
        } else if (step === 3) {
            if (pin.length !== 4) { setError('PIN musí mít přesně 4 čísla.'); return; }
            setStep(4);
        } else if (step === 4) {
            if (!answer.trim()) { setError('Prosím, odpověz na tajnou otázku.'); return; }
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        if (!supabase) return;
        setIsLoading(true);
        setError('');
        try {
            const { data, error: insertError } = await supabase
                .from('players')
                .insert({ username: username.trim(), pin, avatar, recovery_question: question, recovery_answer: answer.trim().toLowerCase() })
                .select()
                .single();
            if (insertError) throw insertError;
            if (data) {
                setPlayer({ id: data.id, username: data.username, avatar: data.avatar as AvatarType });
                router.push('/');
            }
        } catch (err: unknown) {
            console.error(err);
            setError('Něco se pokazilo. Zkus to prosím znovu.');
        } finally {
            setIsLoading(false);
        }
    };

    const appendPin = (num: string) => { if (pin.length < 4) setPin(p => p + num); };
    const deletePin = () => setPin(p => p.slice(0, -1));

    return (
        <main className="h-screen w-screen bg-desk-white flex flex-col font-sans text-board-black">
            <div className="w-full h-full flex flex-col overflow-hidden">

                <AppHeader
                    onBack={goBack}
                    rightContent={
                        <div className="flex gap-1.5 pr-1">
                            {[1, 2, 3, 4].map((s) => (
                                <div key={s} className={`h-2 w-8 rounded-full transition-colors ${step >= s ? 'bg-class-green' : 'bg-slate-200'}`} />
                            ))}
                        </div>
                    }
                />

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
                  <div className="w-full max-w-sm flex flex-col items-center">

                    {error && <div className="p-4 bg-red-100 text-red-600 rounded-2xl w-full text-center mb-4 font-bold animate-in slide-in-from-top-2 duration-200">{error}</div>}

                    {/* STEP 1: USERNAME */}
                    {step === 1 && (
                        <div className="w-full flex items-center flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-4xl font-black italic text-center">Jaká je tvoje přezdívka?</h2>
                            <input
                                type="text"
                                className="w-full text-center text-xl font-black p-4 rounded-2xl border-4 border-slate-200 outline-none focus:border-class-green transition-colors bg-slate-50"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.replace(/[^\p{L}\p{N}]/gu, ''))}
                                placeholder="Tvoje přezdívka"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                            />
                            <DeskButton size="md" variant="info" onClick={handleNextStep} disabled={isLoading} className="w-full py-4 text-lg">
                                Pokračovat <ArrowRight className="ml-2 w-5 h-5" />
                            </DeskButton>
                        </div>
                    )}

                    {/* STEP 2: AVATAR */}
                    {step === 2 && (
                        <div className="w-full flex items-center flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-4xl font-black italic text-center">Vyber si profilovku</h2>
                            <p className="text-slate-400 font-bold text-sm">Tento obrázek uvidíš v žebříčku</p>
                            <div className="grid grid-cols-5 gap-3 w-full">
                                {AVATARS.map((a) => (
                                    <button
                                        key={a.id}
                                        onClick={() => setAvatar(a.id)}
                                        className={`relative p-2 rounded-2xl border-4 transition-all hover:scale-105 ${avatar === a.id ? 'border-class-green bg-class-green/10 shadow-lg scale-105' : 'border-slate-100 hover:border-slate-300'}`}
                                    >
                                        <Image src={`/avatars/${a.id}.png`} alt={a.label} width={80} height={80} className="w-full h-auto aspect-square mix-blend-multiply" />
                                    </button>
                                ))}
                            </div>
                            <DeskButton size="md" variant="info" onClick={handleNextStep} className="w-full py-4 text-lg">
                                Pokračovat <ArrowRight className="ml-2 w-5 h-5" />
                            </DeskButton>
                        </div>
                    )}

                    {/* STEP 3: PIN */}
                    {step === 3 && (
                        <div className="w-full flex items-center flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-4xl font-black italic text-center">Vytvoř si tajný PIN</h2>
                            <p className="text-slate-400 font-bold text-sm">Pomocí 4 čísel se budeš přihlašovat</p>
                            <div className="flex gap-3">
                                {[0, 1, 2, 3].map((i) => (
                                    <div key={i} className={`w-14 h-14 rounded-2xl border-4 flex items-center justify-center text-4xl font-black ${pin[i] ? 'border-class-green bg-class-green/10' : 'border-slate-200'}`}>
                                        {pin[i] || ''}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                    <button key={num} onClick={() => appendPin(num.toString())}
                                        className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-3xl font-black p-4 rounded-2xl transition-colors">
                                        {num}
                                    </button>
                                ))}
                                <div />
                                <button onClick={() => appendPin('0')}
                                    className="bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-3xl font-black p-4 rounded-2xl transition-colors">
                                    0
                                </button>
                                <button onClick={deletePin}
                                    className="bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-500 font-bold p-4 rounded-2xl flex items-center justify-center transition-colors">
                                    <ChevronLeft className="w-7 h-7" />
                                </button>
                            </div>
                            {pin.length === 4 && (
                                <DeskButton size="md" variant="info" onClick={handleNextStep} className="w-full py-4 text-lg animate-in fade-in duration-200">
                                    Pokračovat <ArrowRight className="ml-2 w-5 h-5" />
                                </DeskButton>
                            )}
                        </div>
                    )}

                    {/* STEP 4: RECOVERY QUESTION */}
                    {step === 4 && (
                        <div className="w-full flex items-center flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-4xl font-black italic text-center text-class-green">Záchranná otázka</h2>
                            <p className="text-slate-400 font-bold text-sm text-center">Pokud zapomeneš PIN, tato odpověď tě zachrání.</p>
                            <select
                                className="w-full p-4 rounded-2xl border-4 border-slate-200 text-lg font-bold text-board-black outline-none focus:border-class-green bg-white"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                            >
                                {RECOVERY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                            </select>
                            <input
                                type="text"
                                className="w-full text-center text-xl font-black p-4 rounded-2xl border-4 border-slate-200 outline-none focus:border-class-green transition-colors bg-slate-50"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="Tvoje odpověď"
                                onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                                autoFocus
                            />
                            <DeskButton size="md" variant="primary" onClick={handleNextStep} disabled={isLoading} className="w-full py-4 text-lg">
                                {isLoading ? 'Ukládám...' : 'Vytvořit účet!'} <UserPlus className="ml-3 w-5 h-5" />
                            </DeskButton>
                        </div>
                    )}

                  </div>
                </div>
            </div>
        </main>
    );
}
