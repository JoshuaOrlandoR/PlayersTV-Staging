"use client"

import { useState, useEffect } from "react"
import { StepTimeline } from "@/components/step-timeline"
import {
  FALLBACK_CONFIG,
  calculateInvestment,
  getNextTierInfo,
  alignToSharePrice,
  formatCurrency,
  formatNumber,
  type InvestmentConfig,
} from "@/lib/investment-utils"

interface Step1Data {
  email: string
  firstName: string
  lastName: string
  phone: string
  utmParams?: Record<string, string>
}

interface ExistingInvestment {
  id: string
  state: string
  amount: number
  shares: number
  first_name?: string
  last_name?: string
}

interface StepOneInvestProps {
  onContinue: (amount: number, data: Step1Data) => void
  initialAmount?: number
  config?: InvestmentConfig
}

export function StepOneInvest({ onContinue, initialAmount, config = FALLBACK_CONFIG }: StepOneInvestProps) {
  // Amount state - use -1 as "no selection" sentinel value (invisible placeholder)
  const [amount, setAmount] = useState(initialAmount && initialAmount > 0 ? initialAmount : -1)
  const [customAmount, setCustomAmount] = useState("")

  // Contact fields
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState("")
  
  // Existing investments (for resume flow)
  const [existingInvestments, setExistingInvestments] = useState<ExistingInvestment[]>([])
  const [showExistingBanner, setShowExistingBanner] = useState(false)
  const [showExistingModal, setShowExistingModal] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailChecked, setEmailChecked] = useState("")
  const [resumeRedirecting, setResumeRedirecting] = useState<string | null>(null)

  // UTM params
  const [utmParams, setUtmParams] = useState<Record<string, string>>({})

  // === WEBFLOW_UPSELL_MODAL: START ===
  const [waitingForModal, setWaitingForModal] = useState(false)
  // === WEBFLOW_UPSELL_MODAL: END ===

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const utm: Record<string, string> = {}
      if (params.get("utm_source")) utm.utm_source = params.get("utm_source")!
      if (params.get("utm_medium")) utm.utm_medium = params.get("utm_medium")!
      if (params.get("utm_campaign")) utm.utm_campaign = params.get("utm_campaign")!
      if (params.get("utm_content")) utm.utm_content = params.get("utm_content")!
      if (params.get("utm_term")) utm.utm_term = params.get("utm_term")!
      setUtmParams(utm)
    }
  }, [])

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  // Check for existing investments on email blur
  const handleEmailBlur = async () => {
    const trimmedEmail = email.trim()
    
    // Only check if email is valid and hasn't been checked already
    if (!isValidEmail(trimmedEmail) || trimmedEmail === emailChecked) {
      return
    }

    setCheckingEmail(true)
    setShowExistingBanner(false)
    setExistingInvestments([])

    try {
      const res = await fetch("/api/investor/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      })

      const data = await res.json()
      setEmailChecked(trimmedEmail)

      if (res.ok && data.investments && data.investments.length > 0) {
        setExistingInvestments(data.investments)
        setShowExistingBanner(true)
      }
    } catch {
      // Silently fail - not critical
    } finally {
      setCheckingEmail(false)
    }
  }

  const calculation = calculateInvestment(amount, config)
  const isAboveMin = amount >= config.minInvestment
  const isBelowMax = !config.maxInvestment || amount <= config.maxInvestment
  const isValidAmount = isAboveMin && isBelowMax

  // Form is valid only when a real amount is selected (not -1 placeholder)
  const hasRealSelection = amount > 0
  
  const isFormValid =
    hasRealSelection &&
    isValidAmount &&
    email.trim() !== "" &&
    isValidEmail(email) &&
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    phone.trim() !== ""

  const handleCustomAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, "")
    setCustomAmount(cleanValue)
    const numValue = parseFloat(cleanValue) || 0
    if (numValue > 0) {
      const aligned = alignToSharePrice(numValue, config.sharePrice)
      setAmount(aligned)
    } else {
      setAmount(-1) // Reset to placeholder
    }
  }

  const handlePresetClick = (presetAmount: number) => {
    setAmount(presetAmount)
    setCustomAmount("")
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!isValidEmail(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required"
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required"
    }

    if (!hasRealSelection) {
      newErrors.amount = "Please select an investment amount"
    } else if (!isValidAmount) {
      newErrors.amount = `Investment must be between ${formatCurrency(config.minInvestment, 2)} and ${config.maxInvestment ? formatCurrency(config.maxInvestment, 0) : "unlimited"}`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // === WEBFLOW_UPSELL_MODAL: START ===
  // Actual continue function that proceeds to step 2
  const proceedToStep2 = async (finalAmount: number) => {
    // Fire dataLayer event
    if (typeof window !== "undefined") {
      (window as Record<string, unknown[]>).dataLayer = (window as Record<string, unknown[]>).dataLayer || []
      ;(window as Record<string, unknown[]>).dataLayer.push({
        event: "step1_complete",
        investmentAmount: finalAmount,
        currency: "USD",
      })
    }

    setWaitingForModal(false)
    
    // === EARLY_CAPTURE: START ===
    // Capture the lead early by creating investor profile and investor record
    let investorId: number | undefined
    let profileId: number | undefined
    
    try {
      const captureResponse = await fetch("/api/investor/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          phone,
          investmentAmount: finalAmount,
          ...utmParams,
        }),
      })
      
      if (captureResponse.ok) {
        const captureData = await captureResponse.json()
        if (captureData.investorId) {
          investorId = captureData.investorId
          profileId = captureData.profileId
        }
      }
    } catch {
      // Early capture is best-effort - continue even if it fails
    }
    // === EARLY_CAPTURE: END ===
    
    // Pass data to Step 2
    onContinue(finalAmount, { email, firstName, lastName, phone, utmParams, investorId, profileId })
  }

  // Listen for messages from parent window (Webflow upsell modal)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, amount: upgradeAmount } = event.data || {}
      
      // Only process if we're waiting for modal response
      if (!waitingForModal) return
      
      if (type === 'UPGRADE_AND_CONTINUE') {
        // User chose to upgrade - update amount and continue to step 2
        const finalAmount = (upgradeAmount && typeof upgradeAmount === 'number') ? upgradeAmount : amount
        setAmount(finalAmount)
        setCustomAmount("")
        proceedToStep2(finalAmount)
      }
      
      if (type === 'CONTINUE_WITHOUT_UPGRADE') {
        // User declined upgrade - continue with current amount
        proceedToStep2(amount)
      }
      
      if (type === 'MODAL_DISMISSED') {
        // User clicked X or backdrop - just reset state, don't proceed
        setWaitingForModal(false)
      }
    }
    
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [waitingForModal, amount, email, firstName, lastName, phone, utmParams])
  // === WEBFLOW_UPSELL_MODAL: END ===

  const handleContinueClick = () => {
    if (!validateForm()) return

    // === WEBFLOW_UPSELL_MODAL: START ===
    // Check if there's a next tier - if so, show upsell modal
    const nextTier = getNextTierInfo(amount, config)
    
    if (nextTier) {
      // Broadcast to modal and wait for response
      setWaitingForModal(true)
      broadcastInvestmentSelection(amount)
      return // Don't proceed - wait for modal response
    }
    // === WEBFLOW_UPSELL_MODAL: END ===

    // No upsell available, proceed directly
    proceedToStep2(amount)
  }

  const handleResumeSelect = async (investorId: string) => {
    setResumeRedirecting(investorId)
    try {
      const res = await fetch(`/api/investor/resume/${investorId}`)
      const data = await res.json()
      if (data.accessLink) {
        try {
          window.top!.location.href = data.accessLink
        } catch {
          window.location.href = data.accessLink
        }
      } else {
        setSubmitError("Unable to get access link. Please try again.")
        setResumeRedirecting(null)
      }
    } catch {
      setSubmitError("Unable to resume. Please try again.")
      setResumeRedirecting(null)
    }
  }

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // === WEBFLOW_UPSELL_MODAL: START ===
  // Broadcasts investment selection to parent window for upsell modal
  const broadcastInvestmentSelection = (selectedAmount: number) => {
    const currentCalc = calculateInvestment(selectedAmount, config)
    const nextTier = getNextTierInfo(selectedAmount, config)
    
    // Only broadcast if there's a higher tier available
    if (!nextTier) return
    
    const nextTierCalc = calculateInvestment(nextTier.threshold, config)
    
    const payload = {
      type: 'INVESTMENT_SELECTED',
      
      // Current selection
      currentAmount: selectedAmount,
      currentBaseShares: currentCalc.baseShares,
      currentBonusShares: currentCalc.bonusShares,
      currentTotalShares: currentCalc.totalShares,
      currentBonusPercent: currentCalc.bonusPercent,
      effectiveSharePriceCurrent: currentCalc.effectiveSharePrice,
      
      // Next tier (upgrade option)
      nextTierAmount: nextTier.threshold,
      nextTierBaseShares: nextTierCalc.baseShares,
      nextTierBonusShares: nextTierCalc.bonusShares,
      nextTierTotalShares: nextTierCalc.totalShares,
      nextTierBonusPercent: nextTierCalc.bonusPercent,
      effectiveSharePriceUpgrade: nextTierCalc.effectiveSharePrice,
      
      // Calculated differences
      additionalCost: nextTier.threshold - selectedAmount,
      additionalShares: nextTierCalc.totalShares - currentCalc.totalShares,
      additionalSharesValue: (nextTierCalc.totalShares - currentCalc.totalShares) * config.sharePrice,
      additionalBonusShares: nextTierCalc.bonusShares - currentCalc.bonusShares,
      additionalBonusSharesValue: (nextTierCalc.bonusShares - currentCalc.bonusShares) * config.sharePrice,
    }
    
    try {
      window.parent?.postMessage(payload, '*')
    } catch {
      // Ignore cross-origin errors
    }
  }
  // === WEBFLOW_UPSELL_MODAL: END ===

  return (
    <div className="min-h-screen flex items-start justify-start pb-24 md:pb-4 bg-transparent">
      <div className="w-full max-w-[600px]">
        {/* Main Card */}
        <div className="bg-[#181818] rounded-xl border-2 border-[#f8231b] p-4 md:p-6 lg:p-8">
          {/* Timeline */}
          <StepTimeline currentStep={1} />

          {/* Title */}
          <h1 className="text-[1.625rem] md:text-[2rem] font-bold text-center text-white mb-6 leading-tight">
            Begin Your Investment
          </h1>

          {/* Contact Fields */}
          <div className="space-y-4 mb-6">
            {/* Email */}
            <div>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearError("email")
                    // Reset banner if email changes
                    if (e.target.value !== emailChecked) {
                      setShowExistingBanner(false)
                    }
                  }}
                  onBlur={handleEmailBlur}
                  placeholder="Email"
                  className={`w-full px-4 py-4 text-base md:text-lg border rounded-lg bg-[#242424] text-white placeholder-[#808080] focus:outline-none focus:border-[#f8231b] focus:ring-2 focus:ring-[#f8231b]/20 ${
                    errors.email ? "border-[#ff4444]" : "border-[#333333]"
                  }`}
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#f8231b] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {errors.email && <p className="text-[#ff4444] text-xs mt-1">{errors.email}</p>}
              
              {/* Existing investments banner */}
              {showExistingBanner && existingInvestments.length > 0 && (
                <div className="mt-2 p-3 bg-[#2a1515] border border-[#f8231b] rounded-lg flex items-center justify-between gap-3">
                  <p className="text-xs text-white">
                    Found {existingInvestments.length} existing investment{existingInvestments.length > 1 ? "s" : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowExistingModal(true)}
                    className="text-xs font-semibold text-[#f8231b] hover:underline whitespace-nowrap"
                  >
                    View
                  </button>
                </div>
              )}
            </div>

            {/* First Name */}
            <div>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value)
                  clearError("firstName")
                }}
                placeholder="First Name"
                className={`w-full px-4 py-4 text-base md:text-lg border rounded-lg bg-[#242424] text-white placeholder-[#808080] focus:outline-none focus:border-[#f8231b] focus:ring-2 focus:ring-[#f8231b]/20 ${
                  errors.firstName ? "border-[#ff4444]" : "border-[#333333]"
                }`}
              />
              {errors.firstName && <p className="text-[#ff4444] text-xs mt-1">{errors.firstName}</p>}
            </div>

            {/* Last Name */}
            <div>
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value)
                  clearError("lastName")
                }}
                placeholder="Last Name"
                className={`w-full px-4 py-4 text-base md:text-lg border rounded-lg bg-[#242424] text-white placeholder-[#808080] focus:outline-none focus:border-[#f8231b] focus:ring-2 focus:ring-[#f8231b]/20 ${
                  errors.lastName ? "border-[#ff4444]" : "border-[#333333]"
                }`}
              />
              {errors.lastName && <p className="text-[#ff4444] text-xs mt-1">{errors.lastName}</p>}
            </div>

            {/* Phone */}
            <div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  clearError("phone")
                }}
                placeholder="Phone number"
                className={`w-full px-4 py-4 text-base md:text-lg border rounded-lg bg-[#242424] text-white placeholder-[#808080] focus:outline-none focus:border-[#f8231b] focus:ring-2 focus:ring-[#f8231b]/20 ${
                  errors.phone ? "border-[#ff4444]" : "border-[#333333]"
                }`}
              />
              {errors.phone && <p className="text-[#ff4444] text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Investment Section Title */}
          <h2 className="text-xl md:text-[1.375rem] font-semibold text-center text-white mb-2">
            How much would you like to invest?
          </h2>

          {/* Min Investment & Share Price */}
          <div className="flex flex-col sm:flex-row sm:justify-between text-[0.9375rem] text-[#808080] mb-4 gap-1 sm:gap-0 text-center sm:text-left">
            <span>Min. investment {formatCurrency(config.minInvestment, 2)}</span>
            <span>Share price {formatCurrency(config.sharePrice, 2)}</span>
          </div>

          {/* Share Counter Box - only show when amount is selected (not -1 placeholder) */}
          {/* min-h ensures consistent height to prevent layout shift on mobile */}
          <div className="bg-[#242424] rounded-lg p-3 md:p-4 mb-5 text-center min-h-[72px] md:min-h-[80px] flex items-center justify-center">
            {amount > 0 ? (
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <div>
                  <span className="text-xl md:text-2xl font-bold text-[#f8231b]">{formatNumber(calculation.baseShares)}</span>
                  <p className="text-sm md:text-base text-[#808080]">Shares</p>
                </div>
                <span className="text-lg md:text-xl text-[#808080]">+</span>
                <div>
                  <span className="text-xl md:text-2xl font-bold text-[#f8231b]">{formatCurrency(calculation.bonusShares * config.sharePrice, 0)}</span>
                  <p className="text-sm md:text-base text-[#f8231b]">Free Shares</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#808080]">Select an investment amount to see your shares</p>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="space-y-3 mb-5">
            {config.presetAmounts.map((preset) => {
              const presetCalc = calculateInvestment(preset, config)
              const isSelected = amount > 0 && Math.abs(amount - preset) < 1 && customAmount === ""
              const hasBonus = presetCalc.bonusPercent > 0
              const isMostPopular = preset === 10000

              return (
                <div key={preset} className="relative">
                  {/* Most Popular Badge */}
                  {isMostPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-[#f8231b] text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handlePresetClick(preset)}
                    className={`w-full py-5 px-4 md:px-5 rounded-lg text-left transition-all border ${
                      isMostPopular
                        ? isSelected
                          ? "bg-[#2a1515] border-[#f8231b] border-2 ring-2 ring-[#f8231b]/30"
                          : "bg-[#1f1a1a] border-[#f8231b] border-2 hover:bg-[#2a1515]"
                        : isSelected
                          ? "bg-[#2a1515] border-[#f8231b]"
                          : "bg-[#242424] border-[#333333] hover:border-[#f8231b]"
                    }`}
                  >
                  <div className="flex items-center justify-between gap-2">
                    {/* Left side: Radio + Amount + Shares */}
                    <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                      <div
                        className={`w-6 h-6 md:w-7 md:h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "border-[#f8231b]" : "border-[#444444]"
                        }`}
                      >
                        {isSelected && <div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-[#f8231b]" />}
                      </div>
                      <div>
                        <div className="text-base md:text-lg lg:text-xl font-semibold text-white">
                          Invest {formatCurrency(preset, 0)}
                        </div>
                        <div className="text-sm md:text-base text-[#808080]">
                          {formatNumber(presetCalc.baseShares)} Shares
                        </div>
                      </div>
                    </div>

                    {/* Right side: Bonus pills */}
                    {hasBonus && (
                      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                        <span className="text-sm md:text-base font-bold py-2 px-4 md:py-3 md:px-6 rounded-md md:rounded-lg bg-[#0d3320] text-[#1DB954] text-center min-w-[85px] md:min-w-[120px]">
                          +{formatCurrency(presetCalc.bonusShares * config.sharePrice, 0)}<br />
                          <span className="text-[0.6875rem] md:text-sm font-medium">Free Shares</span>
                        </span>
                        <span className="text-sm md:text-base font-bold py-2 px-4 md:py-3 md:px-6 rounded-md md:rounded-lg bg-[#8a0000] text-white text-center min-w-[68px] md:min-w-[95px]">
                          {presetCalc.bonusPercent.toFixed(0)}%<br />
                          <span className="text-[0.6875rem] md:text-sm font-medium">Bonus</span>
                        </span>
                      </div>
                    )}
                  </div>
                </button>
                </div>
              )
            })}
          </div>

          {/* Custom Amount Input */}
          <div className="mb-6">
            <div className="flex items-center gap-2 px-4 py-4 border border-[#333333] rounded-lg bg-[#242424] focus-within:border-[#f8231b] focus-within:ring-2 focus-within:ring-[#f8231b]/20">
              <span className="text-[#808080] text-base md:text-lg">Amount: $</span>
              <input
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="Enter custom amount"
                className="flex-1 bg-transparent text-base md:text-lg text-white placeholder-[#808080] focus:outline-none"
              />
            </div>
            {!isAboveMin && amount > 0 && (
              <p className="text-[#ff4444] text-xs mt-1">
                Minimum investment is {formatCurrency(config.minInvestment, 2)}
              </p>
            )}
          </div>

          {/* Error Messages */}
          {errors.amount && (
            <p className="text-[#ff4444] text-sm mb-3">{errors.amount}</p>
          )}
          {submitError && (
            <p className="text-[#ff4444] text-sm mb-3">{submitError}</p>
          )}



          {/* Continue Button */}
          <button
            type="button"
            onClick={handleContinueClick}
            disabled={!isFormValid}
            className="w-full py-4 md:py-5 rounded-lg text-base md:text-lg font-semibold bg-[#f8231b] text-white hover:bg-[#d91e17] disabled:bg-[#4a4a4a] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            Continue <span>&rarr;</span>
          </button>

          {/* Disclaimer */}
          <p className="text-xs text-[#808080] text-center mt-4 leading-relaxed">
            By beginning the investment process, you consent to receive communications via email or SMS regarding updates to this offer, and may unsubscribe from non-transactional emails at any time.
          </p>
        </div>
      </div>

      {/* Existing Investments Modal */}
      {showExistingModal && existingInvestments.length > 0 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#181818] border border-[#f8231b] rounded-xl w-full max-w-md p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Existing Investments</h3>
              <button
                type="button"
                onClick={() => setShowExistingModal(false)}
                className="text-[#808080] hover:text-white text-xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <p className="text-sm text-[#808080] mb-4">
              We found verified investments for {email}. Click one to resume where you left off, or close to start a new investment.
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {existingInvestments.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => handleResumeSelect(inv.id)}
                  disabled={resumeRedirecting !== null}
                  className="w-full p-4 border border-[#333333] rounded-lg text-left bg-[#242424] hover:border-[#f8231b] hover:bg-[#2a1515] transition-colors disabled:opacity-50"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-base font-semibold text-white">
                      ${inv.amount?.toLocaleString() || "—"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                      inv.state?.toLowerCase() === "signed" 
                        ? "bg-[#22c55e] text-white" 
                        : inv.state?.toLowerCase() === "waiting"
                        ? "bg-[#f59e0b] text-white"
                        : "bg-[#f8231b] text-white"
                    }`}>
                      {inv.state === "signed" ? "Documents Signed" : inv.state === "waiting" ? "Awaiting Payment" : inv.state}
                    </span>
                  </div>
                  {(inv.first_name || inv.last_name) && (
                    <p className="text-sm text-[#808080]">
                      {inv.first_name} {inv.last_name}
                    </p>
                  )}
                  {inv.shares > 0 && (
                    <p className="text-xs text-[#808080] mt-1">
                      {formatNumber(inv.shares)} shares
                    </p>
                  )}
                  {resumeRedirecting === inv.id && (
                    <p className="text-xs text-[#f8231b] mt-2 flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-[#f8231b] border-t-transparent rounded-full animate-spin" />
                      Redirecting to checkout...
                    </p>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#333333]">
              <button
                type="button"
                onClick={() => setShowExistingModal(false)}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-[#f8231b] hover:bg-[#2a1515] transition-colors"
              >
                Close and start a new investment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
