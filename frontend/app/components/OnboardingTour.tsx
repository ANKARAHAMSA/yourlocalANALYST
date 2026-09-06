'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FileSpreadsheet,
  Terminal,
  BarChart3,
  Download,
  Sparkles,
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetId: string;
  title: string;
  badge: string;
  description: string;
  position: 'right' | 'top' | 'bottom' | 'left' | 'center';
  icon: React.ComponentType<{ className?: string }>;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'upload',
    targetId: 'tour-upload',
    title: 'Import Business Datasets',
    badge: 'Step 1 of 5',
    description:
      'Drag and drop one or multiple CSV files here (e.g. sales, customers, transactions). Files are loaded directly into an isolated in-memory database with zero cloud disk retention.',
    position: 'right',
    icon: FileSpreadsheet,
  },
  {
    id: 'schema',
    targetId: 'tour-schema',
    title: 'Data Dictionary & Quick Cuts',
    badge: 'Step 2 of 5',
    description:
      'Inspect detected table schemas, column types (numeric, date, text), and sample records. Click any of the recommended analytical angles to run instant pre-built queries.',
    position: 'right',
    icon: BarChart3,
  },
  {
    id: 'command',
    targetId: 'tour-command',
    title: 'Analytical Command Console',
    badge: 'Step 3 of 5',
    description:
      'Type any business query in plain language—such as "Show top 5 revenue categories" or "Monthly sales breakdown". The engine translates your request into verified SQL and executes in milliseconds.',
    position: 'top',
    icon: Terminal,
  },
  {
    id: 'dossier',
    targetId: 'tour-dossier',
    title: 'Interactive Visuals & Dossier',
    badge: 'Step 4 of 5',
    description:
      'Explore executive takeaways, zoomable vector charts, transparent SQL audits with 1-click copy, and full tabular data grids with TSV export.',
    position: 'center',
    icon: Sparkles,
  },
  {
    id: 'export',
    targetId: 'tour-export',
    title: 'One-Click Report Export',
    badge: 'Step 5 of 5',
    description:
      'Export your complete analytical work into an Executive PDF Report for stakeholders, or download a production Jupyter Notebook (.ipynb) for reproducible data science.',
    position: 'bottom',
    icon: Download,
  },
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Calculate target element coordinates for the spotlight
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStep) return;

    if (currentStep.position === 'center') {
      setTargetRect(null);
      return;
    }

    const el = document.getElementById(currentStep.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);
    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [updateTargetRect, currentStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const IconComponent = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto select-none">
      {/* Dark Ambient Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#08090E]/80 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Spotlight Ring around targeted element (if target exists) */}
      {targetRect && (
        <div
          className="absolute transition-all duration-300 pointer-events-none rounded-2xl ring-4 ring-emerald-400 ring-offset-4 ring-offset-[#08090E] shadow-[0_0_50px_rgba(0,210,180,0.35)]"
          style={{
            top: `${Math.max(10, targetRect.top - 6)}px`,
            left: `${Math.max(10, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* Floating Tutorial Card */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-labelledby="tour-heading"
          className="pointer-events-auto w-full max-w-lg glass-panel rounded-3xl p-6 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.7)] bg-[#0F121C]/95 backdrop-blur-2xl transition-all duration-300 animate-in fade-in zoom-in-95"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <IconComponent className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  {currentStep.badge}
                </span>
                <h3 id="tour-heading" className="text-base font-bold text-white tracking-tight">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Tutorial (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Card Body */}
          <div className="py-5">
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {currentStep.description}
            </p>
          </div>

          {/* Step Progress Indicators & Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {/* Step Pills */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? 'w-6 bg-emerald-400'
                      : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                  title={`Go to ${step.title}`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>BACK</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-mono font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/25 transition-all"
              >
                {currentStepIndex === TOUR_STEPS.length - 1 ? (
                  <>
                    <span>FINISH TOUR</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>NEXT</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
