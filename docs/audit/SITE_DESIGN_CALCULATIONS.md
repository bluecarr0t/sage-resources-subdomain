# Site Design Calculator — Methodology & Calculations

**Tool:** Site Design (RV Park Yield & Economics Calculator)  
**Location:** `/admin/site-design`  
**Version:** March 2026

---

## 1. Purpose & Scope

The Site Design calculator estimates **site count**, **annual revenue**, **NOI**, and **estimated value** for RV park development based on parcel characteristics and site-type configurations. It is intended for:

- **Internal use:** Feasibility screening, site mix optimization, and client presentations
- **External use:** Sharing with clients, lenders, and partners as a transparent, documented methodology

This document describes all formulas, assumptions, and logic used in the calculator. Results are estimates only and should be validated with site-specific engineering and market analysis.

---

## 2. Constants

| Constant | Value | Description |
|----------|-------|-------------|
| SQFT_PER_ACRE | 43,560 | Square feet per acre (U.S. survey acre) |

---

## 3. Input Parameters

### 3.1 Parcel & Road

| Parameter | Symbol / Variable | Description | Typical Range |
|-----------|-------------------|-------------|---------------|
| Gross acreage | \( A_{gross} \) | Total parcel size in acres | 10–500 |
| Usable % | \( u \) | Share of gross land usable for development (excludes wetlands, slopes, setbacks) | 60–85% |
| Road width | \( w_{road} \) | Typical road width in feet | 18–40 ft |
| Block efficiency | \( e \) | Fraction of pad area actually usable (accounts for corners, irregular shapes, setbacks) | 0.70–1.0 |

### 3.2 Operating Assumptions

| Parameter | Symbol / Variable | Description | Typical Range |
|-----------|-------------------|-------------|---------------|
| Operating nights | \( N \) | Nights per year the park operates | 180–365 |
| Operating expense ratio | \( r_{opex} \) | Operating expenses as % of gross revenue | 40–60% |
| Cap rate | \( c \) | Capitalization rate for value estimate | 7–12% |

### 3.3 Site Types

For each site type:

| Parameter | Symbol | Description |
|-----------|--------|-------------|
| Width | \( W \) | Pad width in feet |
| Depth | \( D \) | Pad depth in feet |
| ADR | \( P \) | Average daily rate ($) |
| Occupancy | \( o \) | Occupancy rate (0–100%) |
| Count | \( n \) | Number of sites (optional; see §5) |
| Dev cost | \( C_{dev} \) | Development cost per site ($) |

---

## 4. Core Calculations

### 4.1 Land Allocation

**Net usable acres**
\[
A_{net} = A_{gross} \times \frac{u}{100}
\]

**Net usable square feet**
\[
S_{net} = A_{net} \times 43{,}560
\]

**Road allocation percentage**

Road width determines the share of net usable land allocated to roads:
\[
r_{road} = \max\bigl(0.10,\ \min\bigl(0.30,\ 0.12 + (w_{road} - 18) \times 0.008\bigr)\bigr)
\]

- Base: 12% at 18 ft road width  
- Increment: 0.8% per additional foot of road width  
- Clamped to 10–30%

**Land available for sites**
\[
S_{sites} = S_{net} \times (1 - r_{road})
\]

---

### 4.2 Per-Site-Type Metrics

**Pad area (sq ft)**
\[
S_{pad} = W \times D
\]

**Effective land per site (sq ft)**

Accounts for block efficiency (corner/geometry loss):
\[
S_{eff} = \frac{S_{pad}}{e}
\]

**Maximum sites per type**
\[
n_{max} = \left\lfloor \frac{S_{sites}}{S_{eff}} \right\rfloor
\]

**Revenue per sq ft (annual)**

Used for auto-fill selection:
\[
R_{sqft} = \frac{P \times \frac{o}{100} \times N}{S_{eff}}
\]

---

### 4.3 Site Count & Revenue

**User-entered counts**

When the user enters counts for one or more site types, those counts are used directly.

**Annual revenue per site type**
\[
R_{site} = n \times P \times \frac{o}{100} \times N
\]

**Total annual revenue**
\[
R_{annual} = \sum_{\text{all types}} R_{site}
\]

**Revenue per acre**
\[
R_{acre} = \frac{R_{annual}}{A_{net}}
\]

**Land used**
\[
S_{used} = \sum_{\text{all types}} \bigl( n \times S_{eff} \bigr)
\]

