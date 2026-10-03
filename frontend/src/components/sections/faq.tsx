"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Minus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPublicFaqs } from "@/lib/api";

const FAQS = [
  {
    q: "Which dental insurance plans do you accept?",
    a: "We are in-network with Delta Dental PPO, Cigna PPO, MetLife, Guardian, and Aetna. For other PPO policies, we file electronic claims on your behalf as an out-of-network provider, allowing you to receive plan reimbursement directly (usually 50% to 80%). We verify your benefits in advance so you know your exact coverage before arrival.",
  },
  {
    q: "What if I do not have dental insurance?",
    a: "We offer an upfront cash fee schedule that is roughly 20% to 25% lower than standard commercial dental billing. Comprehensive preventive checkup, complete digital X-rays, and cleaning is $140 cash. There are no mandatory annual club fees or enrollment memberships.",
  },
  {
    q: "I have dental anxiety and haven't seen a dentist in years. How do you handle this?",
    a: "You are always in control of your visit. Dr. Marlow establishes a clear hand-raise pause signal before beginning, explains every instrument on screen, and will never lecture or criticize you. Your initial visit can simply be a gentle conversation and an exam with zero drilling.",
  },
  {
    q: "Will I always see Dr. Marlow, or are there associate dentists?",
    a: "You will always see Dr. Marlow. She practices solo with zero overlapping chairs. Every diagnostic exam, cleaning, filling, and crown is personally performed by Dr. Marlow from start to finish.",
  },
  {
    q: "How do same-day emergency appointments work?",
    a: "We reserve dedicated emergency triage blocks every day for severe toothaches, broken teeth, or dislodged crowns. Call our office at (312) 555-0147 before 11:00 AM Monday through Thursday, and we will fit you in that same day.",
  },
  {
    q: "Do you offer financing for larger treatments?",
    a: "Yes. For restorative or aligner treatments exceeding $500, we provide 6-month zero-interest financing through CareCredit. We also extend a 5% bookkeeping adjustment for balances paid in full via cash or check on the date of clinical service.",
  },
  {
    q: "Do you treat children?",
    a: "Yes, from age 3 and up. Dr. Marlow offers gentle, pediatric-friendly visits. Parents remain chairside the entire time, and we never touch a tool to a child's mouth until they are comfortable.",
  },
];

export function FAQ() {
  const [faqList, setFaqList] = useState<{ q: string; a: string }[]>(FAQS);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
              description="Have a specific clinical or insurance question not answered here? Call our Lincoln Park desk directly to speak with our front office coordinator."
            />

            <div className="pt-2">
              <Button href="tel:+13125550147" variant="secondary" size="sm">
                <Phone className="h-3.5 w-3.5 text-forest" />
                <span>Call (312) 555-0147</span>
              </Button>
            </div>
          </motion.div>

          {/* FAQ Accordion List - 8 cols with CSS grid-template-rows animation */}
          <div className="lg:col-span-8">
            <div className="divide-y divide-line border-y border-line">
              {FAQS.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div key={faq.q} className="py-4 sm:py-5">
                    <button
                      onClick={() => toggle(idx)}
                      className="flex w-full items-start justify-between gap-4 text-left transition-colors hover:text-forest focus-visible:outline-none cursor-pointer"
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${idx}`}
                    >
                      <span className="font-display text-[18px] sm:text-[19px] text-ink leading-snug">
                        {faq.q}
                      </span>
                      <span className="mt-1 grid h-6 w-6 place-items-center rounded-full border border-line bg-bone text-ink-soft shrink-0 transition-transform duration-200">
                        {isOpen ? (
                          <Minus className="h-3.5 w-3.5 text-forest" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </button>

                    {/* Smooth height transition via grid-template-rows */}
                    <div
                      id={`faq-answer-${idx}`}
                      className="grid transition-all duration-300 ease-out"
                      style={{
                        gridTemplateRows: isOpen ? "1fr" : "0fr",
                      }}
                    >
                      <div className="overflow-hidden">
                        <p className="pt-3 pr-8 text-[14px] sm:text-[14.5px] leading-relaxed text-ink-soft">
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
