import { describe, expect, it, vi } from "vitest";

type Row = { employee_id: string; linkedin_url: string | null; full_name: string | null; company: string | null };

// Fake PostgREST builder that mimics the 1,000-row response cap and the two
// filters findLinkedInConnectors uses (ilike on url, eq on full_name).
const store: Row[] = [];
function builder() {
  const filters: ((r: Row) => boolean)[] = [];
  const b: any = {
    select: () => b,
    eq: (col: string, val: string) => {
      if (col === "full_name") filters.push((r) => r.full_name === val);
      return b;
    },
    ilike: (_col: string, pattern: string) => {
      const needle = pattern.replace(/^%/, "").replace(/%$/, "").replace(/\\([\\%_])/g, "$1").toLowerCase();
      filters.push((r) => (r.linkedin_url ?? "").toLowerCase().includes(needle));
      return b;
    },
    then: (resolve: (v: { data: Row[] }) => void) =>
      resolve({ data: store.filter((r) => filters.every((f) => f(r))).slice(0, 1000) }),
  };
  return b;
}

vi.mock("./client.js", () => ({ db: () => ({ from: () => builder() }) }));

const { findLinkedInConnectors } = await import("./queries.js");

describe("findLinkedInConnectors", () => {
  it("finds a match even when the company has far more than 1,000 connection rows", async () => {
    store.length = 0;
    for (let i = 0; i < 12_000; i++) {
      store.push({ employee_id: "jim", linkedin_url: `https://linkedin.com/in/filler-${i}`, full_name: `filler ${i}`, company: null });
    }
    store.push({ employee_id: "jim", linkedin_url: "https://linkedin.com/in/vivian-tang-mph", full_name: "vivian tang, mph", company: null });

    const res = await findLinkedInConnectors("c1", "https://www.linkedin.com/in/vivian-tang-mph/", "Vivian Tang", "J&J");
    expect(res.get("jim")).toBe("url");
  });

  it("matches legacy rows stored with www, uppercase or a trailing slash", async () => {
    store.length = 0;
    store.push({ employee_id: "gordon", linkedin_url: "https://www.linkedin.com/in/Some-Person/", full_name: "some person", company: null });
    const res = await findLinkedInConnectors("c1", "https://linkedin.com/in/some-person", "Other Name");
    expect(res.get("gordon")).toBe("url");
  });

  it("falls back to name match and returns nothing for strangers", async () => {
    store.length = 0;
    store.push({ employee_id: "a", linkedin_url: null, full_name: "mark reisig", company: null });
    expect((await findLinkedInConnectors("c1", "https://linkedin.com/in/x", "Mark Reisig")).get("a")).toBe("name");
    expect((await findLinkedInConnectors("c1", "https://linkedin.com/in/y", "Someone Else")).size).toBe(0);
  });
});
