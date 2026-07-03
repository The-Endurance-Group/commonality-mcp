import type { Employee } from "@commonality/shared";

// Ported verbatim from the reference repo (server/services/analysis.ts).
// This is the moat - DO NOT change the scoring order or the alias/normalization
// tables. Only the type import path differs from the original.

export interface Commonality {
  type: "alma_mater" | "company" | "location" | "linkedin_connection";
  value: string;
  strength: number;
}

export interface ProspectProfile {
  name: string;
  title?: string;
  company?: string;
  almaMater?: string;
  graduationYear?: string;
  pastCompanies?: string[];
  currentLocation?: string;
  bio?: string;
  degrees?: string[];
  fieldsOfStudy?: string[];
  connectionCount?: number;
}

export interface ConnectionResult {
  employee: Employee;
  commonalities: Commonality[];
  strengthScore: number;
}

const GENERIC_COMPANIES = ["inc", "inc.", "llc", "corp", "corp.", "ltd", "ltd.", "company", "co", "co.", "group", "holdings", "solutions", "services", "consulting", "technologies"];
const GENERIC_LOCATIONS = ["united states", "usa", "us", "america", "california", "new york", "texas", "florida", "area", "region", "metropolitan", "metro", "greater"];

// Strip common legal-entity suffixes so "Acme Inc." matches "Acme". The suffix must be preceded
// by a separator (or start of string) - without this, short suffixes like "co"/"ag"/"sa" would
// match the tail of unrelated names (e.g. "Geico" -> "Gei", "Ecco" -> "Ec").
const COMPANY_SUFFIX_RE = /(?:^|[\s,.])[\s,.]*(inc\.?|llc\.?|ltd\.?|corp\.?|co\.?|plc\.?|lp\.?|llp\.?|pllc\.?|gmbh|ag|sa|nv|bv|& co\.?|and company|and co\.?|international|worldwide|global|holdings?|group|ventures?|partners?)$/i;

function stripCompanySuffixes(name: string): string {
  let s = name.trim();
  let prev = "";
  // Strip multiple suffixes iteratively (e.g. "Acme Corp, Inc.")
  while (s !== prev) { prev = s; s = s.replace(COMPANY_SUFFIX_RE, "").trim(); }
  return s;
}

