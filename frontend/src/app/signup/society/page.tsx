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

export default function SignupSociety() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({ name: '', societyName: '', address: '', phone: '' });

  const sendOtp = useMutation({
    mutationFn: () =>
      api('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone: form.phone }) }),
    onSuccess: () => setStep('otp'),
  });

  const register = useMutation({
    mutationFn: (otp: string) =>
      api<{ token: string; user: SessionUser }>('/api/auth/register-admin', {
        method: 'POST',
        body: JSON.stringify({
          phone: form.phone,
          otp,
          name: form.name,
          societyName: form.societyName,
          ...(form.address ? { address: form.address } : {}),
        }),
      }),
    onSuccess: (data) => {
      saveSession(data.token, data.user);
      const m = data.user.memberships[0]!;
      router.push(`/s/${m.slug}/admin`);
    },
  });

  return (
    <main className="max-w-md mx-auto p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Register your society</h1>

      {step === 'form' && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendOtp.mutate();
          }}
        >
          <Label>Your name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Label>Society name</Label>
          <Input
            value={form.societyName}
            onChange={(e) => setForm({ ...form, societyName: e.target.value })}
            placeholder="Green Valley Apartments"
          />
          <Label>Address (optional)</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 98765 43210"
          />
          {sendOtp.error && (
            <p className="text-sm text-red-600">{(sendOtp.error as Error).message}</p>
          )}
          <Button
            type="submit"
            disabled={sendOtp.isPending || !form.name || !form.societyName || !form.phone}
          >
            {sendOtp.isPending ? 'Sending…' : 'Send OTP'}
          </Button>
        </form>
      )}

      {step === 'otp' && (
        <OtpStep
          onVerify={(otp) => register.mutate(otp)}
          isPending={register.isPending}
          error={register.error ? (register.error as Error).message : null}
          submitLabel="Create society"
        />
      )}
    </main>
  );
}
