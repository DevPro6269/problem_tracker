'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import { saveSession } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';
import OtpStep from '@/components/OtpStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');

  const sendOtp = useMutation({
    mutationFn: () =>
      api('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) }),
    onSuccess: () => setStep('otp'),
  });

  const login = useMutation({
    mutationFn: (otp: string) =>
      api<{ token: string; user: SessionUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      }),
    onSuccess: (data) => {
      saveSession(data.token, data.user);
      const first = data.user.memberships[0];
      if (!first) {
        router.push('/');
        return;
      }
      router.push(
        first.role === 'ADMIN' ? `/s/${first.slug}/admin` : `/s/${first.slug}/resident`,
      );
    },
  });

  return (
    <main className="max-w-sm mx-auto p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {step === 'phone' && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendOtp.mutate();
          }}
        >
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />
          {sendOtp.error && (
            <p className="text-sm text-red-600">{(sendOtp.error as Error).message}</p>
          )}
          <Button type="submit" disabled={sendOtp.isPending || phone.length < 5}>
            {sendOtp.isPending ? 'Sending…' : 'Send OTP'}
          </Button>
        </form>
      )}

      {step === 'otp' && (
        <OtpStep
          onVerify={(otp) => login.mutate(otp)}
          isPending={login.isPending}
          error={login.error ? (login.error as Error).message : null}
          submitLabel="Sign in"
        />
      )}
    </main>
  );
}