// Two-way alias map: both "ey" and "ernst & young" map to the same canonical key.
// Keys are lowercased aliases; values are their canonical lowercased name.
const COMPANY_ALIASES: Record<string, string> = {
  // Big 4 / consulting
  "ey": "ernst & young",
  "ernst & young": "ernst & young",
  "ernst and young": "ernst & young",
  "pwc": "pwc",
  "pricewaterhousecoopers": "pwc",
  "pricewaterhousecoopers llp": "pwc",
  "price waterhouse coopers": "pwc",
  "price waterhousecoopers": "pwc",
  "kpmg": "kpmg",
  "kpmg international": "kpmg",
  "deloitte": "deloitte",
  "deloitte touche": "deloitte",
  "deloitte & touche": "deloitte",
  "mckinsey": "mckinsey & company",
  "mckinsey & company": "mckinsey & company",
  "mckinsey and company": "mckinsey & company",
  "bcg": "boston consulting group",
  "boston consulting group": "boston consulting group",
  "bain": "bain & company",
  "bain & company": "bain & company",
  "bain and company": "bain & company",
  "accenture": "accenture",
  // Banks / finance
  "jpmorgan": "jpmorgan chase",
  "jp morgan": "jpmorgan chase",
  "jpmorgan chase": "jpmorgan chase",
  "j.p. morgan": "jpmorgan chase",
  "jpm": "jpmorgan chase",
  "goldman sachs": "goldman sachs",
  "gs": "goldman sachs",
  "morgan stanley": "morgan stanley",
  "ms": "morgan stanley",
  "bofa": "bank of america",
  "bank of america": "bank of america",
  "boa": "bank of america",
  "wells fargo": "wells fargo",
  "citi": "citigroup",
  "citibank": "citigroup",
  "citigroup": "citigroup",
  "ubs": "ubs",
  "credit suisse": "credit suisse",
  "blackrock": "blackrock",
  "fidelity": "fidelity investments",
  "fidelity investments": "fidelity investments",
  "vanguard": "vanguard",
  // Tech
  "google": "google",
  "alphabet": "google",
  "meta": "meta",
  "facebook": "meta",
  "amazon": "amazon",
  "aws": "amazon web services",
  "amazon web services": "amazon web services",
  "microsoft": "microsoft",
  "msft": "microsoft",
  "apple": "apple",
  "ibm": "ibm",
  "international business machines": "ibm",
  "oracle": "oracle",
  "salesforce": "salesforce",
  "sap": "sap",
  "intel": "intel",
  "hp": "hp",
  "hewlett-packard": "hp",
  "hewlett packard": "hp",
  "hpe": "hpe",
  "hewlett packard enterprise": "hpe",
  "cisco": "cisco",
  "cisco systems": "cisco",
  "nvidia": "nvidia",
  "netflix": "netflix",
  "uber": "uber",
  "lyft": "lyft",
  "airbnb": "airbnb",
  "twitter": "twitter",
  "x (formerly twitter)": "twitter",
  "x corp": "twitter",
  "linkedin": "linkedin",
  "adobe": "adobe",
  "adobe systems": "adobe",
  "vmware": "vmware",
  "dell": "dell",
  "dell technologies": "dell",
  "att": "at&t",
  "at&t": "at&t",
  "verizon": "verizon",
  "t-mobile": "t-mobile",
  "tmobile": "t-mobile",
  // Energy / industrial
  "ge": "general electric",
  "general electric": "general electric",
  "3m": "3m",
  "minnesota mining": "3m",
  "pg&e": "pg&e",
  "exxon": "exxonmobil",
  "exxonmobil": "exxonmobil",
  "chevron": "chevron",
  "bp": "bp",
  "british petroleum": "bp",
  "shell": "shell",
  // Healthcare / pharma
  "j&j": "johnson & johnson",
  "jnj": "johnson & johnson",
  "johnson & johnson": "johnson & johnson",
  "johnson and johnson": "johnson & johnson",
  "p&g": "procter & gamble",
  "pg": "procter & gamble",
  "procter & gamble": "procter & gamble",
  "procter and gamble": "procter & gamble",
  "pfizer": "pfizer",
  "merck": "merck",
  "abbvie": "abbvie",
  "abbott": "abbott",
  "medtronic": "medtronic",
  "unitedhealth": "unitedhealth",
  "united health group": "unitedhealth",
  // Retail / consumer
  "walmart": "walmart",
  "wal-mart": "walmart",
  "target": "target",
  "costco": "costco",
  "nike": "nike",
  "disney": "disney",
  "the walt disney company": "disney",
};

function normalizeCompany(name: string): string {
  const normalized = name.normalize("NFC");
  const stripped = stripCompanySuffixes(normalized);
  const lower = stripped.toLowerCase().replace(/\s*&\s*/g, "&").replace(/&/g, "and").replace(/\s+/g, " ").trim();
  // Check alias table with the ampersand-normalized version too
  if (COMPANY_ALIASES[lower]) return COMPANY_ALIASES[lower];
  // Also check original lowercase before suffix stripping
  const origLower = name.toLowerCase().trim();
  if (COMPANY_ALIASES[origLower]) return COMPANY_ALIASES[origLower];
  return lower;
}

// Display name overrides: canonical (lowercase) → preferred display string shown in charts.
const COMPANY_DISPLAY: Record<string, string> = {
  "pwc": "PwC",
  "kpmg": "KPMG",
  "ey": "EY",
  "ibm": "IBM",
  "hpe": "HPE",
  "hp": "HP",
  "sap": "SAP",
  "aws": "AWS",
  "ups": "UPS",
  "cvs": "CVS",
};

