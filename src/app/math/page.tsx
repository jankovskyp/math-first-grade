'use client';
import { AuthGuard } from "@/components/shared/AuthGuard";
import MathGameContainer from "@/components/math/MathGameContainer";

export default function MathPage() {
  return (
    <AuthGuard>
      <main className="h-screen w-screen bg-desk-white overflow-hidden">
        <MathGameContainer />
      </main>
    </AuthGuard>
  );
}
