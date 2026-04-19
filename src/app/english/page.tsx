'use client';
import { AuthGuard } from "@/components/shared/AuthGuard";
import EnglishGameContainer from "@/components/english/EnglishGameContainer";

export default function EnglishPage() {
  return (
    <AuthGuard>
      <main className="h-screen w-screen overflow-hidden bg-desk-white flex flex-col">
        <div className="relative w-full h-full flex flex-col">
          <EnglishGameContainer />
        </div>
      </main>
    </AuthGuard>
  );
}
