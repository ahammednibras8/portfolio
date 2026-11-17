interface Experience {
  organization: string;
  role: string;
  start: string;
  startLabel: string;
  end: string | null;
  endLabel: string;
  context: string;
}

// Role facts supplied by Nibras. General professional scope comes from his
// public profile, not an inferred assignment of repositories to employers.
export const experience = [
  {
    organization: "Insource Data",
    role: "Developer",
    start: "2026-01",
    startLabel: "Jan 2026",
    end: null,
    endLabel: "Present",
    context: "Contract · Remote",
  },
  {
    organization: "NysaClan",
    role: "Intern",
    start: "2025-06",
    startLabel: "Jun 2025",
    end: "2025-09",
    endLabel: "Sep 2025",
    context: "Remote",
  },
] as const satisfies readonly Experience[];
