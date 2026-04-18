'use client';

import { useRouter } from 'next/navigation';
import { DeskButton } from '@/components/shared/DeskButton';
import { AppHeader } from '@/components/shared/AppHeader';
import { AuthGuard } from '@/components/shared/AuthGuard';
import { Calculator, BookA, Settings, Info } from 'lucide-react';

export default function MainMenu() {
  const router = useRouter();

  return (
    <AuthGuard>
      <main className="h-screen w-screen overflow-hidden bg-desk-white flex items-center justify-center lg:bg-[#ece9fc] lg:p-8">
        <div className="w-full h-full lg:w-[480px] lg:rounded-[2.5rem] lg:overflow-hidden lg:shadow-2xl bg-white flex flex-col font-sans text-board-black">
          <AppHeader showLogout />
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6 pb-6">
            <DeskButton size="lg" onClick={() => router.push('/math')} className="w-full py-7">
              <Calculator className="mr-4 w-9 h-9 shrink-0" strokeWidth={2.5} />
              <span>Matematika</span>
            </DeskButton>

            <DeskButton size="lg" onClick={() => router.push('/english')} className="w-full py-7">
              <BookA className="mr-4 w-9 h-9 shrink-0" strokeWidth={2.5} />
              <span>Angličtina</span>
            </DeskButton>

            <div className="flex gap-4 mt-2 w-full">
              <DeskButton size="md" variant="outline" className="flex-1 py-4" onClick={() => router.push('/settings')}>
                <Settings className="mr-2 w-5 h-5 text-slate-400" />
                <span className="text-xl">Slovníček</span>
              </DeskButton>

              <DeskButton size="md" variant="outline" className="flex-1 py-4" onClick={() => router.push('/about')}>
                <Info className="mr-2 w-5 h-5 text-slate-400" />
                <span className="text-xl">O aplikaci</span>
              </DeskButton>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
