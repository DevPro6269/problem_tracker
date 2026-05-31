'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { saveSession } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';
import OtpStep from '@/components/OtpStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validatePhone } from '@/lib/validation';

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const sendOtp = useMutation({
    mutationFn: () =>
      api('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone: phone.trim() }) }),
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
    <main className="min-h-screen bg-[#f6f5f1] px-5 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#26352b] text-white">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="text-sm text-neutral-600">Continue to your society workspace.</p>
          </div>
        </div>

        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          {step === 'phone' && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const message = validatePhone(phone);
                setPhoneError(message);
                if (message) return;
                sendOtp.mutate();
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  value={phone}
                  aria-invalid={!!phoneError}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  placeholder="+91 98765 43210"
                />
                <p className="text-xs text-neutral-500">Use the number registered with your society.</p>
              </div>
              {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
              {sendOtp.error && (
                <p className="text-sm text-red-600">{(sendOtp.error as Error).message}</p>
              )}
              <Button type="submit" disabled={sendOtp.isPending} className="w-full">
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
        </section>
      </div>
    </main>
  );
}
