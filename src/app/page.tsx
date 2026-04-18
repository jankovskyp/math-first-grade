'use client';

import { useRouter } from 'next/navigation';
import { DeskButton } from '@/components/shared/DeskButton';
import { SubjectHeader } from '@/components/shared/SubjectHeader';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Calculator, BookA, Settings, Info } from 'lucide-react';

export default function MainMenu() {
  const router = useRouter();

  return (
    <AuthGuard>
      <main className="h-screen w-screen overflow-hidden bg-desk-white flex items-center justify-center lg:bg-[#ece9fc] lg:p-8">
        <div className="relative w-full h-full lg:w-[480px] lg:rounded-[2.5rem] lg:overflow-hidden lg:shadow-2xl bg-white flex flex-col items-center justify-center p-6 font-sans text-board-black">
          <SubjectHeader />
          <div className="flex flex-col gap-6 w-full max-w-md mt-24">
            <DeskButton size="xl" onClick={() => router.push('/math')} className="py-8">
              <Calculator className="mr-6 w-12 h-12 shrink-0" strokeWidth={2.5} />
              <span>Matematika</span>
            </DeskButton>

            <DeskButton size="xl" onClick={() => router.push('/english')} className="py-8">
              <BookA className="mr-6 w-12 h-12 shrink-0" strokeWidth={2.5} />
              <span>Angličtina</span>
            </DeskButton>

            <div className="flex gap-4 mt-4 w-full">
              <DeskButton size="md" variant="outline" className="flex-1 py-4" onClick={() => router.push('/settings')}>
                <Settings className="mr-2 w-6 h-6 text-slate-400" />
                <span className="text-xl">Slovníček</span>
              </DeskButton>

              <DeskButton size="md" variant="outline" className="flex-1 py-4" onClick={() => router.push('/about')}>
                <Info className="mr-2 w-6 h-6 text-slate-400" />
                <span className="text-xl">O aplikaci</span>
              </DeskButton>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
