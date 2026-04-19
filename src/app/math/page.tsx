'use client';
import { AuthGuard } from "@/components/shared/AuthGuard";
import MathGameContainer from "@/components/math/MathGameContainer";

export default function MathPage() {
  return (
    <AuthGuard>
      <main className="h-screen w-screen overflow-hidden bg-desk-white flex flex-col">
        <div className="relative w-full h-full flex flex-col">
          <MathGameContainer />
        </div>
      </main>
    </AuthGuard>
  );
}
