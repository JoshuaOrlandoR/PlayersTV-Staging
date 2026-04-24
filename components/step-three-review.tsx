"use client"

import { useState } from "react"
import { User, Mail, Phone, Building, MapPin, Calendar, DollarSign, BarChart3, ArrowRight } from "lucide-react"
import { StepTimeline } from "@/components/step-timeline"
import {
  FALLBACK_CONFIG,
  calculateInvestment,
  formatCurrency,
  formatNumber,
  type InvestmentConfig,
} from "@/lib/investment-utils"

export interface ReviewData {
  // Account details
  firstName: string
  lastName: string
  email: string
  phone: string
  investorType: string
  // Personal information
  streetAddress: string
  unit?: string
  city: string
  postalCode: string
  country: string
  countryCode?: string
  state: string
  dateOfBirth: string
  ssn?: string
  // Type-specific
  jointFirstName?: string
  jointLastName?: string
  entityName?: string // For corporation, trust, llc, partnership
  corporationName?: string // Legacy support
  trustName?: string // Legacy support
  // Investment
  investmentAmount: number
  investorId: number
}

interface StepThreeReviewProps {
  data: ReviewData
  config?: InvestmentConfig
  onBack: () => void
  onContinue: () => void
}

export function StepThreeReview({ data, config = FALLBACK_CONFIG, onBack, onContinue }: StepThreeReviewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const calculation = calculateInvestment(data.investmentAmount, config)
  const totalShares = calculation.baseShares + calculation.bonusShares

  // Format address
  const formatAddress = () => {
    const parts = [
      data.streetAddress,
      data.unit,
      data.city,
      data.state,
      data.postalCode,
      data.country,
    ].filter(Boolean)
    return parts.join(", ")
  }

  // Format date of birth from MM/DD/YYYY to readable format
  const formatDateOfBirth = (dob: string) => {
    if (!dob) return "—"
    // Parse MM/DD/YYYY format
    const parts = dob.split("/")
    if (parts.length !== 3) return dob
    const [month, day, year] = parts.map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }

  // Get investor type display label
  const getInvestorTypeLabel = () => {
    switch (data.investorType) {
      case "joint": return "Joint"
      case "corporation": return "Corporation"
      case "trust": return "Trust"
      case "ira": return "IRA"
      case "llc": return "LLC"
      case "partnership": return "Partnership"
      default: return "Individual"
    }
  }

  const handleSubmit = async () => {
    setSubmitError("")
    setIsSubmitting(true)

    try {
      const res = await fetch("/api/investor/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId: data.investorId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phone,
          investorType: data.investorType,
          streetAddress: data.streetAddress,
          unit: data.unit,
          city: data.city,
          postalCode: data.postalCode,
          country: data.countryCode || data.country,
          state: data.state,
          dateOfBirth: data.dateOfBirth,
          ssn: data.ssn,
          ...(data.investorType === "joint" && { jointFirstName: data.jointFirstName, jointLastName: data.jointLastName }),
          ...(["corporation", "trust", "llc", "partnership"].includes(data.investorType) && { 
            entityName: data.entityName,
            corporationName: data.entityName, // Legacy field support
            trustName: data.entityName, // Legacy field support
          }),
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        // Handle error - could be string or object with field errors
        let errorMessage = "Failed to complete investment. Please try again."
        if (typeof result.error === "string") {
          errorMessage = result.error
        } else if (typeof result.error === "object" && result.error !== null) {
          // Extract first error message from object like {taxpayer_id: ["invalid format"]}
          const firstKey = Object.keys(result.error)[0]
          const firstError = result.error[firstKey]
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = `${firstKey.replace(/_/g, " ")}: ${firstError[0]}`
          } else if (typeof firstError === "string") {
            errorMessage = `${firstKey.replace(/_/g, " ")}: ${firstError}`
          }
        }
        setSubmitError(errorMessage)
      } else {
        if (result.paymentUrl) {
          // Redirect to DealMaker's hosted payment page (break out of iframe if embedded)
          try {
            window.top!.location.href = result.paymentUrl
          } catch {
            // Fallback if cross-origin restrictions block window.top access
            window.location.href = result.paymentUrl
          }
        } else {
          // Payment URL not available, trigger callback
          onContinue()
        }
      }
    } catch {
      setSubmitError("Network error. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-3 pb-4 md:px-4 md:pb-8 bg-transparent">
      <div className="w-full max-w-[600px]">
        {/* Main Card */}
        <div className="bg-[#181818] rounded-2xl md:rounded-3xl overflow-hidden shadow-sm border border-[#f8231b]">
          <div className="p-4 md:p-6">
            {/* Timeline */}
            <StepTimeline currentStep={3} />

            {/* Title */}
            <h1 className="text-[1.375rem] md:text-[1.75rem] font-bold text-white text-center mt-6 mb-2">
              Investor Confirmation
            </h1>
            <p className="text-[0.9375rem] text-[#808080] text-center mb-6">
              Please review your details before proceeding.
            </p>

            {/* Account Details Section */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[#808080] uppercase tracking-wide mb-3">
                Account Details
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-[#808080] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#808080]">Name</p>
                    <p className="text-[0.9375rem] font-medium text-white">{data.firstName} {data.lastName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#808080] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#808080]">Email</p>
                    <p className="text-[0.9375rem] font-medium text-white">{data.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#808080] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#808080]">Phone</p>
                    <p className="text-[0.9375rem] font-medium text-white">{data.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-[#808080] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#808080]">Investor Type</p>
                    <p className="text-[0.9375rem] font-medium text-white">{getInvestorTypeLabel()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[#808080] uppercase tracking-wide mb-3">
                Personal Information
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-[#808080] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#808080]">Full Name</p>
                    <p className="text-[0.9375rem] font-medium text-white">{data.firstName} {data.lastName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#808080] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#808080]">Address</p>
                    <p className="text-[0.9375rem] font-medium text-white break-words">{formatAddress()}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#808080] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#808080]">Phone</p>
                    <p className="text-[0.9375rem] font-medium text-white">{data.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-[#808080] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#808080]">Date of Birth</p>
                    <p className="text-[0.9375rem] font-medium text-white">{formatDateOfBirth(data.dateOfBirth)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Investment Details Section */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-[#808080] uppercase tracking-wide mb-3">
                Investment Details
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-4 h-4 text-[#808080] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#808080]">Investment Amount</p>
                    <p className="text-[0.9375rem] font-medium text-white">{formatCurrency(data.investmentAmount, 2)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-4 h-4 text-[#808080] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#808080]">Shares</p>
                    <p className="text-[0.9375rem] font-medium text-white">
                      {formatNumber(calculation.baseShares)} shares
                      {calculation.bonusShares > 0 && (
                        <span className="text-[#f8231b] ml-1">+ {formatNumber(calculation.bonusShares)} bonus</span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="border-t border-[#333333] my-2" />
                
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-4 h-4 text-[#f8231b] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#808080]">Total Shares</p>
                    <p className="text-[0.9375rem] font-bold text-white">{formatNumber(totalShares)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[0.8125rem] text-[#808080] text-center mb-4 leading-relaxed">
              By clicking the button below, your investment details will be submitted to our processing partner. You will then receive instructions via email to complete document signing and payment.
            </p>

            {/* Error message */}
            {submitError && (
              <div className="bg-[#2a1515] border border-[#ff4444] rounded-lg p-3 mb-4">
                <p className="text-sm text-[#ff4444]">{submitError}</p>
              </div>
            )}

            {/* Continue Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl text-base font-semibold bg-[#f8231b] text-white hover:bg-[#d91e17] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Processing..." : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Back link */}
            <button
              type="button"
              onClick={onBack}
              className="w-full mt-3 py-2 text-[0.9375rem] text-[#808080] hover:text-white transition-colors"
            >
              Go Back to Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
