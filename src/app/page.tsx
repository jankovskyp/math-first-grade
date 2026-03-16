'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DeskButton } from '@/components/shared/DeskButton';
import { Calculator, BookA, Settings, Info } from 'lucide-react';

export default function MainMenu() {
  const router = useRouter();

  return (
    <main className="h-screen w-screen bg-desk-white overflow-hidden flex flex-col items-center justify-center p-6 font-sans text-board-black">
      <div className="flex items-center gap-6 mb-10">
        <Image src="/icon.png" alt="Orel" width={120} height={120} className="w-28 h-28 mix-blend-multiply" priority />
        <h1 className="text-8xl font-black italic drop-shadow-sm">Chytrý Školák</h1>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-md text-board-black">
        <DeskButton size="xl" onClick={() => router.push('/math')} className="bg-class-green shadow-[0_8px_0_0_rgba(163,230,53,0.3)] py-8">
          <Calculator className="mr-6 w-12 h-12 shrink-0" strokeWidth={2.5} />
          <span>Matematika</span>
        </DeskButton>

        <DeskButton size="xl" onClick={() => router.push('/english')} className="bg-[#38BDF8] text-white border-none shadow-[0_8px_0_0_rgba(56,189,248,0.3)] py-8 text-white">
          <BookA className="mr-6 w-12 h-12 shrink-0 text-white" strokeWidth={2.5} />
          <span className="text-white">Angličtina</span>
        </DeskButton>

        <div className="flex gap-4 mt-4 w-full">
          <DeskButton size="md" variant="outline" className="flex-1 border-slate-200 py-4" onClick={() => router.push('/settings')}>
            <Settings className="mr-2 w-6 h-6 text-slate-400" />
            <span className="text-xl">Slovníček</span>
          </DeskButton>

          <DeskButton size="md" variant="outline" className="flex-1 border-slate-200 py-4" onClick={() => router.push('/about')}>
            <Info className="mr-2 w-6 h-6 text-slate-400" />
            <span className="text-xl">O aplikaci</span>
          </DeskButton>
        </div>
      </div>
    </main>
  );
}
