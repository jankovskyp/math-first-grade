'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameSession } from '@/types/sessions';
import { AppHeader } from '@/components/shared/AppHeader';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export const SESSION_LS_KEY = (playerId: string) => `game-sessions-${playerId}`;

interface Props {
  playerId: string | undefined;
  subject: 'math' | 'english';
  headerSubject: string;
  onBack: () => void;
}

export function SessionHistory({ playerId, subject, headerSubject, onBack }: Props) {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    if (!playerId) {
      setIsLoading(false);
      return;
    }

    const localData: GameSession[] = JSON.parse(localStorage.getItem(SESSION_LS_KEY(playerId)) || '[]')
      .filter((s: GameSession) => s.subject === subject);

    if (!isSupabaseConfigured || !supabase) {
      setSessions(localData);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('player_id', playerId)
        .eq('subject', subject)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setSessions((data as GameSession[]) || localData);
    } catch {
      setSessions(localData);
    } finally {
      setIsLoading(false);
    }
  }, [playerId, subject]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const submodeName = (s: GameSession) => {
    if (subject === 'math') return `Do ${s.submode}`;
    const labels: Record<string, string> = { listen: 'Poslech', spelling: 'Psaní', picture: 'Obrázky' };
    return labels[s.submode] ?? s.submode;
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="flex flex-col h-full bg-desk-white font-sans text-board-black">
      <AppHeader subject={headerSubject} page="Historie" onBack={onBack} />
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col gap-3 mt-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="w-12 h-12 animate-spin text-slate-200" />
            <p className="text-xl text-slate-300 font-bold">Načítám...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-center text-2xl text-slate-300">Zatím žádná historie</p>
          </div>
        ) : (
          sessions.map(session => {
            const { date, time } = formatDateTime(session.created_at);
            const isExpanded = expandedId === session.id;
            return (
              <div key={session.id} className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="w-full p-4 flex items-center gap-3 text-left active:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 font-bold">{date} · {time}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                        session.game_mode === 'competition'
                          ? 'bg-class-green/20 text-carpet-green'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {session.game_mode === 'competition' ? 'Soutěž' : 'Trénink'}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{submodeName(session)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-sm font-black text-success">{session.correct}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="w-4 h-4 text-error" />
                      <span className="text-sm font-black text-error">{session.incorrect}</span>
                    </div>
                    <span className="text-sm font-black text-carpet-green w-10 text-right">{session.accuracy}%</span>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 text-slate-300 shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-slate-300 shrink-0" />
                  }
                </button>

                {isExpanded && session.answers.length > 0 && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 flex flex-col gap-1.5">
                    {session.answers.map((ans, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 py-2 px-3 rounded-xl ${
                          ans.wasCorrect ? 'bg-success/10' : 'bg-error/10'
                        }`}
                      >
                        {ans.wasCorrect
                          ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                          : <XCircle className="w-4 h-4 text-error shrink-0" />
                        }
                        <span className={`text-sm font-bold flex-1 min-w-0 truncate ${
                          ans.wasCorrect ? 'text-success' : 'text-error'
                        }`}>
                          {ans.question}
                        </span>
                        {!ans.wasCorrect && ans.correctAnswer !== ans.question && (
                          <span className="text-xs text-slate-400 shrink-0 font-bold">→ {ans.correctAnswer}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
