import { NextResponse } from "next/server"
import {
  searchDealInvestors,
  getInvestorAccessLink,
  isDealmakerConfigured,
  type DealInvestor,
} from "@/lib/dealmaker"

export async function POST(request: Request) {
  if (!isDealmakerConfigured()) {
    return NextResponse.json(
      { error: "DealMaker is not configured." },
      { status: 503 }
    )
  }

  const dealId = process.env.DEALMAKER_DEAL_ID!
  const { email } = await request.json()

  if (!email) {
    return NextResponse.json(
      { error: "Email is required." },
      { status: 400 }
    )
  }

  try {
    const rawInvestors = await searchDealInvestors(dealId, email)
    console.log("[v0] Raw search response:", JSON.stringify(rawInvestors))

    // DealMaker returns { items: [...] } for collection responses
    const raw = rawInvestors as DealInvestor[] | { items?: DealInvestor[]; data?: DealInvestor[] }
    const investors: DealInvestor[] = Array.isArray(raw) ? raw : (raw.items || raw.data || [])
    console.log("[v0] Found investors:", investors.map(inv => ({ id: inv.id, state: inv.state, amount: inv.investment_value })))

    // Find all resumable investors - only those who completed verification
    // "invited" = just created, not verified yet (skip these)
    // "signed" = verified and signed documents
    // "waiting" = waiting for payment/processing
    const resumableStates = ["signed", "waiting"]
    const resumableInvestors = investors
      .filter((inv) => inv.state && resumableStates.includes(inv.state.toLowerCase()))
      .sort((a, b) => Number(b.id) - Number(a.id)) // Most recent first

    if (resumableInvestors.length === 0) {
      return NextResponse.json({ found: false, investments: [] })
    }

    // Return all resumable investments for user to choose
    const investments = resumableInvestors.map((inv) => ({
      id: inv.id,
      state: inv.state,
      amount: inv.investment_value,
      shares: inv.number_of_securities,
      name: inv.name,
      createdAt: inv.created_at,
    }))

    return NextResponse.json({
      found: true,
      investments,
    })
  } catch (error) {
    console.error("Failed to search investors:", error)
    return NextResponse.json(
      { error: "Unable to look up your investment. Please try again." },
      { status: 500 }
    )
  }
}
