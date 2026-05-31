import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  LockKeyhole,
  MessageCircle,
  Phone,
  TimerReset,
  Users,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <main className="min-h-screen bg-[#f6f5f1] text-neutral-950">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#26352b] text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <span>SocietyDesk</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup/society" className="gap-1.5">
                Register society
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="border-b border-neutral-200 bg-[#fbfaf7]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[0.95fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
              <ClipboardList className="h-3.5 w-3.5" />
              Maintenance desk for apartments and housing societies
            </div>

            <div className="flex flex-col gap-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-neutral-950 sm:text-5xl">
                A clear place to report, track, and resolve society complaints.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
                Residents raise issues with the right details. Committee members see what is
                open, who is handling it, and what has already been fixed.
              </p>
            </div>

            <div className="grid gap-2 text-sm text-neutral-700 sm:grid-cols-3">
              <ProofPoint value="4" label="Ticket stages" />
              <ProofPoint value="2" label="Role views" />
              <ProofPoint value="1" label="Join code per society" />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup/society" className="gap-2">
                  Create society portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/signup/resident">Join as resident</Link>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-neutral-500" />
                Demo OTP:
                <code className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-neutral-900">
                  123456
                </code>
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-neutral-300 sm:inline-block" />
              <span>No password setup needed for this demo flow.</span>
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section className="border-b border-neutral-200 px-5 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 max-w-2xl">
            <p className="text-sm font-medium text-neutral-500">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold text-neutral-950">
              Designed around the daily work of running a society.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
          <Feature
            icon={<MessageCircle className="h-5 w-5 text-teal-700" />}
            title="Residents raise issues"
            body="They add title, details, category, priority, and location, so the committee does not need to chase for basic information."
          />
          <Feature
            icon={<ClipboardList className="h-5 w-5 text-amber-700" />}
            title="Admins sort the work"
            body="Every ticket appears in a status board: Open, In Progress, Resolved, or Closed."
          />
          <Feature
            icon={<LockKeyhole className="h-5 w-5 text-rose-700" />}
            title="Access stays separated"
            body="Residents see their own tickets. Admins see the society queue and can add internal notes."
          />
          </div>
        </div>
      </section>

      <section className="bg-[#26352b] px-5 py-10 text-white">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold">Set up a demo society in a minute.</h2>
            <p className="mt-1 text-sm text-neutral-300">
              Create the admin account first, then share the generated join code with residents.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/signup/society">Create society</Link>
            </Button>
            <Button asChild variant="ghost" className="bg-white/10 text-white hover:bg-white/15">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50">
        {icon}
      </div>
      <h3 className="font-semibold text-neutral-900">{title}</h3>
      <p className="text-sm text-neutral-600">{body}</p>
    </div>
  );
}

function ProofPoint({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2">
      <div className="text-lg font-semibold text-neutral-950">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

function ProductPreview() {
  const tickets = [
    {
      title: 'Leakage near A-302',
      tag: 'PLUMBING',
      status: 'Open',
      color: 'border-blue-200 bg-blue-50 text-blue-800',
    },
    {
      title: 'Lift stops at 4th floor',
      tag: 'ELEVATOR',
      status: 'In progress',
      color: 'border-amber-200 bg-amber-50 text-amber-800',
    },
    {
      title: 'Basement light not working',
      tag: 'ELECTRICAL',
      status: 'Resolved',
      color: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    },
  ];

  return (
    <div className="rounded-xl border border-neutral-300 bg-white p-3 shadow-sm">
      <div className="rounded-lg bg-[#f1f0ea] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Green Valley Apartments
            </p>
            <h2 className="text-lg font-semibold text-neutral-950">Maintenance queue</h2>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700">
            <TimerReset className="h-3.5 w-3.5" />
            Today
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {['Open', 'In progress', 'Resolved'].map((label, index) => (
            <div key={label} className="rounded-lg border border-neutral-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700">{label}</span>
                <span className="rounded bg-neutral-100 px-1.5 text-xs text-neutral-500">
                  {[5, 3, 4][index]}
                </span>
              </div>
              <div className="space-y-2">
                {tickets.slice(index, index + 1).map((ticket) => (
                  <div key={ticket.title} className="rounded-md border border-neutral-200 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
                      <Wrench className="h-3.5 w-3.5" />
                      {ticket.tag}
                    </div>
                    <p className="text-sm font-medium leading-5 text-neutral-950">
                      {ticket.title}
                    </p>
                    <div
                      className={`mt-3 inline-flex rounded border px-2 py-0.5 text-xs ${ticket.color}`}
                    >
                      {ticket.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-900">
            <Users className="h-4 w-4 text-teal-700" />
            Resident update
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-[0.9fr_1fr]">
            <p className="rounded-md bg-neutral-100 px-3 py-2 text-neutral-700">
              The pipe near A-302 is leaking since morning.
            </p>
            <p className="rounded-md bg-teal-50 px-3 py-2 text-teal-900">
              Filed under Plumbing, high priority, Block A.
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
          Resident reports stay separate from admin-only notes.
        </div>
      </div>
    </div>
  );
}
