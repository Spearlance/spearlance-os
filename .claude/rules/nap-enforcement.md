# NAP Enforcement

When `business.json` exists at the project root, NEVER hardcode business information in source files. Always import and reference from `business.json`.

## What Counts as Business Info

- **Identity:** Business name, legal name, tagline
- **Contact:** Phone numbers, fax, email addresses (primary and support)
- **Address:** Street, city, state, zip, country, formatted address, additional locations
- **Social:** All social media URLs and @handles (Facebook, Instagram, Twitter/X, LinkedIn, YouTube, TikTok, Pinterest, Yelp, Google Business)
- **Hours:** Business hours for any day, holiday notes
- **Schema:** Business type, price range, area served

## When Writing Components That Display Business Info

1. Import `business.json` (framework-appropriate import)
2. Reference the field: `business.business.phone`, `business.address.formatted`, etc.
3. Never copy-paste the actual value into the component

## When This Rule Is Inactive

When `business.json` does NOT exist at the project root, this rule is inactive. Not every project has business info to centralize.

## When Hardcoding Is OK

- Test fixtures and mock data (use obviously fake values)
- Documentation examples
- The `business.json` file itself
