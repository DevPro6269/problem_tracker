'use client';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Building2, LayoutDashboard, MessageCircle, ClipboardList, LogOut } from 'lucide-react';
import { clearSession, getUserSnapshot, parseUserSnapshot } from '@/lib/auth';
import type { Membership, SocietyInfo } from '@/lib/types';
import { api } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import JoinCodeBanner from '@/components/JoinCodeBanner';

function subscribeToSessionChange(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSessionSnapshot() {
  return getUserSnapshot();
}

function getServerSessionSnapshot() {
  return null;
}

export default function SocietyLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const userSnapshot = useSyncExternalStore(
    subscribeToSessionChange,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  const user = useMemo(() => parseUserSnapshot(userSnapshot), [userSnapshot]);
  const me: Membership | null = user?.memberships.find((x) => x.slug === slug) ?? null;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!me) {
      router.push('/');
    }
  }, [me, router, user]);

  const society = useQuery({
    queryKey: ['society', slug],
    queryFn: () =>
      api<{ society: SocietyInfo; role: 'ADMIN' | 'RESIDENT' }>(`/api/societies/${slug}`),
    enabled: !!me,
  });

  if (!me) return null;

  const info = society.data?.society;

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 font-semibold shrink-0">
              <Building2 className="h-5 w-5 text-indigo-600" />
              <span>SocietyDesk</span>
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="text-sm text-neutral-700 truncate">
              {info?.name ?? slug}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {me.role === 'ADMIN' && info?.joinCode && <JoinCodeBanner code={info.joinCode} />}
            <nav className="flex gap-1 items-center">
              {me.role === 'ADMIN' && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/s/${slug}/admin`} className="gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Link>
                </Button>
              )}
              {me.role === 'RESIDENT' && (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/s/${slug}/resident`} className="gap-1.5">
                      <ClipboardList className="h-4 w-4" />
                      <span className="hidden sm:inline">My Issues</span>
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/s/${slug}/resident/chat`} className="gap-1.5">
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">New Issue</span>
                    </Link>
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  clearSession();
                  router.push('/login');
                }}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
