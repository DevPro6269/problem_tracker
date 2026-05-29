'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  onVerify: (otp: string) => void;
  isPending?: boolean;
  error?: string | null;
  submitLabel?: string;
};

export default function OtpStep({ onVerify, isPending, error, submitLabel = 'Verify' }: Props) {
  const [otp, setOtp] = useState('');
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onVerify(otp);
      }}
    >
      <Label htmlFor="otp">Enter OTP</Label>
      <Input
        id="otp"
        inputMode="numeric"
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="123456"
      />
      <p className="text-xs text-neutral-500">
        Demo OTP: <code className="bg-neutral-200 px-1 rounded">123456</code>
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isPending || otp.length !== 6}>
        {isPending ? 'Verifying…' : submitLabel}
      </Button>
    </form>
  );
}
