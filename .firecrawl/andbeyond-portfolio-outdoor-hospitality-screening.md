# andBeyond portfolio screening — Glamping, Outdoor Boutique Hotel, Landscape Hotel

**Source:** https://www.andbeyond.com/our-lodges/ (May 2026)  
**Method:** Lodge directory scrape + lodge-page copy (accommodation / about)  
**Existing in DB:** andBeyond Punakha River Lodge (id 12186, published, site inventory complete)

## Full portfolio (28 properties on directory)

| # | Property | Region | Tagline (directory) |
|---|----------|--------|---------------------|
| 1 | Ngala Tented Camp | Kruger, South Africa | Romantic canvas sanctuary along Timbavati riverbed |
| 2 | Phinda Forest Lodge | Phinda, South Africa | Rare sand forest retreat lived from within |
| 3 | Serengeti Under Canvas | Serengeti, Tanzania | Immersive tented safari that moves with Great Migration |
| 4 | Grumeti Serengeti River Lodge | Serengeti, Tanzania | Secluded Big Five on Grumeti River |
| 5 | Phinda Vlei Lodge | Phinda, South Africa | Forest shadows and open wetland |
| 6 | Phinda Zuka Lodge | Phinda, South Africa | Safari hideaway for generations |
| 7 | Sandibe & Nxabega Under Canvas | Okavango, Botswana | Immersive safari camps close to nature |
| 8 | Amazon Explorer | Peruvian Amazon | Launching December 2026 |
| 9 | Suyian Lodge | Laikipia, Kenya | Ancient stone and wild space |
| 10 | Galapagos Explorer | Galápagos | Luxury expedition **yacht** |
| 11 | Punakha River Lodge | Bhutan | Mo Chhu river tented suites **(in DB)** |
| 12 | Sandibe Okavango Safari Lodge | Okavango, Botswana | Nature-inspired delta hideaway |
| 13 | Mnemba Island Lodge | Zanzibar | Barefoot island paradise |
| 14 | Phinda Homestead | Phinda, South Africa | Private safari home in sand forest |
| 15 | Klein's Camp | Serengeti, Tanzania | Private concession, Kuka Hills |
| 16 | Bateleur Camp | Masai Mara, Kenya | Timeless safari elegance |
| 17 | Kichwa Tembo Tented Camp | Masai Mara, Kenya | Classic Big Five tented camp |
| 18 | Ngorongoro Crater Lodge | Tanzania | Crater rim lodge (refurbishment) |
| 19 | Sossusvlei Desert Lodge | Namibia | Desertscape of sand, stars, solitude |
| 20 | Benguerra Island | Mozambique | Indian Ocean island lodge |
| 21 | Ngala Safari Lodge | Kruger, South Africa | Classic permanent safari lodge |
| 22 | Phinda Mountain Lodge | Phinda, South Africa | Hilltop Big Five for families |
| 23 | Nxabega Okavango Tented Camp | Okavango, Botswana | Rustic contemporary tented camp |
| 24 | Xaranna Okavango Delta Camp | Okavango, Botswana | Romantic tented camp |
| 25 | Phinda Rock Lodge | Phinda, South Africa | Stone suites on Zululand cliff |
| 26 | Chobe Under Canvas | Chobe, Botswana | Tented canvas luxury |
| 27 | Lake Manyara Tree Lodge | Tanzania | Treehouse sanctuary in mahogany forest |
| 28 | Vira Vira | Chile Lake District | Soulful riverside farm |

## Classification criteria (Sage)

- **Glamping Resort:** Primary inventory is canvas tents, mobile camps, or treehouse-style outdoor structures with hotel-level service (safari tented camp, “under canvas,” tree lodge).
- **Landscape Hotel:** Built form is designed to recede into or follow terrain—stone/glass desert suites, crater-rim architecture, cliff-integrated suites, biomimicry lodges (per Sage glossary).
- **Outdoor Boutique Hotel:** Small-scale, design-led, nature-forward luxury with permanent suites/villas/farm lodge—not primarily tent inventory (island, homestead, forest suites).

## Recommended for `all_glamping_properties` (17 new anchor rows)

### Glamping Resort (9)

| Property | unit_type | Why |
|----------|-----------|-----|
| andBeyond Ngala Tented Camp | Safari Tent | Canvas suites on riverbed |
| andBeyond Serengeti Under Canvas | Safari Tent | Seasonal mobile tented camp |
| andBeyond Sandibe and Nxabega Under Canvas | Safari Tent | Dual under-canvas delta camps |
| andBeyond Chobe Under Canvas | Safari Tent | Tented canvas on Chobe |
| andBeyond Nxabega Okavango Tented Camp | Safari Tent | Permanent tented camp |
| andBeyond Xaranna Okavango Delta Camp | Safari Tent | Romantic tented camp |
| andBeyond Kichwa Tembo Tented Camp | Safari Tent | Mara tented camp |
| andBeyond Lake Manyara Tree Lodge | Treehouse | Only lodge in Manyara; treehouse suites |