// Common abbreviations that substring matching misses (both directions normalized below).
const SCHOOL_ALIASES: Record<string, string> = {
  // Acronyms / initials
  "mit": "massachusetts institute of technology",
  "cmu": "carnegie mellon university",
  "ucla": "university of california, los angeles",
  "ucsd": "university of california, san diego",
  "ucsb": "university of california, santa barbara",
  "uci": "university of california, irvine",
  "ucsc": "university of california, santa cruz",
  "usc": "university of southern california",
  "nyu": "new york university",
  "lsu": "louisiana state university",
  "unc": "university of north carolina",
  "uf": "university of florida",
  "uva": "university of virginia",
  "umd": "university of maryland",
  "uic": "university of illinois chicago",
  "uiuc": "university of illinois urbana-champaign",
  "bu": "boston university",
  "bc": "boston college",
  "tcu": "texas christian university",
  "ttu": "texas tech university",
  "smu": "southern methodist university",
  "asu": "arizona state university",
  "wsu": "washington state university",
  "osu": "ohio state university",
  "psu": "pennsylvania state university",
  "vcu": "virginia commonwealth university",
  "fsu": "florida state university",
  "fiu": "florida international university",
  "gsu": "georgia state university",
  "ku": "university of kansas",
  // "U of X" → canonical name
  "u of michigan": "university of michigan",
  "u of illinois": "university of illinois",
  "u of florida": "university of florida",
  "u of texas": "university of texas",
  "u of washington": "university of washington",
  "u of virginia": "university of virginia",
  "u of maryland": "university of maryland",
  "u of minnesota": "university of minnesota",
  "u of wisconsin": "university of wisconsin",
  "u of colorado": "university of colorado",
  "u of arizona": "university of arizona",
  "u of connecticut": "university of connecticut",
  "u of north carolina": "university of north carolina",
  "u of southern california": "university of southern california",
  "u of pittsburgh": "university of pittsburgh",
  "u of chicago": "university of chicago",
  "u of pennsylvania": "university of pennsylvania",
  "u of notre dame": "university of notre dame",
  // "Univ of X" / "Univ X" → canonical name
  "univ of michigan": "university of michigan",
  "univ michigan": "university of michigan",
  "univ of illinois": "university of illinois",
  "univ of florida": "university of florida",
  "univ of texas": "university of texas",
  "univ of washington": "university of washington",
  // Common short names / campus disambiguation
  "carnegie mellon": "carnegie mellon university",
  "northeastern": "northeastern university",
  "ohio state": "ohio state university",
  "penn state": "pennsylvania state university",
  "georgia tech": "georgia institute of technology",
  "gatech": "georgia institute of technology",
  "rutgers": "rutgers university",
  "purdue": "purdue university",
  "tulane": "tulane university",
  "vanderbilt": "vanderbilt university",
  "emory": "emory university",
  "drexel": "drexel university",
  "fordham": "fordham university",
  "villanova": "villanova university",
  "georgetown": "georgetown university",
  "american university": "american university",
  "cal poly": "california polytechnic state university",
  "cal state": "california state university",
  // Ivy / elite short names
  "harvard": "harvard university",
  "yale": "yale university",
  "princeton": "princeton university",
  "columbia": "columbia university",
  "dartmouth": "dartmouth college",
  "brown": "brown university",
  "cornell": "cornell university",
  "penn": "university of pennsylvania",
  "upenn": "university of pennsylvania",
  "stanford": "stanford university",
  "duke": "duke university",
  "northwestern": "northwestern university",
  "rice": "rice university",
  "wake forest": "wake forest university",
  "tufts": "tufts university",
};

