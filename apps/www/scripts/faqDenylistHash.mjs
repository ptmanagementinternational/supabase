// @ts-check

/**
 * Prints the SHA-256 hash of each name passed on the command line, lowercased,
 * for the DENYLIST_HASHES set in faqs-content.test.ts. Multi-word names are
 * matched as adjacent word pairs, so pass them with a single space.
 *
 *   node scripts/faqDenylistHash.mjs "some vendor" another
 */

import { createHash } from 'node:crypto'

const names = process.argv.slice(2)
if (names.length === 0) {
  console.error('Usage: node scripts/faqDenylistHash.mjs "<name>" ["<name>" ...]')
  process.exit(1)
}

for (const name of names) {
  const term = name.trim().toLowerCase().replace(/\s+/g, ' ')
  console.log(`'${createHash('sha256').update(term).digest('hex')}',`)
}
