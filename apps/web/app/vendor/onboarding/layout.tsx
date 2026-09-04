/**
 * Minimal layout for /vendor/onboarding.
 * This intentionally bypasses the vendor guard layout (which would
 * redirect un-onboarded users here causing an infinite loop).
 * Auth is still enforced by middleware.ts.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
