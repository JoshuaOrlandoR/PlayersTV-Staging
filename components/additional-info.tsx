"use client"

import { Info } from "lucide-react"

export function AdditionalInfo() {
  return (
    <div className="rounded-xl border border-[#2a2640] bg-[#15132a] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-[#d4a853]" />
        <h3 className="text-lg font-bold text-white tracking-wide">Additional Information</h3>
      </div>
      <div className="w-12 h-1 bg-[#d4a853] mb-4" />
      
      <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
        <p>
          I consent to receiving reports, promotional emails and other commercial electronic messages 
          from RAD Intel or from other service providers on behalf of RAD Intel.
        </p>
        <p>
          All shares will be retained at the transfer agent DealMaker Shareholder Services. 
          All shares will be in book entry. On closing, you will receive a notice of your holdings 
          delivered to the address entered.
        </p>
      </div>
    </div>
  )
}
