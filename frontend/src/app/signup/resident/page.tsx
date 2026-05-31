'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { saveSession } from '@/lib/auth';
import type { SessionUser } from '@/lib/types';
import OtpStep from '@/components/OtpStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type FieldErrors, lengthBetween, validatePhone } from '@/lib/validation';

type ResidentSignupField = 'joinCode' | 'name' | 'flatNumber' | 'phone';

export default function SignupResident() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({ name: '', flatNumber: '', joinCode: '', phone: '' });
  const [errors, setErrors] = useState<FieldErrors<ResidentSignupField>>({});

  function updateField(field: ResidentSignupField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateForm(): boolean {
    const next: FieldErrors<ResidentSignupField> = {};
    next.joinCode = lengthBetween(form.joinCode, 'Join code', 4, 20) ?? undefined;
    if (form.joinCode && !/^[A-Z0-9-]+$/.test(form.joinCode.trim())) {
      next.joinCode = 'Join code can use letters, numbers, and hyphens only.';
    }
    next.name = lengthBetween(form.name, 'Your name', 1, 100) ?? undefined;
    next.flatNumber = lengthBetween(form.flatNumber, 'Flat number', 1, 20) ?? undefined;
    next.phone = validatePhone(form.phone) ?? undefined;

    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  const sendOtp = useMutation({
    mutationFn: () =>
      api('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: form.phone.trim() }),
      }),
    onSuccess: () => setStep('otp'),
  });

  const register = useMutation({
    mutationFn: (otp: string) =>
      api<{ token: string; user: SessionUser }>('/api/auth/register-resident', {
        method: 'POST',
        body: JSON.stringify({
          phone: form.phone.trim(),
          otp,
          name: form.name.trim(),
          flatNumber: form.flatNumber.trim(),
          joinCode: form.joinCode.trim(),
        }),
      }),
    onSuccess: (data) => {
      saveSession(data.token, data.user);
      const m = data.user.memberships[0]!;
      router.push(`/s/${m.slug}/resident`);
    },
  });

  return (
    <main className="min-h-screen bg-[#f6f5f1] px-5 py-10">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#26352b] text-white">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Join a society</h1>
            <p className="text-sm text-neutral-600">
              Use the join code shared by your society admin.
            </p>
          </div>
        </div>

        <section className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
          {step === 'form' && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!validateForm()) return;
                sendOtp.mutate();
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="join-code">Join code</Label>
                <Input
                  id="join-code"
                  value={form.joinCode}
                  aria-invalid={!!errors.joinCode}
                  onChange={(e) => updateField('joinCode', e.target.value.toUpperCase())}
                  placeholder="GV-A4F2"
                  className="uppercase"
                />
                <p className="text-xs text-neutral-500">Ask your committee member for this code.</p>
                {errors.joinCode && <p className="text-sm text-red-600">{errors.joinCode}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="resident-name">Your name</Label>
                  <Input
                    id="resident-name"
                    value={form.name}
                    aria-invalid={!!errors.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Resident name"
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="flat-number">Flat number</Label>
                  <Input
                    id="flat-number"
                    value={form.flatNumber}
                    aria-invalid={!!errors.flatNumber}
                    onChange={(e) => updateField('flatNumber', e.target.value)}
                    placeholder="A-301"
                  />
                  {errors.flatNumber && (
                    <p className="text-sm text-red-600">{errors.flatNumber}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="resident-phone">Phone number</Label>
                <Input
                  id="resident-phone"
                  value={form.phone}
                  aria-invalid={!!errors.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
                {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
              </div>

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
              onVerify={(otp) => register.mutate(otp)}
              isPending={register.isPending}
              error={register.error ? (register.error as Error).message : null}
              submitLabel="Join society"
            />
          )}
        </section>
      </div>
    </main>
  );
}
