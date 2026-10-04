"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Minus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPublicFaqs } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";

const DEFAULT_FAQS = [
  {
    q: "Which dental insurance plans do you accept?",
    a: "We accept and bill most major PPO dental insurance plans. We file electronic claims on your behalf as an in-network or out-of-network provider, allowing you to maximize plan reimbursement. We verify your benefits in advance so you know your exact coverage before arrival.",
  },
  {
    q: "What if I do not have dental insurance?",
    a: "We offer an upfront cash fee schedule that is roughly 20% to 25% lower than standard commercial dental billing. Comprehensive preventive checkup, complete digital X-rays, and cleaning is transparently priced. There are no mandatory annual club fees or enrollment memberships.",
  },
  {
    q: "I have dental anxiety and haven't seen a dentist in years. How do you accommodate nervous patients?",
    a: "You are always in control of your visit. Our clinicians establish a clear hand-raise pause signal before beginning, explain every instrument on screen, and will never lecture or criticize you. Your initial visit can simply be a gentle conversation and an exam with zero drilling.",
  },
  {
    q: "Who performs my dental care and treatment?",
    a: "Our clinical team provides direct continuity. Every diagnostic exam, cleaning, filling, and crown is personally performed by licensed practitioners with dedicated appointment blocks.",
  },
  {
    q: "How do same-day emergency appointments work?",
    a: "We reserve dedicated emergency triage blocks every day for severe toothaches, broken teeth, or dislodged restorations. Call our office before 11:00 AM Monday through Thursday, and we will fit you in that same day.",
  },
  {
    q: "Do you offer financing for larger treatments?",
    a: "Yes. For restorative or aligner treatments exceeding $500, we provide 6-month zero-interest financing through CareCredit. We also extend a 5% bookkeeping adjustment for balances paid in full via cash or check on the date of clinical service.",
  },
];

export function FAQ() {
  const { content, primaryLocation } = usePublicContent();
  const [faqList, setFaqList] = useState<{ q: string; a: string }[]>(DEFAULT_FAQS);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const phone = content.general?.phone || primaryLocation?.phone || "(312) 555-0147";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  const locationName = primaryLocation?.name || "reception desk";

  useEffect(() => {
    getPublicFaqs().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setFaqList(data.map((f) => ({ q: f.question, a: f.answer })));
      }
    });
  }, []);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="faq" className="border-t border-line bg-cream/40 py-20 md:py-28">
      <div className="container-x">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Section Introduction - 4 cols */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-4 space-y-4"
          >
            <SectionHeading
              eyebrow="Common Inquiries"
              title={
                <>
                  Clear answers
                  <br />
                  before you schedule.
                </>
              }
              description={`Have a specific clinical or insurance question not answered here? Call our ${locationName} directly to speak with our front office coordinator.`}
            />

            <div className="pt-2">
              <Button href={`tel:${cleanPhone}`} variant="secondary" size="sm">
                <Phone className="h-3.5 w-3.5 text-forest" />
                <span>Call {phone}</span>
              </Button>
            </div>
          </motion.div>

          {/* FAQ Accordion List - 8 cols */}
          <div className="lg:col-span-8">
            <div className="divide-y divide-line border-y border-line">
              {faqList.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div key={idx} className="py-4 sm:py-5">
                    <button
                      onClick={() => toggle(idx)}
                      className="flex w-full items-start justify-between gap-4 text-left transition-colors hover:text-forest"
                      aria-expanded={isOpen}
                    >
                      <span className="font-display text-[16px] sm:text-[17px] text-ink font-normal leading-snug">
                        {faq.q}
                      </span>
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line bg-bone text-ink-soft">
                        {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </span>
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                        isOpen ? "grid-rows-[1fr] pt-3" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="text-xs sm:text-[14px] leading-relaxed text-ink-soft">
                          {faq.a}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FAQ;
