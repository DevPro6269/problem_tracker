'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, clearSession } from '@/lib/auth';
import type { Membership } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function SocietyLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [me, setMe] = useState<Membership | null>(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push('/login');
      return;
    }
    const m = u.memberships.find((x) => x.slug === slug);
    if (!m) {
      router.push('/');
      return;
    }
    setMe(m);
  }, [slug, router]);

  if (!me) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 px-6 py-3 flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            SocietyDesk
          </Link>
          <span className="text-sm text-neutral-500">/ {slug}</span>
        </div>
        <nav className="flex gap-2 items-center">
          {me.role === 'ADMIN' && (
            <Button asChild variant="ghost">
              <Link href={`/s/${slug}/admin`}>Dashboard</Link>
            </Button>
          )}
          {me.role === 'RESIDENT' && (
            <>
              <Button asChild variant="ghost">
                <Link href={`/s/${slug}/resident`}>My Issues</Link>
              </Button>
              <Button asChild>
                <Link href={`/s/${slug}/resident/tickets/new`}>New Issue</Link>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              clearSession();
              router.push('/login');
            }}
          >
            Sign out
          </Button>
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
