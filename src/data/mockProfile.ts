import { DeveloperProfile } from "@/types/profile";

export const INITIAL_DEVELOPER_PROFILE: DeveloperProfile = {
  id: "user-arneldev",
  name: "Arnel Rivera",
  username: "arneldev",
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
  role: "Principal Frontend Architect",
  pronouns: "he/him",
  bio: "Principal Frontend Architect & Systems Enthusiast. Engineering zero-runtime state containers, sub-millisecond reactive UI pipelines, and open developer standards.",
  status: {
    emoji: "🚀",
    message: "Shipping RateFactor v2 & micro-state containers",
    isBusy: false,
    statusType: "available",
    updatedAt: "2h ago",
  },
  company: "@RateFactor / Independent Core",
  location: "San Francisco, CA",
  website: "https://arnel.dev",
  github: "https://github.com/arneldev",
  twitter: "https://twitter.com/arneldev",
  linkedin: "https://linkedin.com/in/arneldev",
  readmeMarkdown: `### Hi, I'm Arnel Rivera 👋

Building high-throughput devtools, concurrent UI state engines, and distributed web telemetry. Obsessed with zero-runtime abstractions, memory layout optimization, and typographic craft.

- 🔭 **Currently Building:** Concurrent bitmask state architectures and low-overhead Next.js profiling runtimes.
- ⚡ **Engineering Principles:** Zero speculative abstractions, subgrid layout purity, and mechanical sympathy.
- 🎯 **Showcasing Here:** Production-tested developer tools open for peer review and architectural critique.
- 💬 **Collaborate With Me:** Open for discussions on WebAssembly runtimes, CRDTs, and client-side compilers.
- 📬 **Get In Touch:** [arnel.dev](https://arnel.dev) • [GitHub](https://github.com/arneldev) • [Twitter](https://twitter.com/arneldev)`,
  pinnedPortfolioIds: ["zenith-state", "pulse-tracer"],
  spotlightPortfolioId: "zenith-state",
  skills: [
    "TypeScript",
    "Rust",
    "Next.js 15",
    "React 19",
    "WASM",
    "Tailwind CSS",
    "Vitest",
    "WebGPU",
    "eBPF",
  ],
  joinedDate: "January 2026",
};

export const STATUS_PRESETS = [
  { emoji: "🎯", message: "Deep work / Focusing", statusType: "focusing" as const },
  { emoji: "🚀", message: "Shipping features & updates", statusType: "available" as const },
  { emoji: "💻", message: "Coding new architecture", statusType: "available" as const },
  { emoji: "🛠️", message: "Debugging memory leaks", statusType: "busy" as const },
  { emoji: "☕", message: "Coffee break / Catching up", statusType: "available" as const },
  { emoji: "⚡", message: "Benchmarking performance", statusType: "focusing" as const },
  { emoji: "🤝", message: "Open for collab & reviews", statusType: "available" as const },
  { emoji: "🌴", message: "AFK / Out of office", statusType: "offline" as const },
];
