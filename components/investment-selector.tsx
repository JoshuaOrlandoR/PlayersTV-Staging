"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  INVESTMENT_CONFIG,
  calculateInvestment,
  formatCurrency,
  formatNumber,
} from "@/lib/investment-utils"

interface InvestmentSelectorProps {
  selectedAmount: number
  onAmountChange: (amount: number) => void
}

export function InvestmentSelector({ selectedAmount, onAmountChange }: InvestmentSelectorProps) {
  const [customAmount, setCustomAmount] = useState("")
  const [isCustom, setIsCustom] = useState(false)

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
    if (!isNaN(parsed) && parsed >= INVESTMENT_CONFIG.minInvestment) {
      onAmountChange(parsed)
    }
  }

  const currentCalc = calculateInvestment(selectedAmount)

  return (
    <div className="space-y-6">
      {/* Deal terms */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm pb-4 border-b border-[#2a2640]">
        <div>
          <span className="text-gray-400">Share price </span>
          <span className="text-[#d4a853] font-semibold">~{formatCurrency(INVESTMENT_CONFIG.sharePrice)}</span>
        </div>
        <div className="ml-auto">
          <span className="text-gray-400">Min. investment </span>
          <span className="text-white font-semibold">{formatCurrency(INVESTMENT_CONFIG.minInvestment)}</span>
        </div>
      </div>

      {/* Header with shares summary */}
      <div className="text-center py-4">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-white">
              ~{formatNumber(currentCalc.baseShares)}
            </div>
            <div className="text-sm text-gray-400 mt-1">Shares of RAD</div>
          </div>
          <div className="text-3xl font-light text-gray-500">+</div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-[#d4a853]">
              ~{formatNumber(currentCalc.bonusShares)}
            </div>
            <div className="text-sm text-gray-400 mt-1">Free Bonus Shares</div>
          </div>
        </div>
      </div>

      {/* Preset amount buttons - radio style with gold accents */}
      <div className="space-y-3">
        {INVESTMENT_CONFIG.presetAmounts.map((amount) => {
          const calc = calculateInvestment(amount)
          const isSelected = !isCustom && selectedAmount === amount

          return (
            <button
              key={amount}
              onClick={() => handlePresetClick(amount)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                isSelected
                  ? "border-[#d4a853] bg-gradient-to-r from-[#d4a853]/10 to-[#d4a853]/5"
                  : "border-[#2a2640] bg-[#1a1830] hover:border-[#d4a853]/50"
              )}
            >
              <div className="flex items-center gap-4">
                {/* Radio circle */}
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    isSelected ? "border-[#d4a853]" : "border-gray-500"
                  )}
                >
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#d4a853]" />}
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-white">
                    {formatCurrency(amount, 0)}
                  </div>
                  <div className="text-sm text-gray-400">
                    ~{formatNumber(calc.baseShares)} Shares
                  </div>
                </div>
              </div>

              {/* Bonus pills */}
              {calc.bonusPercent > 0 && (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-[#52b4f9] text-white text-xs font-bold rounded-full whitespace-nowrap">
                    +{formatNumber(calc.bonusShares)} Free Shares
                  </span>
                  <span className="px-2.5 py-1.5 bg-[#52b4f9] text-white text-xs font-bold rounded-full whitespace-nowrap">
                    {calc.bonusPercent}% Bonus
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Custom amount input */}
      <div className="pt-4">
        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-[#2a2640] bg-[#1a1830]">
          <span className="text-lg font-semibold text-gray-400">Amount: $</span>
          <Input
            type="text"
            placeholder={selectedAmount.toFixed(0)}
            value={customAmount}
            onChange={(e) => handleCustomChange(e.target.value)}
            className="flex-1 bg-transparent border-0 text-xl font-semibold text-white placeholder:text-white focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
          />
        </div>
      </div>

      {/* Total shares summary */}
      <div className="flex items-center justify-between pt-4 border-t border-[#2a2640]">
        <span className="text-lg font-medium text-gray-400">Total Shares</span>
        <span className="text-2xl font-bold text-white">
          ~{formatNumber(currentCalc.totalShares)}
        </span>
      </div>

      <p className="text-xs text-gray-500 text-center leading-relaxed">
        All shares assume conversion of convertible notes into stock at ~{formatCurrency(INVESTMENT_CONFIG.sharePrice)}/share. 
        Final share price will be based on a number of factors.
      </p>
    </div>
  )
}
