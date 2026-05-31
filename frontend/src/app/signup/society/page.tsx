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
import { type FieldErrors, lengthBetween, maxLength, validatePhone } from '@/lib/validation';

type SocietySignupField = 'name' | 'societyName' | 'address' | 'phone';

export default function SignupSociety() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [form, setForm] = useState({ name: '', societyName: '', address: '', phone: '' });
  const [errors, setErrors] = useState<FieldErrors<SocietySignupField>>({});

  function updateField(field: SocietySignupField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validateForm(): boolean {
    const next: FieldErrors<SocietySignupField> = {};
    next.name = lengthBetween(form.name, 'Your name', 1, 100) ?? undefined;
    next.societyName = lengthBetween(form.societyName, 'Society name', 2, 120) ?? undefined;
    next.address = form.address ? (maxLength(form.address, 'Address', 300) ?? undefined) : undefined;
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
      api<{ token: string; user: SessionUser }>('/api/auth/register-admin', {
        method: 'POST',
        body: JSON.stringify({
          phone: form.phone.trim(),
          otp,
          name: form.name.trim(),
          societyName: form.societyName.trim(),
          ...(form.address.trim() ? { address: form.address.trim() } : {}),
        }),
      }),
    onSuccess: (data) => {
      saveSession(data.token, data.user);
      const m = data.user.memberships[0]!;
      router.push(`/s/${m.slug}/admin`);
    },
  });

  return (
    <main className="min-h-screen bg-[#f6f5f1] px-5 py-10">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#26352b] text-white">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Register your society</h1>
            <p className="text-sm text-neutral-600">
              Create the admin workspace and share the join code with residents.
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-name">Your name</Label>
                  <Input
                    id="admin-name"
                    value={form.name}
                    aria-invalid={!!errors.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Committee member name"
                  />
                  {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-phone">Phone number</Label>
                  <Input
                    id="admin-phone"
                    value={form.phone}
                    aria-invalid={!!errors.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                  {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="society-name">Society name</Label>
                <Input
                  id="society-name"
                  value={form.societyName}
                  aria-invalid={!!errors.societyName}
                  onChange={(e) => updateField('societyName', e.target.value)}
                  placeholder="Green Valley Apartments"
                />
                {errors.societyName && (
                  <p className="text-sm text-red-600">{errors.societyName}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="society-address">Address (optional)</Label>
                <Input
                  id="society-address"
                  value={form.address}
                  aria-invalid={!!errors.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Area, city"
                />
                {errors.address && <p className="text-sm text-red-600">{errors.address}</p>}
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
              submitLabel="Create society"
            />
          )}
        </section>
      </div>
    </main>
  );
}
