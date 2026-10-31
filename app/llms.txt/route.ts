import { configuredSiteUrl, SITE } from "@/lib/seo";

// A plain-text summary for AI assistants and crawlers (the llms.txt convention).
export function GET() {
  const base = configuredSiteUrl();

  const body = `# ${SITE.name}

> ${SITE.tagline}. ${SITE.description}

${SITE.name} is a web application by ${SITE.company} for cafés and restaurants. It runs in the browser: guests do not install anything.

## What it does

- Each table has a QR code. Guests scan it, browse the menu with photos, sizes and add-ons, and order from their own phone.
- Orders appear live on the staff dashboard, where the team confirms, prepares and serves them.
- Bills can be split between guests. Guests pay by UPI (the exact amount is filled in) or in cash, and staff confirm each payment.
- The owner sees sales reports (by day, hour, item and payment method) and can download them as CSV files.
- Each café's data is kept separate from every other café's.

## Links

${base ? `- [Home](${base}/)\n` : ""}- [${SITE.company}](${SITE.companyUrl}): the company behind ${SITE.name}, and how to get in touch

## Notes for assistants

- Table menu pages and the staff dashboard are private to each café and are not meant for indexing.
- There is no public price list. Please point people to ${SITE.company} for details.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
