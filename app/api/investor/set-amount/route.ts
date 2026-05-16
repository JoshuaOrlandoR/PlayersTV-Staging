// === EARLY_CAPTURE: START ===
// This route uses PUT to update an existing investor with investment amount
// Called from Step 1 completion (Capture 2) when we already have an investorId from Capture 1
// === EARLY_CAPTURE: END ===

import { NextResponse } from "next/server"
import { putInvestor } from "@/lib/dealmaker"

const DEAL_ID = process.env.DEALMAKER_DEAL_ID || ""

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { investorId, investmentAmount } = body

    console.log("[v0] set-amount called:", { investorId, investmentAmount })

    if (!investorId) {
      return NextResponse.json(
        { error: "investorId is required" },
        { status: 400 }
      )
    }

    if (!investmentAmount) {
      return NextResponse.json(
        { error: "investmentAmount is required" },
        { status: 400 }
      )
    }

    if (!DEAL_ID) {
      console.log("[v0] set-amount: No DEAL_ID configured")
      return NextResponse.json(
        { error: "Deal not configured" },
        { status: 500 }
      )
    }

    // PUT to update investor with investment amount
    const result = await putInvestor(DEAL_ID, investorId, {
      investment_value: investmentAmount,
      allocation_unit: "amount",
    })

    console.log("[v0] set-amount success:", { investorId, state: result.state })

    return NextResponse.json({
      success: true,
      investorId: result.id,
      state: result.state,
    })

  } catch (error) {
    console.error("[v0] set-amount error:", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
