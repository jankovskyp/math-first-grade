'use client';

import { DeskButton } from '@/components/shared/DeskButton';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Home, Heart, Mail, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();

  return (
    <AuthGuard>
      <main className="h-screen w-screen bg-desk-white flex flex-col p-6 font-sans text-board-black overflow-hidden items-center justify-center">
        <div className="absolute top-6 left-6">
          <DeskButton variant="outline" size="md" onClick={() => router.push('/')} className="border-slate-400">
            <Home className="w-8 h-8 text-slate-600" />
          </DeskButton>
        </div>

        <div className="w-full max-w-2xl bg-white p-12 rounded-[4rem] shadow-2xl border-8 border-slate-50 flex flex-col items-center gap-8 text-center animate-in zoom-in duration-500">
          <div className="flex gap-4">
            <Heart className="w-16 h-16 text-error animate-pulse" fill="currentColor" />
            <Sparkles className="w-16 h-16 text-yellow-400" />
          </div>

          <h1 className="text-6xl font-black italic">O aplikaci</h1>

          <div className="flex flex-col gap-6 text-3xl font-medium leading-relaxed text-slate-600">
            <p>
              Tuto aplikaci vyrobil <span className="text-board-black font-black">Filípek</span> za pomoci svého <span className="text-board-black font-black">tatínka</span> a několika <span className="text-class-green font-black">AI agentů</span>.
            </p>

            <p>
              Naším cílem bylo vytvořit zábavné místo, kde se děti mohou učit matematiku a angličtinu bez stresu a s radostí.
            </p>
          </div>

          <div className="mt-8 pt-8 border-t-4 border-slate-50 w-full flex flex-col items-center gap-4">
            <p className="text-xl font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Mail className="w-6 h-6" /> Zpětná vazba
            </p>
            <a
              href="mailto:gritty-claps8g@icloud.com"
              className="text-4xl font-black text-[#38BDF8] hover:scale-105 transition-transform"
            >
              gritty-claps8g@icloud.com
            </a>
            <p className="text-lg text-slate-400 font-bold">
              Budeme moc rádi za každý nápad na zlepšení!
            </p>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
