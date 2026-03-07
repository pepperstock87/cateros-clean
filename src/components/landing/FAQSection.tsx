"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Can I try it before paying?",
    answer:
      "Absolutely. Every paid plan starts with a 14-day free trial with full access to all features. No credit card required — just sign up and start exploring.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. Cateros is built on Supabase with enterprise-grade Postgres infrastructure. All data is encrypted in transit and at rest, and we never share your information with third parties.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, you can cancel your subscription at any time from your billing settings. There are no long-term contracts or cancellation fees. Your data stays available through the end of your billing period.",
  },
  {
    question: "Does it work on mobile?",
    answer:
      "Yes. Cateros is fully responsive and works on phones, tablets, and desktops. Check event details, review proposals, or update schedules from wherever you are.",
  },
  {
    question: "Can I import my existing data?",
    answer:
      "You can add recipes manually or use our AI assistant to quickly build your cost library. We're also happy to help with bulk imports during onboarding on Pro plans.",
  },
  {
    question: "How do proposals work?",
    answer:
      "Once you price an event, you can generate a professional, branded PDF proposal with one click. Share it via a unique link where your client can review, accept, or request changes — no back-and-forth emails needed.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-6 pb-24">
      <h2 className="text-center font-display text-3xl font-semibold mb-4">
        Frequently asked questions
      </h2>
      <p className="text-center text-[#9c8876] mb-12">
        Everything you need to know about Cateros
      </p>
      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-medium text-sm">{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#9c8876] shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm text-[#9c8876] leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
