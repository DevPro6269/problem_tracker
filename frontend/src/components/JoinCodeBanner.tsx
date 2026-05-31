'use client';
import { KeyRound } from 'lucide-react';
import CopyButton from './CopyButton';

type Props = { code: string };

export default function JoinCodeBanner({ code }: Props) {
  return (
    <div className="hidden sm:flex items-center gap-2 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-sky-50 px-3 py-1.5">
      <KeyRound className="h-3.5 w-3.5 text-indigo-600" />
      <span className="text-xs text-neutral-600">Join code</span>
      <code className="text-sm font-semibold tracking-wide text-indigo-700">{code}</code>
      <CopyButton value={code} label="Copy" />
    </div>
  );
}
