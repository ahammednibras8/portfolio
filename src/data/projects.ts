/*
 * The project cards. Each summary comes from the project's own README or GitHub
 * description, cut down to what the code does. Nibras reviews every line before
 * it counts as a claim, so change a card here, not in the page.
 */
import {
  Cpu,
  Database,
  Layers,
  MessageCircleMore,
  Server,
  ShieldCheck,
} from "@lucide/astro";

export interface Project {
  name: string;
  summary: string;
  stack: string;
  href: string;
  Icon: typeof Layers;
}

const github = "https://github.com/ahammednibras8";

export const projects: Project[] = [
  {
    name: "Cascade",
    summary:
      "Runs background tasks and keeps a durable record of each run. I started the project and maintain it.",
    stack: "TypeScript · PostgreSQL · Redis",
    href: "#cascade",
    Icon: Layers,
  },
  {
    name: "Rivet",
    summary:
      "Gives T3 Code a durable home in the cloud, so AI-assisted development can continue from a phone without depending on a personal laptop.",
    stack: "AWS · HCL · Shell",
    href: `${github}/rivet`,
    Icon: Server,
  },
  {
    name: "Secure MCP Database Bridge",
    summary:
      "A reference implementation of a Zero Trust gateway between AI agents and a database. It checks every query with PostgreSQL’s own parser, compiled to WebAssembly, before the query reaches the database.",
    stack: "JavaScript · TypeScript · WebAssembly",
    href: `${github}/secure-mcp-db`,
    Icon: ShieldCheck,
  },
  {
    name: "llama.cpp inference server",
    summary:
      "A minimal HTTP server built directly on llama.cpp to measure RAM use, throughput, and concurrency under real load. A controlled experiment, not a production server.",
    stack: "Python · llama.cpp",
    href: `${github}/llama-infrence-server`,
    Icon: Cpu,
  },
  {
    name: "Organic KV",
    summary:
      "A persistent key-value store in Go. It counts how often each key is used, then keeps hot data in memory and moves cold data to disk when it flushes.",
    stack: "Go",
    href: `${github}/kvstore`,
    Icon: Database,
  },
  {
    name: "Apple Music Discord Bridge",
    summary:
      "A macOS command-line program that shows what is playing in Apple Music as your Discord status.",
    stack: "Go · macOS",
    href: `${github}/applemusicdiscord`,
    Icon: MessageCircleMore,
  },
];
