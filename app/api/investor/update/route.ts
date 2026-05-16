// === EARLY_CAPTURE: START ===
import { NextRequest, NextResponse } from "next/server"
import { 
  putInvestor,
  createInvestorProfile,
  isDealmakerConfigured,
  type InvestorType 
} from "@/lib/dealmaker"

/**
 * Update investor endpoint - uses PUT to update investment amount and link profile
 * Called in Step 2 after early capture has created the investor
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      existingInvestorId,
      investmentAmount,
      // Profile data for creating full profile
      email,
      firstName,
      lastName,
      phone,
      investorType = "individual",
      streetAddress,
      unit,
      city,
      state,
      postalCode,
      country,
      dateOfBirth,
      // Joint investor fields
      jointFirstName,
      jointLastName,
      // Entity fields
      entityName,
    } = body

    if (!existingInvestorId) {
      return NextResponse.json(
        { error: "existingInvestorId is required" },
        { status: 400 }
      )
    }

    // If DealMaker is not configured, return mock data
    if (!isDealmakerConfigured()) {
      console.log("[v0] DealMaker not configured, returning mock update data")
      return NextResponse.json({
        success: true,
        investorId: existingInvestorId,
        accessLink: "https://example.com/mock-checkout",
        message: "Mock update - DealMaker not configured",
      })
    }

    const dealId = process.env.DEALMAKER_DEAL_ID!

    // Format phone to E.164
    let e164Phone = phone
    if (phone) {
      const digits = phone.replace(/\D/g, "")
      if (digits.length === 10) {
        e164Phone = `+1${digits}`
      } else if (digits.length === 11 && digits.startsWith("1")) {
        e164Phone = `+${digits}`
      }
    }

    // Format DOB
    let formattedDob = ""
    if (dateOfBirth) {
      const parts = dateOfBirth.split("/")
      if (parts.length === 3) {
        formattedDob = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
      }
    }

    // Determine profile type
    const type: InvestorType = investorType as InvestorType

    // Build profile data
    const profileData: Record<string, unknown> = {
      email: email?.toLowerCase().trim(),
      first_name: firstName?.trim(),
      last_name: lastName?.trim(),
      phone_number: e164Phone,
      date_of_birth: formattedDob,
      street_address: streetAddress,
      unit2: unit || "",
      city,
      region: state,
      postal_code: postalCode,
      country: country || "US",
    }

    // Add joint investor fields
    if (type === "joint" && jointFirstName && jointLastName) {
      profileData.joint_holder_first_name = jointFirstName
      profileData.joint_holder_last_name = jointLastName
    }

    // Add entity name for corporation types
    if (["corporation", "trust", "llc", "partnership"].includes(type) && entityName) {
      profileData.name = entityName
    }

    console.log("[v0] Creating full profile for investor:", existingInvestorId)

    // Create the full profile with all data
    let profileId: number | undefined
    try {
      const profile = await createInvestorProfile(type, profileData)
      profileId = profile.id
      console.log("[v0] Profile created:", profileId)
    } catch (profileError) {
      console.error("[v0] Profile creation failed:", profileError)
      // Continue without profile - investor can still complete via DealMaker
    }

    // Now PUT to update the investor with investment amount and profile link
    console.log("[v0] PUT to update investor with amount and profile")
    
    const updateData: {
      investment_value: number
      allocation_unit: string
      investor_profile_id?: number
    } = {
      investment_value: investmentAmount,
      allocation_unit: "amount",
    }
    
    if (profileId) {
      updateData.investor_profile_id = profileId
    }

    const updatedInvestor = await putInvestor(dealId, existingInvestorId, updateData)

    console.log("[v0] Investor updated successfully")

    return NextResponse.json({
      success: true,
      investorId: updatedInvestor.id,
      profileId,
      subscriptionId: updatedInvestor.subscription_id,
      state: updatedInvestor.state,
      accessLink: updatedInvestor.access_link,
    })
  } catch (error) {
    console.error("[v0] Update investor error:", error)
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.log("[v0] DealMaker API error body:", errorMessage)
    
    return NextResponse.json(
      { error: "Failed to update investor. Please try again." },
      { status: 500 }
    )
  }
}
// === EARLY_CAPTURE: END ===
