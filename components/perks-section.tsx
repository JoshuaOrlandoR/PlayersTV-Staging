"use client"

import { INVESTMENT_CONFIG, formatCurrency } from "@/lib/investment-utils"
import { Gift } from "lucide-react"
import { cn } from "@/lib/utils"

interface PerksSectionProps {
  currentAmount: number
}

export function PerksSection({ currentAmount }: PerksSectionProps) {
  const sortedTiers = [...INVESTMENT_CONFIG.volumeTiers].sort((a, b) => a.threshold - b.threshold)

  return (
    <div className="rounded-xl border border-[#2a2640] bg-[#15132a] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-[#d4a853]" />
        <h3 className="text-lg font-bold text-white tracking-wide">Perks</h3>
      </div>
      <div className="w-12 h-1 bg-[#d4a853] mb-4" />
      
      <ul className="space-y-3">
        {sortedTiers.map((tier) => {
          const isActive = currentAmount >= tier.threshold
          
          return (
            <li
              key={tier.threshold}
              className={cn(
                "flex items-start gap-2 text-sm",
                isActive ? "text-white" : "text-gray-400"
              )}
            >
              <span className={cn(
                "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                isActive ? "bg-[#d4a853]" : "bg-gray-600"
              )} />
              <span>
                Invest {formatCurrency(tier.threshold, 0)}+ and receive{" "}
                <span className={cn(
                  "font-bold",
                  isActive ? "text-[#d4a853]" : "text-gray-300"
                )}>
                  {tier.bonusPercent}% Bonus Shares
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
