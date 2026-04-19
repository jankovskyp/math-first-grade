'use client';

import { useState, useEffect, useCallback } from 'react';
import { EnglishGameState, EnglishMode, EnglishProblem, EnglishStats, EnglishLeaderboardEntry, VocabularyWord } from '../../types/english';
import { generateEnglishProblem, playAudio } from '../../lib/english-logic';
import { DeskButton } from '../shared/DeskButton';
import { SpellingKeyboard } from '../shared/SpellingKeyboard';
import { AppHeader } from '../shared/AppHeader';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import Image from 'next/image';
import {
  Trophy, Timer, RotateCcw, Play, CheckCircle2, XCircle, Home,
  ListOrdered, Frown, Star, Loader2, Volume2, X, ChevronLeft,
  ChevronRight, Medal,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';

const LOCAL_STORAGE_KEY = 'english-leaderboard-local-v3';

// --- Custom Date Picker ---
function CustomDatePicker({
  initialDate,
  onSelect,
  onClose,
}: {
  initialDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(initialDate ? new Date(initialDate) : new Date());
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString('cs-CZ', { month: 'long' });
  const days: (number | null)[] = [];
  const startOffset = (firstDayOfMonth(year, month) + 6) % 7;
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let i = 1; i <= daysInMonth(year, month); i++) days.push(i);

  return (
    <div
      className="fixed inset-0 bg-board-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 font-sans text-board-black"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl flex flex-col gap-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-4xl font-black italic">Vyber datum</h3>
          <button onClick={onClose} className="p-4 bg-slate-100 rounded-2xl text-slate-400 hover:text-error transition-all">
            <X className="w-8 h-8" />
          </button>
        </div>
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-3xl">
          <button
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            className="p-4 hover:bg-white rounded-2xl transition-all shadow-sm"
          >
            <ChevronLeft className="w-10 h-10 text-class-green" />
          </button>
          <span className="text-3xl font-black uppercase tracking-widest">{monthName} {year}</span>
          <button
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            className="p-4 hover:bg-white rounded-2xl transition-all shadow-sm"
          >
            <ChevronRight className="w-10 h-10 text-class-green" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-3 text-center">
          {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(d => (
            <span key={d} className="text-slate-300 font-bold text-sm uppercase mb-2">{d}</span>
          ))}
          {days.map((day, i) => {
            if (!day) return <div key={i} />;
            const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return (
              <button
                key={i}
                onClick={() => { const d = new Date(year, month, day); d.setHours(12); onSelect(d.toISOString().split('T')[0]); }}
                className={`h-16 text-2xl font-black rounded-2xl flex items-center justify-center transition-all ${
                  initialDate === iso
                    ? 'bg-class-green text-white shadow-lg scale-105'
                    : 'bg-slate-50 text-board-black hover:bg-class-green/10'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
export default function EnglishGameContainer() {
  const router = useRouter();
  const [gameState, setGameState]     = useState<EnglishGameState>('HOME');
  const [gameMode, setGameMode]       = useState<'training' | 'competition'>('training');
  const [selectedMode, setSelectedMode] = useState<EnglishMode>('listen');
  const [words, setWords]             = useState<VocabularyWord[]>([]);
  const [currentProblem, setCurrentProblem] = useState<EnglishProblem | null>(null);
  const [stats, setStats]             = useState<EnglishStats>({ correct: 0, total: 0, errors: 0, percentage: 0 });
  const [timeLeft, setTimeLeft]       = useState(60);
  const [feedback, setFeedback]       = useState<'correct' | 'wrong' | null>(null);
  const [clickedOptions, setClickedOptions] = useState<Set<string>>(new Set());
  const [hasErrorInCurrent, setHasErrorInCurrent] = useState(false);
  const { player }                    = usePlayer();
  const [spellingInput, setSpellingInput] = useState('');
  const [leaderboard, setLeaderboard] = useState<EnglishLeaderboardEntry[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<EnglishMode | 'all'>('all');
  const [isLoading, setIsLoading]     = useState(false);
  const [fromDate, setFromDate]       = useState<string>('');
  const [selectionMode, setSelectionMode] = useState<'all' | 'date'>('all');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [liveScore, setLiveScore]     = useState(0);
  const [scorePop, setScorePop]       = useState(false);
  const [showNewRecord, setShowNewRecord] = useState(false);

  // --- Data fetching ---

  const fetchWords = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('vocabulary').select('*').order('created_at', { ascending: false });
      if (data) setWords(data as VocabularyWord[]);
    }
  }, []);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localData: (EnglishLeaderboardEntry & { player_id?: string })[] = saved ? JSON.parse(saved) : [];

    if (!isSupabaseConfigured || !supabase) {
      setLeaderboard(localData);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('english_leaderboard')
        .select('*, players ( avatar )')
        .order('score', { ascending: false })
        .limit(100);

      if (error) throw error;
      if (data && data.length > 0) {
        const mapped = data.map((d: { players?: { avatar?: string } } & Record<string, unknown>) => ({
          ...d,
          avatar: d.players?.avatar,
        }));
        setLeaderboard(mapped as EnglishLeaderboardEntry[]);
      } else {
        setLeaderboard(localData);
      }
    } catch {
      setLeaderboard(localData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gameState === 'LEADERBOARD') fetchLeaderboard();
  }, [gameState, fetchLeaderboard]);

  const getFilteredWords = useCallback(() => {
    if (selectionMode === 'all' || !fromDate) return words;
    const cutoff = new Date(fromDate);
    cutoff.setHours(0, 0, 0, 0);
    return words.filter(w => new Date(w.created_at) >= cutoff);
  }, [words, fromDate, selectionMode]);

  const filteredCount = getFilteredWords().length;

  const saveToLeaderboard = async () => {
    console.log('[ENG-SAVE] saveToLeaderboard called, liveScore=', liveScore, 'selectedMode=', selectedMode, 'player=', player?.username);
    setIsLoading(true);
    const entry: EnglishLeaderboardEntry & { player_id?: string } = {
      id: Math.random().toString(36).substring(2, 9),
      name: player?.username || 'NEZNÁMÝ HRÁČ',
      score: liveScore,
      errors: stats.errors,
      total: stats.total,
      accuracy: Math.round((stats.correct / (stats.total || 1)) * 100),
      mode: selectedMode,
      date: new Date().toLocaleDateString('cs-CZ'),
      player_id: player?.id,
    };

    const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localList = localSaved ? JSON.parse(localSaved) : [];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(
      [...localList, entry].sort((a, b) => b.score - a.score).slice(0, 100)
    ));

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('english_leaderboard').insert([{
          name: entry.name,
          score: entry.score,
          errors: entry.errors,
          total: entry.total,
          accuracy: entry.accuracy,
          mode: entry.mode,
          date: entry.date,
          player_id: player?.id,
        }]);
        if (error) console.error('[ENG-SAVE] Supabase insert error:', error);
      } catch (err: unknown) {
        console.error('[ENG-SAVE] Supabase exception:', err);
      }
    }

    setIsLoading(false);
  };

  // --- Game logic ---

  const startNewGame = (mode: 'training' | 'competition') => {
    const filtered = getFilteredWords();
    if (filtered.length < 1) {
      alert('Nemáš žádná slovíčka.');
      return;
    }
    setGameMode(mode);
    setStats({ correct: 0, total: 0, errors: 0, percentage: 0 });
    setLiveScore(0);
    setTimeLeft(60);
    setGameState('PLAYING');
    nextProblem(filtered);
  };

  const nextProblem = useCallback((currentWords: VocabularyWord[] = getFilteredWords()) => {
    setFeedback(null);
    setClickedOptions(new Set());
    setHasErrorInCurrent(false);
    setSpellingInput('');
    const problem = generateEnglishProblem(currentWords, [selectedMode]);
    setCurrentProblem(problem);
    if (problem?.audioUrl && problem.type !== 'picture') setTimeout(() => playAudio(problem.audioUrl!), 300);
  }, [getFilteredWords, selectedMode]);

  const handleAnswer = (answer: string) => {
    if (!currentProblem || feedback !== null) return;
    const isCorrect = answer.toLowerCase().trim() === currentProblem.correctAnswer.toLowerCase().trim();

    if (isCorrect) {
      setFeedback('correct');
      const newCorrect = !hasErrorInCurrent ? stats.correct + 1 : stats.correct;
      const newTotal   = stats.total + 1;
      setStats(prev => ({ ...prev, correct: newCorrect, total: newTotal }));

      if (gameMode === 'competition') {
        const accuracy = Math.round((newCorrect / newTotal) * 100);
        const newScore = Math.max(0, Math.round(((newCorrect * 10) - (stats.errors * 5)) * (accuracy / 100)));
        setLiveScore(newScore);
        setScorePop(true);
        setTimeout(() => setScorePop(false), 300);
      }
      setTimeout(() => nextProblem(), 800);
    } else {
      setFeedback('wrong');
      setHasErrorInCurrent(true);
      setClickedOptions(prev => new Set(prev).add(answer));
      const newErrors = stats.errors + 1;
      const newTotal  = stats.total + 1;
      setStats(prev => ({ ...prev, errors: newErrors, total: newTotal }));

      if (gameMode === 'competition') {
        const accuracy = Math.round((stats.correct / newTotal) * 100);
        const newScore = Math.max(0, Math.round(((stats.correct * 10) - (newErrors * 5)) * (accuracy / 100)));
        setLiveScore(newScore);
        setTimeout(() => nextProblem(), 800);
      } else {
        // training: clear feedback + input after 1 s so user can retry
        setTimeout(() => { setFeedback(null); setSpellingInput(''); }, 1000);
      }
    }
  };

  const handleSpellingSubmit = () => {
    if (!spellingInput.trim()) return;
    handleAnswer(spellingInput);
  };

  const handleSkip = () => {
    if (!hasErrorInCurrent) {
      const newErrors = stats.errors + 1;
      const newTotal = stats.total + 1;
      setStats(prev => ({ ...prev, errors: newErrors, total: newTotal }));
      setHasErrorInCurrent(true);
      if (gameMode === 'competition') {
        const accuracy = Math.round((stats.correct / newTotal) * 100);
        const newScore = Math.max(0, Math.round(((stats.correct * 10) - (newErrors * 5)) * (accuracy / 100)));
        setLiveScore(newScore);
      }
    }
    nextProblem();
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'PLAYING' && gameMode === 'competition' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'PLAYING') {
      console.log('[ENG-TIMER] Timer hit 0! liveScore=', liveScore, 'selectedMode=', selectedMode, 'player=', player?.id);
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const localList: EnglishLeaderboardEntry[] = saved ? JSON.parse(saved) : [];
      const personalBest = localList
        .filter(e => (e as EnglishLeaderboardEntry & { player_id?: string }).player_id === player?.id && e.mode === selectedMode)
        .reduce((best, e) => Math.max(best, e.score), 0);
      const isNewRecord = liveScore > personalBest && liveScore > 0;
      if (isNewRecord) setShowNewRecord(true);
      if (isNewRecord) {
        saveToLeaderboard().then(() => {
          setTimeout(() => { setShowNewRecord(false); setGameState('RESULTS'); }, 5000);
        });
      } else {
        setGameState('RESULTS');
      }
    }
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, gameMode, timeLeft, liveScore]);

  // ==========================================================================
  // Render
  // ==========================================================================

  if (showNewRecord) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-class-green text-white font-sans p-8 animate-in fade-in duration-500">
        <Trophy className="w-40 h-40 mb-6 animate-bounce" fill="currentColor" />
        <h1 className="text-4xl font-black italic mb-3 text-center">NOVÝ REKORD!</h1>
        <p className="text-3xl font-bold uppercase tracking-widest text-center">{liveScore} BODŮ</p>
      </div>
    );
  }

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (gameState === 'HOME') {
    return (
      <div className="flex flex-col h-full bg-desk-white font-sans text-board-black">
        <AppHeader subject="Angličtina" onBack={() => router.push('/')} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 pb-6">
          <DeskButton size="lg" onClick={() => { setGameMode('training'); setGameState('SETUP'); }} className="w-full py-7">
            <Play className="mr-4 w-9 h-9" fill="currentColor" strokeWidth={2.5} /> Trénink
          </DeskButton>
          <DeskButton size="lg" variant="secondary" onClick={() => { setGameMode('competition'); setGameState('SETUP'); }} className="w-full py-7">
            <Trophy className="mr-4 w-9 h-9" fill="currentColor" strokeWidth={2.5} /> Soutěž
          </DeskButton>
          <DeskButton size="lg" variant="outline" className="w-full border-slate-200 py-5" onClick={() => setGameState('LEADERBOARD')}>
            <ListOrdered className="mr-4 w-7 h-7" /> Žebříček
          </DeskButton>
        </div>
      </div>
    );
  }

  // ── LEADERBOARD ───────────────────────────────────────────────────────────
  if (gameState === 'LEADERBOARD') {
    const deduped = (entries: typeof leaderboard) => {
      const map = new Map<string, typeof leaderboard[0]>();
      for (const e of entries) {
        const key = `${(e as EnglishLeaderboardEntry & { player_id?: string }).player_id ?? e.name}-${e.mode}`;
        const ex = map.get(key);
        if (!ex || e.score > ex.score) map.set(key, e);
      }
      return Array.from(map.values()).sort((a, b) => b.score - a.score);
    };
    const bestPerPlayer = (entries: typeof leaderboard) => {
      const map = new Map<string, typeof leaderboard[0]>();
      for (const e of entries) {
        const key = (e as EnglishLeaderboardEntry & { player_id?: string }).player_id ?? e.name;
        const ex = map.get(key);
        if (!ex || e.score > ex.score) map.set(key, e);
      }
      return Array.from(map.values()).sort((a, b) => b.score - a.score);
    };
    const filteredLeaderboard =
      leaderboardTab === 'all'
        ? bestPerPlayer(leaderboard)
        : deduped(leaderboard.filter(e => e.mode === leaderboardTab));

    return (
      <div className="flex flex-col h-full bg-desk-white font-sans text-board-black">
        <AppHeader subject="Angličtina" page="Žebříček" onBack={() => setGameState('HOME')} />

        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] mx-4">
          <DeskButton size="md" variant={leaderboardTab === 'all' ? 'primary' : 'outline'} className="border-none shadow-none py-2 px-4 whitespace-nowrap" onClick={() => setLeaderboardTab('all')}>
            Všechno
          </DeskButton>
          {(['listen', 'spelling', 'picture'] as const).map(m => {
            const labels = { listen: 'Poslech', spelling: 'Psaní', picture: 'Obrázky' };
            return (
              <DeskButton key={m} size="md" variant={leaderboardTab === m ? 'primary' : 'outline'} className="border-none shadow-none py-2 px-4 whitespace-nowrap" onClick={() => setLeaderboardTab(m)}>
                {labels[m]}
              </DeskButton>
            );
          })}
        </div>

        <div className="bg-white rounded-[2rem] p-4 mx-4 mt-3 mb-4 shadow-xl overflow-hidden flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-slate-200" />
              <p className="text-xl text-slate-300 font-bold">Načítám...</p>
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <p className="text-center text-2xl text-slate-300 py-16">Zatím žádné výsledky</p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto h-full pr-1">
              <div className="flex text-slate-400 font-bold px-3 mb-1 uppercase text-[10px] tracking-[0.15em]">
                <span className="w-10 text-center shrink-0">#</span>
                <span className="flex-1 ml-2">Jméno</span>
                <span className="w-16 text-center shrink-0">Úspěch</span>
                <span className="w-14 text-center font-black shrink-0">Body</span>
              </div>
              {filteredLeaderboard.map((entry, i) => {
                const labels = { listen: 'POSLECH', spelling: 'PSANÍ', picture: 'OBRÁZKY' };
                return (
                  <div key={entry.id} className="flex items-center p-3 bg-slate-50 rounded-xl">
                    <span className="w-10 flex justify-center shrink-0">
                      {i === 0 ? <Medal className="w-7 h-7 text-yellow-400" fill="currentColor" /> :
                       i === 1 ? <Medal className="w-7 h-7 text-slate-300" fill="currentColor" /> :
                       i === 2 ? <Medal className="w-7 h-7 text-amber-600" fill="currentColor" /> :
                                 <span className="text-lg font-black text-slate-300 italic">#{i + 1}</span>}
                    </span>
                    <div className="flex-1 ml-2 min-w-0 flex items-center gap-2">
                      {entry.avatar && (
                        <Image src={`/avatars/${entry.avatar}.png`} alt="avatar" width={28} height={28} className="w-7 h-7 drop-shadow-sm mix-blend-multiply shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-black leading-tight uppercase truncate">{entry.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          {labels[entry.mode as keyof typeof labels] || entry.mode}
                        </p>
                      </div>
                    </div>
                    <div className="w-16 text-center text-sm font-black text-class-green bg-class-green/10 py-1 rounded-lg shrink-0">{entry.accuracy}%</div>
                    <div className="w-14 text-center text-base font-black shrink-0">{entry.score}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (gameState === 'SETUP') {
    const isCompetition = gameMode === 'competition';
    return (
      <div className="flex flex-col h-full font-sans text-board-black">
        <AppHeader subject="Angličtina" page={isCompetition ? 'Soutěž' : 'Trénink'} onBack={() => setGameState('HOME')} />
        <div className="flex-1 flex flex-col items-center justify-start gap-3 p-4 overflow-y-auto">

          {/* Word selection */}
          <div className="flex flex-col gap-2 items-center w-full bg-white p-4 rounded-[2rem] border-2 border-slate-100">
            <p className="text-xs font-black uppercase tracking-widest text-slate-300">Která slovíčka?</p>
            <div className="flex gap-2 w-full items-center">
              <DeskButton size="md" variant={selectionMode === 'all' ? 'primary' : 'outline'} className="flex-1 py-2 text-base" onClick={() => setSelectionMode('all')}>
                Všechna
              </DeskButton>
              <DeskButton
                size="md"
                variant={selectionMode === 'date' ? 'primary' : 'outline'}
                className="flex-1 py-2 text-base"
                onClick={() => { setSelectionMode('date'); setIsDatePickerOpen(true); }}
              >
                {fromDate ? new Date(fromDate).toLocaleDateString('cs-CZ') : 'Jen od data'}
              </DeskButton>
              {selectionMode === 'date' && fromDate && (
                <button
                  onClick={() => { setFromDate(''); setSelectionMode('all'); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-error hover:bg-red-50 transition-colors shrink-0"
                  title="Zrušit filtr"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <span className="text-sm font-black text-slate-400">
              Ve výběru:{' '}
              <span className={filteredCount < 1 ? 'text-error' : 'text-class-green'}>{filteredCount}</span>{' '}
              slovíček
            </span>
          </div>

          {/* Mode selection */}
          <div className="flex flex-col gap-2 items-center w-full">
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Vyber jeden režim</p>
            <div className="flex gap-2 w-full">
              {([
                'listen',
                'spelling',
                ...(words.some(w => w.image_url) ? ['picture'] : []),
              ] as EnglishMode[]).map(op => {
                const labels: Record<EnglishMode, string> = { listen: 'Poslech', spelling: 'Psaní', picture: 'Obrázky' };
                return (
                  <DeskButton
                    key={op}
                    size="md"
                    variant={selectedMode === op ? 'primary' : 'outline'}
                    className="flex-1 py-2 text-base"
                    onClick={() => setSelectedMode(op)}
                  >
                    {labels[op]}
                  </DeskButton>
                );
              })}
            </div>
          </div>

          <DeskButton size="lg" variant="secondary" className="mt-1 px-12 py-4" onClick={() => startNewGame(gameMode)}>
            START!
          </DeskButton>

          {isDatePickerOpen && (
            <CustomDatePicker
              initialDate={fromDate}
              onSelect={date => { setFromDate(date); setIsDatePickerOpen(false); }}
              onClose={() => setIsDatePickerOpen(false)}
            />
          )}
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────
  if (gameState === 'PLAYING' && currentProblem) {
    const isSpelling      = currentProblem.type === 'spelling';
    const isPictureToWord = currentProblem.type === 'picture' && currentProblem.pictureVariant === 'picture_to_word';
    const isWordToPicture = currentProblem.type === 'picture' && currentProblem.pictureVariant === 'word_to_picture';

    return (
      <div className="flex flex-col h-full p-4 font-sans text-board-black">

        {/* ── Topbar — training: [home+badges] · competition: [home][score][timer] */}
        <div className="flex items-center mb-4 flex-shrink-0 gap-2">
          <DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')} className="border-class-green border-2 shrink-0">
            <Home className="w-6 h-6 text-class-green" />
          </DeskButton>

          {gameMode === 'training' ? (
            <div className="flex gap-2 items-center">
              <div className="bg-white rounded-xl px-4 py-2 shadow-sm border-2 border-slate-50 flex items-center gap-2">
                <CheckCircle2 className="text-success w-5 h-5" />
                <span className="text-2xl font-black text-success leading-none">{stats.correct}</span>
              </div>
              {stats.errors > 0 && (
                <div className="bg-white rounded-xl px-4 py-2 shadow-sm border-2 border-slate-50 flex items-center gap-2">
                  <XCircle className="text-error w-5 h-5" />
                  <span className="text-2xl font-black text-error leading-none">{stats.errors}</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 flex justify-center">
                <div className={`bg-board-black text-white px-5 py-1.5 rounded-2xl flex items-center gap-2 transition-transform duration-300 ${scorePop ? 'scale-125' : 'scale-100'}`}>
                  <Star className="w-5 h-5 text-class-green" fill="currentColor" />
                  <span className="text-3xl font-black">{liveScore}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 shrink-0 min-w-[68px]">
                <div className="flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  <span className="text-xl font-mono font-black">{timeLeft}s</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-white shadow-inner">
                  <div className="h-full bg-class-green transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 60) * 100}%` }} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Picture mode: word → images (word at top, image grid fills remaining space) */}
        {isWordToPicture && (
          <>
            <div className="flex-shrink-0 pb-3 px-2">
              <div className="font-black tracking-tight text-center text-board-black drop-shadow-sm leading-tight" style={{ fontSize: 'clamp(2rem, 10vw, 5rem)' }}>
                {currentProblem.questionText}
              </div>
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 pb-2 px-2">
              {currentProblem.imageOptions!.map((opt, i) => (
                <button
                  key={`${currentProblem.id}-${i}`}
                  onClick={() => handleAnswer(opt.word)}
                  disabled={feedback === 'correct' || clickedOptions.has(opt.word)}
                  className={`relative rounded-2xl overflow-hidden border-4 transition-all touch-manipulation
                    ${feedback === 'correct' && opt.word === currentProblem.correctAnswer
                      ? 'border-success'
                      : clickedOptions.has(opt.word)
                      ? 'border-error opacity-60'
                      : 'border-transparent hover:border-class-green/30 active:scale-95'}`}
                >
                  <Image src={opt.imageUrl} alt="" fill className="object-contain" />
                  {feedback === 'correct' && opt.word === currentProblem.correctAnswer && (
                    <div className="absolute inset-0 bg-success/20 flex items-center justify-center">
                      <CheckCircle2 className="w-14 h-14 text-success drop-shadow-lg" />
                    </div>
                  )}
                  {clickedOptions.has(opt.word) && opt.word !== currentProblem.correctAnswer && (
                    <div className="absolute inset-0 bg-error/20 flex items-center justify-center">
                      <XCircle className="w-14 h-14 text-error drop-shadow-lg" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Question / listen area (non-picture or picture-to-word) ──── */}
        {!isWordToPicture && (
          <div className="flex-1 min-h-0 overflow-hidden px-2">
            {isPictureToWord ? (
              /* Picture-to-word: image fills all available height, no audio */
              <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-xl">
                <Image src={currentProblem.questionImageUrl!} alt="" fill className="object-contain" />
              </div>
            ) : currentProblem.questionText === '?' ? (
              /* Listen mode: big tappable sound button */
              <div className="w-full h-full flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => currentProblem.audioUrl && playAudio(currentProblem.audioUrl)}
                  className="w-44 h-44 rounded-full bg-class-green text-white flex items-center justify-center shadow-[0_8px_32px_rgba(124,58,237,0.4)] hover:shadow-[0_12px_48px_rgba(124,58,237,0.5)] active:scale-[0.95] transition-all"
                >
                  <Volume2 className="w-24 h-24" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="font-black tracking-tight text-center text-board-black drop-shadow-sm px-4 leading-tight" style={{ fontSize: 'clamp(2.5rem, 14vw, 7rem)' }}>
                  {currentProblem.questionText}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Answer area (non-word-to-picture modes) ──────────────────── */}
        {!isWordToPicture && (
        <div className="flex-shrink-0 pb-2 w-full">
          {isSpelling ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <SpellingKeyboard
                value={spellingInput}
                onChange={setSpellingInput}
                onSubmit={handleSpellingSubmit}
                feedbackState={feedback}
                disabled={!!feedback}
              />
              {gameMode === 'training' && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={feedback === 'correct'}
                  className="text-slate-400 font-bold text-sm hover:text-slate-500 underline underline-offset-2 py-1 disabled:opacity-0 transition-opacity"
                >
                  Přeskočit slovo →
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 w-full grid-cols-2 px-2">
              {currentProblem.options?.map((opt, i) => (
                <DeskButton
                  key={i}
                  size="xl"
                  variant={
                    feedback === 'correct' && opt === currentProblem.correctAnswer
                      ? 'success'
                      : clickedOptions.has(opt)
                      ? 'error'
                      : 'outline'
                  }
                  className="w-full h-28 text-4xl md:text-5xl font-black border-2 border-slate-200"
                  onClick={() => handleAnswer(opt)}
                  disabled={feedback === 'correct' || clickedOptions.has(opt)}
                >
                  {opt}
                </DeskButton>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  if (gameState === 'RESULTS') {
    const isSad   = stats.errors > stats.correct;
    const accuracy = Math.round((stats.correct / (stats.total || 1)) * 100);
    return (
      <div className="flex flex-col h-full font-sans text-board-black">
        <AppHeader subject="Angličtina" page="Výsledky" onBack={() => setGameState('HOME')} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4 overflow-y-auto">
        <div className="flex flex-col items-center">
          {isSad
            ? <Frown className="w-20 h-20 text-error mb-2 animate-bounce" />
            : <Trophy className="w-20 h-20 text-class-green mb-2 animate-bounce" />}
          <h2 className="text-5xl font-black italic">{isSad ? 'Zkus to znovu!' : 'Super výkon!'}</h2>
        </div>
        <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border-2 border-slate-50 flex flex-col gap-4 items-center w-full max-w-md">
          <div className="grid grid-cols-2 w-full gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl text-center flex flex-col">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Správně</span>
              <span className="text-4xl font-black text-success">{stats.correct}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl text-center flex flex-col">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Úspěšnost</span>
              <span className="text-4xl font-black text-carpet-green">{accuracy}%</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 bg-board-black text-white w-full p-4 rounded-2xl">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Body</span>
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-class-green" fill="currentColor" />
              <span className="text-5xl font-black">{liveScore}</span>
            </div>
          </div>
          {gameMode === 'competition' && (
            <div className="flex flex-col gap-2 w-full mt-2 pt-4 border-t-2 border-slate-100 items-center">
              <p className="text-xl font-bold text-slate-400">
                Uloženo jako <span className="text-class-green">{player?.username}</span>
              </p>
            </div>
          )}
        </div>
        <DeskButton size="md" variant="outline" className="border-slate-200 shadow-none py-3" onClick={() => setGameState('HOME')}>
          <RotateCcw className="mr-2 w-5 h-5" /> Zkusit znovu
        </DeskButton>
        </div>
      </div>
    );
  }

  return null;
}
