import { SignedIn, SignedOut, SignInButton, SignUpButton, useAuth } from "@clerk/clerk-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { JoinNoticeScreen } from "../components/JoinNoticeScreen";
import { useAuthStore } from "../lib/store";

// The site's main marketing page. Positioning: "Commonality teaches AI who
// you know" - the AI answers "How do we get into IBM?" with real relationship
// paths from across the user's organization, not just prospect research.

function StartFreeButton({ label = "Start Free", className }: { label?: string; className?: string }) {
  const cls =
    className ??
    "rounded-lg bg-brand px-6 py-3 font-medium text-white transition hover:scale-105 hover:bg-brand-dark";
  return (
    <>
      <SignedOut>
        <SignUpButton mode="modal">
          <button className={cls}>{label}</button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <Link to="/dashboard" className={`inline-block ${cls}`}>
          Open your workspace
        </Link>
      </SignedIn>
    </>
  );
}

function SectionCta({ label }: { label: string }) {
  return (
    <div className="mt-10">
      <StartFreeButton label={label} />
    </div>
  );
}

function CheckIcon({ className = "text-brand" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const ICON_PATHS: Record<string, string> = {
  network: "M12 2 4 7v10l8 5 8-5V7z M12 12v10 M12 12 4 7 M12 12l8-5",
  link: "M9 17H7a5 5 0 0 1 0-10h2 M15 7h2a5 5 0 0 1 0 10h-2 M8 12h8",
  history: "M3 12a9 9 0 1 0 3-6.7 M3 5v5h5",
  route: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M19 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M5 17v-3a4 4 0 0 1 4-4h6a4 4 0 0 0 4-4",
  building: "M3 21h18 M5 21V7l7-4 7 4v14 M9 9h1 M9 13h1 M14 9h1 M14 13h1",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  message:
    "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  mail: "M3 6h18v12H3z M3 6l9 7 9-7",
  school: "M22 10 12 5 2 10l10 5 10-5z M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5 M22 10v6",
  pin: "M12 22s8-7.58 8-13a8 8 0 1 0-16 0c0 5.42 8 13 8 13z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  chart: "M3 3v18h18 M7 15l4-4 3 3 5-6",
  lock: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
};

function Icon({ name, className = "text-brand" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

// --- Hero AI-conversation demonstration -------------------------------------
// A static, semantic example conversation (not a screenshot) so it stays
// accessible. Names/companies are fictional; the card is labeled as an
// example. Auto-cycles through several real example questions, each with
// its own answer, so the hero demonstrates the range of things Commonality
// can actually answer - not just one canned IBM example.

interface HeroDemoScenario {
  q: string;
  content: ReactNode;
}

const HERO_DEMOS: HeroDemoScenario[] = [
  {
    q: "How do we get into IBM?",
    content: (
      <>
        <p className="text-lavender">I researched your organization's relationships using Commonality.</p>
        <p className="mt-2.5 font-semibold text-ink">Your strongest paths into IBM</p>
        <ul className="mt-2 space-y-2.5">
          {[
            {
              name: "Sarah Chen",
              kind: "Former IBM employee",
              detail: "Sarah worked at IBM for seven years and is connected to several current IBM leaders.",
            },
            {
              name: "Michael Torres",
              kind: "Shared employer history",
              detail: "Michael and IBM's Chief Information Officer worked together at a previous company.",
            },
            {
              name: "David Reynolds",
              kind: "Alumni connection",
              detail: "David and an IBM senior executive attended Northwestern University during the same period.",
            },
            {
              name: "Rachel Adams",
              kind: "Direct professional connection",
              detail: "Rachel is connected to IBM's Vice President of Enterprise Technology.",
            },
          ].map((p) => (
            <li key={p.name}>
              <p className="font-medium text-ink">
                {p.name} <span className="font-normal text-brand">— {p.kind}</span>
              </p>
              <p className="text-lavender">{p.detail}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-semibold text-ink">Recommended first step</p>
        <p className="mt-1 text-lavender">
          Start with Sarah. Her previous employment and active relationships at IBM appear to
          offer the strongest path to a warm introduction.
        </p>
      </>
    ),
  },
  {
    q: "What is our strongest path into Amazon?",
    content: (
      <>
        <p className="text-lavender">I researched your organization's relationships using Commonality.</p>
        <p className="mt-2.5 font-semibold text-ink">Strongest path into Amazon</p>
        <p className="mt-1 font-medium text-ink">
          Priya Nair <span className="font-normal text-brand">— Former Amazon employee</span>
        </p>
        <p className="text-lavender">
          Priya worked at Amazon for four years and is still connected to two directors on the
          retail team.
        </p>
        <p className="mt-3 font-semibold text-ink">Recommended first step</p>
        <p className="mt-1 text-lavender">
          Ask Priya if she's comfortable making an introduction - her tenure and active
          connections make this your best opening.
        </p>
      </>
    ),
  },
  {
    q: "Does anyone here know the Chief Marketing Officer at Nike?",
    content: (
      <>
        <p className="text-lavender">I researched your organization's relationships using Commonality.</p>
        <p className="mt-2.5 font-semibold text-ink">Yes - one direct connection</p>
        <p className="mt-1 font-medium text-ink">
          Devon Marsh <span className="font-normal text-brand">— Direct professional connection</span>
        </p>
        <p className="text-lavender">
          Devon is connected to Nike's CMO through a previous agency engagement they worked on
          together.
        </p>
        <p className="mt-3 font-semibold text-ink">Recommended first step</p>
        <p className="mt-1 text-lavender">Ask Devon for a warm introduction before reaching out cold.</p>
      </>
    ),
  },
  {
    q: "Who on our team previously worked at Salesforce?",
    content: (
      <>
        <p className="text-lavender">I researched your organization's relationships using Commonality.</p>
        <p className="mt-2.5 font-semibold text-ink">2 teammates with Salesforce history</p>
        <ul className="mt-2 space-y-2.5">
          <li>
            <p className="font-medium text-ink">Alex Kim</p>
            <p className="text-lavender">3 years, Enterprise Sales - still connected to several former colleagues.</p>
          </li>
          <li>
            <p className="font-medium text-ink">Jordan Lee</p>
            <p className="text-lavender">2 years, Solutions Engineering.</p>
          </li>
        </ul>
        <p className="mt-3 font-semibold text-ink">Recommended first step</p>
        <p className="mt-1 text-lavender">Alex's active connections make them the stronger starting point.</p>
      </>
    ),
  },
  {
    q: "Which executive should approach this account?",
    content: (
      <>
        <p className="text-lavender">I researched your organization's relationships using Commonality.</p>
        <p className="mt-2.5 font-semibold text-ink">Recommended: your CRO, Taylor Brooks</p>
        <p className="mt-1 text-lavender">
          Taylor and the prospect's VP of Operations both serve on the same industry advisory
          board - the strongest combined signal on your team for this account.
        </p>
        <p className="mt-3 font-semibold text-ink">Recommended first step</p>
        <p className="mt-1 text-lavender">
          Have Taylor reach out directly, referencing the advisory board as shared context.
        </p>
      </>
    ),
  },
  {
    q: "Find our best relationships across this target-account list.",
    content: (
      <>
        <p className="text-lavender">I researched your organization's relationships using Commonality.</p>
        <ul className="mt-2 space-y-2.5">
          <li>
            <p className="font-medium text-ink">
              Acme Inc. <span className="font-normal text-brand">— warm path found</span>
            </p>
            <p className="text-lavender">Sam K. is a 1st-degree LinkedIn connection to their VP Sales.</p>
          </li>
          <li>
            <p className="font-medium text-ink">
              Globex Corp <span className="font-normal text-lavender">— no warm path yet</span>
            </p>
            <p className="text-lavender">Recent posts are available for a research-based opener instead.</p>
          </li>
          <li>
            <p className="font-medium text-ink">
              Initech <span className="font-normal text-brand">— warm path found</span>
            </p>
            <p className="text-lavender">Priya N. previously worked there alongside their current CTO.</p>
          </li>
        </ul>
      </>
    ),
  },
  {
    q: "Draft a message asking for an introduction.",
    content: (
      <>
        <p className="text-lavender">Here's a draft, based on your relationship with Sarah:</p>
        <p className="mt-2.5 rounded-md border border-gray-200 bg-white px-3 py-2.5 italic text-ink">
          "Hi Sarah - hope you're doing well! I noticed your time at IBM and wanted to ask: would
          you be comfortable introducing me to someone on their enterprise tech team? Happy to
          share more context. Thanks so much!"
        </p>
        <p className="mt-3 text-lavender">Want me to adjust the tone or add more detail?</p>
      </>
    ),
  },
  {
    q: "Explain why this is our strongest relationship.",
    content: (
      <>
        <p className="text-lavender">
          Sarah's relationship is strongest because it combines two signals: seven years of
          direct employment history at IBM, and an active, recent connection with IBM's current
          VP of Cloud Platforms.
        </p>
        <p className="mt-2 text-lavender">
          That means she can speak credibly to both the account itself and the specific
          stakeholder you're trying to reach - stronger than a single shared-school or
          shared-employer signal alone.
        </p>
      </>
    ),
  },
];

const HERO_DEMO_TYPING_MS = 1100;
const HERO_DEMO_ANSWER_MS = 5200;

function HeroDemo() {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"typing" | "answer">("typing");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPhase("typing");
    const toAnswer = setTimeout(() => setPhase("answer"), HERO_DEMO_TYPING_MS);
    const toNext = setTimeout(() => {
      setStep((s) => (s + 1) % HERO_DEMOS.length);
    }, HERO_DEMO_TYPING_MS + HERO_DEMO_ANSWER_MS);
    return () => {
      clearTimeout(toAnswer);
      clearTimeout(toNext);
    };
  }, [step]);

  const demo = HERO_DEMOS[step];

  return (
    <div className="mx-auto w-full max-w-lg rounded-xl border border-gray-200 bg-white p-4 text-left shadow-xl sm:p-5">
      <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-lavender">
          Example - illustrative names, not real data
        </span>
      </div>

      <div className="flex h-[420px] flex-col gap-3 text-sm">
        <p
          key={`q-${step}`}
          className="animate-fade-up ml-auto w-fit max-w-[85%] shrink-0 rounded-lg rounded-br-sm bg-tint-accent px-3 py-2 text-ink"
        >
          {demo.q}
        </p>

        {phase === "typing" ? (
          <div className="flex w-fit shrink-0 gap-1 rounded-lg rounded-bl-sm bg-gray-50 px-3.5 py-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-lavender"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        ) : (
          <div
            key={`a-${step}`}
            className="animate-fade-up flex-1 overflow-y-auto rounded-lg rounded-bl-sm bg-gray-50 px-3.5 py-3"
          >
            {demo.content}
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-center gap-1.5" aria-hidden="true">
        {HERO_DEMOS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-6 bg-brand" : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// --- FAQ / testimonials (retained content) ----------------------------------

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "How are we defining \"team,\" in this case - is it pulling from your own colleague connections, or any and all of your network?",
    a: "\"Team\" is a roster you control, not automatically your personal connections. We pull current employees from your company's LinkedIn page to start, then you can add or remove anyone - clients, contractors, alumni, people outside your company entirely. It's whoever you want the AI searching for warm paths, separate from who's allowed to use Commonality (that's unlimited).",
  },
  {
    q: "Is our LinkedIn and company data secure?",
    a: "Yes - your team roster and prospect data are scoped to your company only, and we never expose them to other customers. See our Privacy page for details on exactly what's collected and how it's used.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, there's no contract. Downgrade to Free or cancel from the Billing page whenever you like.",
  },
  {
    q: "What happens if we go over our monthly credits?",
    a: "We'll let you know as you approach your limit. Once you hit it, lookups pause until next month or until you upgrade - nothing is charged automatically.",
  },
  {
    q: "Do teammates have to upload their LinkedIn connections?",
    a: "No, it's optional. Adding first-degree connections helps the AI find more warm paths, but nobody has to share their network to use Commonality.",
  },
  {
    q: "Can I sign up with a personal email instead of my work email?",
    a: "Yes, any email works to create your own account. Just know that teammates auto-join your workspace by matching your company's email domain - with a personal domain (Gmail, etc.) they'd need a direct invite instead.",
  },
  {
    q: "What if we need more than 150 team members or credits?",
    a: "That's what Enterprise is for - custom limits built around your organization. Contact us and we'll set it up.",
  },
  {
    q: "Does this work with Claude, ChatGPT, and Microsoft Copilot?",
    a: (
      <>
        Yes to all three. Need a hand connecting any of them?{" "}
        <a
          href="https://meetings.hubspot.com/conor-sullivan/commonality"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand hover:underline"
        >
          Reach out and we'll help you onboard
        </a>
        .
      </>
    ),
  },
];

const testimonials = [
  {
    quote:
      "Working with The Endurance Group was absolutely amazing. They introduced a LinkedIn outreach solution that has been a fantastic addition to our prospecting strategy. TEG totally exceeded our expectations.",
    name: "Sevag Sarkissian",
    title: "VP Growth Marketing, Realty ONE Group",
    logo: "/logos/realty-one-group.webp",
  },
  {
    quote:
      "The Endurance Group's strategy of using shared experiences to establish connections and book meetings with prospects has worked incredibly well. Their efforts have resulted in an average 30% response rate and started conversations with key firms that we'd been interested in pursuing for years.",
    name: "David Palmer",
    title: "CEO & Founder, FenestraPro",
    logo: "/logos/fenestrapro.webp",
  },
  {
    quote:
      "TEG's relationship expansion campaigns are well-named. By connecting with prospects you share backgrounds with, you develop authentic connections and become a known entity in your space.",
    name: "Ben Chrischelles",
    title: "Senior Director, Huron",
    logo: "/logos/huron.webp",
  },
  {
    quote: "TEG found and landed the meeting that turned into our largest client. I recommend TEG without reservation.",
    name: "Michael Prevost",
    title: "CEO, VividCloud",
    logo: "/logos/vividcloud.webp",
  },
  {
    quote:
      "The Endurance Group's efforts to expand our business through networking with like-minded health and safety leaders have helped SaltGrid develop new business relationships across the globe.",
    name: "Chris Aitken",
    title: "CEO, SaltGrid",
    logo: "/logos/saltgrid.webp",
  },
  {
    quote: "Their lead generation and business development strategies resulted in measurable connections made and new projects for our firm.",
    name: "Jay Connolly",
    title: "President, Connolly Brothers",
    logo: "/logos/connolly-brothers.webp",
  },
  {
    quote: "The team's expertise and insight into how social capital works were so valuable for our company and had a very high return on investment.",
    name: "Kevin Finn",
    title: "CEO, Mutual Capital Analytics",
    logo: "/logos/mutual-capital-analytics.webp",
  },
  {
    quote:
      "I highly recommend The Endurance Group for their outstanding social capital campaign services. They are a reliable and trusted partner - responsive and quite proactive.",
    name: "Nikki Blacksmith",
    title: "CEO, Symeta Inc.",
    logo: "/logos/symeta.png",
  },
  {
    quote:
      "Their approach to reaching new people is very effective and efficient. If you're looking for a \"way in\" to a large group of targeted people, they'll improve your efficiency.",
    name: "Jason Benavidez",
    title: "Director of Strategic Business, The Tyson Group, Inc.",
    photo: "/people/jason-benavidez.jpeg",
  },
];

// --- Supported AI assistants ------------------------------------------------

function MqClaudeLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" rx="3" fill="#CC785C" />
      <path d="M9.218 2h2.402L16 12.987h-2.402zM4.379 2h2.512l4.38 10.987H8.82l-.895-2.308h-4.58l-.896 2.307H0L4.38 2.001zm2.755 6.64L5.635 4.777 4.137 8.64z" fill="white" />
    </svg>
  );
}

function MqChatGPTLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#1A1A1A" />
      <path transform="translate(4,4)" d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="white" />
    </svg>
  );
}

function MqGeminiLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#4285F4" />
      <path d="M16 6C16 6 18.2 13.8 24 16C18.2 18.2 16 26 16 26C16 26 13.8 18.2 8 16C13.8 13.8 16 6 16 6Z" fill="white" />
    </svg>
  );
}

function MqCopilotLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#F0F0F0" />
      <rect x="8" y="8" width="7" height="7" rx="1" fill="#F25022" />
      <rect x="17" y="8" width="7" height="7" rx="1" fill="#7FBA00" />
      <rect x="8" y="17" width="7" height="7" rx="1" fill="#00A4EF" />
      <rect x="17" y="17" width="7" height="7" rx="1" fill="#FFB900" />
    </svg>
  );
}

