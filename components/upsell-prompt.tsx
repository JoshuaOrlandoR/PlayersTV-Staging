"use client"

import { Button } from "@/components/ui/button"
import { getNextTierInfo, formatCurrency, formatNumber, calculateInvestment } from "@/lib/investment-utils"
import { Sparkles, ArrowUp } from "lucide-react"

interface UpsellPromptProps {
  currentAmount: number
  onUpgrade: (amount: number) => void
}

export function UpsellPrompt({ currentAmount, onUpgrade }: UpsellPromptProps) {
  const nextTier = getNextTierInfo(currentAmount)
  
  // Don't show if no next tier or if more than $2000 away from next tier
  if (!nextTier || nextTier.amountNeeded > 2000) {
    return null
  }

  const nextTierCalc = calculateInvestment(nextTier.threshold)
  const currentCalc = calculateInvestment(currentAmount)
  const additionalBonusShares = nextTierCalc.bonusShares - currentCalc.bonusShares

  return (
    <div className="rounded-xl border border-[#d4a853]/30 bg-gradient-to-r from-[#d4a853]/10 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[#d4a853]/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-[#d4a853]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium mb-1">
            Add {formatCurrency(nextTier.amountNeeded, 0)} more to unlock{" "}
            <span className="text-[#d4a853] font-bold">{nextTier.bonusPercent}% bonus</span>
            {" "}(+{formatNumber(additionalBonusShares)} extra shares)
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpgrade(nextTier.threshold)}
            className="mt-2 border-[#d4a853] text-[#d4a853] hover:bg-[#d4a853] hover:text-[#0d0b1a] bg-transparent"
          >
            <ArrowUp className="w-4 h-4 mr-1" />
            Yes, increase to next tier
          </Button>
        </div>
      </div>
    </div>
  )
}
