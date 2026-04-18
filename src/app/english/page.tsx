'use client';
import { AuthGuard } from "@/components/shared/AuthGuard";
import EnglishGameContainer from "@/components/english/EnglishGameContainer";

export default function EnglishPage() {
  return (
    <AuthGuard>
      {/* Desktop: centred card on lavender background. Mobile: full screen. */}
      <main className="h-screen w-screen overflow-hidden bg-desk-white flex items-center justify-center lg:bg-[#ece9fc] lg:p-8">
        <div className="relative w-full h-full lg:w-[480px] lg:rounded-[2.5rem] lg:overflow-hidden lg:shadow-2xl bg-white flex flex-col">
          <EnglishGameContainer />
        </div>
      </main>
    </AuthGuard>
  );
}
