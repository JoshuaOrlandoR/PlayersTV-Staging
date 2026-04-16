import { NextResponse } from "next/server"
import { getInvestorAccessLink, isDealmakerConfigured } from "@/lib/dealmaker"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDealmakerConfigured()) {
    return NextResponse.json(
      { error: "DealMaker is not configured." },
      { status: 503 }
    )
  }

  const dealId = process.env.DEALMAKER_DEAL_ID!
  const { id: investorId } = await params

  if (!investorId) {
    return NextResponse.json(
      { error: "Investor ID is required." },
      { status: 400 }
    )
  }

  try {
    const link = await getInvestorAccessLink(dealId, parseInt(investorId, 10))
    return NextResponse.json({
      accessLink: link.access_link || null,
    })
  } catch (error) {
    console.error("Failed to get access link:", error)
    return NextResponse.json(
      { error: "Unable to get access link. Please try again." },
      { status: 500 }
    )
  }
}
