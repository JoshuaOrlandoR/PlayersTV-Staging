export interface InvestmentConfig {
  sharePrice: number
  minInvestment: number
  maxInvestment?: number
  investorFeePercent: number
  campaignRaised: number
  campaignGoal: number
  investorsCount?: number
  currency?: string
  currencySymbol?: string
  securityType?: string
  presetAmounts: number[]
  volumeTiers: { threshold: number; bonusPercent: number }[]
}

export const FALLBACK_CONFIG: InvestmentConfig = {
  sharePrice: 1.00,
  minInvestment: 1000,
  investorFeePercent: 2,
  campaignRaised: 14000000,
  campaignGoal: 17000000,
  // Presets aligned to $1.00/share for whole share counts
  presetAmounts: [2500, 5000, 10000, 25000, 50000, 100000],
  volumeTiers: [
    { threshold: 100000, bonusPercent: 30 },
    { threshold: 50000, bonusPercent: 25 },
    { threshold: 25000, bonusPercent: 20 },
    { threshold: 10000, bonusPercent: 15 },
    { threshold: 5000, bonusPercent: 10 },
    { threshold: 2500, bonusPercent: 5 },
  ],
}

export const INVESTMENT_CONFIG = FALLBACK_CONFIG

export interface InvestmentCalculation {
  amount: number
  baseShares: number
  bonusPercent: number
  bonusShares: number
  totalShares: number
  effectiveSharePrice: number
  investorFee: number
  totalWithFee: number
}

export function calculateInvestment(
  amount: number,
  config: InvestmentConfig = FALLBACK_CONFIG
): InvestmentCalculation {
  const { sharePrice, investorFeePercent, volumeTiers } = config

  const baseShares = Math.floor(amount / sharePrice)

  let bonusPercent = 0
  for (const tier of volumeTiers) {
    if (amount >= tier.threshold) {
      bonusPercent = tier.bonusPercent
      break
    }
  }

  const bonusShares = Math.floor(baseShares * (bonusPercent / 100))
  const totalShares = baseShares + bonusShares
  const effectiveSharePrice = totalShares > 0 ? amount / totalShares : sharePrice
  const investorFee = baseShares * sharePrice * (investorFeePercent / 100)
  const totalWithFee = amount + investorFee

  return {
    amount,
    baseShares,
    bonusPercent,
    bonusShares,
    totalShares,
    effectiveSharePrice,
    investorFee,
    totalWithFee,
  }
}

export function getNextTierInfo(
  amount: number,
  config: InvestmentConfig = FALLBACK_CONFIG
): { threshold: number; bonusPercent: number; amountNeeded: number } | null {
  const { volumeTiers } = config
  
  const sortedTiers = [...volumeTiers].sort((a, b) => a.threshold - b.threshold)
  
  for (const tier of sortedTiers) {
    if (amount < tier.threshold) {
      return {
        threshold: tier.threshold,
        bonusPercent: tier.bonusPercent,
        amountNeeded: tier.threshold - amount,
      }
    }
  }
  
  return null
}

/**
 * Rounds a dollar amount up to the nearest value that produces whole shares.
 * e.g. alignToSharePrice(2500, 1.00) = 2500 (2500 shares x $1.00)
 */
export function alignToSharePrice(amount: number, sharePrice: number): number {
  if (sharePrice <= 0 || amount <= 0) return amount
  const shares = Math.ceil(amount / sharePrice)
  return parseFloat((shares * sharePrice).toFixed(2))
}

export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}
