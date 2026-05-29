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

export default function SignupResident() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({ name: '', flatNumber: '', joinCode: '', phone: '' });

  const sendOtp = useMutation({
    mutationFn: () =>
      api('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone: form.phone }) }),
    onSuccess: () => setStep('otp'),
  });

  const register = useMutation({
    mutationFn: (otp: string) =>
      api<{ token: string; user: SessionUser }>('/api/auth/register-resident', {
        method: 'POST',
        body: JSON.stringify({
          phone: form.phone,
          otp,
          name: form.name,
          flatNumber: form.flatNumber,
          joinCode: form.joinCode,
        }),
      }),
    onSuccess: (data) => {
      saveSession(data.token, data.user);
      const m = data.user.memberships[0]!;
      router.push(`/s/${m.slug}/resident`);
    },
  });

  return (
    <main className="max-w-md mx-auto p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Join a society</h1>

      {step === 'form' && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendOtp.mutate();
          }}
        >
          <Label>Join code</Label>
          <Input
            value={form.joinCode}
            onChange={(e) =>
              setForm({ ...form, joinCode: e.target.value.toUpperCase() })
            }
            placeholder="GV-A4F2"
          />
          <Label>Your name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Label>Flat number</Label>
          <Input
            value={form.flatNumber}
            onChange={(e) => setForm({ ...form, flatNumber: e.target.value })}
            placeholder="A-301"
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
            disabled={
              sendOtp.isPending ||
              !form.name ||
              !form.joinCode ||
              !form.phone ||
              !form.flatNumber
            }
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
          submitLabel="Join society"
        />
      )}
    </main>
  );
}
