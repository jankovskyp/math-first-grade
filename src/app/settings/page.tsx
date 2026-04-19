'use client';

import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DeskButton } from '@/components/shared/DeskButton';
import { AppHeader } from '@/components/shared/AppHeader';
import { Plus, Trash2, Loader2, Calendar, Volume2, RefreshCw, AlertCircle, Lock, ImageIcon, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { addVocabularyWord, adminRegenerateAll, regenerateWordImage } from '../actions/vocabulary';
import { VocabularyWord } from '@/types/english';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { ArrowRight as ArrowRightIcon } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [enWord, setEnWord] = useState('');
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminWorking, setIsAdminWorking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [regeneratingImageId, setRegeneratingImageId] = useState<string | null>(null);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Regen dialog
  const [regenDialog, setRegenDialog] = useState<{ id: string; word: string; hint: string } | null>(null);

  // Auth state
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState(false);

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
      fetchWords();
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
      setErrorMsg(result.error || 'Neznámá chyba');
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

  const handleRegenerateImage = async (id: string, hint?: string) => {
    setRegenDialog(null);
    setRegeneratingImageId(id);
    const result = await regenerateWordImage(id, hint);
    setRegeneratingImageId(null);
    if (result.success) {
      fetchWords();
    } else {
      alert(result.error || 'Nepodařilo se vygenerovat obrázek');
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
        } catch { }
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
      <AuthGuard>
        <main className="h-screen w-screen bg-desk-white flex flex-col font-sans text-board-black">
          <div className="w-full h-full flex flex-col overflow-hidden">
            <AppHeader onBack={() => router.push('/')} />
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
              <form onSubmit={handleAuth} className="w-full max-w-sm flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-300">
                <div className="bg-slate-100 p-6 rounded-full">
                  <Lock className={`w-12 h-12 ${authError ? 'text-error animate-shake' : 'text-slate-400'}`} />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-black italic mb-1">Vstup povolen jen pro dospělé</h1>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Zadej tajný kód</p>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full text-center text-3xl font-black py-4 rounded-2xl border-4 outline-none bg-slate-50 transition-all ${authError ? 'border-error text-error' : 'border-slate-200 focus:border-slate-400'}`}
                  placeholder="••••"
                  autoFocus
                  inputMode="numeric"
                />
                <DeskButton size="md" type="submit" className="w-full py-4 text-lg bg-slate-800 text-white shadow-slate-200">
                  Odemknout <ArrowRightIcon className="ml-3 w-5 h-5" />
                </DeskButton>
              </form>
            </div>
          </div>
        </main>
      </AuthGuard>
    );
  }

  // Admin Screen (Authorized)
  return (
    <AuthGuard>
      <main className="h-screen w-screen bg-desk-white flex flex-col font-sans overflow-hidden text-board-black">

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="relative w-full max-w-lg max-h-[90vh] aspect-square" onClick={e => e.stopPropagation()}>
              <Image src={lightboxUrl} alt="" fill className="object-contain rounded-2xl" />
            </div>
          </div>
        )}

        {/* Regen dialog */}
        {regenDialog && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setRegenDialog(null)}
          >
            <div
              className="bg-white rounded-[2rem] p-6 w-full max-w-sm flex flex-col gap-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">Generovat obrázek</h3>
                <button onClick={() => setRegenDialog(null)} className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-400 font-bold text-sm">
                Slovíčko: <span className="text-board-black uppercase">{regenDialog.word}</span>
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase tracking-widest text-slate-300">
                  Doplňující instrukce <span className="font-normal normal-case">(volitelné)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Např. nakresli červený míč v krabici, styl: pastelové barvy…"
                  value={regenDialog.hint}
                  onChange={e => setRegenDialog(d => d ? { ...d, hint: e.target.value } : d)}
                  className="w-full text-sm font-medium py-3 px-4 rounded-2xl border-2 border-slate-200 focus:border-class-green outline-none bg-slate-50 resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <DeskButton size="md" variant="outline" className="flex-1 border-slate-200" onClick={() => setRegenDialog(null)}>
                  Zrušit
                </DeskButton>
                <DeskButton
                  size="md"
                  className="flex-1"
                  onClick={() => handleRegenerateImage(regenDialog.id, regenDialog.hint || undefined)}
                >
                  <ImageIcon className="w-4 h-4 mr-2" /> Generovat
                </DeskButton>
              </div>
            </div>
          </div>
        )}

        {/* Header row */}
        <div className="flex items-center gap-2 pr-4 shrink-0">
          <AppHeader page="Slovníček (Admin)" onBack={() => router.push('/')} />
          <button
            onClick={handleRegenerate}
            disabled={isAdminWorking}
            className="flex items-center justify-center gap-2 shrink-0 p-2.5 rounded-xl border-2 border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors disabled:opacity-50"
            title="Regenerovat vše"
          >
            {isAdminWorking ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            <span className="hidden sm:inline text-sm font-bold">Regenerovat vše</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto min-h-0">

          {/* Add word panel */}
          <div className="w-full lg:w-80 xl:w-96 bg-white p-5 rounded-[2rem] shadow-md border-2 border-slate-100 flex flex-col gap-4 shrink-0">
            <h2 className="text-xl font-black">Nové slovíčko</h2>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-slate-400 font-bold uppercase tracking-widest text-xs ml-1">Anglicky</label>
                <input
                  type="text"
                  value={enWord}
                  onChange={(e) => setEnWord(e.target.value)}
                  className="w-full text-2xl font-black py-3 px-4 rounded-2xl border-4 border-slate-100 focus:border-class-green outline-none bg-slate-50 text-slate-900"
                  placeholder="apple"
                  autoFocus
                />
              </div>
              {errorMsg && (
                <div className="bg-error/10 text-error p-3 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-bold leading-tight">{errorMsg}</p>
                </div>
              )}
              <DeskButton size="md" variant="outline" className="w-full py-4 border-slate-800 text-slate-800 bg-white" type="submit" disabled={!enWord.trim() || isLoading || !isSupabaseConfigured}>
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6 mr-2" />}
                {isLoading ? 'Ukládám...' : 'Přidat do slovníku'}
              </DeskButton>
            </form>
            <p className="text-[10px] text-slate-400 text-center mt-auto uppercase font-bold tracking-wider">Automaticky vytvoří zvuk a podobné varianty</p>
          </div>

          {/* Word list */}
          <div className="flex-1 bg-white p-5 rounded-[2rem] shadow-md border-2 border-slate-100 flex flex-col overflow-hidden min-h-[300px] lg:min-h-0">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black">Seznam slovíček</h2>
              <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-400 font-bold text-sm">Počet: {words.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              {words.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-20"><p className="text-xl font-black uppercase">Prázdno</p></div>
              ) : (
                words.map((w) => (
                  <div key={w.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border-2 border-slate-100 hover:border-slate-200 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      {w.image_url ? (
                        <button
                          onClick={() => setLightboxUrl(w.image_url!)}
                          className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 hover:border-class-green hover:scale-105 transition-all"
                          title="Zobrazit obrázek"
                        >
                          <Image src={w.image_url} alt={w.en} fill className="object-cover" />
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0 flex items-center justify-center">
                          <span className="text-slate-400 text-[9px] font-bold uppercase">–</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-lg font-black text-slate-900 uppercase truncate">{w.en}</div>
                        <div className="flex items-center gap-1 text-slate-300">
                          <Calendar className="w-3 h-3" />
                          <p className="text-[10px] font-bold uppercase tracking-wider">{new Date(w.created_at).toLocaleDateString('cs-CZ')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {w.audio_url && (
                        <button onClick={() => playPreview(w.audio_url!)} className="text-class-green hover:bg-white p-2.5 rounded-xl transition-all">
                          <Volume2 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => setRegenDialog({ id: w.id, word: w.en, hint: '' })}
                        disabled={regeneratingImageId === w.id}
                        title="Vygenerovat obrázek znovu"
                        className="text-slate-300 hover:text-class-green transition-colors p-2.5 rounded-xl disabled:opacity-50"
                      >
                        {regeneratingImageId === w.id
                          ? <Loader2 className="w-5 h-5 animate-spin" />
                          : <ImageIcon className="w-5 h-5" />}
                      </button>
                      <button onClick={() => handleDelete(w.id, w.audio_url)} className="text-slate-300 hover:text-error transition-colors p-2.5 rounded-xl">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </AuthGuard>
  );
}