function normalizeSchool(name: string): string {
  // Unicode-normalize first: LinkedIn scrapes from different sources can encode the
  // same accented text in different normalization forms (NFC vs NFD), which otherwise
  // makes visually-identical school names compare as different strings.
  const lower = name.normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
  if (SCHOOL_ALIASES[lower]) return SCHOOL_ALIASES[lower];
  // Expand "u of X" / "univ of X" / "univ. of X" to "university of X" when no explicit alias.
  const uOf = lower.match(/^(?:u\.?|univ\.?) of (.+)$/);
  if (uOf) return `university of ${uOf[1].trim()}`;
  // Fold diacritics so accented and ASCII-transliterated spellings of the same
  // non-English institution (e.g. "Boğaziçi Üniversitesi" vs "Bogazici University")
  // collapse into one bucket instead of rendering as separate chart bars.
  return lower.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Compare a prospect's profile against a list of employees and return ranked
 * connections sharing schools, past companies, locations, or direct LinkedIn connections.
 * Pass `linkedInConnectors` (employeeId → matchType) from storage.findLinkedInConnectors()
 * to include 1st-degree connection signals.
 */
export function findConnections(
  prospect: ProspectProfile,
  employees: Employee[],
  linkedInConnectors?: Map<string, "url" | "name">
): ConnectionResult[] {
  const results: ConnectionResult[] = [];

  for (const employee of employees) {
    const commonalities: Commonality[] = [];
    let strengthScore = 0;

    // 1st-degree LinkedIn connection - highest possible signal (strength 5).
    if (linkedInConnectors?.has(employee.id)) {
      commonalities.push({ type: "linkedin_connection", value: "1st-degree LinkedIn connection", strength: 5 });
      strengthScore += 5;
    }

    // Education - collect ALL matching schools (not just the first).
    const splitSchools = (s: string) =>
      (s.includes(";") ? s.split(";") : s.split(/, /)).map(p => p.trim()).filter(Boolean);
    const prospectSchools = prospect.almaMater ? splitSchools(prospect.almaMater) : [];

    const seenSchools = new Set<string>();
    if (prospectSchools.length > 0 && employee.almaMater) {
      const employeeSchools = splitSchools(employee.almaMater);
      for (const ps of prospectSchools) {
        const psNorm = normalizeSchool(ps);
        for (const es of employeeSchools) {
          if (es.toLowerCase() === "none listed" || es.length < 4) continue;
          const esNorm = normalizeSchool(es);
          const matched =
            psNorm === esNorm ||
            ((psNorm.includes(esNorm) || esNorm.includes(psNorm)) && psNorm.length >= 6 && esNorm.length >= 6);
          if (matched && !seenSchools.has(esNorm)) {
            seenSchools.add(esNorm);
            let strength = 3;
            // Graduation year proximity bonus.
            const py = parseInt(prospect.graduationYear || "", 10);
            const ey = parseInt(employee.graduationYear || "", 10);
            if (!isNaN(py) && !isNaN(ey) && Math.abs(py - ey) <= 5) strength += 1;
            commonalities.push({ type: "alma_mater", value: ps, strength });
            strengthScore += strength;
          }
        }
      }
    }

    // Past companies - deduplicate matches within the same employee pairing.
    const seenCompanies = new Set<string>();
    const employeePastCompanies = Array.isArray(employee.pastCompanies) ? employee.pastCompanies as string[] : [];
    const allProspectCompanies = [
      ...(prospect.pastCompanies || []),
      ...(prospect.company ? [prospect.company] : []),
    ];
    if (allProspectCompanies.length > 0 && employeePastCompanies.length > 0) {
      for (const pc of allProspectCompanies) {
        for (const ec of employeePastCompanies) {
          const pcNorm = normalizeCompany(pc);
          const ecNorm = normalizeCompany(ec);
          if (
            pcNorm.length >= 3 && ecNorm.length >= 3 &&
            !GENERIC_COMPANIES.includes(pcNorm) && !GENERIC_COMPANIES.includes(ecNorm) &&
            !seenCompanies.has(ecNorm)
          ) {
            const matched =
              pcNorm === ecNorm ||
              (pcNorm.includes(ecNorm) && ecNorm.length >= 4) ||
              (ecNorm.includes(pcNorm) && pcNorm.length >= 4);
            if (matched) {
              seenCompanies.add(ecNorm);
              commonalities.push({ type: "company", value: ec, strength: 2 });
              strengthScore += 2;
            }
          }
        }
      }
    }

    // Location
    if (prospect.currentLocation && employee.currentLocation) {
      const pl = prospect.currentLocation.toLowerCase().trim();
      const el = employee.currentLocation.toLowerCase().trim();
      if (pl.length >= 4 && el.length >= 4) {
        const isGeneric = GENERIC_LOCATIONS.some(t => pl === t || el === t || pl.endsWith(", " + t) || el.endsWith(", " + t));
        if (!isGeneric && (pl.includes(el) || el.includes(pl))) {
          const words = el.split(/[\s,]+/).filter(w => w.length > 2);
          if (words.length >= 1 && !GENERIC_LOCATIONS.includes(words[0])) {
            commonalities.push({ type: "location", value: employee.currentLocation, strength: 1 });
            strengthScore += 1;
          }
        }
      }
    }

    if (commonalities.length > 0) {
      results.push({ employee, commonalities, strengthScore });
    }
  }

  results.sort((a, b) => b.strengthScore - a.strengthScore);

  // Deduplicate by employee name - keep the highest-scoring record when the same
  // person exists twice in the DB (e.g. two LinkedIn URL formats for the same employee).
  const seen = new Map<string, ConnectionResult>();
  for (const r of results) {
    const key = r.employee.name.trim().toLowerCase();
    const existing = seen.get(key);
    if (!existing || r.strengthScore > existing.strengthScore) seen.set(key, r);
  }
  return Array.from(seen.values()).sort((a, b) => b.strengthScore - a.strengthScore);
}

/* ---------------- Social capital inventory ---------------- */

export interface CountItem { label: string; count: number; }
export interface WordItem { word: string; count: number; }

export interface DetailPerson { name: string; linkedinUrl: string | null; }

export interface SocialCapital {
  totalEmployees: number;
  locations: CountItem[];
  schools: CountItem[];
  pastCompanies: CountItem[];
  fieldsOfStudy: CountItem[];
  degrees: CountItem[];
  bioWords: WordItem[];
  avgConnections: number | null;
  detail: {
    locations: Record<string, DetailPerson[]>;
    schools: Record<string, DetailPerson[]>;
    companies: Record<string, DetailPerson[]>;
    bioWords: Record<string, DetailPerson[]>;
    fields: Record<string, DetailPerson[]>;
  };
}

const STOPWORDS = new Set([
  "the","and","for","with","that","this","have","has","had","are","was","were","will","would","your","you","our","their","they","them","from","into","over","under","about","after","before","more","most","much","many","some","such","than","then","when","what","which","who","whom","whose","while","also","been","being","both","each","few","how","into","just","like","only","other","out","per","via","not","but","can","could","should","may","might","across","upon","within","including","helping","help","work","working","years","year","experience","experienced","professional","team","teams","company","companies","business","industry","industries","passionate","focused","focus","leader","leading","leadership","drive","driving","building","build","builder","love","loves","enjoy","enjoys","specializing","specialist","expert","skilled","proven","results","oriented","based","currently","previously","various","including","etc","new","using","use","used","make","making","made","get","got","one","two","all","any","its","his","her","him","she","he","i","a","an","of","to","in","on","at","is","as","by","or","be","it","we","us","my","me","do","so","up","if","no"
]);

export function computeSocialCapital(employees: Employee[], companyName?: string): SocialCapital {
  // Detail maps: normalized key → unique {name, linkedinUrl} entries
  const locationDetail = new Map<string, DetailPerson[]>();
  const schoolDetail   = new Map<string, DetailPerson[]>();
  const companyDetail  = new Map<string, DetailPerson[]>();
  const bioWordDetail  = new Map<string, DetailPerson[]>();
  const fieldDetail    = new Map<string, DetailPerson[]>();
  const fieldMap   = new Map<string, number>();
  const degreeMap  = new Map<string, number>();
  const wordMap    = new Map<string, number>();
  let connectionTotal = 0, connectionCounts = 0;

  const ownCompanyNormalized = companyName ? normalizeCompany(companyName) : null;

  // Track a person in a detail map - deduplicates by name so count == names.length
  const track = (detail: Map<string, DetailPerson[]>, key: string | null | undefined, person: DetailPerson) => {
    if (!key) return;
    const k = key.trim();
    if (!k || k.toLowerCase() === "none listed") return;
    const arr = detail.get(k) || [];
    if (!arr.some(p => p.name === person.name)) arr.push(person);
    detail.set(k, arr);
  };

  const bump = (map: Map<string, number>, key: string | null | undefined) => {
    if (!key) return;
    const k = key.trim();
    if (!k) return;
    map.set(k, (map.get(k) || 0) + 1);
  };

  // Split almaMater stored as "; " (new) or ", " (old legacy data)
  const splitAlmaMater = (s: string): string[] =>
    (s.includes(";") ? s.split(";") : s.split(/, /)).map(p => p.trim()).filter(Boolean);

  for (const emp of employees) {
    const person: DetailPerson = { name: emp.name, linkedinUrl: emp.linkedinUrl || null };
    track(locationDetail, emp.currentLocation, person);
    if (emp.almaMater) splitAlmaMater(emp.almaMater).forEach(s => track(schoolDetail, normalizeSchool(s), person));
    (Array.isArray(emp.pastCompanies) ? emp.pastCompanies as string[] : []).forEach(c => {
      const nc = normalizeCompany(c);
      if (!ownCompanyNormalized || nc !== ownCompanyNormalized) track(companyDetail, nc, person);
    });
    (emp.fieldsOfStudy as string[] | null || []).forEach(f => { bump(fieldMap, f); track(fieldDetail, f, person); });
    (emp.degrees as string[] | null || []).forEach(d => bump(degreeMap, d));
    if (typeof emp.connectionCount === "number") { connectionTotal += emp.connectionCount; connectionCounts++; }
    if (emp.bio) {
      const tokens = [...new Set(emp.bio.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/))];
      for (const tok of tokens) {
        if (tok.length >= 4 && !STOPWORDS.has(tok) && !/^\d+$/.test(tok)) {
          wordMap.set(tok, (wordMap.get(tok) || 0) + 1);
          track(bioWordDetail, tok, person);
        }
      }
    }
  }

  // \S+ (not \w) so accented/non-ASCII leading letters (ü, ö, İ, ç, ...) get capitalized
  // correctly too - \w is ASCII-only and would skip them, capitalizing the next letter instead.
  const toTitleCase = (s: string) =>
    s.replace(/\S+/g, w => w.charAt(0).toLocaleUpperCase() + w.slice(1));
  const formatLocation = (loc: string) =>
    loc.replace(/,?\s*United States$/i, "").trim() || loc;

  // Convert a detail map into sorted CountItem[] + keyed detail record simultaneously
  const fromDetail = (
    raw: Map<string, DetailPerson[]>,
    displayFn: (k: string) => string,
    limit: number
  ): { items: CountItem[]; detail: Record<string, DetailPerson[]> } => {
    // Merge raw keys that produce the same display label
    const merged = new Map<string, DetailPerson[]>();
    for (const [rawKey, persons] of raw.entries()) {
      const label = displayFn(rawKey);
      const existing = merged.get(label) || [];
      for (const p of persons) if (!existing.some(e => e.name === p.name)) existing.push(p);
      merged.set(label, existing);
    }
    const items = Array.from(merged.entries())
      .map(([label, persons]) => ({ label, count: persons.length }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, limit);
    const detail: Record<string, DetailPerson[]> = {};
    for (const { label } of items) detail[label] = merged.get(label) || [];
    return { items, detail };
  };

  const titleFn = (k: string) => COMPANY_DISPLAY[k.toLowerCase()] || toTitleCase(k);
  const locFn   = (k: string) => formatLocation(toTitleCase(k));

  const loc  = fromDetail(locationDetail, locFn,   Infinity);
  const sch  = fromDetail(schoolDetail,   titleFn,  Infinity);
  const comp = fromDetail(companyDetail,  titleFn,  Infinity);
  const flds = fromDetail(fieldDetail,    titleFn,   Infinity);

  const bioWords: WordItem[] = Array.from(wordMap.entries())
    .map(([word, count]) => ({ word, count }))
    .filter(w => w.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);

  return {
    totalEmployees: employees.length,
    locations: loc.items,
    schools: sch.items,
    pastCompanies: comp.items,
    fieldsOfStudy: flds.items,
    degrees: Array.from(degreeMap.entries()).map(([label, count]) => ({ label: toTitleCase(label), count })).sort((a,b) => b.count - a.count).slice(0, 50),
    bioWords,
    avgConnections: connectionCounts > 0 ? Math.round(connectionTotal / connectionCounts) : null,
    detail: {
      locations: loc.detail,
      schools: sch.detail,
      companies: comp.detail,
      fields: flds.detail,
      bioWords: Object.fromEntries(
        Array.from(bioWordDetail.entries()).filter(([, persons]) => persons.length >= 2)
      ),
    },
  };
}
