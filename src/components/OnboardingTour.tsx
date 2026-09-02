"use client";

import { useState, useEffect } from "react";
import { completeOnboarding, getOnboardingStatus } from "../functions/user/dashboard-extras";

interface TourStep {
  title: string;
  content: string;
  icon: string;
}

const steps: TourStep[] = [
  {
    icon: "👋",
    title: "Welcome to Prime Jewellery",
    content: "You're now part of our Gold Investment & Binary MLM platform. Let's take a quick tour to help you get started!",
  },
  {
    icon: "💎",
    title: "Purchase Gold Packages",
    content: "Start by selecting a gold package from the dashboard. Each package activates your account and adds gold to your portfolio.",
  },
  {
    icon: "🌳",
    title: "Build Your Binary Tree",
    content: "Share your referral link (with L or R suffix) to build your team. You earn 5% direct commission on every activation!",
  },
  {
    icon: "🎯",
    title: "Matching Income",
    content: "When both left and right legs have active members, you earn 20% matching income per pair — up to 3 pairs per day!",
  },
  {
    icon: "🏆",
    title: "Earn Awards & Ranks",
    content: "Hit milestones to earn badges, rank up from Bronze to Platinum, and unlock exclusive rewards like bags, phones, and cars!",
  },
  {
    icon: "⭐",
    title: "You're Ready!",
    content: "Explore your dashboard, track your earnings, and start building your team. Good luck on your journey!",
  },
];

export function OnboardingTour() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const { done } = await getOnboardingStatus();
      if (!done) setShow(true);
    } catch {
      // If can't check, show tour
      setShow(true);
    } finally {
      setChecked(true);
    }
  };

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      try {
        await completeOnboarding();
      } catch {}
      setShow(false);
    }
  };

  const handleSkip = async () => {
    try {
      await completeOnboarding();
    } catch {}
    setShow(false);
  };

  if (!checked || !show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-gold/30 bg-cream shadow-2xl">
        {/* Progress */}
        <div className="flex gap-1 px-6 pt-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? "bg-gold" : "bg-gold/20"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <span className="text-5xl">{steps[step].icon}</span>
          <h2 className="mt-4 font-display text-2xl text-emerald">{steps[step].title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-emerald/70">{steps[step].content}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            onClick={handleSkip}
            className="text-[10px] uppercase tracking-widest text-emerald/50 hover:text-emerald"
          >
            Skip Tour
          </button>
          <button
            onClick={handleNext}
            className="bg-emerald px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-cream transition-all hover:bg-emerald/80"
          >
            {step === steps.length - 1 ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
