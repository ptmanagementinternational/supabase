import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'

// Content checks for the FAQ pages in _faqs/. These pages answer one question
// each and describe Supabase only: no other vendors, no comparison tables.

const FAQ_DIR = path.join(process.cwd(), '_faqs')
const DOCS_GUIDES_DIR = path.join(process.cwd(), '..', 'docs', 'content', 'guides')

// SHA-256 hashes of lowercase vendor and product names that must never appear
// in an FAQ page, including in link URLs. Hashed so the list itself doesn't
// publish those names. Add one with: node scripts/faqDenylistHash.mjs "<name>"
const DENYLIST_HASHES = new Set([
  '1a79e3c0c3b5d31b47c315f964aa2f15b5b8dc82c9114c200ea868225aae6841',
  'c6f4e8330a50b2e95b4f5be182af338f2b577f42fc886c88f77900a6d68f57e1',
  '042e9398f2cc89025595d077503121a4a5a41d153d6863caa4c7332c8f1029f6',
  '06c2c9b5450a8529d072cb3486b9745b2bca1ba2faea9d06604a4b414acc9477',
  '07311b26942e0d3d6e40e21bf9262fc702cf9e768661dbb31a0c17282da68823',
  '0eaa452a864c304a6c96dceac6809b31ba0c954307e31fe69adc8a43f956bf56',
  '16fd3c9b3a28501f74ccd4742a24da9885a257f2d4fffc27bb07dc49c099ba43',
  '1b6405d1ef5a816105210b20a8f0fc129869a25876e45c0891e4f6d972bf74c2',
  '1cc9a79bdaf09793062750a17e559d40d5c0f1372cc859f67fe1081e6bc8a307',
  '1dd312a72a4a77e923384d6e213559c1b566a99e168ebdc5963f9a1e9a753b3a',
  '23066caccb55bb970c6fde20b9cc046ad544d6848b1568f808ab980efc478afe',
  '253f7ea627b61fd6e5eabc13474eefba649d0c14e11c056e9a7a39bfc9e556c3',
  '297837da50bddaa07722fc967c01a1cb8999eb03f36a2b1be968785b53fab9e1',
  '2b896c585e028d6733112beb7c88ee30ea300d31932875684c3bac4d05b34639',
  '2c01567a95a4f6b8b608923dcccc24ea060b1579d7d8e24f5bef85c50b05c6b1',
  '2dc010636b9dce91b7328ecb3d287ef6245c96281f1ebf37071210a6ef829000',
  '3347d0bdd97e6df866abddb2c3de496bbf1ad77d74745b688e70bc73bba31d8c',
  '3dae9f92d851b99d715b34f10d51dbd48fe9a57adc8a2bf8c2585f373c35ed38',
  '4170f4782823a501ca0357861606550c03bad7d8ec70d166bf7ff8ae7d328bbd',
  '430005175c4c7810996d3481f0dbc3ec01103d6abcc5beec5db4b3f1eae35047',
  '46b0f480101dcd0e2cf8a176ea5ba1045c9d6eea19a5d390678ba2d616d5ce31',
  '4af49e69389063bf7adb6343161996ed0af07f195d1455548ba308156ddcf8b6',
  '4b4ca44b97c515972742a369af8c284858434f74a7497028f574b4d8e0d06ba0',
  '4c292a55c8ccf25dbbb45b5e4c0060424a908dc70b0fabd2e47043226eaeeb79',
  '4cb0896e6c8971be08b2b3fb3a07cea6f87b6581ee99fe772ca4ace0bb4bf5a8',
  '4efb305aa25d376269290f52f6212385d766e85de5af7f174f3cd30d2d73b2b3',
  '50cfd89765d6d5dd71dce64ee77ea810ae4f24b19a13e3f94ef17c9e2bcbeddb',
  '50de90d0bd0f777a5682f0362a4de201e96e15d89a5757d8428f194c3832f870',
  '55969199c092e84368cb054ca96f8007b2f0f714689eb3849e5293b7abbdda57',
  '58465a6f6cb16f2719b55ba9e3a15b3864f2ec9d49c83fe6ec67579904cd798f',
  '5ff2507a8ad4c1a14418d0d243e99d6bbe430a747dae4b9f10877afd16f7f253',
  '618b8c8de24c7b03f7a150fa9419177f753a46bd123fdcbb4f11d643abf066eb',
  '6326e0e8cfdaab9af83026a0620bafd05179e3a0cd1b812222682d86285b30cc',
  '635ef97e2b6e87d73e76801edaac6ca9e2600ce255be4bfbc3ac92a75489765f',
  '65819e198c32566ae994e481fd6ab4f725a3c16e916102713a58f22d291aed0b',
  '6ffe9bce28cdff262b30c342183ba88015e3cd094cb35d105067c518430534cb',
  '738e22f0acab814cc0c6a9dfdd1c6a193ea278e48b07f070784d608243e68d8c',
  '74f8b187fcc4e194881c59f85fde8f03438ecf41ee7db52a93c8d103bd86a0b0',
  '79c41baebfebd6a5fd52ef814be690fc590b1ad0c7b670bf99d58b8de87a120d',
  '79f43c3b9c23fbdf293bdba80dab38ba194fc1da79187091b3d3760dad840bf8',
  '7d1507284a5757cac6b62708a4ef00bfc5d695256489cb704f12b4b9e6255df2',
  '7fcb2405149d988583882777bbe6d4e42821896745fb567cd862f943544299f1',
  '83d5df9c766ac439ce588cc5cb2f31a06db7e1f50d9f672117a80f945a9f024f',
  '843ed06b189860ae7de46e338f5ae3d4ba4b81df2d7e4b6f88538cbe54968f84',
  '86ee95988ff77533f70dbe031a4b2352347f85e7e081557c7f2d9a8de8fdd4ae',
  '8c6dd2663599bee209296221eda13df90e45b14ee9ef9082191da0056abe1182',
  '9202af6ce925b26ae6b25adfff0b2705147e195fa38dd58ae6ecc58ed263751f',
  '943e891bf6042f2db8926493c0f94e45b72cb58a21145fdfa3c23b5c057e4b2d',
  '99d211b2dd6f2f4ff227e4128c27483d93823c9cd294a297df7b211455075d68',
  '9b89025ce7a6d932b28f6e15132a70d402f723874a425e9b4c7cc3b179fa66ce',
  '9f41c9209f22065562f02b635c2f7e8503c2fd384901315b5024d2d56fc17ca4',
  '9f4868c97498b2e40b9491dcefd6d083bcbbad45f8331d4a0a46f5e649e55321',
  'a50a703777f6ad9a72c6dc69a248d98cf347d3379d96b34937c837a2d0af6e8e',
  'ba1c464e18573b1f54a78563d8c3a4eeadb817db5cd7fb8d626456783369f0e2',
  'ba62dbd514d499c4fcc726a21c2623c16d5eb69dc1a6b8c8c60442cb75c0ab5b',
  'bc0be64abbb1f88cda0253a07c14da119463be6ae5ea10412025bfbdb3babcfc',
  'c40dc72b0228e5850d8b173ff861a48acfb4a15b37b2849cbb6584bbadbc7907',
  'c41aaf739d7d04382cd8978d8b6247d664e51ae51ee024a9a3d76193f9f8d1f0',
  'cbc62794911ff31b2864ecd3dbbbee7ebcb7ea41c5a42e2cba377f3cfdb42811',
  'ce9da497f682400f823b9344ed428e68842c1a63f18b3348d4eafd877603b04f',
  'cf99b895f350b77585881438ab38a935e68c9c7409c5adaad23fb17572ca1ea2',
  'd5d0d6556d98abd3b1c449ea617b73769f987bbc20d4a0457051e66a0308a518',
  'd9082bdcf7eaf584e640203ff313a74a401cab4bc2167979eedc76a0019c0334',
  'd9b1d7819af92e77de6464230e05de8013f0789b32a47b9dc4d16ad6bfed85f1',
  'dcfe74ebfe0df65745d83e179343c188faf2bf1b395d9bada5ba56e243fdddf5',
  'dffab4e5e5d86ea81431cad2bf77fc027c0042d54fc4414c67145bfa255ee6cf',
  'e08f4c9c36148019458d78d4baa84cbfa4beeb6e36be36c96f74c8655723b1ba',
  'e34d1c9011e06204d0540f17e6370d18d2163d69944a3b43b5c92d68d89096fe',
  'e66be346981417ceec9888056640e1a783c2ce1b965aa8312d166d6e52bec080',
  'ec5df277195755d82b8cbc3dedb4088ece38cece2ce935990373ef4dc4d83550',
  'ece375199f9118cf29e19e171742f668b6b13367dc1797d11da1c74795e758cc',
  'f1a72f26a9ee153461b321d254c4885012b85477a727093d372826df3bf64ed8',
  'f804ff2fd8efd8445b745ff69f4c69cfd96f6b830245296b9ef866e2edcb801f',
])

