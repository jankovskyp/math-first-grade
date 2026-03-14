'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameState, GameMode, Operation, NumberRange, Problem, GameStats, LeaderboardEntry } from '../types/game';
import { generateProblem } from '../lib/math-logic';
import { DeskButton } from './DeskButton';
import { supabase } from '../lib/supabase';
import { Trophy, Timer, RotateCcw, Play, CheckCircle2, XCircle, Home, ListOrdered, Save, Target, Frown, Star, Loader2 } from 'lucide-react';

export default function GameContainer() {
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
  const [leaderboardTab, setLeaderboardTab] = useState<NumberRange>(10);
  const [isLoading, setIsLoading] = useState(false);

  // --- Supabase Persistence ---

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('score', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) setLeaderboard(data as LeaderboardEntry[]);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (gameState === 'LEADERBOARD') {
      fetchLeaderboard();
    }
  }, [gameState, fetchLeaderboard]);

  const saveToLeaderboard = async () => {
    if (!playerName.trim()) return;
    
    setIsLoading(true);
    const accuracy = Math.round((stats.correct / (stats.total || 1)) * 100);
    const rawScore = (stats.correct * 10) - (stats.errors * 5);
    const finalScore = Math.max(0, Math.round(rawScore * (accuracy / 100)));

    try {
      const { error } = await supabase
        .from('leaderboard')
        .insert([{
          name: playerName.trim().toUpperCase(),
          score: finalScore,
          errors: stats.errors,
          total: stats.total,
          accuracy,
          range: range,
        }]);

      if (error) throw error;
      
      setLeaderboardTab(range);
      setGameState('LEADERBOARD');
      setPlayerName('');
    } catch (err) {
      console.error('Error saving result:', err);
      alert('Chyba při ukládání, zkus to znovu!');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Game Logic ---

  const startNewGame = (mode: GameMode) => {
    setGameMode(mode);
    setStats({ correct: 0, total: 0, errors: 0, percentage: 0 });
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

    if (gameMode === 'training') {
      if (isCorrect) {
        setFeedback('correct');
        if (!hasErrorInCurrent) setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
        setStats(prev => ({ ...prev, total: prev.total + 1 }));
        setTimeout(() => nextProblem(), 800);
      } else {
        setFeedback('wrong');
        setHasErrorInCurrent(true);
        setClickedOptions(prev => new Set(prev).add(answer));
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      }
    } else {
      if (isCorrect) setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
      else setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      setStats(prev => ({ ...prev, total: prev.total + 1 }));
      nextProblem();
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'PLAYING' && gameMode === 'competition' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && gameState === 'PLAYING') {
      setGameState('RESULTS');
    }
    return () => clearInterval(timer);
  }, [gameState, gameMode, timeLeft]);

  // --- Render ---

  if (gameState === 'HOME') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 p-6 bg-desk-white font-sans">
        <h1 className="text-9xl font-black text-board-black mb-4 italic drop-shadow-sm">Matika</h1>
        <div className="flex flex-col gap-6 w-full max-w-md">
          <DeskButton size="xl" onClick={() => { setGameMode('training'); setGameState('SETUP'); }}><Play className="mr-4 w-12 h-12" fill="currentColor" /> Trénink</DeskButton>
          <DeskButton size="xl" variant="secondary" onClick={() => { setGameMode('competition'); setGameState('SETUP'); }}><Trophy className="mr-4 w-12 h-12" fill="currentColor" /> Soutěž</DeskButton>
          <DeskButton size="lg" variant="outline" className="border-slate-200" onClick={() => setGameState('LEADERBOARD')}><ListOrdered className="mr-4 w-10 h-10" /> Žebříček</DeskButton>
        </div>
      </div>
    );
  }

  if (gameState === 'LEADERBOARD') {
    const filteredLeaderboard = leaderboard.filter(e => e.range === leaderboardTab);
    return (
      <div className="flex flex-col items-center h-full gap-6 p-6 relative bg-desk-white font-sans">
        <div className="absolute top-8 left-8"><DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')}><Home className="w-8 h-8" /></DeskButton></div>
        <h2 className="text-6xl font-black mt-4 italic">Síň slávy</h2>
        <div className="flex gap-4 p-2 bg-slate-100 rounded-[2rem]">
          {[10, 20, 100].map(r => (
            <DeskButton key={r} size="md" variant={leaderboardTab === r ? 'primary' : 'outline'} className="border-none shadow-none" onClick={() => setLeaderboardTab(r as NumberRange)}>Do {r}</DeskButton>
          ))}
        </div>
        <div className="w-full max-w-4xl bg-white rounded-[3rem] p-8 shadow-xl overflow-hidden flex-1 mb-4 flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4"><Loader2 className="w-16 h-16 animate-spin text-slate-200" /><p className="text-2xl text-slate-300 font-bold">Načítám...</p></div>
          ) : filteredLeaderboard.length === 0 ? (
            <p className="text-center text-3xl text-slate-300 py-24">Zatím žádné výsledky</p>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto h-full pr-2">
              <div className="flex text-slate-400 font-bold px-4 mb-2 uppercase text-xs tracking-[0.2em]">
                 <span className="w-12 text-center">#</span>
                 <span className="flex-1">Jméno</span>
                 <span className="w-24 text-center">Úspěšnost</span>
                 <span className="w-20 text-center text-success">Správně</span>
                 <span className="w-20 text-center text-error">Chyby</span>
                 <span className="w-28 text-center text-board-black font-black">Body</span>
              </div>
              {filteredLeaderboard.map((entry, i) => (
                <div key={entry.id} className="flex items-center p-4 bg-slate-50 rounded-2xl">
                  <span className="text-3xl font-black text-slate-300 w-12 italic text-center">#{i + 1}</span>
                  <div className="flex-1 ml-4"><p className="text-2xl font-black leading-tight">{entry.name}</p></div>
                  <div className="w-24 text-center text-2xl font-black text-carpet-green bg-class-green/20 py-2 rounded-xl">{entry.accuracy}%</div>
                  <div className="w-20 text-center text-3xl font-black text-success/70">{entry.total - entry.errors}</div>
                  <div className="w-20 text-center text-3xl font-black text-error/40">{entry.errors}</div>
                  <div className="w-28 text-center text-4xl font-black text-board-black">{entry.score}</div>
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
      <div className="flex flex-col items-center justify-center h-full gap-12 p-6 relative font-sans">
        <div className="absolute top-8 left-8"><DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')}><Home className="w-8 h-8" /></DeskButton></div>
        <h2 className="text-7xl font-black italic">{isCompetition ? 'Soutěžní start' : 'Trénink'}</h2>
        <div className="flex flex-col gap-6 items-center">
          <p className="text-4xl font-black text-slate-300 uppercase tracking-widest">Obor čísel</p>
          <div className="flex gap-6">
            {[10, 20, 100].map(r => (<DeskButton key={r} size="lg" variant={range === r ? 'primary' : 'outline'} className="min-w-[140px]" onClick={() => setRange(r as NumberRange)}>Do {r}</DeskButton>))}
          </div>
        </div>
        {!isCompetition && (
          <div className="flex flex-col gap-6 items-center">
            <p className="text-4xl font-black text-slate-300 uppercase tracking-widest">Příklady</p>
            <div className="flex gap-6">
              {(['addition', 'subtraction', 'comparison'] as Operation[]).map(op => (
                <DeskButton key={op} size="md" variant={operations.includes(op) ? 'primary' : 'outline'} className="min-w-[120px]" onClick={() => { if (operations.includes(op)) { if (operations.length > 1) setOperations(operations.filter(o => o !== op)); } else { setOperations([...operations, op]); } }}>{op === 'addition' ? '+' : op === 'subtraction' ? '-' : '< > ='}</DeskButton>
              ))}
            </div>
          </div>
        )}
        <DeskButton size="xl" variant="secondary" className="mt-8 px-24" onClick={() => startNewGame(gameMode)}>START!</DeskButton>
      </div>
    );
  }

  if (gameState === 'PLAYING' && currentProblem) {
    const isComparison = currentProblem.type === 'comparison';
    const displayOptions = isComparison ? ['<', '=', '>'] : currentProblem.options;
    return (
      <div className="flex flex-col h-full relative p-6 font-sans">
        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-4 items-center">
             <DeskButton variant="outline" size="md" onClick={() => setGameState('HOME')}><Home className="w-8 h-8" /></DeskButton>
             <div className="flex gap-3">
               <div className="bg-white rounded-[1.5rem] px-8 py-4 shadow-sm border-4 border-slate-50 flex items-center gap-4"><CheckCircle2 className="text-success w-10 h-10" /><span className="text-5xl font-black text-success leading-none">{stats.correct}</span></div>
               {stats.errors > 0 && (<div className="bg-white rounded-[1.5rem] px-8 py-4 shadow-sm border-4 border-slate-50 flex items-center gap-4"><XCircle className="text-error w-10 h-10" /><span className="text-5xl font-black text-error leading-none">{stats.errors}</span></div>)}
             </div>
          </div>
          {gameMode === 'competition' && (
            <div className="flex flex-col items-end gap-3 w-1/3">
              <div className="flex items-center gap-4"><Timer className="w-10 h-10" /><span className="text-5xl font-mono font-black">{timeLeft}s</span></div>
              <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden border-4 border-white shadow-inner"><div className="h-full bg-carpet-green transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 60) * 100}%` }} /></div>
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-16">
          <div className="h-64 flex items-center justify-center text-[14rem] font-black tracking-tight leading-none gap-10">
            <span>{currentProblem.a}</span>
            {isComparison ? (<div className="w-40 h-40 border-8 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center bg-slate-50 translate-y-2"><span className="text-8xl text-slate-200">?</span></div>) : (<><span className="text-class-green drop-shadow-sm">{currentProblem.displayOperator}</span><span>{currentProblem.b}</span><span className="text-slate-200">=</span><span className="text-slate-200 italic">?</span></>)}
            {isComparison && <span>{currentProblem.b}</span>}
          </div>
          <div className="h-96 w-full max-w-5xl flex items-center justify-center">
            <div className={`grid gap-10 w-full ${isComparison ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {displayOptions.map((opt, i) => (
                <div key={`${currentProblem.id}-${i}`} className="w-full flex justify-center"><DeskButton size="xl" variant={feedback === 'correct' && opt === currentProblem.result ? 'success' : clickedOptions.has(opt) ? 'error' : 'primary'} className="w-full h-48 text-8xl font-black" onClick={() => handleAnswer(opt)} disabled={feedback === 'correct' || clickedOptions.has(opt)}>{opt}</DeskButton></div>
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
    const rawScore = (stats.correct * 10) - (stats.errors * 5);
    const finalScore = Math.max(0, Math.round(rawScore * (accuracy / 100)));

    return (
      <div className="flex flex-col items-center justify-center h-full gap-8 p-6 font-sans">
        {isSad ? (<Frown className="w-40 h-40 text-error mb-4 animate-bounce" />) : (<Trophy className="w-40 h-40 text-class-green mb-4 animate-bounce" />)}
        <h2 className="text-8xl font-black italic">{isSad ? 'Příště to bude lepší!' : 'Super výkon!'}</h2>
        <div className="bg-white rounded-[4rem] p-12 shadow-2xl border-8 border-slate-50 flex flex-col gap-6 items-center w-full max-w-xl">
          <div className="grid grid-cols-2 w-full gap-4">
             <div className="bg-slate-50 p-6 rounded-[2rem] text-center flex flex-col gap-1">
                <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Správně</span>
                <span className="text-5xl font-black text-success">{stats.correct}</span>
             </div>
             <div className="bg-slate-50 p-6 rounded-[2rem] text-center flex flex-col gap-1">
                <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Úspěšnost</span>
                <span className="text-5xl font-black text-carpet-green">{accuracy}%</span>
             </div>
          </div>
          <div className="flex flex-col items-center gap-2 bg-board-black text-white w-full p-6 rounded-[2rem]">
             <span className="text-slate-400 font-bold uppercase text-sm tracking-widest">Tvoje Body</span>
             <div className="flex items-center gap-4">
                <Star className="w-10 h-10 text-class-green" fill="currentColor" />
                <span className="text-7xl font-black">{finalScore}</span>
             </div>
          </div>
          {gameMode === 'competition' && (
            <div className="flex flex-col gap-4 w-full mt-4 pt-6 border-t-4 border-slate-100">
               <div className="flex items-center justify-center gap-4 text-slate-300">
                  <Target className="w-8 h-8" /><p className="text-xl uppercase tracking-widest font-black whitespace-nowrap">Zapiš se do síně slávy</p>
               </div>
               <input type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value.slice(0, 12))} placeholder="TVOJE JMÉNO" className="w-full text-center text-5xl font-black uppercase py-6 rounded-[2.5rem] border-8 border-slate-100 focus:border-class-green outline-none bg-slate-50 text-board-black placeholder:text-slate-200 transition-all" autoFocus />
               <DeskButton size="xl" variant="secondary" onClick={saveToLeaderboard} disabled={!playerName.trim() || isLoading}>
                  <div className="flex items-center justify-center gap-4 whitespace-nowrap">
                    {isLoading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Save className="w-10 h-10" />}
                    <span className="text-3xl">{isLoading ? 'UKLÁDÁM...' : 'ULOŽIT VÝSLEDEK'}</span>
                  </div>
               </DeskButton>
            </div>
          )}
        </div>
        <DeskButton size="lg" variant="outline" className="border-slate-200 mt-4 shadow-none" onClick={() => setGameState('HOME')}><RotateCcw className="mr-4 w-8 h-8" /> Hrát znovu bez uložení</DeskButton>
      </div>
    );
  }
  return null;
}
