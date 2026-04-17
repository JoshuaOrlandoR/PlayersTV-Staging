"use client"

import { Check } from "lucide-react"

interface StepTimelineProps {
  currentStep: 1 | 2 | 3
}

export function StepTimeline({ currentStep }: StepTimelineProps) {
  const steps = [
    { number: 1, label: "Investment" },
    { number: 2, label: "Details" },
    { number: 3, label: "Review" },
  ]

  return (
    <div className="flex items-center justify-between w-full max-w-[280px] md:max-w-xs mx-auto mb-6">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number
        const isActive = currentStep === step.number
        const isLast = index === steps.length - 1

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold transition-all ${
                  isCompleted
                    ? "bg-[#f8231b] text-white"
                    : isActive
                    ? "bg-[#181818] border-2 border-[#f8231b] text-[#f8231b]"
                    : "bg-[#181818] border-2 border-[#444444] text-[#808080]"
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : step.number}
              </div>
              <span
                className={`text-[0.625rem] md:text-xs mt-1 md:mt-1.5 font-medium ${
                  isActive ? "text-white" : isCompleted ? "text-[#f8231b]" : "text-[#808080]"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div className="flex-1 mx-1 md:mx-2">
                <div
                  className={`h-0.5 w-full transition-colors ${
                    isCompleted ? "bg-[#f8231b]" : "bg-[#444444]"
                  }`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
