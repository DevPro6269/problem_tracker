'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Send, User2, AlertCircle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Msg = {
  role: 'user' | 'assistant' | 'error';
  text: string;
  createdTicketId?: string;
};

export default function Chat() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: "Hi! Tell me about the issue you'd like to report, or ask about the status of your existing tickets.",
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useMutation({
    mutationFn: (message: string) =>
      api<{ assistantMessage: string; createdTicketId?: string }>(
        `/api/societies/${slug}/chat`,
        { method: 'POST', body: JSON.stringify({ message }) },
      ),
    onSuccess: (data) => {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: data.assistantMessage,
          createdTicketId: data.createdTicketId,
        },
      ]);
      if (data.createdTicketId) qc.invalidateQueries({ queryKey: ['tickets', slug] });
    },
    onError: (e) => {
      setMessages((m) => [...m, { role: 'error', text: (e as Error).message }]);
    },
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, send.isPending]);

  function submit() {
    const text = input.trim();
    if (!text || send.isPending) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    send.mutate(text);
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-3 h-[calc(100vh-160px)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-100 border border-indigo-200 inline-flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Report an issue</h1>
            <p className="text-xs text-neutral-500">Powered by Gemini · ADK agent</p>
          </div>
        </div>
        <Link
          href={`/s/${slug}/resident/tickets/new`}
          className="text-xs underline text-neutral-500 hover:text-neutral-700"
        >
          Prefer a form? →
        </Link>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto border border-neutral-200 rounded-xl p-4 bg-white flex flex-col gap-3"
      >
        {messages.map((m, i) => (
          <Bubble key={i} m={m} slug={slug} />
        ))}
        {send.isPending && (
          <div className="self-start flex items-end gap-2">
            <div className="h-7 w-7 rounded-full bg-indigo-100 inline-flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            </div>
            <div className="bg-neutral-100 text-neutral-500 text-sm px-3 py-2 rounded-2xl rounded-bl-sm italic">
              thinking…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex gap-2 items-end"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the issue, or ask about your tickets…"
          rows={2}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button type="submit" disabled={send.isPending || !input.trim()} className="gap-1.5">
          <Send className="h-4 w-4" />
          Send
        </Button>
      </form>
    </div>
  );
}

function Bubble({ m, slug }: { m: Msg; slug: string }) {
  if (m.role === 'user') {
    return (
      <div className="self-end flex items-end gap-2 max-w-[80%]">
        <div className="bg-neutral-900 text-white text-sm px-3 py-2 rounded-2xl rounded-br-sm whitespace-pre-wrap">
          {m.text}
        </div>
        <div className="h-7 w-7 rounded-full bg-neutral-200 inline-flex items-center justify-center shrink-0">
          <User2 className="h-3.5 w-3.5 text-neutral-600" />
        </div>
      </div>
    );
  }
  if (m.role === 'error') {
    return (
      <div className="self-start flex items-end gap-2 max-w-[80%]">
        <div className="h-7 w-7 rounded-full bg-red-100 inline-flex items-center justify-center shrink-0">
          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
        </div>
        <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-2xl rounded-bl-sm border border-red-200 whitespace-pre-wrap">
          {m.text}
        </div>
      </div>
    );
  }
  return (
    <div className="self-start flex items-end gap-2 max-w-[80%]">
      <div className="h-7 w-7 rounded-full bg-indigo-100 inline-flex items-center justify-center shrink-0">
        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
      </div>
      <div className="bg-neutral-100 text-neutral-900 text-sm px-3 py-2 rounded-2xl rounded-bl-sm whitespace-pre-wrap flex flex-col gap-1">
        <div>{m.text}</div>
        {m.createdTicketId && (
          <Link
            href={`/s/${slug}/resident`}
            className="text-xs underline text-neutral-600 hover:text-neutral-800 mt-1 self-start inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View My Issues
          </Link>
        )}
      </div>
    </div>
  );
}
