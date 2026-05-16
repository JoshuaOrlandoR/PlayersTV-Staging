// === EARLY_CAPTURE: START ===
import { NextRequest, NextResponse } from "next/server"
import { 
  createDealInvestor, 
  isDealmakerConfigured,
  type UtmParams 
} from "@/lib/dealmaker"

/**
 * Early capture endpoint - creates investor with basic info (no profile, no address)
 * Called when user completes Step 1 to capture lead immediately
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      email,
      firstName,
      lastName,
      phone,
      investmentAmount,
      // UTM params
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
    } = body

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
        { status: 400 }
      )
    }

    // If DealMaker is not configured, return mock data for development
    if (!isDealmakerConfigured()) {
      console.log("[v0] DealMaker not configured, returning mock capture data")
      return NextResponse.json({
        success: true,
        investorId: Math.floor(Math.random() * 1000000),
        message: "Mock capture - DealMaker not configured",
      })
    }

    const dealId = process.env.DEALMAKER_DEAL_ID!

    // Build UTM params
    const utmParams: UtmParams = {}
    if (utm_source) utmParams.utm_source = utm_source
    if (utm_medium) utmParams.utm_medium = utm_medium
    if (utm_campaign) utmParams.utm_campaign = utm_campaign
    if (utm_content) utmParams.utm_content = utm_content
    if (utm_term) utmParams.utm_term = utm_term

    // Format phone to E.164 if provided
    let formattedPhone = phone
    if (phone) {
      const digits = phone.replace(/\D/g, "")
      if (digits.length === 10) {
        formattedPhone = `+1${digits}`
      } else if (digits.length === 11 && digits.startsWith("1")) {
        formattedPhone = `+${digits}`
      }
    }

    console.log("[v0] Early capture - creating investor with basic info")

    // Create investor directly (no profile) - this is the early capture
    // Investment value is set to minimum or provided amount
    const investor = await createDealInvestor(
      dealId,
      {
        email: email.toLowerCase().trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: formattedPhone,
        investment_value: investmentAmount || 1000, // Use provided or minimum
        allocation_unit: "amount",
      },
      utmParams
    )

    console.log("[v0] Early capture successful:", { investorId: investor.id })

    return NextResponse.json({
      success: true,
      investorId: investor.id,
      subscriptionId: investor.subscription_id,
      state: investor.state,
    })
  } catch (error) {
    console.error("[v0] Early capture error:", error)
    
    // Check if it's a 409 conflict (investor already exists)
    if (error instanceof Error && error.message.includes("409")) {
      return NextResponse.json({
        success: false,
        error: "Investor already exists",
        code: "DUPLICATE",
      }, { status: 409 })
    }
    
    return NextResponse.json(
      { error: "Failed to capture investor. Please try again." },
      { status: 500 }
    )
  }
}
// === EARLY_CAPTURE: END ===
