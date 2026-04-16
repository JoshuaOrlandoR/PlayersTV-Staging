"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowUpDown } from "lucide-react"
import {
  INVESTMENT_CONFIG,
  calculateInvestment,
  formatCurrency,
  formatNumber,
} from "@/lib/investment-utils"

interface InvestmentSelectionStepProps {
  selectedAmount: number
  onAmountChange: (amount: number) => void
  onContinue: () => void
}

export function InvestmentSelectionStep({
  selectedAmount,
  onAmountChange,
  onContinue,
}: InvestmentSelectionStepProps) {
  const [customAmount, setCustomAmount] = useState("")
  const [isCustom, setIsCustom] = useState(false)
  const [inputMode, setInputMode] = useState<"dollars" | "shares">("dollars")

  const handlePresetClick = (amount: number) => {
    setIsCustom(false)
    setCustomAmount("")
    onAmountChange(amount)
  }

  const handleCustomChange = (value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, "")
    setCustomAmount(numericValue)
    setIsCustom(true)

    const parsed = parseFloat(numericValue)
    if (!isNaN(parsed)) {
      if (inputMode === "dollars") {
        if (parsed >= INVESTMENT_CONFIG.minInvestment) {
          onAmountChange(parsed)
        }
      } else {
        // Convert shares to dollars
        const dollarsFromShares = parsed * INVESTMENT_CONFIG.sharePrice
        if (dollarsFromShares >= INVESTMENT_CONFIG.minInvestment) {
          onAmountChange(dollarsFromShares)
        }
      }
    }
  }

  const toggleInputMode = () => {
    setInputMode(inputMode === "dollars" ? "shares" : "dollars")
    setCustomAmount("")
  }

  const currentCalc = calculateInvestment(selectedAmount)

  // Display value in input based on mode
  const getDisplayValue = () => {
    if (customAmount) return customAmount
    if (inputMode === "dollars") {
      return selectedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return currentCalc.baseShares.toLocaleString()
  }

  return (
    <div className="w-full max-w-md">
      {/* Light theme card for Step 1 */}
      <div className="rounded-2xl bg-white p-8 shadow-2xl border border-gray-100">
        <h2 className="text-2xl font-semibold text-center text-gray-900 mb-8">
          How much would you like<br />to invest?
        </h2>

        {/* Custom input with toggle */}
        <div className="mb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center px-4 py-3 rounded-lg border border-gray-200 bg-white">
              {inputMode === "dollars" && (
                <span className="text-gray-900 font-medium mr-1">$</span>
              )}
              <Input
                type="text"
                placeholder={getDisplayValue()}
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                className="flex-1 bg-transparent border-0 text-lg font-medium text-gray-900 placeholder:text-gray-900 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
              />
              {inputMode === "shares" && (
                <span className="text-gray-500 text-sm ml-1">shares</span>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleInputMode}
              className="h-12 w-12 bg-[#e07850] hover:bg-[#d06840] border-[#e07850] text-white hover:text-white"
            >
              <ArrowUpDown className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Shares conversion display */}
        <div className="mb-1">
          <span className="text-gray-500">
            = {formatNumber(currentCalc.baseShares)} Common Stock
          </span>
        </div>

        {/* Minimum investment note */}
        <p className="text-sm text-gray-400 mb-8">
          Minimum investment {formatCurrency(INVESTMENT_CONFIG.minInvestment)}
        </p>

        {/* Preset buttons - coral/salmon gradient style */}
        <div className="space-y-3 mb-8">
          {INVESTMENT_CONFIG.presetAmounts.map((amount, index) => {
            const calc = calculateInvestment(amount)
            const isSelected = !isCustom && selectedAmount === amount

            // Create gradient effect - darker for selected/first items
            const getBgColor = () => {
              if (isSelected) return "bg-[#f5a898]"
              // Lighter shades as you go down
              const shades = [
                "bg-[#fcd5cc]",
                "bg-[#fde4de]",
                "bg-[#fef0ec]",
                "bg-[#fef5f2]",
                "bg-[#fef8f6]",
                "bg-[#fffafa]",
                "bg-[#fffcfc]",
              ]
              return shades[index] || "bg-[#fef0ec]"
            }

            return (
              <button
                key={amount}
                onClick={() => handlePresetClick(amount)}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-full transition-all text-sm font-medium",
                  getBgColor(),
                  isSelected 
                    ? "text-[#8b4332] ring-2 ring-[#e07850]" 
                    : "text-[#8b5a4a] hover:ring-2 hover:ring-[#e07850]/30"
                )}
              >
                <span>{formatCurrency(amount, 2)}</span>
                <span className="w-1 h-1 rounded-full bg-current" />
                <span>{formatNumber(calc.totalShares)}</span>
              </button>
            )
          })}
        </div>

        {/* Continue button */}
        <Button
          onClick={onContinue}
          disabled={selectedAmount < INVESTMENT_CONFIG.minInvestment}
          className="w-full bg-[#e07850] hover:bg-[#d06840] text-white h-12 text-base font-semibold rounded-lg"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