### Landscape Hotel (5)

| Property | unit_type | Why |
|----------|-----------|-----|
| andBeyond Sossusvlei Desert Lodge | Suite | “Invisible by design”; stone/glass suites on private desert reserve; skylights, desert pools |
| andBeyond Ngorongoro Crater Lodge | Suite | Iconic crater-rim architecture (temporarily closed for refurbishment) |
| andBeyond Sandibe Okavango Safari Lodge | Suite | Pangolin-inspired lodge sculpted into delta landscape |
| andBeyond Phinda Rock Lodge | Suite | Intimate stone suites on rocky outcrop overlooking valley |
| andBeyond Suyian Lodge | Lodge | Stone-rooted Laikipia lodge in wild conservancy |

### Outdoor Boutique Hotel (3)

| Property | unit_type | Why |
|----------|-----------|-----|
| andBeyond Vira Vira | Lodge | Small riverside farm lodge, Chile (not safari tents) |
| andBeyond Phinda Forest Lodge | Suite | Sand-forest glass/stilted suites “lived from within” |
| andBeyond Mnemba Island Lodge | Villa | Exclusive barefoot island bandas/villas |

## Excluded from this batch (11) — rationale

| Property | Reason |
|----------|--------|
| Punakha River Lodge | Already in DB (published) |
| Galapagos Explorer | Expedition yacht, not land-based outdoor hospitality |
| Amazon Explorer | River vessel; launching Dec 2026 — revisit when live |
| Grumeti Serengeti River Lodge | Conventional luxury river lodge |
| Ngala Safari Lodge | Permanent brick-and-thatch safari lodge |
| Phinda Vlei / Mountain / Zuka | Standard Phinda safari lodges |
| Klein's Camp / Bateleur Camp | Permanent luxury bush camps (cottages/lodge rooms), not tent-primary |
| Benguerra Island | Beach island lodge (different comp set) |
| Phinda Homestead | Private villa product — optional future add as Outdoor Boutique |

## Next steps (not in this migration)

1. Site-level enrichment (suites, tents, rates) per property from `/rates/` pages — same workflow as Punakha.
2. Link all rows to `glamping_brands.slug = andbeyond` (brand exists).
3. Re-evaluate **Amazon Explorer** after Dec 2026 launch.
4. Optional: **Phinda Homestead** as Outdoor Boutique private villa.

## Lodge URLs (recommended adds)

```
https://www.andbeyond.com/our-lodges/africa/south-africa/kruger-national-park/ngala-private-game-reserve/andbeyond-ngala-tented-camp/
https://www.andbeyond.com/our-lodges/africa/tanzania/serengeti-national-park/andbeyond-serengeti-under-canvas/
https://www.andbeyond.com/our-lodges/africa/botswana/okavango-delta/andbeyond-sandibe-and-nxabega-under-canvas/
https://www.andbeyond.com/our-lodges/africa/botswana/chobe-national-park/andbeyond-chobe-under-canvas/
https://www.andbeyond.com/our-lodges/africa/botswana/okavango-delta/andbeyond-nxabega-okavango-tented-camp/
https://www.andbeyond.com/our-lodges/africa/botswana/okavango-delta/andbeyond-xaranna-okavango-delta-camp/
https://www.andbeyond.com/our-lodges/africa/kenya/masai-mara-national-park/andbeyond-kichwa-tembo-tented-camp/
https://www.andbeyond.com/our-lodges/africa/tanzania/lake-manyara-national-park/andbeyond-lake-manyara-tree-lodge/
https://www.andbeyond.com/our-lodges/africa/namibia/sossusvlei-desert/andbeyond-sossusvlei-desert-lodge/
https://www.andbeyond.com/our-lodges/africa/tanzania/ngorongoro-crater/andbeyond-ngorongoro-crater-lodge/
https://www.andbeyond.com/our-lodges/africa/botswana/okavango-delta/andbeyond-sandibe-okavango-safari-lodge/
https://www.andbeyond.com/our-lodges/africa/south-africa/kwazulu-natal/phinda-private-game-reserve/andbeyond-phinda-rock-lodge/
https://www.andbeyond.com/our-lodges/africa/kenya/laikipia/suyian-conservancy/andbeyond-suyian-lodge/
https://www.andbeyond.com/our-lodges/south-america/chile/lake-district/andbeyond-vira-vira/
https://www.andbeyond.com/our-lodges/africa/south-africa/kwazulu-natal/phinda-private-game-reserve/andbeyond-phinda-forest-lodge/
https://www.andbeyond.com/our-lodges/africa/andbeyond-mnemba-island/
```
