"use client";

import { useState } from "react";
import Link from "next/link";

const services = [
  { id: "exam", label: "Cleaning & exam", meta: "~45 min · from $120" },
  { id: "filling", label: "Filling or crown", meta: "~60–90 min · from $210" },
  { id: "root", label: "Root canal", meta: "~90 min · from $650" },
  { id: "whitening", label: "Whitening", meta: "~60 min · from $280" },
  { id: "aligners", label: "Invisalign consultation", meta: "~30 min · free" },
  { id: "emergency", label: "I'm in pain — emergency", meta: "Same day if you call before 11am" },
];

const times = ["8:00", "9:30", "11:00", "1:00", "2:30", "4:00"];

type Step = 0 | 1 | 2 | 3;

export default function BookPage() {
  const [step, setStep] = useState<Step>(0);
  const [service, setService] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [done, setDone] = useState(false);

  const next = () => setStep((s) => (s + 1) as Step);
  const back = () => setStep((s) => (s - 1) as Step);

  const canStep1 = service !== null;
  const canStep2 = date !== "" && time !== null;
  const canStep3 =
    form.name.trim() !== "" && form.phone.trim().length >= 7 && form.email.includes("@");

  return (
    <div className="min-h-screen bg-bone">
      <header className="border-b border-line">
        <div className="container-x flex h-[68px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-bone">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 4c-2.5 0-3.2 1.2-4.6 1.2C6 5.2 4.5 6.6 4.5 9.2c0 3.4 1.7 6 2.6 8.6.6 1.7 1 3 2.1 3 1.2 0 1.3-1.6 1.5-3.3.15-1.4.5-2.5 1.3-2.5s1.15 1.1 1.3 2.5c.2 1.7.3 3.3 1.5 3.3 1.1 0 1.5-1.3 2.1-3 .9-2.6 2.6-5.2 2.6-8.6 0-2.6-1.5-4-2.9-4C15.2 5.2 14.5 4 12 4Z" />
              </svg>
            </span>
            <span className="font-display text-[18px] tracking-tight">
              Marlow <span className="text-forest">Dental</span>
            </span>
          </Link>
          <a href="tel:+13125550147" className="text-[13px] text-ink-soft hover:text-forest">
            Or call (312) 555-0147
          </a>
        </div>
      </header>

      <main className="container-x py-14 md:py-20">
        {done ? (
          <div className="mx-auto max-w-xl text-center">
            <p className="eyebrow mb-4">Request received</p>
            <h1 className="text-[40px] leading-[1.05] tracking-[-0.02em] sm:text-[52px]">
              We&rsquo;ll call you
              <br />
              within one business hour.
            </h1>
            <p className="mt-6 text-[15.5px] leading-relaxed text-ink-soft">
              Thanks {form.name.split(" ")[0]}. Someone from the front desk will call{" "}
              {form.phone} to confirm your {service?.replace("-", " ")} on {date} at {time}.
            </p>
            <p className="mt-3 text-[14px] text-ink-soft/80">
              If it's urgent, call (312) 555-0147 and we&rsquo;ll fit you in sooner.
            </p>
            <Link
              href="/"
              className="mt-10 inline-block rounded-full border border-line px-6 py-3 text-[13.5px] text-ink-soft hover:border-forest hover:text-forest"
            >
              Back to homepage
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            {/* Progress */}
            <div className="mb-10">
              <div className="flex items-center gap-3 text-[12px] uppercase tracking-[0.16em] text-ink-soft">
                <span className={step >= 0 ? "text-clay" : ""}>01 Service</span>
                <span className="h-px flex-1 bg-line" />
                <span className={step >= 1 ? "text-clay" : ""}>02 Time</span>
                <span className="h-px flex-1 bg-line" />
                <span className={step >= 2 ? "text-clay" : ""}>03 Your details</span>
                <span className="h-px flex-1 bg-line" />
                <span className={step >= 3 ? "text-clay" : ""}>04 Confirm</span>
              </div>
            </div>

            {step === 0 && (
              <Section
                title="What can we help with?"
                sub="Pick the closest thing. We'll fine-tune it on the call."
              >
                <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {services.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => setService(s.id)}
                        className={`w-full rounded-sm border p-5 text-left transition-all ${
                          service === s.id
                            ? "border-forest bg-forest text-bone"
                            : "border-line bg-cream hover:border-forest/40"
                        }`}
                      >
                        <p className="font-display text-[18px] leading-tight">{s.label}</p>
                        <p
                          className={`mt-1.5 text-[12.5px] ${
                            service === s.id ? "text-bone/70" : "text-ink-soft"
                          }`}
                        >
                          {s.meta}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
                <FooterNav onNext={next} disabled={!canStep1} />
              </Section>
            )}

            {step === 1 && (
              <Section title="Pick a day and time." sub="We'll confirm by phone.">
                <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.16em] text-ink-soft/70">
                      Preferred date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="mt-2 w-full rounded-sm border border-line bg-cream px-4 py-3 text-[15px] outline-none focus:border-forest"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-[0.16em] text-ink-soft/70">
                      Preferred time
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {times.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTime(t)}
                          className={`rounded-sm border py-3 text-[14px] transition-all ${
                            time === t
                              ? "border-forest bg-forest text-bone"
                              : "border-line bg-cream hover:border-forest/40"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <FooterNav onBack={back} onNext={next} disabled={!canStep2} />
              </Section>
            )}

            {step === 2 && (
              <Section title="A few details." sub="So we know who to look for.">
                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field
                    label="Full name"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                    placeholder="Jane Alvarez"
                  />
                  <Field
                    label="Phone"
                    value={form.phone}
                    onChange={(v) => setForm({ ...form, phone: v })}
                    placeholder="(312) 555-0100"
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label="Email"
                      value={form.email}
                      onChange={(v) => setForm({ ...form, email: v })}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] uppercase tracking-[0.16em] text-ink-soft/70">
                      Anything we should know? (optional)
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={3}
                      placeholder="I chipped a tooth on Saturday. Sensitive to cold."
                      className="mt-2 w-full resize-none rounded-sm border border-line bg-cream px-4 py-3 text-[15px] outline-none focus:border-forest"
                    />
                  </div>
                </div>
                <FooterNav onBack={back} onNext={next} disabled={!canStep3} />
              </Section>
            )}

            {step === 3 && (
              <Section title="Look right?" sub="We'll call to confirm within one business hour.">
                <dl className="mt-8 divide-y divide-line border-y border-line">
                  <Row k="Service" v={service?.replace("-", " ") ?? ""} />
                  <Row k="Date" v={date} />
                  <Row k="Time" v={time ?? ""} />
                  <Row k="Name" v={form.name} />
                  <Row k="Phone" v={form.phone} />
                  <Row k="Email" v={form.email} />
                  {form.notes && <Row k="Notes" v={form.notes} />}
                </dl>
                <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <button
                    onClick={back}
                    className="rounded-full border border-line px-6 py-3 text-[13.5px] text-ink-soft hover:border-forest hover:text-forest"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setDone(true)}
                    className="rounded-full bg-forest px-8 py-3.5 text-[14px] font-medium tracking-wide text-bone transition-colors hover:bg-forest-deep"
                  >
                    Request appointment
                  </button>
                </div>
                <p className="mt-5 text-center text-[12.5px] text-ink-soft/70 sm:text-left">
                  No payment required to book. We&rsquo;ll confirm by phone.
                </p>
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- helpers ---------- */

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-[36px] leading-[1.08] tracking-[-0.02em] sm:text-[44px]">
        {title}
      </h1>
      <p className="mt-3 text-[15px] text-ink-soft">{sub}</p>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.16em] text-ink-soft/70">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-sm border border-line bg-cream px-4 py-3 text-[15px] outline-none focus:border-forest"
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <dt className="text-[12.5px] uppercase tracking-[0.14em] text-ink-soft/70">{k}</dt>
      <dd className="text-right text-[15px] text-ink">{v}</dd>
    </div>
  );
}

function FooterNav({
  onBack,
  onNext,
  disabled,
}: {
  onBack?: () => void;
  onNext?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
      {onBack ? (
        <button
          onClick={onBack}
          className="rounded-full border border-line px-6 py-3 text-[13.5px] text-ink-soft hover:border-forest hover:text-forest"
        >
          Back
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onNext}
        disabled={disabled}
        className={`rounded-full px-8 py-3.5 text-[14px] font-medium tracking-wide transition-colors ${
          disabled
            ? "cursor-not-allowed bg-line text-ink-soft/60"
            : "bg-forest text-bone hover:bg-forest-deep"
        }`}
      >
        Continue
      </button>
    </div>
  );
}