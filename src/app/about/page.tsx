'use client';

import { Heart, Mail, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/shared/AppHeader';

export default function AboutPage() {
  const router = useRouter();

  return (
    <main className="h-screen w-screen bg-desk-white flex flex-col font-sans text-board-black">
      <div className="w-full h-full flex flex-col overflow-hidden">

        <AppHeader page="O aplikaci" onBack={() => router.back()} />

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center animate-in zoom-in duration-500">

            <div className="flex gap-3">
              <Heart className="w-12 h-12 text-error animate-pulse" fill="currentColor" />
              <Sparkles className="w-12 h-12 text-yellow-400" />
            </div>

            <h1 className="text-4xl font-black italic">O aplikaci</h1>

            <div className="flex flex-col gap-4 text-lg font-medium leading-relaxed text-slate-600">
              <p>
                Tuto aplikaci vyrobil <span className="text-board-black font-black">Filípek</span> za pomoci svého{' '}
                <span className="text-board-black font-black">tatínka</span> a několika{' '}
                <span className="text-class-green font-black">AI agentů</span>.
              </p>
              <p>
                Naším cílem bylo vytvořit zábavné místo, kde se děti mohou učit matematiku a angličtinu bez stresu a s radostí.
              </p>
            </div>

            <div className="pt-6 border-t-4 border-slate-100 w-full flex flex-col items-center gap-3">
              <p className="text-sm font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Zpětná vazba
              </p>
              <a
                href="mailto:gritty-claps8g@icloud.com"
                className="text-2xl font-black text-class-green hover:scale-105 transition-transform break-all"
              >
                gritty-claps8g@icloud.com
              </a>
              <p className="text-base text-slate-400 font-bold">
                Budeme moc rádi za každý nápad na zlepšení!
              </p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
