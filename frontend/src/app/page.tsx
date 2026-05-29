import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">SocietyDesk</h1>
      <p className="text-neutral-600 max-w-md text-center">
        Multi-tenant complaint tracker for housing societies. Residents file issues, admins resolve them.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild>
          <Link href="/signup/society">Register your society</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/signup/resident">Join with code</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
      <p className="text-xs text-neutral-500">
        Demo OTP: <code className="bg-neutral-200 px-1 rounded">123456</code>
      </p>
    </main>
  );
}
