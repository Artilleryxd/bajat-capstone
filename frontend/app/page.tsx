"use client"

import { useRouter } from "next/navigation"

export default function LandingPage() {
  const router = useRouter()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Plus+Jakarta+Sans:wght@700;800&display=swap');

        .lp-serif { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-weight: 800; }
        .lp-mono  { font-family: 'Inter', system-ui, sans-serif; }

        @keyframes lp-up   { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes lp-bar  { from { transform:scaleX(0); } to { transform:scaleX(1); } }
        @keyframes lp-tick { 0% { transform:translateX(0); } 100% { transform:translateX(-50%); } }
        @keyframes lp-dot  { 0%,100% { opacity:1; } 50% { opacity:.15; } }
        @keyframes lp-draw { from { stroke-dashoffset:320; } to { stroke-dashoffset:0; } }

        .lp-in  { opacity:0; animation:lp-up .65s ease forwards; }
        .lp-d1  { animation-delay:.05s; }
        .lp-d2  { animation-delay:.15s; }
        .lp-d3  { animation-delay:.25s; }
        .lp-d4  { animation-delay:.38s; }
        .lp-d5  { animation-delay:.50s; }
        .lp-d6  { animation-delay:.62s; }

        .lp-bar-base { transform-origin:left center; animation:lp-bar 1.1s cubic-bezier(.16,1,.3,1) both; }
        .lp-line     { stroke-dasharray:320; animation:lp-draw 1.8s cubic-bezier(.16,1,.3,1) .9s both; }
        .lp-blink    { animation:lp-dot 2s ease infinite; }

        .lp-ticker {
          display:flex; width:max-content;
          animation:lp-tick 30s linear infinite;
          will-change:transform;
        }

        .lp-card { transition:transform .2s ease, box-shadow .2s ease; }
        .lp-card:hover {
          transform:translateY(-3px);
          box-shadow:0 24px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.07);
        }

        .lp-grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
          background-size:44px 44px;
        }
      `}</style>

      <div className="min-h-screen bg-[#07090C] text-white overflow-hidden" style={{ colorScheme: "dark" }}>
        {/* Ambient */}
        <div className="fixed inset-0 lp-grid-bg pointer-events-none" />
        <div className="fixed pointer-events-none"
          style={{ top:"-15%", right:"5%", width:560, height:560,
            background:"radial-gradient(circle, rgba(16,185,129,.07) 0%, transparent 70%)" }} />
        <div className="fixed pointer-events-none"
          style={{ bottom:"-10%", left:"5%", width:400, height:400,
            background:"radial-gradient(circle, rgba(59,130,246,.05) 0%, transparent 70%)" }} />

        <div className="relative z-10 flex flex-col min-h-screen">

          {/* ── Nav ── */}
          <header className="lp-in lp-d1 flex items-center justify-between px-6 sm:px-10 py-5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                   style={{ background: "linear-gradient(135deg, #E8357A, #7B5EA7)" }}>
                <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                  <path d="M2 12 L5.5 7.5 L8.5 9.5 L13 3" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="lp-serif text-sm font-bold tracking-tight text-white">
                FinSight AI
              </span>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="lp-mono text-[11px] tracking-wide cursor-pointer transition-colors"
              style={{ color: "rgba(255,255,255,.4)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.8)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.4)")}
            >
              Login →
            </button>
          </header>

          {/* ── Main ── */}
          <main className="flex-1 grid lg:grid-cols-[1fr_1.1fr] gap-6 xl:gap-12 px-6 sm:px-10 pb-6 items-center max-w-[1300px] mx-auto w-full min-h-0">

            {/* LEFT */}
            <div className="space-y-6 py-4">

              <div className="lp-in lp-d2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                   style={{ border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)" }}>
                <span className="lp-blink w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#E8357A" }} />
                <span className="lp-mono uppercase tracking-[.12em]" style={{ fontSize: 10, color: "#E8357A" }}>
                  AI-Powered Finance
                </span>
              </div>

              <div className="lp-in lp-d3">
                <h1 className="lp-serif leading-[1.0] tracking-tight text-white"
                    style={{ fontSize: "clamp(2.6rem,4.5vw,4.2rem)", fontWeight: 800, letterSpacing: "-0.02em" }}>
                  Your money,
                  <br />
                  <span style={{
                    background: "linear-gradient(120deg, #6EE7B7 0%, #10B981 55%, #059669 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>
                    understood.
                  </span>
                </h1>
                <p className="mt-4 text-base leading-relaxed" style={{ color: "rgba(255,255,255,.45)", maxWidth: 360 }}>
                  AI-generated budgets, optimised loan payoffs, and investment strategies — built around your life.
                </p>
              </div>

              <div className="lp-in lp-d4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <button
                  onClick={() => router.push("/signup")}
                  className="cursor-pointer px-7 py-3 rounded-xl text-white text-sm font-semibold transition-all active:scale-[.97]"
                  style={{ background: "linear-gradient(135deg, #E8357A, #7B5EA7)", transitionProperty: "box-shadow, transform", boxShadow: "0 0 24px rgba(232,53,122,0.35)" }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 0 40px rgba(232,53,122,0.6)")}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 0 24px rgba(232,53,122,0.35)")}
                >
                  Get started free
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="cursor-pointer px-7 py-3 rounded-xl text-white text-sm font-medium transition-all active:scale-[.97]"
                  style={{ border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.2)"; e.currentTarget.style.background = "rgba(255,255,255,.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; e.currentTarget.style.background = "rgba(255,255,255,.04)"; }}
                >
                  Sign in
                </button>
              </div>

              <div className="lp-in lp-d5 flex items-center gap-8 pt-1">
                {[
                  { v: "₹2.4Cr+", l: "tracked" },
                  { v: "< 3 min", l: "setup" },
                  { v: "4-in-1",  l: "modules" },
                ].map(s => (
                  <div key={s.l}>
                    <p className="lp-serif text-base text-white">{s.v}</p>
                    <p className="lp-mono uppercase tracking-[.12em] mt-0.5" style={{ fontSize: 9, color: "rgba(255,255,255,.3)" }}>
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: bento */}
            <div className="lp-in lp-d4 grid grid-cols-2 gap-2.5 py-4">

              {/* ── Card 1: AI Budget ── */}
              <div className="lp-card rounded-2xl p-4 space-y-3"
                   style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(16,185,129,.12)", boxShadow: "0 0 0 .5px rgba(255,255,255,.04)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="lp-mono uppercase tracking-widest" style={{ fontSize: 9, color: "rgba(16,185,129,.6)" }}>01</span>
                    <p className="text-[13px] font-semibold text-white mt-0.5">AI Budget</p>
                  </div>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,.1)" }}>
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                      <circle cx="6" cy="6" r="4.5" stroke="#10B981" strokeWidth="1.2"/>
                      <path d="M6 3v3l2 1.5" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 shrink-0 rounded-full" style={{
                    background: "conic-gradient(#10B981 0deg 180deg, #3B82F6 180deg 252deg, #F59E0B 252deg 324deg, #EF4444 324deg 360deg)",
                    WebkitMask: "radial-gradient(circle, transparent 54%, black 55%)",
                    mask: "radial-gradient(circle, transparent 54%, black 55%)",
                  }} />
                  <div className="space-y-1">
                    {([ ["Needs","#10B981","50%"], ["Wants","#3B82F6","20%"], ["Invest","#F59E0B","20%"] ] as [string,string,string][]).map(([l,c,p]) => (
                      <div key={l} className="flex items-center gap-1.5 lp-mono" style={{ fontSize: 9 }}>
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                        <span style={{ color: "rgba(255,255,255,.45)" }}>{l}</span>
                        <span style={{ color: "rgba(255,255,255,.7)", marginLeft: "auto", paddingLeft: 8 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="lp-mono leading-snug" style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>
                  50-30-20 framework, AI-tuned
                </p>
              </div>

              {/* ── Card 2: Loan Payoff ── */}
              <div className="lp-card rounded-2xl p-4 space-y-3"
                   style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="lp-mono uppercase tracking-widest" style={{ fontSize: 9, color: "rgba(59,130,246,.6)" }}>02</span>
                    <p className="text-[13px] font-semibold text-white mt-0.5">Loan Payoff</p>
                  </div>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(59,130,246,.1)" }}>
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                      <path d="M1 9 L4 5.5 L7 7.5 L11 2" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="space-y-2">
                  {([
                    { l: "Credit Card", p: 92, c: "#EF4444", delay: ".70s"  },
                    { l: "Personal",    p: 67, c: "#F59E0B", delay: ".85s"  },
                    { l: "Education",   p: 41, c: "#3B82F6", delay: "1.00s" },
                  ]).map(b => (
                    <div key={b.l}>
                      <div className="flex justify-between lp-mono mb-0.5" style={{ fontSize: 9 }}>
                        <span style={{ color: "rgba(255,255,255,.45)" }}>{b.l}</span>
                        <span style={{ color: "rgba(255,255,255,.65)" }}>{b.p}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.06)" }}>
                        <div className="h-full rounded-full lp-bar-base"
                             style={{ width: `${b.p}%`, background: b.c, animationDelay: b.delay }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="lp-mono leading-snug" style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>
                  Avalanche strategy · saves ₹12,400 interest
                </p>
              </div>

              {/* ── Card 3: Investment Strategy ── */}
              <div className="lp-card rounded-2xl p-4 space-y-3"
                   style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="lp-mono uppercase tracking-widest" style={{ fontSize: 9, color: "rgba(245,158,11,.6)" }}>03</span>
                    <p className="text-[13px] font-semibold text-white mt-0.5">Investment</p>
                  </div>
                  <span className="lp-mono px-1.5 py-0.5 rounded-md" style={{ fontSize: 9, color: "#F59E0B", background: "rgba(245,158,11,.1)" }}>
                    Moderate
                  </span>
                </div>

                <div className="h-4 rounded-md overflow-hidden flex gap-px">
                  {([
                    { p: 45, c: "#10B981", delay: ".70s"  },
                    { p: 25, c: "#3B82F6", delay: ".82s"  },
                    { p: 15, c: "#F59E0B", delay: ".94s"  },
                    { p: 10, c: "#8B5CF6", delay: "1.06s" },
                    { p:  5, c: "#475569", delay: "1.18s" },
                  ]).map((x, i) => (
                    <div key={i} className="h-full lp-bar-base"
                         style={{ width: `${x.p}%`, background: x.c, animationDelay: x.delay }} />
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-1">
                  {([ ["Equity","#10B981","45%"], ["Debt","#3B82F6","25%"], ["Gold","#F59E0B","15%"], ["RE","#8B5CF6","10%"] ] as [string,string,string][]).map(([l,c,p]) => (
                    <div key={l} className="flex items-center gap-1 lp-mono" style={{ fontSize: 9 }}>
                      <span className="w-1.5 h-1.5 rounded-sm shrink-0" style={{ background: c }} />
                      <span style={{ color: "rgba(255,255,255,.45)" }}>{l}</span>
                      <span style={{ color: "rgba(255,255,255,.65)", marginLeft: "auto" }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Card 4: Net Worth ── */}
              <div className="lp-card rounded-2xl p-4 space-y-2"
                   style={{ background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="lp-mono uppercase tracking-widest" style={{ fontSize: 9, color: "rgba(167,139,250,.6)" }}>04</span>
                    <p className="text-[13px] font-semibold text-white mt-0.5">Net Worth</p>
                  </div>
                  <span className="lp-mono text-[10px] font-bold" style={{ color: "#10B981" }}>↑ 12.4%</span>
                </div>

                <p className="lp-mono text-lg font-bold text-white">₹24.8L</p>

                <svg viewBox="0 0 120 36" className="w-full" style={{ height: 36 }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity=".22"/>
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 33 L15 30 L30 26 L45 22 L60 17 L75 13 L90 9 L105 5 L120 2"
                    fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"
                    className="lp-line"
                  />
                  <path
                    d="M0 33 L15 30 L30 26 L45 22 L60 17 L75 13 L90 9 L105 5 L120 2 L120 36 L0 36 Z"
                    fill="url(#sg)"
                  />
                </svg>

                <div className="flex justify-between lp-mono" style={{ fontSize: 8, color: "rgba(255,255,255,.2)" }}>
                  <span>Jan</span><span>Apr</span><span>Jul</span><span>Now</span>
                </div>
              </div>

            </div>
          </main>

          {/* ── Ticker ── */}
          <footer className="shrink-0 overflow-hidden py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,.05)" }}>
            <div className="lp-ticker lp-mono select-none"
                 style={{ fontSize: 9, color: "rgba(255,255,255,.18)", letterSpacing: ".15em", textTransform: "uppercase" }}>
              {Array(10).fill(["AI Budget Generation","Loan Optimiser","Investment Strategy","Net Worth Tracking","Expense Analysis","Financial Health Score"]).flat().map((t, i) => (
                <span key={i} className="mx-7 shrink-0">{t} ·</span>
              ))}
            </div>
          </footer>

        </div>
      </div>
    </>
  )
}
