'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  className?: string;
  label?: string;
};

export default function CopyButton({ value, className, label = 'Copy' }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium rounded-md px-2 py-1 transition-colors',
        copied
          ? 'bg-green-100 text-green-800'
          : 'bg-white/80 text-neutral-700 hover:bg-white border border-neutral-200',
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}
