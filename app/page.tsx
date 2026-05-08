"use client"

import { useState, useEffect, useRef } from "react"
import { StepOneInvest } from "@/components/step-one-invest"
import { StepTwoDetails } from "@/components/step-two-details"
import { StepThreeReview, type ReviewData } from "@/components/step-three-review"
import { FALLBACK_CONFIG, type InvestmentConfig } from "@/lib/investment-utils"

interface Step1Data {
  email: string
  firstName: string
  lastName: string
  phone: string
  utmParams?: Record<string, string>
}

export default function InvestmentPage() {
  const [step, setStep] = useState(1)
  const [config, setConfig] = useState<InvestmentConfig>(FALLBACK_CONFIG)
  const [configLoaded, setConfigLoaded] = useState(false)
  const isFirstRender = useRef(true)
  const [selectedAmount, setSelectedAmount] = useState(0)
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)

  useEffect(() => {
    fetch("/api/deal")
      .then((res) => res.json())
      .then((data) => {
        if (data.config) {
          setConfig(data.config)
          // Don't set selectedAmount - let user choose
        }
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true))
  }, [])

  // Scroll to top when step changes (important for mobile and iframe)
  useEffect(() => {
    // Skip scroll on initial page load
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    
    // Try multiple scroll methods for maximum compatibility
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
    
    // Also notify parent window in case we're in an iframe
    try {
      window.parent?.postMessage({ type: 'scrollToIframe' }, '*')
    } catch {
      // Ignore cross-origin errors
    }
  }, [step])

  // Report height to parent iframe for dynamic resizing
  useEffect(() => {
    const sendHeight = () => {
      const height = document.body.scrollHeight
      window.parent?.postMessage({ type: 'setIframeHeight', height }, '*')
    }
    
    sendHeight()
    const timeout = setTimeout(sendHeight, 100)
    
    const observer = new ResizeObserver(sendHeight)
    observer.observe(document.body)
    
    return () => {
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [step])

  

  const handleContinueFromStepOne = (amount: number, data: Step1Data) => {
    setSelectedAmount(amount)
    setStep1Data(data)
    setStep(2)
  }

  const handleBackToStepOne = () => {
    setStep(1)
  }

  const handleContinueFromStepTwo = (data: ReviewData) => {
    setReviewData(data)
    setStep(3)
  }

  const handleBackToStepTwo = () => {
    setStep(2)
  }

  const handleCompleteInvestment = () => {
    // Investment completed - could show a success page or redirect
    // For now, this is called if no payment URL is returned
  }

  if (!configLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-[#f8231b] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#808080]">Loading deal information...</p>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <StepOneInvest
        initialAmount={selectedAmount > 0 ? selectedAmount : undefined}
        onContinue={handleContinueFromStepOne}
        config={config}
      />
    )
  }

  if (step === 2 && step1Data) {
    return (
      <StepTwoDetails
        initialAmount={selectedAmount}
        investorEmail={step1Data.email}
        investorFirstName={step1Data.firstName}
        investorLastName={step1Data.lastName}
        investorPhone={step1Data.phone}
        utmParams={step1Data.utmParams}
        onBack={handleBackToStepOne}
        onContinue={handleContinueFromStepTwo}
        config={config}
      />
    )
  }

  if (step === 3 && reviewData) {
    return (
      <StepThreeReview
        data={reviewData}
        config={config}
        onBack={handleBackToStepTwo}
        onContinue={handleCompleteInvestment}
      />
    )
  }

  // Fallback - shouldn't reach here
  return null
}