const MQ_PROVIDERS = [
  { name: "Claude", Logo: MqClaudeLogo },
  { name: "ChatGPT", Logo: MqChatGPTLogo },
  { name: "Gemini", Logo: MqGeminiLogo },
  { name: "Copilot", Logo: MqCopilotLogo },
];

function AIMarquee() {
  // Duplicate once — animation runs to -50% which lands on an identical frame, seamless loop
  const track = [...MQ_PROVIDERS, ...MQ_PROVIDERS];
  return (
    <section className="border-b border-gray-100 bg-white py-8" aria-label="Supported AI assistants">
      <style>{`
        @keyframes mq-loop { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @media (prefers-reduced-motion: reduce) { .mq-track { animation: none !important; } }
      `}</style>
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-lavender">
        Works with the AI tools your team already uses
      </p>
      <div className="relative mx-auto max-w-xl overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent" />
        <div className="mq-track" style={{ display: "flex", width: "max-content", animation: "mq-loop 9s linear infinite" }}>
          {track.map((p, i) => (
            <div key={i} className="mx-2.5 flex items-center gap-2.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
              <p.Logo />
              <span className="whitespace-nowrap text-sm font-semibold text-ink">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Section content --------------------------------------------------------

const DISCOVER_CARDS = [
  {
    icon: "history",
    title: "Previous Employment",
    body: "Someone on your team worked at the target company.",
  },
  {
    icon: "link",
    title: "Direct Connections",
    body: "A colleague is directly connected to a key decision-maker on LinkedIn.",
  },
  {
    icon: "school",
    title: "Shared Education",
    body: "A teammate and an executive attended the same university or program.",
  },
  {
    icon: "building",
    title: "Shared Employer History",
    body: "Members of each organization previously worked at the same company.",
  },
  {
    icon: "pin",
    title: "Shared Location",
    body: "A teammate is based in the same city or region as your prospect.",
  },
  {
    icon: "users",
    title: "Team-Wide Relationships",
    body: "The useful connection may belong to someone outside the salesperson's own network.",
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    n: 1,
    title: "Connect your professional network",
    body: "Commonality securely connects the professional relationship information authorized by you and your organization - your team roster, backgrounds, and any LinkedIn connections teammates choose to share.",
  },
  {
    n: 2,
    title: "Build organizational relationship intelligence",
    body: "Commonality researches connections, employment histories, shared education, and other relevant professional overlaps across your whole team.",
  },
  {
    n: 3,
    title: "Ask naturally",
    body: "Use the AI assistant your team already works with. Commonality doesn't replace it - it makes it relationship-aware.",
  },
];

const TEAM_OUTCOMES = [
  {
    icon: "message",
    title: "Book More Warm Meetings",
    body: "Begin with introductions instead of cold outreach.",
  },
  {
    icon: "chart",
    title: "Improve Account Planning",
    body: "Add relationship context to target-account strategy.",
  },
  {
    icon: "route",
    title: "Make New Hires Productive Faster",
    body: "Help new employees understand the relationships that already exist across the company.",
  },
  {
    icon: "network",
    title: "Preserve Organizational Knowledge",
    body: "Reduce the loss of relationship intelligence when employees change roles or leave.",
  },
];

const SECURITY_POINTS = [
  "Your data is used only for Commonality's own features - finding your team's relationship paths.",
  "Relationship information is never sold.",
  "Your workspace's data is scoped to your company only - other customers can never see it.",
  "Users see only the workspace they belong to, controlled by your admin.",
  "Data is protected in transit and at rest.",
  "Admins control who joins the workspace and what's on the team roster.",
];

// --- Page -------------------------------------------------------------------

const NAV_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#use-cases", label: "Use Cases" },
  { href: "#security", label: "Security" },
  { href: "#for-teams", label: "For Teams" },
  { href: "#pricing", label: "Pricing" },
];

export function Marketing() {
  // Redirect signed-in users straight to their workspace.
  const { ready, token, needsOnboarding, authError, joinNotice } = useAuthStore();
  const { isSignedIn } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  if (ready && needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (ready && token && joinNotice) return <JoinNoticeScreen />;
  if (ready && token) return <Navigate to="/dashboard" replace />;

  // Session exchange failed for a reason other than "no workspace" (a
  // timeout, a 401, a 500) - show a retry option rather than silently
  // falling through to the full marketing page or navigating to onboarding.
  if (ready && authError && isSignedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-lavender">Couldn't verify your session. Please try again.</p>
        <button className="rounded-lg bg-brand px-6 py-3 font-medium text-white" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-6 py-4">
          <a href="/" className="flex shrink-0 items-center" aria-label="Commonality home">
            <img src="/logo.png" alt="Commonality" className="h-7 w-auto" />
          </a>
          <nav className="hidden items-center gap-5 text-sm lg:flex" aria-label="Main">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="font-medium text-lavender hover:text-ink">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="hidden font-medium text-lavender hover:text-ink sm:inline">Sign In</button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-lg bg-brand px-4 py-2 font-medium text-white transition hover:bg-brand-dark">
                  Start Free
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard" className="font-medium text-brand">
                Go to dashboard →
              </Link>
            </SignedIn>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-lavender hover:bg-gray-50 lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-gray-100 px-6 py-3 text-sm lg:hidden" aria-label="Main">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-2 py-2 font-medium text-lavender hover:bg-gray-50 hover:text-ink"
              >
                {l.label}
              </a>
            ))}
            <SignedOut>
              <SignInButton mode="modal">
                <button className="rounded-md px-2 py-2 text-left font-medium text-lavender hover:bg-gray-50 hover:text-ink sm:hidden">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="bg-white px-6 pb-16 pt-14 sm:pt-20">
        <div className="mx-auto grid max-w-content items-center gap-10 lg:grid-cols-2">
          <div className="animate-fade-up text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">
              Relationship Intelligence for AI
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-ink sm:text-5xl">
              How do we get into IBM?
            </h1>
            <p className="mt-2 text-2xl font-semibold text-brand sm:text-3xl">Now your AI can answer.</p>
            <p className="mx-auto mt-5 max-w-lg text-lg text-lavender lg:mx-0">
              Commonality gives ChatGPT, Claude, or whatever AI you use access to LinkedIn so it
              can find your warmest path into any target account.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <StartFreeButton />
              <a href="#how-it-works" className="rounded-lg px-6 py-3 font-medium text-ink hover:bg-gray-50">
                See How It Works →
              </a>
            </div>
            <p className="mt-4 text-sm text-lavender">Works with the AI tools your team already uses.</p>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <HeroDemo />
          </div>
        </div>
      </section>

      <AIMarquee />

      {/* Video */}
      <section id="demo" className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">See it in action</h2>
        <div className="mx-auto mt-8 max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube.com/embed/kjiCFnTgtWQ"
              title="Commonality product walkthrough"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* The missing context in AI */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-content text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">AI knows the world.</h2>
          <p className="mt-1 text-2xl font-bold text-brand sm:text-3xl">It doesn't know your relationships.</p>
          <p className="mx-auto mt-4 max-w-xl text-lavender">
            AI can research companies, executives, industries, and markets. But without
            Commonality, it doesn't understand the relationships, shared histories, and potential
            introductions that exist across your organization.
          </p>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 text-left sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-lavender">Standard AI</p>
              <p className="mt-3 text-sm italic text-ink">&ldquo;How do we get into IBM?&rdquo;</p>
              <p className="mt-3 rounded-lg bg-white px-4 py-3 text-sm text-lavender">
                Research IBM's priorities, identify the appropriate decision-maker, and develop a
                personalized outreach message.
              </p>
              <p className="mt-3 text-xs font-medium text-lavender">Useful research. No relationship context.</p>
            </div>
            <div className="rounded-xl border-2 border-brand/40 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">AI with Commonality</p>
              <p className="mt-3 text-sm italic text-ink">&ldquo;How do we get into IBM?&rdquo;</p>
              <p className="mt-3 rounded-lg bg-tint-brand px-4 py-3 text-sm text-ink">
                Sarah worked at IBM for seven years, Michael and its CIO worked together earlier in
                their careers, and Rachel has a direct professional connection to a vice president.
              </p>
              <p className="mt-3 text-xs font-semibold text-brand">A real path into the account.</p>
            </div>
          </div>
        </div>
      </section>

      {/* What Commonality discovers */}
      <section id="use-cases" className="mx-auto max-w-content px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          Find the relationships hidden across your organization.
        </h2>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
          {DISCOVER_CARDS.map((c) => (
            <div key={c.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Icon name={c.icon} className="h-5 w-5" />
              </span>
              <p className="mt-3 font-semibold text-ink">{c.title}</p>
              <p className="mt-1 text-sm text-lavender">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-content text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Ask your AI. Commonality finds the path.</h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left sm:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
                  {s.n}
                </span>
                <p className="mt-3 font-semibold text-ink">{s.title}</p>
                <p className="mt-1 text-sm text-lavender">{s.body}</p>
              </div>
            ))}
          </div>
          <SectionCta label="Start Free" />
        </div>
      </section>

      {/* Sales Navigator context */}
      <section className="mx-auto max-w-content px-6 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Make your LinkedIn research actionable.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lavender">
            LinkedIn Sales Navigator can help your team identify the right accounts and people.
            Commonality helps answer the next question:{" "}
            <span className="font-semibold text-ink">who inside our organization can help us reach them?</span>{" "}
            Whether a target comes from Sales Navigator, your CRM, an account list, or an AI
            conversation, Commonality helps surface the strongest relationship path.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-lavender">Sales Navigator helps you find</p>
            <ul className="mt-3 space-y-2 text-sm text-lavender">
              {["Target accounts", "Decision-makers", "Professional profiles", "Relevant activity"].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <CheckIcon className="text-lavender" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border-2 border-brand/40 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Commonality helps your AI find</p>
            <ul className="mt-3 space-y-2 text-sm text-ink">
              {[
                "Who on your team knows them",
                "How the relationship was formed",
                "Who should request the introduction",
                "What to say next",
              ].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <CheckIcon />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Built for teams */}
      <section id="for-teams" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-content text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">
            Turn individual connections into a company-wide advantage.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lavender">
            The most valuable relationship into an account may belong to your CEO, a former
            employee, or someone in another department. Commonality helps make that relationship
            knowledge useful to the people who need it.
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left sm:grid-cols-2">
            {TEAM_OUTCOMES.map((c) => (
              <div key={c.title} className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Icon name={c.icon} className="h-5 w-5" />
                </span>
                <p className="mt-3 font-semibold text-ink">{c.title}</p>
                <p className="mt-1 text-sm text-lavender">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-content px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-8 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Icon name="shield" className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">Your relationships remain yours.</h2>
          </div>
          <p className="mt-4 text-lavender">
            Commonality is designed to help your organization use its relationship intelligence -
            not sell it, expose it, or make it available to unauthorized users.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {SECURITY_POINTS.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-ink">
                <span className="mt-0.5">
                  <CheckIcon />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-lavender">
            Read our{" "}
            <Link to="/privacy" className="font-medium text-brand hover:underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="font-medium text-brand hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-content px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">
          Trusted by teams who needed a real way in
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm">
              {t.logo && <img src={t.logo} alt={t.title} className="mb-3 h-6 w-auto object-contain" />}
              {t.photo && <img src={t.photo} alt={t.name} className="mb-3 h-6 w-6 rounded-full object-cover" />}
              <p className="text-sm text-ink">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-3 text-xs font-medium text-lavender">
                {t.name} · {t.title}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white px-6 py-16">
        <div className="mx-auto max-w-content">
          <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">Simple pricing</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-lavender">
            One subscription per company. Unlimited users - anyone at your company can use it,
            sharing one monthly credit pool spent only on LinkedIn lookups (drafting the outreach
            itself is free). The only limit is team members - how many people the AI searches for
            relationships with.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div className="relative rounded-xl border border-gray-200 p-6 transition hover:scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">
                Free forever
              </div>
              <div className="font-semibold text-ink">Free</div>
              <div className="mt-2 text-3xl font-bold text-ink">$0</div>
              <ul className="mt-4 space-y-2 text-sm text-lavender">
                <li>
                  <span className="flex items-center gap-2">
                    <CheckIcon />
                    25 team members
                  </span>
                  <span className="ml-6 text-xs text-lavender/80">who the AI searches - not a user limit</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  50 credits/mo
                </li>
              </ul>
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="mt-6 w-full rounded-lg border border-gray-300 px-6 py-3 font-medium text-ink hover:bg-gray-50">
                    Start Free
                  </button>
                </SignUpButton>
              </SignedOut>
            </div>

            <div className="relative rounded-xl border-2 border-brand p-6 transition hover:scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
                Most popular
              </div>
              <div className="font-semibold text-ink">Pro</div>
              <div className="mt-2 text-3xl font-bold text-ink">$49/mo</div>
              <ul className="mt-4 space-y-2 text-sm text-lavender">
                <li>
                  <span className="flex items-center gap-2">
                    <CheckIcon />
                    150 team members
                  </span>
                  <span className="ml-6 text-xs text-lavender/80">who the AI searches - not a user limit</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  200 credits/mo
                </li>
              </ul>
              <SignedOut>
                <SignUpButton mode="modal">
                  <button className="mt-6 w-full rounded-lg bg-brand px-6 py-3 font-medium text-white hover:bg-brand-dark">
                    Start Free
                  </button>
                </SignUpButton>
              </SignedOut>
            </div>

            <div className="rounded-xl border border-gray-200 p-6 transition hover:scale-105">
              <div className="font-semibold text-ink">Enterprise</div>
              <div className="mt-2 text-3xl font-bold text-ink">Custom</div>
              <ul className="mt-4 space-y-2 text-sm text-lavender">
                <li>
                  <span className="flex items-center gap-2">
                    <CheckIcon />
                    150+ team members
                  </span>
                  <span className="ml-6 text-xs text-lavender/80">who the AI searches - not a user limit</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  Custom credits/mo
                </li>
              </ul>
              <a
                href="mailto:hello@theendurancegroup.com"
                className="mt-6 block w-full rounded-lg border border-gray-300 px-6 py-3 text-center font-medium text-ink hover:bg-gray-50"
              >
                Contact us
              </a>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-lavender">
            Commonality is built and installed for you by{" "}
            <a href="https://theendurancegroup.com" className="font-medium text-brand hover:underline">
              The Endurance Group
            </a>
            . Want more AI automations for your team?{" "}
            <a href="https://theendurancegroup.com" className="font-medium text-brand hover:underline">
              Give us a call
            </a>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-content px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-ink sm:text-3xl">Frequently asked questions</h2>
        <div className="mx-auto mt-8 max-w-2xl divide-y divide-gray-200">
          {faqs.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                {f.q}
                <span className="shrink-0 text-lavender transition group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-lavender">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">
            Your next customer may already be one relationship away.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lavender">
            Give your AI the relationship context it needs to find the best path into your target
            accounts.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <StartFreeButton />
            <a
              href="https://meetings.hubspot.com/conor-sullivan/commonality"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium text-ink hover:bg-gray-50"
            >
              Book a Demo
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-footer px-6 py-12 text-sm text-white/60">
        <div className="mx-auto max-w-content">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
            <div className="max-w-sm">
              <img src="/logo.png" alt="Commonality" className="mx-auto h-6 w-auto brightness-0 invert sm:mx-0" />
              <p className="mt-3">
                Commonality gives AI secure access to authorized professional relationship
                intelligence, helping teams discover who can open the right door.
              </p>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Footer">
              <Link to="/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-white">
                Terms of Service
              </Link>
              <a href="mailto:csullivan@theendurancegroup.com" className="hover:text-white">
                Contact
              </a>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="hover:text-white">Sign In</button>
                </SignInButton>
              </SignedOut>
            </nav>
          </div>
          <p className="mt-8 text-center">
            © {new Date().getFullYear()} Commonality ·{" "}
            <a href="https://theendurancegroup.com" className="hover:text-white">
              The Endurance Group
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
