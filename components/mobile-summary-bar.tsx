"use client"

import { Button } from "@/components/ui/button"
import { calculateInvestment, formatCurrency, formatNumber } from "@/lib/investment-utils"
import { ArrowRight } from "lucide-react"

interface MobileSummaryBarProps {
  amount: number
  onContinue: () => void
}

export function MobileSummaryBar({ amount, onContinue }: MobileSummaryBarProps) {
  const calc = calculateInvestment(amount)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#15132a] border-t border-[#2a2640] p-4 md:hidden z-50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-400">
            Investing {formatCurrency(amount, 0)} {calc.bonusPercent > 0 && `→ ${calc.bonusPercent}% bonus`}
          </div>
          <div className="text-lg font-bold text-[#d4a853] truncate">
            {calc.bonusPercent > 0 
              ? `${formatNumber(calc.bonusShares)} bonus shares`
              : `${formatNumber(calc.totalShares)} total shares`
            }
          </div>
        </div>
        <Button
          onClick={onContinue}
          className="bg-[#d4a853] text-[#0d0b1a] hover:bg-[#c49a48] px-6"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
