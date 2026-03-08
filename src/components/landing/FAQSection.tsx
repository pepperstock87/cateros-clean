"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is Cateros?",
    answer:
      "Cateros is an event operations platform that connects caterers, venues, clients, and vendors in one unified system. From pricing and proposals to staffing and production — everything lives in one place.",
  },
  {
    question: "Who is Cateros for?",
    answer:
      "Cateros is built for the full event industry — catering companies, venues, event planners, and third-party vendors. Whether you run a boutique catering business or manage a large venue operation, Cateros scales with you.",
  },
  {
    question: "Can I try it before paying?",
    answer:
      "Absolutely. Every paid plan starts with a 14-day free trial with full access to all features. No credit card required — just sign up and start exploring.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. Cateros is built on enterprise-grade infrastructure with encrypted data in transit and at rest. We never share your information with third parties.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, you can cancel your subscription at any time from your billing settings. There are no long-term contracts or cancellation fees. Your data stays available through the end of your billing period.",
  },
  {
    question: "How do proposals and client approvals work?",
    answer:
      "Once you price an event, generate a professional, branded proposal with one click. Share it via a unique link where your client can review, approve, sign contracts, and make payments — no back-and-forth emails needed.",
  },
  {
    question: "Does Cateros work on mobile?",
    answer:
      "Yes. Cateros is fully responsive and works on phones, tablets, and desktops. Check event details, review proposals, or update schedules from wherever you are.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-6 pb-28">
      <h2 className="text-center font-display text-3xl md:text-4xl font-semibold mb-4">
        Frequently asked questions
      </h2>
      <p className="text-center text-[#D4A373] mb-12">
        Everything you need to know about the Cateros Event Engine
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
                  className={`w-4 h-4 text-[#D4A373] shrink-0 transition-transform duration-200 ${
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
                  <p className="px-5 pb-5 text-sm text-[#D4A373] leading-relaxed">
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