---

### 4.4 Operating & Value Metrics

**Operating expenses**
\[
E_{opex} = R_{annual} \times \frac{r_{opex}}{100}
\]

**Net operating income (NOI)**
\[
NOI = R_{annual} - E_{opex}
\]

**NOI per acre**
\[
NOI_{acre} = \frac{NOI}{A_{net}}
\]

**Total development cost**
\[
C_{total} = \sum_{\text{all types}} (n \times C_{dev})
\]

**Estimated value (capitalization)**
\[
V_{est} = \frac{NOI}{c/100}
\]

where \( c \) is the cap rate in percent (e.g., 9 for 9%).

---

## 5. Auto-Fill Logic

### 5.1 No Counts Entered (Full Auto-Fill)

When **all** site counts are blank:

1. For each site type, compute \( R_{sqft} \) (revenue per sq ft).
2. Select the type with the **highest** \( R_{sqft} \).
3. Fill the parcel with that type: \( n = n_{max} \) for the selected type.
4. Revenue, NOI, and development cost use this single-type allocation.

**Rationale:** Maximizes total revenue for the given land by choosing the most land-efficient revenue generator.

### 5.2 Partial Counts Entered (Partial Auto-Fill)

When the user enters counts for **some** types but leaves others blank:

1. Compute land used by entered counts: \( S_{used} = \sum n \times S_{eff} \) for types with counts.
2. Remaining land: \( S_{remain} = S_{sites} - S_{used} \).
3. Among types with **no** count entered, select the one with the highest \( R_{sqft} \).
4. Auto-fill remaining land: \( n_{auto} = \lfloor S_{remain} / S_{eff} \rfloor \) for that type.
5. Add \( n_{auto} \) to total sites and revenue; include in development cost.

---

## 6. Over-Capacity Validation

If \( S_{used} > S_{sites} \), the calculator flags **over capacity**:

- Over capacity (sq ft): \( S_{used} - S_{sites} \)
- Over capacity (acres): \( (S_{used} - S_{sites}) / 43{,}560 \)

A warning is displayed. Revenue and NOI are still computed from the entered counts (no automatic capping).

---

## 7. Assumptions & Limitations

| Assumption | Implication |
|------------|-------------|
| Block efficiency is uniform | Actual layouts may vary by block shape and site type. |
| Road allocation is a function of width only | Terrain, loop vs. grid, and utility corridors can change road share. |
| ADR and occupancy are static | Real performance varies by season, market, and management. |
| Operating expense ratio is flat | Fixed vs. variable costs and scale effects are not modeled. |
| Cap rate is user input | Market-specific; not derived from comparable sales. |
| No utilities, amenities, or common area | Development cost is per-site only; infrastructure is not itemized. |
| No phasing or financing | Single-phase, all-at-once development assumed. |

---

## 8. Example (Standard Preset)

**Inputs:** 50 acres gross, 75% usable, 24 ft roads, 0.9 block efficiency, 365 nights, 45% opex, 9% cap rate.

**Land:**
- \( A_{net} = 50 \times 0.75 = 37.5 \) acres  
- \( S_{net} = 37.5 \times 43{,}560 = 1{,}633{,}500 \) sq ft  
- \( r_{road} = 0.12 + (24-18) \times 0.008 = 0.168 \) (16.8%)  
- \( S_{sites} = 1{,}633{,}500 \times (1 - 0.168) = 1{,}359{,}180 \) sq ft  

**Site type (Pull-thru):** 45×90 ft, ADR $110, 70% occupancy  

- \( S_{pad} = 4{,}050 \) sq ft  
- \( S_{eff} = 4{,}050 / 0.9 = 4{,}500 \) sq ft  
- \( n_{max} = \lfloor 1{,}359{,}180 / 4{,}500 \rfloor = 302 \) sites  

**Revenue (auto-fill):**
- \( R_{annual} = 302 \times 110 \times 0.70 \times 365 = \$8{,}492{,}710 \)  
- \( NOI = 8{,}492{,}710 \times (1 - 0.45) = \$4{,}670{,}991 \)  
- \( V_{est} = 4{,}670{,}991 / 0.09 = \$51{,}899{,}900 \)  

---

## 9. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 2026 | Sage Outdoor Advisory | Initial methodology document |

---

*This document may be shared internally and externally. For questions or updates, contact the Sage Outdoor Advisory team.*
