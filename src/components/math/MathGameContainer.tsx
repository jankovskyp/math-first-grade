'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameState, GameMode, Operation, NumberRange, Problem, GameStats, LeaderboardEntry } from '@/types/game';
import { generateProblem } from '@/lib/math-logic';
import { DeskButton } from '@/components/shared/DeskButton';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Trophy, Timer, RotateCcw, Play, CheckCircle2, XCircle, Home, ListOrdered, Save, Frown, Star, Loader2, Medal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const LOCAL_STORAGE_KEY = 'math-leaderboard-local';

export default function MathGameContainer() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('HOME');
  const [gameMode, setGameMode] = useState<GameMode>('training');
  const [range, setRange] = useState<NumberRange>(10);
  const [operations, setOperations] = useState<Operation[]>(['addition', 'subtraction']);

  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [stats, setStats] = useState<GameStats>({ correct: 0, total: 0, errors: 0, percentage: 0 });
  const [timeLeft, setTimeLeft] = useState(60);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [clickedOptions, setClickedOptions] = useState<Set<number | string>>(new Set());
  const [hasErrorInCurrent, setHasErrorInCurrent] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<NumberRange | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [liveScore, setLiveScore] = useState(0);
  const [scorePop, setScorePop] = useState(false);
  const [showNewRecord, setShowNewRecord] = useState(false);

  // --- Hybrid Persistence Logic ---

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured || !supabase) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      setLeaderboard(saved ? JSON.parse(saved) : []);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.from('leaderboard').select('*').order('score', { ascending: false }).limit(100);
      if (error) throw error;
      if (data) setLeaderboard(data as LeaderboardEntry[]);
    } catch (err) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      setLeaderboard(saved ? JSON.parse(saved) : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { if (gameState === 'LEADERBOARD') fetchLeaderboard(); }, [gameState, fetchLeaderboard]);

  const saveToLeaderboard = async () => {
    if (!playerName.trim()) return;
    setIsLoading(true);

    const entry: LeaderboardEntry = {
      id: Math.random().toString(36).substring(2, 9),
      name: playerName.trim().toUpperCase(),
      score: liveScore,
      errors: stats.errors,
      total: stats.total,
      accuracy: Math.round((stats.correct / (stats.total || 1)) * 100),
      range: range,
      date: new Date().toLocaleDateString('cs-CZ'),
    };

    const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const localList = localSaved ? JSON.parse(localSaved) : [];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([...localList, entry].sort((a, b) => b.score - a.score).slice(0, 100)));

    if (isSupabaseConfigured && supabase) {
      try { await supabase.from('leaderboard').insert([{ name: entry.name, score: entry.score, errors: entry.errors, total: entry.total, accuracy: entry.accuracy, range: entry.range }]); } catch (err) { console.error(err); }
    }

    setLeaderboardTab('all');
    setGameState('LEADERBOARD');
    setPlayerName('');
    setIsLoading(false);
  };

  // --- Game Logic ---

  const startNewGame = (mode: GameMode) => {
    setGameMode(mode);
    setStats({ correct: 0, total: 0, errors: 0, percentage: 0 });
    setLiveScore(0);
    setTimeLeft(60);
    const activeOps: Operation[] = mode === 'competition' ? ['addition', 'subtraction', 'comparison'] : operations;
    setGameState('PLAYING');
    setCurrentProblem(generateProblem(range, activeOps));
    setFeedback(null);
    setClickedOptions(new Set());
    setHasErrorInCurrent(false);
  };

  const nextProblem = useCallback(() => {
    setFeedback(null);
    setClickedOptions(new Set());
    setHasErrorInCurrent(false);
    const activeOps: Operation[] = gameMode === 'competition' ? ['addition', 'subtraction', 'comparison'] : operations;
    setCurrentProblem(generateProblem(range, activeOps));
  }, [range, operations, gameMode]);

  const handleAnswer = (answer: number | string) => {
    if (!currentProblem || feedback === 'correct') return;
    const isCorrect = answer === currentProblem.result;

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
        nextProblem();
      } else {
        setTimeout(() => nextProblem(), 800);
      }
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
        nextProblem();
      }
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'PLAYING' && gameMode === 'competition' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'PLAYING') {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      const localList = saved ? JSON.parse(saved) : [];
      const bestScore = localList.length > 0 ? Math.max(...localList.map((e: any) => e.score)) : 0;

      if (liveScore > bestScore && liveScore > 0) {
        setShowNewRecord(true);
        setTimeout(() => {
          setShowNewRecord(false);
          setGameState('RESULTS');
        }, 5000);
      } else {
        setGameState('RESULTS');
      }
    }
    return () => clearInterval(timer);
  }, [gameState, gameMode, timeLeft, liveScore]);

  // --- Render ---

  if (showNewRecord) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-class-green text-board-black font-sans p-10 animate-in fade-in duration-500">
        <Trophy className="w-64 h-64 mb-8 animate-bounce" fill="currentColor" />
        <h1 className="text-9xl font-black italic mb-4">NOVÝ REKORD!</h1>
        <p className="text-6xl font-bold uppercase tracking-widest">{liveScore} BODŮ</p>
      </div>
    );
  }

  if (gameState === 'HOME') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 bg-desk-white font-sans text-board-black relative">
        <div className="absolute top-6 right-6 flex items-center gap-4">
          <div className="flex flex-col items-end leading-none">
            <h1 className="text-2xl sm:text-3xl font-black italic flex items-center gap-1">
              <span>Chytrý</span>
              <span>Školák</span>
            </h1>
            <span className="text-base sm:text-lg font-black text-class-green uppercase tracking-widest mt-1">Matematika</span>
          </div>
          <Image src="/icon.png" alt="Orel" width={64} height={64} className="w-14 h-14 sm:w-16 sm:h-16 mix-blend-multiply" />
        </div>
        <div className="absolute top-6 left-6 flex items-center gap-6">
          <DeskButton variant="outline" size="md" onClick={() => router.push('/')} className="border-class-green border-4">
            <Home className="w-6 h-6 text-class-green" />
          </DeskButton>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-md">
          <DeskButton size="xl" onClick={() => { setGameMode('training'); setGameState('SETUP'); }}><Play className="mr-4 w-12 h-12" fill="currentColor" strokeWidth={2.5} /> Trénink</DeskButton>
          <DeskButton size="xl" variant="secondary" onClick={() => { setGameMode('competition'); setGameState('SETUP'); }}><Trophy className="mr-4 w-12 h-12" fill="currentColor" strokeWidth={2.5} /> Soutěž</DeskButton>
          <DeskButton size="lg" variant="outline" className="border-slate-200" onClick={() => setGameState('LEADERBOARD')}><ListOrdered className="mr-4 w-8 h-8" /> Žebříček</DeskButton>
        </div>
      </div>
    );
  }

  if (gameState === 'LEADERBOARD') {
    const filteredLeaderboard = leaderboardTab === 'all' ? leaderboard : leaderboard.filter(e => e.range === leaderboardTab);
    return (
      <div className="flex flex-col items-center h-full gap-4 p-4 relative bg-desk-white font-sans text-board-black">
        <div className="absolute top-6 right-6 flex items-center gap-4">
          <div className="flex flex-col items-end leading-none">
            <h1 className="text-2xl sm:text-3xl font-black italic flex items-center gap-1">
              <span>Chytrý</span>
              <span>Školák</span>
            </h1>
            <span className="text-base sm:text-lg font-black text-class-green uppercase tracking-widest mt-1">Matematika</span>
          </div>
          <Image src="/icon.png" alt="Orel" width={64} height={64} className="w-14 h-14 sm:w-16 sm:h-16 mix-blend-multiply" />
        </div>
        <div className="absolute top-6 left-6 flex items-center gap-6">
          <DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')} className="border-class-green border-4">
            <Home className="w-6 h-6 text-class-green" />
          </DeskButton>
        </div>
        <h2 className="text-5xl font-black mt-2 italic">Síň slávy</h2>
        <div className="flex gap-3 p-1.5 bg-slate-100 rounded-[1.5rem]">
          <DeskButton size="md" variant={leaderboardTab === 'all' ? 'primary' : 'outline'} className="border-none shadow-none py-2 px-6" onClick={() => setLeaderboardTab('all')}>Všechno</DeskButton>
          {[10, 20, 100].map(r => (<DeskButton key={r} size="md" variant={leaderboardTab === r ? 'primary' : 'outline'} className="border-none shadow-none py-2 px-6" onClick={() => setLeaderboardTab(r as NumberRange)}>Do {r}</DeskButton>))}
        </div>
        <div className="w-full max-w-4xl bg-white rounded-[2.5rem] p-6 shadow-xl overflow-hidden flex-1 mb-2 flex flex-col text-board-black">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4"><Loader2 className="w-12 h-12 animate-spin text-slate-200" /><p className="text-xl text-slate-300 font-bold">Načítám...</p></div>
          ) : filteredLeaderboard.length === 0 ? (
            <p className="text-center text-2xl text-slate-300 py-16">Zatím žádné výsledky</p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto h-full pr-2 text-board-black">
              <div className="flex text-slate-400 font-bold px-4 mb-1 uppercase text-[10px] tracking-[0.2em]">
                <span className="w-12 text-center">#</span><span className="flex-1">Jméno</span><span className="w-20 text-center">Úspěch</span><span className="w-16 text-center">Ano</span><span className="w-16 text-center">Ne</span><span className="w-24 text-center font-black">Body</span>
              </div>
              {filteredLeaderboard.map((entry, i) => (
                <div key={entry.id} className="flex items-center p-3 bg-slate-50 rounded-xl text-board-black">
                  <span className="w-12 flex justify-center">
                    {i === 0 ? <Medal className="w-8 h-8 text-yellow-400" fill="currentColor" /> :
                      i === 1 ? <Medal className="w-8 h-8 text-slate-300" fill="currentColor" /> :
                        i === 2 ? <Medal className="w-8 h-8 text-amber-600" fill="currentColor" /> :
                          <span className="text-2xl font-black text-slate-300 italic">#{i + 1}</span>}
                  </span>
                  <div className="flex-1 ml-3"><p className="text-xl font-black leading-tight uppercase">{entry.name} <span className="text-[10px] text-slate-300 font-normal">({entry.range})</span></p></div>
                  <div className="w-20 text-center text-xl font-black text-carpet-green bg-class-green/20 py-1 rounded-lg">{entry.accuracy}%</div>
                  <div className="w-16 text-center text-xl font-black text-success/70">{entry.total - entry.errors}</div>
                  <div className="w-16 text-center text-xl font-black text-error/40">{entry.errors}</div>
                  <div className="w-24 text-center text-2xl font-black">{entry.score}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'SETUP') {
    const isCompetition = gameMode === 'competition';
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 p-6 relative font-sans text-board-black">
        <div className="absolute top-6 right-6 flex items-center gap-4">
          <div className="flex flex-col items-end leading-none">
            <h1 className="text-2xl sm:text-3xl font-black italic flex items-center gap-1">
              <span>Chytrý</span>
              <span>Školák</span>
            </h1>
            <span className="text-base sm:text-lg font-black text-class-green uppercase tracking-widest mt-1">Matematika</span>
          </div>
          <Image src="/icon.png" alt="Orel" width={64} height={64} className="w-14 h-14 sm:w-16 sm:h-16 mix-blend-multiply" />
        </div>
        <div className="absolute top-6 left-6 flex items-center gap-6 text-board-black">
          <DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')} className="border-class-green border-4"><Home className="w-6 h-6 text-class-green" /></DeskButton>
        </div>
        <h2 className="text-6xl font-black italic">{isCompetition ? 'Soutěž' : 'Trénink'}</h2>
        <div className="flex flex-col gap-4 items-center">
          <p className="text-2xl font-black text-slate-300 uppercase tracking-widest">Obor čísel</p>
          <div className="flex gap-4">
            {[10, 20, 100].map(r => (<DeskButton key={r} size="lg" variant={range === r ? 'primary' : 'outline'} className="min-w-[120px]" onClick={() => setRange(r as NumberRange)}>Do {r}</DeskButton>))}
          </div>
        </div>
        {!isCompetition && (
          <div className="flex flex-col gap-4 items-center text-board-black">
            <p className="text-2xl font-black text-slate-300 uppercase tracking-widest">Příklady</p>
            <div className="flex gap-4">
              {(['addition', 'subtraction', 'comparison'] as Operation[]).map(op => (<DeskButton key={op} size="md" variant={operations.includes(op) ? 'primary' : 'outline'} className="min-w-[100px]" onClick={() => { if (operations.includes(op)) { if (operations.length > 1) setOperations(operations.filter(o => o !== op)); } else { setOperations([...operations, op]); } }}>{op === 'addition' ? '+' : op === 'subtraction' ? '-' : '< > ='}</DeskButton>))}
            </div>
          </div>
        )}
        <DeskButton size="xl" variant="secondary" className="mt-4 px-20 py-6" onClick={() => startNewGame(gameMode)}>START!</DeskButton>
      </div>
    );
  }

  if (gameState === 'PLAYING' && currentProblem) {
    const isComparison = currentProblem.type === 'comparison';
    const displayOptions = isComparison ? ['<', '=', '>'] : currentProblem.options;
    return (
      <div className="flex flex-col h-full relative p-4 font-sans text-board-black">
        <div className="flex justify-between items-center mb-4 text-board-black">
          <div className="flex gap-3 items-center">
            <DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')} className="border-class-green border-4"><Home className="w-6 h-6 text-class-green" /></DeskButton>
            <div className="flex gap-2">
              <div className="bg-white rounded-xl px-5 py-2 shadow-sm border-2 border-slate-50 flex items-center gap-2"><CheckCircle2 className="text-success w-6 h-6" /><span className="text-3xl font-black text-success leading-none">{stats.correct}</span></div>
              {stats.errors > 0 && (<div className="bg-white rounded-xl px-5 py-2 shadow-sm border-2 border-slate-50 flex items-center gap-2"><XCircle className="text-error w-6 h-6" /><span className="text-3xl font-black text-error leading-none">{stats.errors}</span></div>)}
            </div>
          </div>

          {gameMode === 'competition' && (
            <div className="absolute left-1/2 -translate-x-1/2 top-6 flex flex-col items-center">
              <div className={`bg-board-black text-white px-8 py-3 rounded-2xl flex items-center gap-4 transition-transform duration-300 ${scorePop ? 'scale-125' : 'scale-100'}`}>
                <Star className="w-8 h-8 text-class-green" fill="currentColor" />
                <span className="text-5xl font-black">{liveScore}</span>
              </div>
            </div>
          )}

          {gameMode === 'competition' && (
            <div className="flex flex-col items-end gap-1 w-1/4">
              <div className="flex items-center gap-2 text-board-black"><Timer className="w-6 h-6" /><span className="text-3xl font-mono font-black">{timeLeft}s</span></div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border-2 border-white shadow-inner"><div className="h-full bg-carpet-green transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 60) * 100}%` }} /></div>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="h-40 flex items-center justify-center text-[9rem] font-black tracking-tight leading-none gap-8 text-board-black">
            <span>{currentProblem.a}</span>
            {isComparison ? (<div className="w-28 h-28 border-4 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50 translate-y-2"><span className="text-6xl text-slate-200">?</span></div>) : (<><span className="text-class-green">{currentProblem.displayOperator}</span><span>{currentProblem.b}</span><span className="text-slate-200">=</span><span className="text-slate-200">?</span></>)}
            {isComparison && <span>{currentProblem.b}</span>}
          </div>
          <div className="h-72 w-full max-w-4xl flex items-center justify-center">
            <div className={`grid gap-6 w-full ${isComparison ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {displayOptions.map((opt, i) => (
                <div key={`${currentProblem.id}-${i}`} className="w-full flex justify-center"><DeskButton size="xl" variant={feedback === 'correct' && opt === currentProblem.result ? 'success' : clickedOptions.has(opt) ? 'error' : 'primary'} className="w-full h-32 text-6xl font-black" onClick={() => handleAnswer(opt)} disabled={feedback === 'correct' || clickedOptions.has(opt)}>{opt}</DeskButton></div>
              ))}
            </div>
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
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4 font-sans overflow-y-auto text-board-black">
        <div className="flex flex-col items-center">
          {isSad ? (<Frown className="w-20 h-20 text-error mb-2 animate-bounce" />) : (<Trophy className="w-20 h-20 text-class-green mb-2 animate-bounce" />)}
          <h2 className="text-5xl font-black italic">{isSad ? 'Zkus to znovu!' : 'Super výkon!'}</h2>
        </div>
        <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border-4 border-slate-50 flex flex-col gap-4 items-center w-full max-w-md text-board-black">
          <div className="grid grid-cols-2 w-full gap-3 text-board-black">
            <div className="bg-slate-50 p-4 rounded-2xl text-center flex flex-col"><span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Správně</span><span className="text-4xl font-black text-success">{stats.correct}</span></div>
            <div className="bg-slate-50 p-4 rounded-2xl text-center flex flex-col"><span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Úspěšnost</span><span className="text-4xl font-black text-carpet-green">{accuracy}%</span></div>
          </div>
          <div className="flex flex-col items-center gap-1 bg-board-black text-white w-full p-4 rounded-2xl">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Body</span>
            <div className="flex items-center gap-3"><Star className="w-6 h-6 text-class-green" fill="currentColor" /><span className="text-5xl font-black">{finalScore}</span></div>
          </div>
          {gameMode === 'competition' && (
            <div className="flex flex-col gap-3 w-full mt-2 pt-4 border-t-2 border-slate-100">
              <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value.slice(0, 12))} placeholder="TVOJE JMÉNO" className="w-full text-center text-3xl font-black uppercase py-4 rounded-2xl border-4 border-slate-100 focus:border-class-green outline-none bg-slate-50 text-board-black placeholder:text-slate-200 transition-all" autoFocus />
              <DeskButton size="lg" variant="secondary" onClick={saveToLeaderboard} disabled={!playerName.trim() || isLoading} className="py-4">
                <div className="flex items-center justify-center gap-3 whitespace-nowrap">
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                  <span className="text-xl font-bold uppercase">{isLoading ? 'Ukládám...' : 'Uložit výsledek'}</span>
                </div>
              </DeskButton>
            </div>
          )}
        </div>
        <DeskButton size="md" variant="outline" className="border-slate-200 shadow-none py-3" onClick={() => setGameState('HOME')}><RotateCcw className="mr-2 w-5 h-5" /> Zkusit znovu</DeskButton>
      </div>
    );
  }
  return null;
}