// Lowercase words and adjacent word pairs, so multi-word names and hyphenated
// spellings (split into two words) are both caught. Dots inside a token are
// kept for domain-style names, and leading and trailing dots are dropped.
function candidateTerms(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9.]+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean)
  const pairs = words.slice(1).map((w, i) => `${words[i]} ${w}`)
  // Domain-style tokens also contribute their segments, so a vendor written as
  // a domain in plain text or code is still caught.
  const segments = words.filter((w) => w.includes('.')).flatMap((w) => w.split('.'))
  return [...words, ...pairs, ...segments]
}

function deniedTerms(text: string): string[] {
  return [...new Set(candidateTerms(text))].filter((term) =>
    DENYLIST_HASHES.has(createHash('sha256').update(term).digest('hex'))
  )
}

// Links an FAQ page may use besides /docs/guides/* and /faqs/*.
const ALLOWED_LINK_PREFIXES = ['/pricing', '/database', '/dashboard', 'https://www.postgresql.org/']

const files = fs
  .readdirSync(FAQ_DIR)
  .filter((f) => f.endsWith('.mdx'))
  .sort()
const slugs = new Set(files.map((f) => f.replace(/\.mdx$/, '')))

function docsGuideExists(docsPath: string): boolean {
  const rel = docsPath
    .replace(/^\/docs\/guides\//, '')
    .replace(/[#?].*$/, '')
    .replace(/\/$/, '')
  return (
    fs.existsSync(path.join(DOCS_GUIDES_DIR, `${rel}.mdx`)) ||
    fs.existsSync(path.join(DOCS_GUIDES_DIR, rel, 'index.mdx'))
  )
}

function linkTargets(markdown: string): string[] {
  return [...markdown.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1])
}

describe('FAQ pages', () => {
  it('has pages to check', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  describe.each(files)('%s', (file) => {
    const raw = fs.readFileSync(path.join(FAQ_DIR, file), 'utf8')
    const { data, content } = matter(raw)

    it('uses a kebab-case slug', () => {
      expect(file).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.mdx$/)
    })

    it('is titled as a question', () => {
      expect(typeof data.title).toBe('string')
      expect(data.title.trim().endsWith('?')).toBe(true)
    })

    it('has a one-sentence answer as its description', () => {
      expect(typeof data.description).toBe('string')
      const description = data.description.trim()
      expect(description.length).toBeGreaterThan(40)
      expect(description.length).toBeLessThanOrEqual(220)
      expect(description.endsWith('.')).toBe(true)
    })

    it('has a YYYY-MM-DD date', () => {
      const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('names no other vendor, anywhere in the file', () => {
      expect(deniedTerms(raw)).toEqual([])
    })

    it('contains no tables', () => {
      expect(/^\s*\|.*\|\s*$/m.test(content)).toBe(false)
    })

    it('contains no JSX or HTML', () => {
      const withoutCode = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
      expect(/<[A-Za-z/]/.test(withoutCode)).toBe(false)
    })

    it('links only to docs guides, other FAQs, or allowed pages that exist', () => {
      for (const target of linkTargets(content)) {
        if (target.startsWith('/docs/guides/')) {
          expect(docsGuideExists(target), `missing docs page: ${target}`).toBe(true)
        } else if (target.startsWith('/faqs/')) {
          const slug = target.replace(/^\/faqs\//, '').replace(/[#?].*$/, '')
          expect(slugs.has(slug), `missing FAQ page: ${target}`).toBe(true)
        } else {
          expect(
            ALLOWED_LINK_PREFIXES.some((prefix) => target.startsWith(prefix)),
            `link not allowed: ${target}`
          ).toBe(true)
        }
      }
    })
  })
})
