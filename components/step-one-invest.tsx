"use client"

import { useState, useEffect } from "react"
import { StepTimeline } from "@/components/step-timeline"
import {
  FALLBACK_CONFIG,
  calculateInvestment,
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

  const handleContinueClick = () => {
    if (!validateForm()) return

    // Fire dataLayer event
    if (typeof window !== "undefined") {
      (window as Record<string, unknown[]>).dataLayer = (window as Record<string, unknown[]>).dataLayer || []
      ;(window as Record<string, unknown[]>).dataLayer.push({
        event: "step1_complete",
        investmentAmount: amount,
        currency: "USD",
      })
    }

    // Pass data to Step 2 - no API call, profile will be created in Step 2
    onContinue(amount, { email, firstName, lastName, phone, utmParams })
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

  return (
    <div className="min-h-screen flex items-start justify-center px-3 pb-24 md:px-4 md:pb-4 bg-transparent">
      <div className="w-full max-w-[600px]">
        {/* Main Card */}
        <div className="bg-white rounded-xl border-2 border-[#147bc3] p-4 md:p-6 lg:p-8">
          {/* Timeline */}
          <StepTimeline currentStep={1} />

          {/* Title */}
          <h1 className="text-2xl md:text-[1.75rem] font-bold text-center text-black mb-6 leading-tight">
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
                  className={`w-full px-4 py-3 text-[0.9375rem] border rounded-lg bg-[#f5f7fa] text-[#2c3345] placeholder-[#7a8299] focus:outline-none focus:border-[#52b4f9] focus:ring-2 focus:ring-[#52b4f9]/20 ${
                    errors.email ? "border-[#cb3837]" : "border-[#d1d9e6]"
                  }`}
                />
                {checkingEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[#52b4f9] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {errors.email && <p className="text-[#cb3837] text-xs mt-1">{errors.email}</p>}
              
              {/* Existing investments banner */}
              {showExistingBanner && existingInvestments.length > 0 && (
                <div className="mt-2 p-3 bg-[#e8f4fd] border border-[#52b4f9] rounded-lg flex items-center justify-between gap-3">
                  <p className="text-xs text-[#2c3345]">
                    Found {existingInvestments.length} existing investment{existingInvestments.length > 1 ? "s" : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowExistingModal(true)}
                    className="text-xs font-semibold text-[#52b4f9] hover:underline whitespace-nowrap"
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
                className={`w-full px-4 py-3 text-[0.9375rem] border rounded-lg bg-[#f5f7fa] text-[#2c3345] placeholder-[#7a8299] focus:outline-none focus:border-[#52b4f9] focus:ring-2 focus:ring-[#52b4f9]/20 ${
                  errors.firstName ? "border-[#cb3837]" : "border-[#d1d9e6]"
                }`}
              />
              {errors.firstName && <p className="text-[#cb3837] text-xs mt-1">{errors.firstName}</p>}
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
                className={`w-full px-4 py-3 text-[0.9375rem] border rounded-lg bg-[#f5f7fa] text-[#2c3345] placeholder-[#7a8299] focus:outline-none focus:border-[#52b4f9] focus:ring-2 focus:ring-[#52b4f9]/20 ${
                  errors.lastName ? "border-[#cb3837]" : "border-[#d1d9e6]"
                }`}
              />
              {errors.lastName && <p className="text-[#cb3837] text-xs mt-1">{errors.lastName}</p>}
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
                className={`w-full px-4 py-3 text-[0.9375rem] border rounded-lg bg-[#f5f7fa] text-[#2c3345] placeholder-[#7a8299] focus:outline-none focus:border-[#52b4f9] focus:ring-2 focus:ring-[#52b4f9]/20 ${
                  errors.phone ? "border-[#cb3837]" : "border-[#d1d9e6]"
                }`}
              />
              {errors.phone && <p className="text-[#cb3837] text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>

          {/* Investment Section Title */}
          <h2 className="text-lg font-semibold text-center text-[#2c3345] mb-2">
            How much would you like to invest?
          </h2>

          {/* Min Investment & Share Price */}
          <div className="flex flex-col sm:flex-row sm:justify-between text-sm text-[#7a8299] mb-4 gap-1 sm:gap-0 text-center sm:text-left">
            <span>Min. investment {formatCurrency(config.minInvestment, 2)}</span>
            <span>Share price {formatCurrency(config.sharePrice, 2)}</span>
          </div>

          {/* Share Counter Box - only show when amount is selected (not -1 placeholder) */}
          {/* min-h ensures consistent height to prevent layout shift on mobile */}
          <div className="bg-[#f0f4f8] rounded-lg p-3 md:p-4 mb-5 text-center min-h-[72px] md:min-h-[80px] flex items-center justify-center">
            {amount > 0 ? (
              <div className="flex items-center justify-center gap-2 md:gap-3">
                <div>
                  <span className="text-xl md:text-2xl font-bold text-[#52b4f9]">{formatNumber(calculation.baseShares)}</span>
                  <p className="text-sm md:text-base text-[#7a8299]">Shares of iotty</p>
                </div>
                <span className="text-lg md:text-xl text-[#7a8299]">+</span>
                <div>
                  <span className="text-xl md:text-2xl font-bold text-[#52b4f9]">{formatCurrency(calculation.bonusShares * config.sharePrice, 0)}</span>
                  <p className="text-sm md:text-base text-[#52b4f9]">Free Shares</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#7a8299]">Select an investment amount to see your shares</p>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="space-y-3 mb-5">
            {config.presetAmounts.map((preset) => {
              const presetCalc = calculateInvestment(preset, config)
              const isSelected = amount > 0 && Math.abs(amount - preset) < 1 && customAmount === ""
              const hasBonus = presetCalc.bonusPercent > 0

              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`w-full py-3 px-3 md:px-4 rounded-lg text-left transition-all border ${
                    isSelected
                      ? "bg-[#f0f7ff] border-[#52b4f9]"
                      : "bg-white border-[#d1d9e6] hover:border-[#52b4f9]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Left side: Radio + Amount + Shares */}
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                      <div
                        className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "border-[#52b4f9]" : "border-[#d1d9e6]"
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#52b4f9]" />}
                      </div>
                      <div>
                        <div className="text-xs md:text-sm lg:text-base font-semibold text-[#2c3345]">
                          Invest {formatCurrency(preset, 0)}
                        </div>
                        <div className="text-[0.625rem] md:text-[0.6875rem] text-[#7a8299]">
                          {formatNumber(presetCalc.baseShares)} Shares
                        </div>
                      </div>
                    </div>

                    {/* Right side: Bonus pills */}
                    {hasBonus && (
                      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                        <span className="text-[0.6875rem] md:text-sm font-bold py-1 px-4 md:py-2 md:px-6 rounded-md md:rounded-lg bg-[#52b4f9] text-white text-center min-w-[78px] md:min-w-[115px]">
                          +{formatCurrency(presetCalc.bonusShares * config.sharePrice, 0)}<br />
                          <span className="text-[0.5625rem] md:text-xs font-medium">Free Shares</span>
                        </span>
                        <span className="text-[0.6875rem] md:text-sm font-bold py-1 px-4 md:py-2 md:px-6 rounded-md md:rounded-lg bg-[#52b4f9] text-white text-center min-w-[62px] md:min-w-[90px]">
                          {presetCalc.bonusPercent.toFixed(0)}%<br />
                          <span className="text-[0.5625rem] md:text-xs font-medium">Bonus</span>
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Custom Amount Input */}
          <div className="mb-6">
            <div className="flex items-center gap-2 px-4 py-3 border border-[#d1d9e6] rounded-lg bg-[#f5f7fa] focus-within:border-[#52b4f9] focus-within:ring-2 focus-within:ring-[#52b4f9]/20">
              <span className="text-[#7a8299] text-sm">Amount: $</span>
              <input
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="Enter custom amount"
                className="flex-1 bg-transparent text-[0.9375rem] text-[#2c3345] placeholder-[#7a8299] focus:outline-none"
              />
            </div>
            {!isAboveMin && amount > 0 && (
              <p className="text-[#cb3837] text-xs mt-1">
                Minimum investment is {formatCurrency(config.minInvestment, 2)}
              </p>
            )}
          </div>

          {/* Error Messages */}
          {errors.amount && (
            <p className="text-[#cb3837] text-sm mb-3">{errors.amount}</p>
          )}
          {submitError && (
            <p className="text-[#cb3837] text-sm mb-3">{submitError}</p>
          )}



          {/* Continue Button */}
          <button
            type="button"
            onClick={handleContinueClick}
            disabled={!isFormValid}
            className="w-full py-3.5 rounded-lg text-[0.9375rem] font-semibold bg-[#52b4f9] text-white hover:bg-[#3a9fe0] disabled:bg-[#b8c4d4] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            Continue <span>&rarr;</span>
          </button>

          {/* Disclaimer */}
          <p className="text-[0.6875rem] text-[#7a8299] text-center mt-4 leading-relaxed">
            By beginning the investment process, you consent to receive communications via email or SMS regarding updates to this offer, and may unsubscribe from non-transactional emails at any time.
          </p>
        </div>
      </div>

      {/* Existing Investments Modal */}
      {showExistingModal && existingInvestments.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#2c3345]">Existing Investments</h3>
              <button
                type="button"
                onClick={() => setShowExistingModal(false)}
                className="text-[#7a8299] hover:text-[#2c3345] text-xl leading-none"
              >
                &times;
              </button>
            </div>
            
            <p className="text-sm text-[#7a8299] mb-4">
              We found verified investments for {email}. Click one to resume where you left off, or close to start a new investment.
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {existingInvestments.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => handleResumeSelect(inv.id)}
                  disabled={resumeRedirecting !== null}
                  className="w-full p-4 border border-[#d1d9e6] rounded-lg text-left bg-[#f5f7fa] hover:border-[#52b4f9] hover:bg-[#f0f7ff] transition-colors disabled:opacity-50"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-base font-semibold text-[#2c3345]">
                      ${inv.amount?.toLocaleString() || "—"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                      inv.state?.toLowerCase() === "signed" 
                        ? "bg-[#22c55e] text-white" 
                        : inv.state?.toLowerCase() === "waiting"
                        ? "bg-[#f59e0b] text-white"
                        : "bg-[#52b4f9] text-white"
                    }`}>
                      {inv.state === "signed" ? "Documents Signed" : inv.state === "waiting" ? "Awaiting Payment" : inv.state}
                    </span>
                  </div>
                  {(inv.first_name || inv.last_name) && (
                    <p className="text-sm text-[#7a8299]">
                      {inv.first_name} {inv.last_name}
                    </p>
                  )}
                  {inv.shares > 0 && (
                    <p className="text-xs text-[#7a8299] mt-1">
                      {formatNumber(inv.shares)} shares
                    </p>
                  )}
                  {resumeRedirecting === inv.id && (
                    <p className="text-xs text-[#52b4f9] mt-2 flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-[#52b4f9] border-t-transparent rounded-full animate-spin" />
                      Redirecting to checkout...
                    </p>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setShowExistingModal(false)}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-[#52b4f9] hover:bg-[#f0f7ff] transition-colors"
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
