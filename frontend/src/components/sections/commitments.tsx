"use client";

import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { usePublicContent } from "@/components/providers/public-content-provider";

export function Commitments() {
  const { content } = usePublicContent();

  const promises = content.homepage?.promises || [];

  // A section with no data is not rendered at all
  if (!Array.isArray(promises) || promises.length === 0) {
    return null;
  }

  const eyebrow = content.homepage?.heroEyebrow || "Our Standards";
  const title = "Clinical Standards";

  return (
    <section
      id="commitments"
      className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 py-20 md:py-28"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-4"
          >
            <SectionHeading eyebrow={eyebrow} title={title} />
          </motion.div>

          <div className="lg:col-span-8 space-y-4">
            {promises.map((c, i) => (
              <motion.div
                key={c.num || i}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card surface="bone" shadow="card" className="p-6 sm:p-7">
                  <div className="flex items-start gap-5">
                    <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        {c.num && (
                          <span className="font-mono text-xs font-semibold text-primary">
                            {c.num}
                          </span>
                        )}
                        <h3 className="font-display text-lg text-gray-900 dark:text-white font-normal">
                          {c.title}
                        </h3>
                      </div>
                      {c.subtitle && (
                        <p className="text-xs font-medium text-primary">
                          {c.subtitle}
                        </p>
                      )}
                      <p className="text-xs sm:text-[13px] leading-relaxed text-gray-600 dark:text-gray-400 pt-1">
                        {c.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Commitments;
