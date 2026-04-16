"use client"

import { INVESTMENT_CONFIG } from "@/lib/investment-utils"
import { TrendingUp } from "lucide-react"

export function CampaignProgress() {
  const { campaignRaised, campaignGoal } = INVESTMENT_CONFIG
  const progressPercent = Math.min((campaignRaised / campaignGoal) * 100, 100)
  
  const formatCompact = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}M`
    }
    return `$${(value / 1000).toFixed(0)}K`
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3">Regulation A Round</h3>
      
      <div className="relative">
        {/* Progress bar background */}
        <div className="h-6 bg-[#2a2640] rounded-full overflow-hidden">
          {/* Progress fill - lime green like the screenshot */}
          <div 
            className="h-full bg-[#c8e636] rounded-full transition-all duration-500 flex items-center justify-end pr-3"
            style={{ width: `${progressPercent}%` }}
          >
            <span className="text-xs font-bold text-[#0d0b1a]">
              {formatCompact(campaignRaised)}
            </span>
          </div>
        </div>
        
        {/* Goal label */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2">
          <span className="text-sm font-semibold text-white">{formatCompact(campaignGoal)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
        <TrendingUp className="w-3 h-3 text-[#c8e636]" />
        <span>CAMPAIGN MILESTONE GOAL</span>
      </div>
    </div>
  )
}
