import { NextResponse } from "next/server"
import { getDeal, getDealIncentiveTiers, isDealmakerConfigured } from "@/lib/dealmaker"
import { FALLBACK_CONFIG, alignToSharePrice } from "@/lib/investment-utils"

export async function GET() {
  const dealId = process.env.DEALMAKER_DEAL_ID

  if (!isDealmakerConfigured() || !dealId) {
    return NextResponse.json({
      source: "fallback",
      config: FALLBACK_CONFIG,
    })
  }

  try {
    const [deal, tiers] = await Promise.all([
      getDeal(dealId),
      getDealIncentiveTiers(dealId).catch(() => []),
    ])

    const config = {
      sharePrice: deal.price_per_security,
      minInvestment: deal.minimum_investment / 100,
      maxInvestment: deal.maximum_investment / 100,
      currency: deal.currency,
      currencySymbol: deal.currency_symbol,
      securityType: deal.security_type,
      campaignRaised: deal.funded_amount_cents / 100,
      campaignGoal: deal.funding_goal_cents / 100,
      investorsCount: deal.investors_count,
      investorFeePercent: FALLBACK_CONFIG.investorFeePercent,
      presetAmounts: [2500, 5000, 10000, 25000, 50000, 100000, 250000].map(
        (amt) => alignToSharePrice(amt, deal.price_per_security)
      ),
      volumeTiers: tiers.length > 0
        ? tiers
            .map((t) => ({
              threshold: t.minimum_amount,
              bonusPercent: t.bonus_percentage,
            }))
            .sort((a, b) => b.threshold - a.threshold)
        : FALLBACK_CONFIG.volumeTiers,
    }

    return NextResponse.json({
      source: "dealmaker",
      config,
    })
  } catch (error) {
    console.error("DealMaker API error, using fallback:", error)
    return NextResponse.json({
      source: "fallback",
      config: FALLBACK_CONFIG,
    })
  }
}
