'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { EnglishGameState, EnglishMode, EnglishProblem, EnglishStats, EnglishLeaderboardEntry, VocabularyWord } from '../../types/english';
import { generateEnglishProblem, playAudio } from '../../lib/english-logic';
import { DeskButton } from '../shared/DeskButton';
import { SubjectHeader } from '../shared/SubjectHeader';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import Image from 'next/image';
import { Trophy, Timer, RotateCcw, Play, CheckCircle2, XCircle, Home, ListOrdered, Save, Frown, Star, Loader2, Volume2, ArrowRight, X, ChevronLeft, ChevronRight, Medal, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/context/PlayerContext';

const LOCAL_STORAGE_KEY = 'english-leaderboard-local-v3';

// --- Custom Date Picker Component ---
function CustomDatePicker({ initialDate, onSelect, onClose }: { initialDate: string, onSelect: (date: string) => void, onClose: () => void }) {
  const [currentMonth, setCurrentMonth] = useState(initialDate ? new Date(initialDate) : new Date());
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString('cs-CZ', { month: 'long' });
  const days = [];
  const startOffset = (firstDayOfMonth(year, month) + 6) % 7;
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let i = 1; i <= daysInMonth(year, month); i++) days.push(i);

  return (
    <div className="fixed inset-0 bg-board-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 font-sans text-board-black" onClick={onClose}>
      <div className="bg-white rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl flex flex-col gap-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center text-board-black">
          <h3 className="text-4xl font-black italic">Vyber datum</h3>
          <button onClick={onClose} className="p-4 bg-slate-100 rounded-2xl text-slate-400 hover:text-error transition-all"><X className="w-8 h-8" /></button>
        </div>
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-3xl text-board-black">
          <button onClick={handlePrevMonth} className="p-4 hover:bg-white rounded-2xl transition-all shadow-sm"><ChevronLeft className="w-10 h-10 text-[#38BDF8]" /></button>
          <span className="text-3xl font-black uppercase tracking-widest">{monthName} {year}</span>
          <button onClick={handleNextMonth} className="p-4 hover:bg-white rounded-2xl transition-all shadow-sm"><ChevronRight className="w-10 h-10 text-[#38BDF8]" /></button>
        </div>
        <div className="grid grid-cols-7 gap-3 text-center text-board-black">
          {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(d => (<span key={d} className="text-slate-300 font-bold text-sm uppercase mb-2">{d}</span>))}
          {days.map((day, i) => (day ? (<button key={i} onClick={() => { const d = new Date(year, month, day); d.setHours(12); onSelect(d.toISOString().split('T')[0]); }} className={`h-16 text-2xl font-black rounded-2xl flex items-center justify-center transition-all ${initialDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` ? 'bg-[#38BDF8] text-white shadow-lg scale-105' : 'bg-slate-50 text-board-black hover:bg-[#38BDF8]/10'}`}>{day}</button>) : <div key={i} />))}
        </div>
      </div>
    </div>
  );
}

export default function EnglishGameContainer() {
  const router = useRouter();
  const [gameState, setGameState] = useState<EnglishGameState>('HOME');
  const [gameMode, setGameMode] = useState<'training' | 'competition'>('training');
  const [selectedMode, setSelectedMode] = useState<EnglishMode>('listen');
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [currentProblem, setCurrentProblem] = useState<EnglishProblem | null>(null);
  const [stats, setStats] = useState<EnglishStats>({ correct: 0, total: 0, errors: 0, percentage: 0 });
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [clickedOptions, setClickedOptions] = useState<Set<string>>(new Set());
  const [hasErrorInCurrent, setHasErrorInCurrent] = useState(false);
  const { player } = usePlayer();
  const [spellingInput, setSpellingInput] = useState('');
  const [leaderboard, setLeaderboard] = useState<EnglishLeaderboardEntry[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<EnglishMode | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [fromDate, setFromDate] = useState<string>('');
  const [selectionMode, setSelectionMode] = useState<'all' | 'date'>('all');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [liveScore, setLiveScore] = useState(0);
  const [scorePop, setScorePop] = useState(false);
  const [showNewRecord, setShowNewRecord] = useState(false);

  const spellingInputRef = useRef<HTMLInputElement>(null);

  // --- Data Fetching ---

  const fetchWords = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('vocabulary').select('*').order('created_at', { ascending: false });
      if (data) setWords(data as VocabularyWord[]);
    }
  }, []);

  useEffect(() => { fetchWords(); }, [fetchWords]);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      setLeaderboard(saved ? JSON.parse(saved) : []);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('english_leaderboard')
        .select(`
          *,
          players ( avatar )
        `)
        .order('score', { ascending: false })
        .limit(100);

      if (error) console.error(error);
      if (data) {
        const mapped = data.map((d: { players?: { avatar?: string } } & Record<string, unknown>) => ({
          ...d,
          avatar: d.players?.avatar
        }));
        setLeaderboard(mapped as EnglishLeaderboardEntry[]);
      }
    } catch {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      setLeaderboard(saved ? JSON.parse(saved) : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { if (gameState === 'LEADERBOARD') fetchLeaderboard(); }, [gameState, fetchLeaderboard]);

  const getFilteredWords = useCallback(() => {
    if (selectionMode === 'all' || !fromDate) return words;
    const cutoff = new Date(fromDate);
    cutoff.setHours(0, 0, 0, 0);
    return words.filter(w => new Date(w.created_at) >= cutoff);
  }, [words, fromDate, selectionMode]);

  const filteredCount = getFilteredWords().length;

  const saveToLeaderboard = async () => {
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
      player_id: player?.id
    };
    const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localList = localSaved ? JSON.parse(localSaved) : [];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...localList, entry].sort((a, b) => b.score - a.score).slice(0, 100)));
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('english_leaderboard').insert([{
          name: entry.name,
          score: entry.score,
          errors: entry.errors,
          total: entry.total,
          accuracy: entry.accuracy,
          mode: entry.mode,
          player_id: player?.id
        }]);
        if (error) console.error(error);
      } catch (err: unknown) { console.error(err); }
    }
    setLeaderboardTab('all');
    setGameState('LEADERBOARD');
    setIsLoading(false);
  };

  // --- Game Logic ---

  const startNewGame = (mode: 'training' | 'competition') => {
    const filtered = getFilteredWords();
    if (filtered.length < 1) {
      alert(`Nemáš žádná slovíčka.`);
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
    if (problem?.audioUrl) setTimeout(() => playAudio(problem.audioUrl!), 300);
    if (problem?.type === 'spelling') setTimeout(() => spellingInputRef.current?.focus(), 100);
  }, [getFilteredWords, selectedMode]);

  const handleAnswer = (answer: string) => {
    if (!currentProblem || feedback !== null) return;
    const isCorrect = answer.toLowerCase().trim() === currentProblem.correctAnswer.toLowerCase().trim();

    if (isCorrect) {
      setFeedback('correct');
      const newCorrect = !hasErrorInCurrent ? stats.correct + 1 : stats.correct;
      const newTotal = stats.total + 1;
      setStats(prev => ({ ...prev, correct: newCorrect, total: newTotal }));

      if (gameMode === 'competition') {
        const accuracy = Math.round((newCorrect / newTotal) * 100);
        const rawScore = (newCorrect * 10) - (stats.errors * 5);
        const newScore = Math.max(0, Math.round(rawScore * (accuracy / 100)));
        setLiveScore(newScore);
        setScorePop(true);
        setTimeout(() => setScorePop(false), 300);
      }

      // Show feedback for 800ms before next problem
      setTimeout(() => nextProblem(), 800);
    } else {
      setFeedback('wrong');
      setHasErrorInCurrent(true);
      setClickedOptions(prev => new Set(prev).add(answer));
      const newErrors = stats.errors + 1;
      const newTotal = stats.total + 1;
      setStats(prev => ({ ...prev, errors: newErrors, total: newTotal }));

      if (gameMode === 'competition') {
        const accuracy = Math.round((stats.correct / newTotal) * 100);
        const rawScore = (stats.correct * 10) - (newErrors * 5);
        const newScore = Math.max(0, Math.round(rawScore * (accuracy / 100)));
        setLiveScore(newScore);
        // In competition, move to next problem after showing error for 800ms
        setTimeout(() => nextProblem(), 800);
      } else {
        // In training, allow to try again (clear feedback after a bit or let user click skip)
        setTimeout(() => setFeedback(null), 1000);
      }
    }
  };

  const handleSpellingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spellingInput.trim()) return;
    handleAnswer(spellingInput);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'PLAYING' && gameMode === 'competition' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'PLAYING') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const localList = saved ? JSON.parse(saved) : [];
      const bestScore = localList.length > 0 ? Math.max(...localList.map((e: EnglishLeaderboardEntry) => e.score)) : 0;
      if (liveScore > bestScore && liveScore > 0) {
        setShowNewRecord(true);
        setTimeout(() => { setShowNewRecord(false); setGameState('RESULTS'); }, 5000);
      } else {
        setGameState('RESULTS');
      }
    }
    return () => clearInterval(timer);
  }, [gameState, gameMode, timeLeft, liveScore]);

  // --- Render ---

  if (showNewRecord) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#38BDF8] text-white font-sans p-10 animate-in fade-in duration-500">
        <Trophy className="w-64 h-64 mb-8 animate-bounce" fill="currentColor" />
        <h1 className="text-9xl font-black italic mb-4 text-center text-white">NOVÝ REKORD!</h1>
        <p className="text-6xl font-bold uppercase tracking-widest text-center text-white">{liveScore} BODŮ</p>
      </div>
    );
  }

  if (gameState === 'HOME') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 font-sans relative text-board-black bg-desk-white">
        <SubjectHeader subject="Angličtina" />
        <div className="absolute top-6 left-6 flex items-center gap-6">
          <DeskButton variant="outline" size="md" onClick={() => router.push('/')} className="border-[#38BDF8] border-4"><Home className="w-6 h-6 text-[#38BDF8]" /></DeskButton>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-md mt-24">
          <DeskButton size="xl" variant="info" onClick={() => { setGameMode('training'); setGameState('SETUP'); }}><Play className="mr-4 w-12 h-12" fill="currentColor" strokeWidth={2.5} /> Trénink</DeskButton>
          <DeskButton size="xl" variant="secondary" onClick={() => { setGameMode('competition'); setGameState('SETUP'); }}><Trophy className="mr-4 w-12 h-12" fill="currentColor" strokeWidth={2.5} /> Soutěž</DeskButton>
          <DeskButton size="lg" variant="outline" className="border-slate-200" onClick={() => setGameState('LEADERBOARD')}><ListOrdered className="mr-4 w-8 h-8" /> Žebříček</DeskButton>
        </div>
      </div>
    );
  }

  if (gameState === 'LEADERBOARD') {
    const filteredLeaderboard = leaderboardTab === 'all' ? leaderboard : leaderboard.filter(e => e.mode === leaderboardTab);
    return (
      <div className="flex flex-col items-center h-full gap-4 p-4 relative font-sans text-board-black bg-desk-white">
        <SubjectHeader subject="Angličtina" />
        <div className="absolute top-6 left-6 flex items-center gap-6">
          <DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')} className="border-[#38BDF8] border-4"><Home className="w-6 h-6 text-[#38BDF8]" /></DeskButton>
        </div>

        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[1.5rem] justify-center text-board-black mt-24">
          <DeskButton size="md" variant={leaderboardTab === 'all' ? 'info' : 'outline'} className={`border-none shadow-none py-2 px-4 whitespace-nowrap ${leaderboardTab !== 'all' ? 'border-[#38BDF8] text-[#38BDF8]' : ''}`} onClick={() => setLeaderboardTab('all')}>Všechno</DeskButton>
          {(['listen', 'spelling'] as const).map(m => {
            const labels = { 'listen': 'Poslech', 'spelling': 'Psaní' };
            return (<DeskButton key={m} size="md" variant={leaderboardTab === m ? 'info' : 'outline'} className={`border-none shadow-none py-2 px-4 whitespace-nowrap ${leaderboardTab !== m ? 'border-[#38BDF8] text-[#38BDF8]' : ''}`} onClick={() => setLeaderboardTab(m)}>{labels[m]}</DeskButton>);
          })}
        </div>
        <div className="w-full max-w-4xl bg-white rounded-[2.5rem] p-6 shadow-xl overflow-hidden flex-1 mb-2 flex flex-col text-board-black">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-board-black"><Loader2 className="w-12 h-12 animate-spin text-slate-200" /><p className="text-xl text-slate-300 font-bold text-slate-300">Načítám...</p></div>
          ) : filteredLeaderboard.length === 0 ? (
            <p className="text-center text-2xl text-slate-300 py-16 text-slate-300 text-slate-300">Zatím žádné výsledky</p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto h-full pr-2 text-board-black text-board-black">
              <div className="flex text-slate-400 font-bold px-4 mb-1 uppercase text-[10px] tracking-[0.2em] text-slate-400 text-slate-400">
                <span className="w-12 text-center">#</span><span className="flex-1">Jméno</span><span className="w-20 text-center">Úspěch</span><span className="w-16 text-center">Ano</span><span className="w-16 text-center">Ne</span><span className="w-24 text-center font-black">Body</span>
              </div>
              {filteredLeaderboard.map((entry, i) => {
                const labels = { 'listen': 'POSLECH', 'spelling': 'PSANÍ' };
                return (
                  <div key={entry.id} className="flex items-center p-3 bg-slate-50 rounded-xl text-board-black">
                    <span className="w-12 flex justify-center">
                      {i === 0 ? <Medal className="w-8 h-8 text-yellow-400" fill="currentColor" /> :
                        i === 1 ? <Medal className="w-8 h-8 text-slate-300" fill="currentColor" /> :
                          i === 2 ? <Medal className="w-8 h-8 text-amber-600" fill="currentColor" /> :
                            <span className="text-2xl font-black text-slate-300 italic text-slate-300">#{i + 1}</span>}
                    </span>
                    <div className="flex-1 ml-3 flex items-center gap-3">
                      {entry.avatar && (
                        <Image src={`/avatars/${entry.avatar}.png`} alt="avatar" width={32} height={32} className="w-8 h-8 drop-shadow-sm mix-blend-multiply" />
                      )}
                      <p className="text-xl font-black leading-tight uppercase text-board-black">{entry.name} <span className="text-[10px] text-slate-300 font-normal">({labels[entry.mode as keyof typeof labels] || entry.mode})</span></p>
                    </div>
                    <div className="w-20 text-center text-xl font-black text-[#38BDF8] bg-[#38BDF8]/10 py-1 rounded-lg">{entry.accuracy}%</div>
                    <div className="w-16 text-center text-xl font-black text-success/70">{entry.total - entry.errors}</div>
                    <div className="w-16 text-center text-xl font-black text-error/40">{entry.errors}</div>
                    <div className="w-24 text-center text-2xl font-black">{entry.score}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'SETUP') {
    const isCompetition = gameMode === 'competition';
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 relative font-sans text-board-black">
        <SubjectHeader subject="Angličtina" />
        <div className="absolute top-6 left-6 flex items-center gap-6">
          <DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')} className="border-[#38BDF8] border-4"><Home className="w-6 h-6 text-[#38BDF8]" /></DeskButton>
        </div>
        <h2 className="text-6xl font-black italic mt-20">{isCompetition ? 'Soutěž' : 'Trénink'}</h2>
        <div className="flex flex-col gap-3 items-center w-full max-w-xl bg-white p-6 rounded-[2.5rem] border-4 border-slate-50 text-board-black">
          <p className="text-xl font-black uppercase tracking-widest text-slate-300">Která slovíčka?</p>
          <div className="flex gap-4 w-full">
            <DeskButton size="md" variant={selectionMode === 'all' ? 'info' : 'outline'} className={`flex-1 py-4 border-2 ${selectionMode !== 'all' ? 'border-[#38BDF8] text-[#38BDF8]' : ''}`} onClick={() => setSelectionMode('all')}>Všechna</DeskButton>
            <DeskButton size="md" variant={selectionMode === 'date' ? 'info' : 'outline'} className={`flex-1 py-4 border-2 ${selectionMode !== 'date' ? 'border-[#38BDF8] text-[#38BDF8]' : ''}`} onClick={() => { setSelectionMode('date'); setIsDatePickerOpen(true); }}>{fromDate ? new Date(fromDate).toLocaleDateString('cs-CZ') : 'Jen od data'}</DeskButton>
          </div>
          <div className="text-center text-board-black"><span className="text-lg font-black text-slate-400">Ve výběru: <span className={filteredCount < 1 ? 'text-error' : 'text-[#38BDF8]'}>{filteredCount}</span> slovíček</span></div>
        </div>
        <div className="flex flex-col gap-4 items-center">
          <p className="text-xl font-black text-slate-300 uppercase tracking-widest text-slate-300">Vyber jeden režim</p>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xl text-board-black">
            {(['listen', 'spelling'] as EnglishMode[]).map(op => {
              const labels = { 'listen': 'Poslech', 'spelling': 'Psaní (Spelling)' };
              return (<DeskButton key={op} size="md" variant={selectedMode === op ? 'info' : 'outline'} className={`py-5 border-2 ${selectedMode !== op ? 'border-[#38BDF8] text-[#38BDF8]' : ''}`} onClick={() => setSelectedMode(op)}>{labels[op]}</DeskButton>);
            })}
          </div>
        </div>
        <DeskButton size="xl" variant="secondary" className="mt-4 px-20 py-6" onClick={() => startNewGame(gameMode)}>START!</DeskButton>
        {isDatePickerOpen && <CustomDatePicker initialDate={fromDate} onSelect={(date) => { setFromDate(date); setIsDatePickerOpen(false); }} onClose={() => setIsDatePickerOpen(false)} />}
      </div>
    );
  }

  if (gameState === 'PLAYING' && currentProblem) {
    const isSpelling = currentProblem.type === 'spelling';
    const isListen = currentProblem.type === 'listen';
    return (
      <div className="flex flex-col h-full relative p-4 font-sans text-board-black text-board-black">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3 items-center">
            <DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')} className="border-[#38BDF8] border-4"><Home className="w-6 h-6 text-[#38BDF8]" /></DeskButton>
            <div className="flex gap-2">
              <div className="bg-white rounded-xl px-5 py-2 shadow-sm border-2 border-slate-50 flex items-center gap-2"><CheckCircle2 className="text-success w-6 h-6" /><span className="text-3xl font-black text-success leading-none">{stats.correct}</span></div>
              {stats.errors > 0 && (<div className="bg-white rounded-xl px-5 py-2 shadow-sm border-2 border-slate-50 flex items-center gap-2"><XCircle className="text-error w-6 h-6" /><span className="text-3xl font-black text-error leading-none">{stats.errors}</span></div>)}
            </div>
          </div>
          {gameMode === 'competition' && (
            <div className="absolute left-1/2 -translate-x-1/2 top-6 flex flex-col items-center">
              <div className={`bg-board-black text-white px-8 py-3 rounded-2xl flex items-center gap-4 transition-transform duration-300 ${scorePop ? 'scale-125' : 'scale-100'}`}>
                <Star className="w-8 h-8 text-[#38BDF8]" fill="currentColor" />
                <span className="text-5xl font-black">{liveScore}</span>
              </div>
            </div>
          )}
          {gameMode === 'competition' && (
            <div className="flex flex-col items-end gap-1 w-1/4">
              <div className="flex items-center gap-2 text-board-black"><Timer className="w-6 h-6 text-board-black" /><span className="text-3xl font-mono font-black text-board-black">{timeLeft}s</span></div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-white shadow-inner"><div className="h-full bg-[#38BDF8] transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 60) * 100}%` }} /></div>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-6">
            {(isListen || isSpelling) && currentProblem.audioUrl && (
              <DeskButton variant="outline" size="lg" className="rounded-full w-48 h-48 border-8 border-[#38BDF8] text-[#38BDF8] shadow-xl hover:bg-[#38BDF8]/10 transition-all text-board-black" onClick={() => playAudio(currentProblem.audioUrl!)}>
                <Volume2 className="w-24 h-24 text-[#38BDF8]" strokeWidth={3} />
              </DeskButton>
            )}
            <div className="text-6xl md:text-9xl font-black tracking-tight text-center text-board-black drop-shadow-sm px-4">
              {currentProblem.questionText}
            </div>
          </div>
          <div className="w-full max-w-4xl mt-8">
            {isSpelling ? (
              <form onSubmit={handleSpellingSubmit} className="flex flex-col items-center gap-6 w-full px-4 text-board-black">
                <input ref={spellingInputRef} type="text" value={spellingInput} onChange={(e) => setSpellingInput(e.target.value)} className={`w-full max-w-2xl text-center text-6xl font-black py-8 rounded-[2rem] border-8 outline-none bg-white text-board-black transition-all ${feedback === 'correct' ? 'border-success text-success bg-success/10' : feedback === 'wrong' ? 'border-error text-error bg-error/10' : 'border-slate-200 focus:border-[#38BDF8]'}`} autoFocus autoCapitalize="none" autoComplete="off" disabled={feedback === 'correct'} />
                <div className="flex gap-4 w-full max-w-2xl">
                  <DeskButton size="xl" type="submit" variant="info" className="flex-1 h-24" disabled={feedback === 'correct'}><ArrowRight className="w-12 h-12 text-white" /></DeskButton>
                  {hasErrorInCurrent && feedback !== 'correct' && gameMode === 'training' && (
                    <DeskButton size="xl" variant="outline" className="flex-1 h-24 border-slate-300 text-slate-400 bg-white" onClick={() => nextProblem()}>
                      <HelpCircle className="w-10 h-10 mr-4" /> Nevím
                    </DeskButton>
                  )}
                </div>
              </form>
            ) : (
              <div className="grid gap-6 w-full grid-cols-2 px-4">
                {currentProblem.options?.map((opt, i) => (
                  <DeskButton key={i} size="xl" variant={feedback === 'correct' && opt === currentProblem.correctAnswer ? 'success' : clickedOptions.has(opt) ? 'error' : 'outline'} className={`w-full h-32 text-4xl md:text-5xl font-black ${feedback !== 'correct' && !clickedOptions.has(opt) ? 'border-[#38BDF8] text-board-black' : ''}`} onClick={() => handleAnswer(opt)} disabled={feedback === 'correct' || clickedOptions.has(opt)}>{opt}</DeskButton>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'RESULTS') {
    const isSad = stats.errors > stats.correct;
    const accuracy = Math.round((stats.correct / (stats.total || 1)) * 100);
    const finalScore = liveScore;
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4 font-sans overflow-y-auto text-board-black text-board-black">
        <div className="flex flex-col items-center">
          {isSad ? (<Frown className="w-20 h-20 text-error mb-2 animate-bounce" />) : (<Trophy className="w-20 h-20 text-[#38BDF8] mb-2 animate-bounce" />)}
          <h2 className="text-5xl font-black italic">{isSad ? 'Zkus to znovu!' : 'Super výkon!'}</h2>
        </div>
        <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border-4 border-slate-50 flex flex-col gap-4 items-center w-full max-w-md text-board-black text-board-black">
          <div className="grid grid-cols-2 w-full gap-3">
            <div className="bg-slate-50 p-4 rounded-2xl text-center flex flex-col"><span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-slate-400">Správně</span><span className="text-4xl font-black text-success">{stats.correct}</span></div>
            <div className="bg-slate-50 p-4 rounded-2xl text-center flex flex-col"><span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-slate-400 text-slate-400">Úspěšnost</span><span className="text-4xl font-black text-carpet-green">{accuracy}%</span></div>
          </div>
          <div className="flex flex-col items-center gap-1 bg-board-black text-white w-full p-4 rounded-2xl">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-slate-400">Body</span>
            <div className="flex items-center gap-3"><Star className="w-6 h-6 text-[#38BDF8]" fill="currentColor" /><span className="text-5xl font-black text-white">{finalScore}</span></div>
          </div>
          {gameMode === 'competition' && (
            <div className="flex flex-col gap-3 w-full mt-2 pt-4 border-t-2 border-slate-100 items-center">
              <p className="text-xl font-bold text-slate-400">Hraješ jako <span className="text-[#38BDF8]">{player?.username}</span></p>
              <DeskButton size="lg" variant="secondary" onClick={saveToLeaderboard} disabled={isLoading} className="py-4 w-full">
                <div className="flex items-center justify-center gap-3 whitespace-nowrap">
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  <span className="text-xl font-bold uppercase">{isLoading ? 'Ukládám...' : 'Uložit výsledek'}</span>
                </div>
              </DeskButton>
            </div>
          )}
        </div>
        <DeskButton size="md" variant="outline" className="border-slate-200 shadow-none py-3 text-board-black text-board-black" onClick={() => setGameState('HOME')}><RotateCcw className="mr-2 w-5 h-5 text-board-black" /> Zkusit znovu</DeskButton>
      </div>
    );
  }
  return null;
}
