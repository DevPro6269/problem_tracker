'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateOtp } from '@/lib/validation';

type Props = {
  onVerify: (otp: string) => void;
  isPending?: boolean;
  error?: string | null;
  submitLabel?: string;
};

export default function OtpStep({ onVerify, isPending, error, submitLabel = 'Verify' }: Props) {
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  function submit() {
    const message = validateOtp(otp);
    setOtpError(message);
    if (message) return;
    onVerify(otp);
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otp">Enter OTP</Label>
        <Input
          id="otp"
          inputMode="numeric"
          maxLength={6}
          value={otp}
          aria-invalid={!!otpError}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, ''));
            if (otpError) setOtpError(null);
          }}
          placeholder="123456"
          className="text-center text-lg tracking-[0.3em]"
        />
        <p className="text-xs text-neutral-500">
          Demo OTP: <code className="rounded bg-neutral-100 px-1.5 py-0.5">123456</code>
        </p>
      </div>
      {otpError && <p className="text-sm text-red-600">{otpError}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isPending || otp.length !== 6} className="mt-1 w-full">
        {isPending ? 'Verifying…' : submitLabel}
      </Button>
    </form>
  );
}
