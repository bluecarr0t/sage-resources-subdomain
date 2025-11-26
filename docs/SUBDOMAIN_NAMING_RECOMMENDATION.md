# Subdomain Naming Recommendation

## 🎯 Current Situation

**Current Subdomain:** `marketing.sageoutdooradvisory.com`

**Content Hosted:**
- Landing pages (feasibility studies, appraisals, guides)
- Glossary terms (50+ definitions)
- Educational and informational content

## 📊 Subdomain Name Analysis

### Current: `marketing.sageoutdooradvisory.com`

**Pros:**
- ✅ Already set up and configured
- ✅ Clear that it's marketing-focused content
- ✅ Professional

**Cons:**
- ❌ "Marketing" is generic and doesn't convey educational value
- ❌ Less SEO-friendly (people don't search for "marketing")
- ❌ Doesn't clearly indicate it's a resource/learning hub
- ❌ May feel too sales-focused for glossary/educational content

## 🏆 Top Recommendations

### 1. **`resources.sageoutdooradvisory.com`** ⭐ BEST CHOICE

**Why This Is Optimal:**

✅ **SEO Benefits:**
- People search for "resources" (high search volume)
- Can rank for queries like "outdoor hospitality resources"
- Keyword-rich subdomain name
- Natural for both landing pages and glossary

✅ **User Experience:**
- Clearly indicates it's a resource hub
- Professional and trustworthy
- Works for both landing pages and glossary
- Easy to remember

✅ **Brand Positioning:**
- Positions Sage as a knowledge leader
- Educational, not just sales-focused
- Comprehensive resource center

✅ **Flexibility:**
- Can expand to include more content types
- Works for guides, tools, calculators, reports
- Future-proof naming

**Example URLs:**
- `resources.sageoutdooradvisory.com/landing/glamping-feasibility-study`
- `resources.sageoutdooradvisory.com/glossary/feasibility-study`
- `resources.sageoutdooradvisory.com/guides/...`
- `resources.sageoutdooradvisory.com/tools/...`

**SEO Potential:**
- "outdoor hospitality resources"
- "glamping resources"
- "RV resort resources"
- "feasibility study resources"

---

### 2. **`learn.sageoutdooradvisory.com`** ⭐ STRONG ALTERNATIVE

**Why This Works:**

✅ **SEO Benefits:**
- "Learn" is a high-intent keyword
- People search "learn about [topic]"
- Educational positioning
- Good for "how-to" and definition queries

✅ **User Experience:**
- Clear educational purpose
- Inviting and approachable
- Works well for glossary and guides

**Cons:**
- Slightly less professional than "resources"
- May feel too casual for B2B audience

**Example URLs:**
- `learn.sageoutdooradvisory.com/landing/glamping-feasibility-study`
- `learn.sageoutdooradvisory.com/glossary/feasibility-study`

---

### 3. **`guides.sageoutdooradvisory.com`**

**Why This Works:**

✅ **SEO Benefits:**
- "Guides" is a popular search term
- People search for "guides" and "how-to guides"
- Clear purpose

**Cons:**
- Less ideal for glossary (glossary isn't really "guides")
- May feel limiting for future expansion

---

### 4. **`library.sageoutdooradvisory.com`**

**Why This Works:**

✅ **Professional feel**
✅ **Comprehensive resource center**
✅ **Works for all content types**

**Cons:**
- Less SEO-friendly (lower search volume for "library")
- May feel too academic

---

## 🎯 Final Recommendation

### **Use: `resources.sageoutdooradvisory.com`**

**Rationale:**
1. **Best SEO Value**: "Resources" is a high-volume, high-intent keyword
2. **Clear Purpose**: Immediately communicates it's a resource hub
3. **Flexible**: Works for landing pages, glossary, and future content
4. **Professional**: Appropriate for B2B audience
5. **Brand Positioning**: Positions Sage as a knowledge leader
6. **User-Friendly**: Easy to remember and type

## 📋 Implementation Checklist

If changing from `marketing` to `resources`:

### Technical Changes Needed:
- [ ] Update DNS records (create `resources` subdomain)
- [ ] Update `app/sitemap.ts` - change baseUrl
- [ ] Update `app/robots.ts` - change baseUrl
- [ ] Update `app/layout.tsx` - update metadataBase
- [ ] Update `app/landing/[slug]/page.tsx` - update canonical URLs
- [ ] Update all documentation references
- [ ] Update root domain links (when implemented)
- [ ] Set up 301 redirects from `marketing.*` to `resources.*`
- [ ] Update Google Search Console property
- [ ] Update analytics tracking
- [ ] Update any external links/bookmarks

### SEO Considerations:
- [ ] Set up 301 redirects (critical for preserving rankings)
- [ ] Submit new sitemap to Google Search Console
- [ ] Update internal links
- [ ] Monitor for any ranking drops
- [ ] Update social media profiles if linked

## 🔄 Alternative: Keep `marketing` But Rebrand

If you want to keep the current subdomain for technical reasons:

**Option:** Keep `marketing.sageoutdooradvisory.com` but:
- Rebrand internally as "Resources" or "Resource Center"
- Use "Resources" in navigation and headers
- Update meta descriptions to say "resources"
- The URL can stay `marketing` while the brand is "resources"

**Pros:**
- No technical migration needed
- No risk of temporary ranking drops
- Can still position as resources

**Cons:**
- URL doesn't match branding
- Less SEO value from subdomain name
- Slightly confusing

## 📊 Comparison Table

| Subdomain | SEO Value | UX Clarity | Flexibility | Professional | Overall |
|-----------|-----------|------------|-------------|---------------|---------|
| **resources** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **95/100** |
| **learn** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **80/100** |
| **guides** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | **75/100** |
| **library** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **75/100** |
| **marketing** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | **60/100** |

## 🎯 Quick Decision Guide

**Choose `resources` if:**
- ✅ You want maximum SEO value
- ✅ You plan to expand content types
- ✅ You want clear, professional branding
- ✅ You're willing to do the migration

**Keep `marketing` if:**
- ✅ Migration is too complex right now
- ✅ You have many external links already
- ✅ You want to avoid any temporary ranking risk
- ✅ You can rebrand internally as "Resources"

## 💡 Recommendation Summary

**Best Choice:** `resources.sageoutdooradvisory.com`

This subdomain name:
- Maximizes SEO potential
- Clearly communicates purpose
- Works for both landing pages and glossary
- Positions Sage as a knowledge leader
- Is future-proof for expansion

**Migration Priority:** Medium-High
- Worth doing if you can handle the technical migration
- Can wait if current setup is working well
- Consider doing during a slower period to minimize risk

---

**Next Steps:**
1. Review this recommendation
2. Decide if migration is feasible
3. If yes, follow the implementation checklist
4. If no, consider internal rebranding strategy

