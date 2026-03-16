'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DeskButton } from '@/components/shared/DeskButton';
import { Home, Plus, Trash2, Loader2, Calendar, Volume2, RefreshCw, AlertCircle, Lock, Unlock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { addVocabularyWord, adminRegenerateAll } from '../actions/vocabulary';
import { VocabularyWord } from '@/types/english';

export default function SettingsPage() {
  const router = useRouter();
  const [enWord, setEnWord] = useState('');
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminWorking, setIsAdminWorking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Auth state
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState(false);

  useEffect(() => { 
    if (isAuthorized) fetchWords(); 
  }, [isAuthorized]);

  const fetchWords = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('vocabulary').select('*').order('created_at', { ascending: false });
      if (data) setWords(data as VocabularyWord[]);
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '0808') {
      setIsAuthorized(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setPassword('');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enWord.trim() || !isSupabaseConfigured) return;
    setIsLoading(true);
    setErrorMsg(null);
    const result = await addVocabularyWord(enWord.trim());
    if (result.success) {
      setEnWord('');
      fetchWords();
    } else {
      setErrorMsg(result.error);
    }
    setIsLoading(false);
  };

  const handleRegenerate = async () => {
    if (!confirm('Tato akce dogeneruje chybějící audio a chytré varianty pro všechna slova. Pokračovat?')) return;
    setIsAdminWorking(true);
    const result = await adminRegenerateAll();
    setIsAdminWorking(false);
    if (result.success) {
      alert(`Hotovo! Aktualizováno ${result.count} slovíček.`);
      fetchWords();
    }
  };

  const handleDelete = async (id: string, audioUrl?: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    if (confirm('Opravdu chceš smazat toto slovíčko?')) {
      await supabase.from('vocabulary').delete().eq('id', id);
      if (audioUrl) {
        try {
          const fileName = audioUrl.split('/').pop();
          if (fileName) await supabase.storage.from('audio').remove([fileName]);
        } catch (e) {}
      }
      fetchWords();
    }
  };

  const playPreview = (url: string) => {
    const audio = new Audio(url);
    audio.play();
  };

  // Login Screen
  if (!isAuthorized) {
    return (
      <main className="h-screen w-screen bg-slate-100 flex items-center justify-center p-6 font-sans text-board-black">
        <div className="absolute top-6 left-6">
          <DeskButton variant="outline" size="md" onClick={() => router.push('/')} className="border-slate-400">
            <Home className="w-8 h-8 text-slate-600" />
          </DeskButton>
        </div>

        <form onSubmit={handleAuth} className="w-full max-w-md bg-white p-12 rounded-[4rem] shadow-2xl border-8 border-slate-50 flex flex-col items-center gap-8 animate-in zoom-in duration-300">
          <div className="bg-slate-100 p-8 rounded-full">
            <Lock className={`w-16 h-16 ${authError ? 'text-error animate-shake' : 'text-slate-400'}`} />
          </div>
          
          <div className="text-center">
            <h1 className="text-4xl font-black italic mb-2">Vstup povolen jen pro dospělé</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Zadej tajný kód</p>
          </div>

          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full text-center text-6xl font-black py-6 rounded-3xl border-8 outline-none bg-slate-50 transition-all ${authError ? 'border-error text-error' : 'border-slate-100 focus:border-slate-400'}`}
            placeholder="****"
            autoFocus
            inputMode="numeric"
          />

          <DeskButton size="xl" type="submit" className="w-full bg-slate-800 text-white shadow-slate-200">
            Odemknout <ArrowRightIcon className="ml-4 w-10 h-10" />
          </DeskButton>
        </form>
      </main>
    );
  }

  // Admin Screen (Authorized)
  return (
    <main className="h-screen w-screen bg-slate-50 flex flex-col p-6 font-sans text-slate-900 overflow-hidden text-board-black">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
          <DeskButton variant="outline" size="md" onClick={() => router.push('/')} className="border-slate-400 text-board-black">
            <Home className="w-8 h-8 text-slate-600" />
          </DeskButton>
          <h1 className="text-6xl font-black italic text-slate-800">Slovníček (Admin)</h1>
        </div>
        <div className="flex gap-4">
          <DeskButton variant="outline" size="md" onClick={handleRegenerate} disabled={isAdminWorking} className="border-slate-300 text-slate-400 py-3">
            {isAdminWorking ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <RefreshCw className="w-6 h-6 mr-3" />}
            Regenerovat vše
          </DeskButton>
          <button onClick={() => setIsAuthorized(false)} className="bg-slate-200 p-4 rounded-2xl text-slate-500 hover:bg-slate-300 transition-all">
            <Unlock className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex gap-8 flex-1 min-h-0 text-board-black">
        <div className="w-[400px] bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-100 flex flex-col gap-6 shrink-0">
          <h2 className="text-3xl font-black mb-2">Nové slovíčko</h2>
          <form onSubmit={handleAdd} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-2">Anglicky</label>
              <input 
                type="text" 
                value={enWord} 
                onChange={(e) => setEnWord(e.target.value)} 
                className="w-full text-3xl font-black py-5 px-6 rounded-2xl border-4 border-slate-100 focus:border-[#38BDF8] outline-none bg-slate-50 text-slate-900"
                placeholder="apple"
                autoFocus
              />
            </div>
            {errorMsg && (
              <div className="bg-error/10 text-error p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <p className="text-sm font-bold leading-tight">{errorMsg}</p>
              </div>
            )}
            <DeskButton size="lg" variant="outline" className="w-full py-6 text-2xl border-slate-800 text-slate-800 bg-white" type="submit" disabled={!enWord.trim() || isLoading || !isSupabaseConfigured}>
              {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Plus className="w-8 h-8 mr-2" />} 
              {isLoading ? 'Ukládám...' : 'Přidat do slovníku'}
            </DeskButton>
          </form>
          <p className="text-[10px] text-slate-400 text-center mt-auto uppercase font-bold tracking-wider">Automaticky vytvoří zvuk a podobné varianty</p>
        </div>

        <div className="flex-1 bg-white p-8 rounded-[3rem] shadow-xl border-4 border-slate-100 flex flex-col overflow-hidden text-board-black">
           <div className="flex justify-between items-center mb-6 text-board-black">
              <h2 className="text-3xl font-black">Seznam slovíček</h2>
              <span className="bg-slate-100 px-4 py-1 rounded-full text-slate-400 font-bold text-sm">Počet: {words.length}</span>
           </div>
           <div className="flex-1 overflow-y-auto pr-4 flex flex-col gap-3 text-board-black text-board-black">
              {words.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20"><p className="text-2xl font-black uppercase">Prázdno</p></div>
              ) : (
                words.map((w) => (
                  <div key={w.id} className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 hover:border-slate-200 transition-all text-board-black">
                    <div className="flex items-center gap-8 text-3xl font-black text-board-black text-board-black">
                      <div className="text-slate-900 uppercase">{w.en}</div>
                      <div className="flex items-center gap-1 text-slate-300">
                        <Calendar className="w-3 h-3" /><p className="text-[10px] font-bold uppercase tracking-wider">{new Date(w.created_at).toLocaleDateString('cs-CZ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {w.audio_url && (<button onClick={() => playPreview(w.audio_url!)} className="text-[#38BDF8] hover:bg-white p-3 rounded-xl transition-all"><Volume2 className="w-6 h-6" /></button>)}
                      <button onClick={() => handleDelete(w.id, w.audio_url)} className="text-slate-200 hover:text-error transition-colors p-3 rounded-xl"><Trash2 className="w-6 h-6" /></button>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </main>
  );
}

import { ArrowRight as ArrowRightIcon } from 'lucide-react';
