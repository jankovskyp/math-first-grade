'use client';
import { AuthGuard } from "@/components/shared/AuthGuard";
import EnglishGameContainer from "@/components/english/EnglishGameContainer";

export default function EnglishPage() {
  return (
    <AuthGuard>
      <main className="h-screen w-screen bg-desk-white overflow-hidden">
        <EnglishGameContainer />
      </main>
    </AuthGuard>
  );
}
