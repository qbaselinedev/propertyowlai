import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/verify-conveyancer?licence=123456
 *
 * Calls the VIC Consumer Affairs register and parses the HTML response
 * to determine if a conveyancer licence number is valid.
 *
 * The register URL:
 * https://registers.consumer.vic.gov.au/CvSearch/PerformSearch
 *   ?NameOrLicenceNumber=LicenceNumber
 *   &LicenceNumber={number}
 *   &IncludeNonCurrentLicensees=False
 *
 * Response logic:
 *  - If HTML contains a results table with licensee data → valid: true, name: "..."
 *  - If HTML contains "no results" / empty table / error text → valid: false
 */
export async function GET(request: NextRequest) {
  const licence = request.nextUrl.searchParams.get('licence')?.trim()

  if (!licence) {
    return NextResponse.json({ valid: false, error: 'No licence number provided' }, { status: 400 })
  }

  // Basic sanity: VIC conveyancer licences are typically 6–10 digits
  if (!/^\d{4,12}$/.test(licence)) {
    return NextResponse.json({ valid: false, error: 'Licence number must be 4–12 digits' })
  }

  const registerUrl = `https://registers.consumer.vic.gov.au/CvSearch/PerformSearch?NameOrLicenceNumber=LicenceNumber&LicenceNumber=${encodeURIComponent(licence)}&IncludeNonCurrentLicensees=False`

  try {
    const res = await fetch(registerUrl, {
      headers: {
        // Mimic a real browser request — the register serves HTML to browsers
        'User-Agent': 'Mozilla/5.0 (compatible; PropertyOwlAI/1.0; +https://propertyowlai.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-AU,en;q=0.9',
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      console.error(`[VerifyConveyancer] Register returned HTTP ${res.status}`)
      return NextResponse.json({
        valid: false,
        error: `Register service returned an error (${res.status}). Admin will review manually.`,
        pendingApproval: true,
      })
    }

    const html = await res.text()

    // ── Parse the HTML response ──────────────────────────────────────────────
    //
    // The VIC register returns one of:
    //
    // Case A — Results found:
    //   A <table> with class "search-results" or similar containing rows
    //   with licensee name, licence type, status etc.
    //   The licensee name typically appears in <td> cells.
    //
    // Case B — No results:
    //   Text like "No results found", "no records", "0 records" etc.
    //
    // Case C — Error page:
    //   Generic error or timeout page.
    //
    // We check for Case A first (positive match), then fall through to invalid.

    const lowerHtml = html.toLowerCase()

    // Signals that NO results were found
    const noResultSignals = [
      'no results found',
      'no records found',
      '0 records',
      'no matching',
      'no licensees found',
      'search returned no',
      'did not match any',
    ]

    const hasNoResults = noResultSignals.some(signal => lowerHtml.includes(signal))
    if (hasNoResults) {
      return NextResponse.json({
        valid: false,
        error: 'Licence number not found in the VIC Consumer Affairs register.',
        pendingApproval: true,
      })
    }

    // Signals that results WERE found — look for a licensee name in a results table
    // The register typically renders: <td>FIRSTNAME LASTNAME</td> adjacent to the licence number
    // We use a regex to extract the name from table cells near the licence number
    const hasResultsTable = (
      html.includes('search-results') ||
      html.includes('SearchResults') ||
      html.includes('result-row') ||
      html.includes('ResultRow') ||
      // Fallback: any <table> with <tbody> containing <td> cells with the licence number
      (html.includes('<table') && html.includes(licence))
    )

    if (!hasResultsTable) {
      // Could not parse the page structure — flag for admin review
      return NextResponse.json({
        valid: false,
        error: 'Could not verify automatically. An admin will review your licence.',
        pendingApproval: true,
      })
    }

    // Extract the licensee name from the HTML
    // Strategy: find the licence number in the HTML, then extract the surrounding <td> content
    // which typically contains the registrant's name
    let registeredName: string | null = null

    // Pattern 1: name in a <td> right before or after the licence number cell
    // <tr>...<td>JANE SMITH</td><td>123456</td>... or reversed
    const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let rowMatch
    while ((rowMatch = tableRowRegex.exec(html)) !== null) {
      const row = rowMatch[1]
      if (row.includes(licence)) {
        // Extract all <td> text content from this row
        const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
        const cells: string[] = []
        let tdMatch
        while ((tdMatch = tdRegex.exec(row)) !== null) {
          // Strip inner HTML tags, decode entities
          const cellText = tdMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ')
            .replace(/&#39;/g, "'")
            .trim()
          if (cellText.length > 0) cells.push(cellText)
        }

        // Find the cell that looks like a person's name (all caps or mixed, 2+ words, not the licence number)
        const nameCell = cells.find(cell =>
          cell !== licence &&
          cell.length > 3 &&
          cell.length < 80 &&
          !/^\d+$/.test(cell) && // not all digits
          !/^(active|current|cancelled|suspended|expired|conveyancer|agent|broker|vic|victoria)$/i.test(cell.trim())
        )
        if (nameCell) {
          registeredName = nameCell
          break
        }
      }
    }

    // Pattern 2: look for name in heading or strong tags near the result
    if (!registeredName) {
      const strongMatch = html.match(/<strong[^>]*>([A-Z][a-zA-Z\s'-]{3,60})<\/strong>/)
      if (strongMatch) registeredName = strongMatch[1].trim()
    }

    // Pattern 3: generic — just confirm valid without a name
    if (!registeredName) {
      // We know there are results (hasResultsTable was true), just can't extract name
      registeredName = 'Verified (name not extracted)'
    }

    return NextResponse.json({
      valid: true,
      name: registeredName,
      licence,
    })

  } catch (err: any) {
    console.error('[VerifyConveyancer] Error:', err)

    // Network timeout or service down — don't block the user, flag for admin
    if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT') {
      return NextResponse.json({
        valid: false,
        error: 'Verification service timed out. Your account will be submitted for admin review.',
        pendingApproval: true,
      })
    }

    return NextResponse.json({
      valid: false,
      error: 'Verification service unavailable. An admin will review your licence.',
      pendingApproval: true,
    })
  }
}
