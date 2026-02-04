// API endpoint to fetch proposed Constitutional Amendments from Congress.gov
const API_KEY = process.env.CONGRESS_API_KEY;
const BASE_URL = "https://api.congress.gov/v3";
const CONGRESS = 119;

async function fetchBillsByType(type) {
  // type = "hjres" or "sjres"
  const url = `${BASE_URL}/bill/${CONGRESS}/${type}?api_key=${API_KEY}&limit=250`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Error fetching ${type}:`, response.status);
    return [];
  }
  const data = await response.json();
  return data.bills || [];
}

async function fetchBillDetails(bill) {
  try {
    // bill.url already has ?format=json, so use & for api_key
    const url = `${bill.url}&api_key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Detail fetch failed for ${bill.number}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.bill;
  } catch (err) {
    console.error(`Detail fetch error for ${bill.number}:`, err.message);
    return null;
  }
}

async function fetchCosponsors(bill) {
  const url = `${BASE_URL}/bill/${CONGRESS}/${bill.type.toLowerCase()}/${bill.number}/cosponsors?api_key=${API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) return 0;
  const data = await response.json();
  return data.cosponsors?.length || 0;
}

module.exports = async function handler(req, res) {
  try {
    // Check API key
    if (!API_KEY) {
      console.error("CONGRESS_API_KEY not set");
      return res.status(500).json({ error: "API key not configured" });
    }

    // Fetch both House and Senate joint resolutions
    const [hjresBills, sjresBills] = await Promise.all([
      fetchBillsByType("hjres"),
      fetchBillsByType("sjres")
    ]);

    console.log(`Fetched ${hjresBills.length} hjres, ${sjresBills.length} sjres`);

    const allBills = [...hjresBills, ...sjresBills];

    // Filter for constitutional amendments
    const amendmentBills = allBills.filter(bill =>
      bill.title && bill.title.includes("Proposing an amendment to the Constitution")
    );

    console.log(`Filtered to ${amendmentBills.length} constitutional amendments`);

    // Fetch details for each amendment
    const amendments = await Promise.all(
      amendmentBills.map(async (bill) => {
        const [details, cosponsorsCount] = await Promise.all([
          fetchBillDetails(bill),
          fetchCosponsors(bill)
        ]);

        if (!details) return null;

        const sponsor = details.sponsors?.[0] || {};

        return {
          number: `${bill.type} ${bill.number}`,
          title: bill.title,
          introducedDate: details.introducedDate,
          sponsor: {
            name: sponsor.fullName || sponsor.name || "Unknown",
            party: sponsor.party || "Unknown",
            state: sponsor.state || "Unknown",
            district: sponsor.district || null
          },
          status: details.latestAction?.text || "Introduced",
          statusDate: details.latestAction?.actionDate || details.introducedDate,
          cosponsorsCount: cosponsorsCount,
          congressUrl: `https://www.congress.gov/bill/${CONGRESS}th-congress/${bill.type.toLowerCase().replace(".", "-")}/${bill.number}`
        };
      })
    );

    // Filter out nulls and sort by introduced date (most recent first)
    const validAmendments = amendments
      .filter(a => a !== null)
      .sort((a, b) => new Date(b.introducedDate) - new Date(a.introducedDate));

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).json({
      count: validAmendments.length,
      congress: CONGRESS,
      lastUpdated: new Date().toISOString(),
      amendments: validAmendments
    });

  } catch (error) {
    console.error("Error fetching amendments:", error);
    res.status(500).json({ error: "Failed to fetch amendments" });
  }
};
