#!/usr/bin/env python3
"""Check a markdown draft against the author's measured prose profile.

Usage:
    python3 check_style.py draft.md
    python3 check_style.py draft.md --quiet   # only report failures

Exit codes:
    0  no hard failures
    1  one or more hard failures
    2  bad usage / unreadable file

All corpus figures are measured from ~27,000 words (621 body sentences,
229 body paragraphs) of the author's design documents. Bands are set from
that measurement, widened where per-file variance in the corpus is wide, so
a conforming document is not forced tighter than the author's own range.
"""

import argparse
import re
import statistics
import sys

# ---------------------------------------------------------------------------
# Corpus constants. Each is a measurement, not a preference.
# ---------------------------------------------------------------------------

CORPUS = {
    "sent_mean": 22.3,
    "sent_median": 20,
    "sent_sd": 12.8,
    "buckets": {"<=10": 9.0, "11-20": 42.0, "21-30": 32.0, "31-40": 12.0, "41+": 5.0},
    "adjacent_delta_mean": 9.6,      # mean abs word-count diff between neighbours
    "adjacent_big_swing_pct": 25.0,  # % of adjacent pairs differing by >=15 words
    "para_median_sents": 2,
    "para_one_sent_pct": 28.4,
    "para_median_words": 49,
    "para_opener_mean_words": 21.7,
    "para_opener_short_pct": 20.5,   # openers under 12 words
    "para_coda_pct": 7.4,
    "opener_the_pct": 22.0,
    "opener_this_pct": 13.0,
    "opener_indef_pct": 1.8,
    "enum_per_1k": 4.8,
    "numeric_per_1k": 17.0,          # corpus 13.7-20.3 across files
    "such_as_per_1k": 3.2,
    "for_example_per_1k": 1.6,
    "responsible_for_per_1k": 1.7,
    "which_per_1k": 0.15,
    "we_per_1k": 2.3,
    "seam_per_1k": 1.4,              # In addition/Further/Additionally/However/Instead
}

# Idioms an imitator reliably over-fires. rate = per 1000 body words.
# Ceilings sit at or just above the author's own per-file maximum, so a
# conforming document is never held tighter than the corpus itself.
IDIOM_CEILINGS = {
    "rather than": 1.8,                    # author's per-file max 1.61
    "in order to": 2.0,                    # author's per-file max 1.88
    "at the expense of": 0.7,
    "somewhat": 1.3,                       # author's per-file max 1.13
    "necessary but not sufficient": 0.7,
    "one-way door": 0.8,
}

# Hard-banned only where the corpus has ZERO occurrences. Tokens the author
# uses even once (robust, paramount, crucial, traverses) are demoted to
# NOTICE_TOKENS: worth a look, never a failure.
BANNED_TOKENS = [
    "delve", "furthermore", "moreover", "testament", "seamless", "holistic",
    "realm", "unlock", "empower", "foster", "underscore", "pivotal",
    "bespoke", "elevate", "cutting-edge", "myriad", "plethora", "tapestry",
    "it is important to note", "it's worth noting", "at the end of the day",
    "a wide range of", "plays a key role", "revolutionize", "transformative",
    "best-in-class", "game-chang", "dive deep into", "in today's",
]

# Present in the corpus at 1-2 occurrences across 27k words. Flag, do not fail.
NOTICE_TOKENS = [
    "robust", "paramount", "crucial", "vital", "harness", "streamline",
    "landscape", "notably", "utilize", "leverage", "traverses",
]

BANNED_COMPRESSIONS = [
    "forfeit", "outright", "indicative", "asymmetry", "less forgiving",
    "bought", "paid for", "buys", "descends",
    "attacked", "exploited", "defeated", "pin down",
]

# Intensifiers, matched as whole words so "delivery"/"every" do not trip them.
INTENSIFIERS = [r"\bvery\b", r"\bextremely\b", r"\bdramatically\b",
                r"\bincredibly\b"]

BRITISH = ["behaviour", "signalling", "optimisation", "optimise",
           "acknowledgement", "analyse", "centre", "prioritise"]

TEMPLATE_BOILER = re.compile(
    r"(some of the (required )?example|please add other|this should list|do \.\.\.|"
    r"follow up with|person x|mm/dd/yy|in order to power|above table is just|"
    r"list any one way|any other information|risks associated|any special constraints|"
    r"please indicate which|\[required\]|\[optional\]|tbd|todo)", re.I)


def parse_body(text):
    """Split markdown into body paragraphs of prose sentences.

    Excludes headers, table rows, fenced code, list items, image/link lines,
    blockquotes and unfilled template boilerplate. Applied identically to any
    document so numbers stay comparable to the corpus figures above.
    """
    text = re.sub(r"```.*?```", "", text, flags=re.S)  # fenced code
    paragraphs = []
    for block in text.split("\n\n"):
        lines = []
        for raw in block.split("\n"):
            s = raw.strip()
            if not s:
                continue
            if s[0] in "#|>":
                continue
            if s.startswith(("```", "[Image:", "[Link", "---", "***", "* ", "- ", "+ ",
                             "•", "http://", "https://")):
                continue
            if re.match(r"^\s*\d+\.\s", s) or re.match(r"^\s*[a-z]\.\s", s):
                continue
            if re.match(r"^\*\*[^*]+\*\*:?\s*$", s):  # bold-only label line
                continue
            if TEMPLATE_BOILER.search(s):
                continue
            # A line containing a tab or an inner pipe is table content that lost
            # its leading delimiter; a bullet mid-line means a packed table cell.
            if "\t" in raw or "|" in s or "•" in s:
                continue
            # Residual code: a line with no sentence-ending punctuation but heavy
            # brace, colon or quote density is a config or JSON fragment.
            if not re.search(r"[.!?]", s) and len(re.findall(r'[{}":;]', s)) >= 2:
                continue
            lines.append(s)
        if not lines:
            continue
        body = " ".join(lines)
        body = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", body)   # link text only
        body = re.sub(r"`[^`]*`", "CODE", body)                # neutralize inline code
        body = re.sub(r"\s+", " ", body).strip()
        if len(body.split()) < 4:
            continue
        # Protect decimals, versions and abbreviations from the splitter.
        prot = re.sub(r"(\d)\.(\d)", r"\1<DOT>\2", body)
        prot = re.sub(r"\b(e\.g|i\.e|vs|etc|Dr|Mr|Ms|No)\.", r"\1<DOT>", prot)
        sents = [x.replace("<DOT>", ".").strip()
                 for x in re.split(r"(?<=[.!?])\s+", prot)]
        sents = [x for x in sents if len(x.split()) >= 3]
        if sents:
            paragraphs.append(sents)
    return paragraphs


class Report:
    def __init__(self):
        self.rows = []
        self.hard = []
        self.soft = []

    def measure(self, label, value, target, ok, hard=False, note=""):
        self.rows.append((label, value, target, ok, note))
        if not ok:
            (self.hard if hard else self.soft).append((label, value, target, note))


def band(value, lo, hi):
    return lo <= value <= hi


def check(path, quiet=False):
    try:
        text = open(path, encoding="utf-8").read()
    except OSError as exc:
        print(f"cannot read {path}: {exc}", file=sys.stderr)
        return 2

    paras = parse_body(text)
    if not paras:
        print("No body prose found. Is this file all headers, tables and lists?",
              file=sys.stderr)
        return 2

    sents = [s for p in paras for s in p]
    lengths = [len(s.split()) for s in sents]
    words = sum(lengths)
    prose = " ".join(sents)
    per1k = lambda n: 1000.0 * n / words if words else 0.0
    count = lambda pat: len(re.findall(pat, prose, re.I))

    r = Report()

    # --- hard rules -------------------------------------------------------
    em = text.count("—")
    r.measure("em-dashes", em, "0", em == 0, hard=True,
              note="absent from 27k corpus words" if em else "")

    # Corpus max is 69w and 0.46% of sentences exceed 60w, so a single long
    # sentence is in register. Only a runaway past 70 is a hard failure.
    longest = max(lengths)
    r.measure("longest sentence", f"{longest}w", "<=70w", longest <= 70, hard=True)
    over60 = 100.0 * sum(1 for n in lengths if n > 60) / len(lengths)
    r.measure("sentences over 60w", f"{over60:.1f}%", "<=2% (corpus 0.5%)", over60 <= 2)

    hits = [t for t in BANNED_TOKENS if re.search(r"\b" + re.escape(t), prose, re.I)]
    hits += [p.strip(r"\b") for p in INTENSIFIERS if re.search(p, prose, re.I)]
    r.measure("banned tokens", ", ".join(hits) if hits else "none", "none",
              not hits, hard=True)

    notice = [t for t in NOTICE_TOKENS if re.search(r"\b" + re.escape(t), prose, re.I)]
    r.measure("notice tokens", ", ".join(notice) if notice else "none",
              "rare in corpus", True,
              note="present 1-2x in 27k corpus words; fine once, not as habit")

    comp = [t for t in BANNED_COMPRESSIONS if re.search(r"\b" + re.escape(t), prose, re.I)]
    r.measure("banned compressions", ", ".join(comp) if comp else "none", "none",
              not comp, hard=True)

    brit = [t for t in BRITISH if re.search(r"\b" + t, prose, re.I)]
    r.measure("British spelling", ", ".join(brit) if brit else "none", "none",
              not brit, hard=True)

    rfc = len(re.findall(r"\b(MUST|SHOULD|MAY|SHALL) (NOT )?\b", prose))
    r.measure("RFC uppercase modals", rfc, "0", rfc == 0, hard=True,
              note="paraphrase into lowercase memo register" if rfc else "")

    exemplifiers = count(r"\bsuch as\b") + count(r"\bfor example\b")
    r.measure("exemplifiers (such as + For example)", exemplifiers, ">=2",
              exemplifiers >= 2, hard=True,
              note="zero of both is as strong a signal as an em-dash"
                   if exemplifiers < 2 else "")

    # --- distribution -----------------------------------------------------
    mean, med = statistics.mean(lengths), statistics.median(lengths)
    sd = statistics.stdev(lengths) if len(lengths) > 1 else 0.0
    r.measure("sentence mean", f"{mean:.1f}w", "18-26w", band(mean, 18, 26))
    r.measure("sentence median", f"{med:.0f}w", "17-23w", band(med, 17, 23))
    r.measure("sentence sd", f"{sd:.1f}", ">=9.0", sd >= 9.0,
              note="low sd means written to a counter" if sd < 9.0 else "")

    buckets = {"<=10": 0, "11-20": 0, "21-30": 0, "31-40": 0, "41+": 0}
    for n in lengths:
        key = ("<=10" if n <= 10 else "11-20" if n <= 20 else
               "21-30" if n <= 30 else "31-40" if n <= 40 else "41+")
        buckets[key] += 1
    pct = {k: 100.0 * v / len(lengths) for k, v in buckets.items()}
    r.measure("modal band 11-20", f"{pct['11-20']:.0f}%", ">=30%",
              pct["11-20"] >= 30,
              note="11-20 must stay the largest band" if pct["11-20"] < 30 else "")
    r.measure("band 41+", f"{pct['41+']:.0f}%", "<=10%", pct["41+"] <= 10)
    r.measure("has a 40+ sentence", "yes" if longest >= 40 else "no", "yes",
              longest >= 40)

    # rhythm: drift vs oscillation
    deltas = []
    for p in paras:
        L = [len(s.split()) for s in p]
        deltas += [abs(L[i + 1] - L[i]) for i in range(len(L) - 1)]
    if deltas:
        dmean = statistics.mean(deltas)
        big = 100.0 * sum(1 for d in deltas if d >= 15) / len(deltas)
        r.measure("adjacent delta mean", f"{dmean:.1f}w", "<=13w (corpus 9.6)",
                  dmean <= 13)
        r.measure("big swings >=15w", f"{big:.0f}%", "<=38% (corpus 25%)",
                  big <= 38,
                  note="short-long alternation is as detectable as uniformity"
                       if big > 38 else "")

    # --- paragraphs -------------------------------------------------------
    pcounts = [len(p) for p in paras]
    pwords = [sum(len(s.split()) for s in p) for p in paras]
    one = 100.0 * sum(1 for c in pcounts if c == 1) / len(pcounts)
    mid = 100.0 * sum(1 for c in pcounts if c in (3, 4)) / len(pcounts)
    r.measure("paragraph median", f"{statistics.median(pcounts):.0f} sents", "2-3",
              band(statistics.median(pcounts), 2, 3))
    r.measure("one-sentence paragraphs", f"{one:.0f}%", ">=15% (corpus 28%)",
              one >= 15,
              note="single-sentence paragraphs are the most common shape"
                   if one < 15 else "")
    r.measure("3-or-4 sentence paragraphs", f"{mid:.0f}%", "<=55%", mid <= 55,
              note="metronomic paragraph mass" if mid > 55 else "")
    r.measure("paragraph median words", f"{statistics.median(pwords):.0f}w", "35-75w",
              band(statistics.median(pwords), 35, 75))

    openers = [len(p[0].split()) for p in paras]
    oshort = 100.0 * sum(1 for x in openers if x < 12) / len(openers)
    r.measure("paragraph opener mean", f"{statistics.mean(openers):.1f}w", ">=16w",
              statistics.mean(openers) >= 16,
              note="load belongs at the front of the paragraph"
                   if statistics.mean(openers) < 16 else "")
    r.measure("short paragraph openers", f"{oshort:.0f}%", "<=30%", oshort <= 30)

    frontload = sum(1 for p in paras
                    if len(p) > 1 and len(p[0].split()) <= 12 and len(p[1].split()) >= 25)
    fl = 100.0 * frontload / len(paras)
    r.measure("short-opener-then-long", f"{fl:.0f}%", "<=15% (corpus 3%)", fl <= 15,
              note="the essayistic topic-sentence template" if fl > 15 else "")

    coda = re.compile(
        r",\s+(?:\w+ing|\w+ed|with|without|though|while|given|leaving|making|capped|"
        r"published|reported|proposed|backported|which|where)\b[^.]{0,70}\.$", re.I)
    ncoda = sum(1 for p in paras if coda.search(p[-1]))
    cpct = 100.0 * ncoda / len(paras)
    r.measure("paragraph comma-coda closers", f"{cpct:.0f}%", "<=20% (corpus 7%)",
              cpct <= 20)

    # --- openers and chaining --------------------------------------------
    first = [s.split()[0].strip("(,.") for s in sents]
    fc = lambda w: 100.0 * sum(1 for x in first if x == w) / len(first)
    the, this = fc("The"), fc("This") + fc("These")
    indef = fc("A") + fc("An")
    r.measure("'The' openers", f"{the:.0f}%", "15-32% (corpus 22%)", band(the, 15, 32))
    r.measure("'This/These' openers", f"{this:.0f}%", ">=7% (corpus 13%)", this >= 7,
              note="anaphoric This is the primary chaining device" if this < 7 else "")
    r.measure("'A/An' openers", f"{indef:.0f}%", "<=6% (corpus 1.8%)", indef <= 6,
              note="repeating indefinite subjects is the loudest chain failure"
                   if indef > 6 else "")

    whichr = per1k(count(r",\s+which\b"))
    r.measure("', which' rate", f"{whichr:.2f}/1k", "<=1.5 (corpus 0.15)", whichr <= 1.5,
              note="end the sentence and open with This" if whichr > 1.5 else "")

    for pat, label in ((r",\s+so\b", "', so' consequence tails"),
                       (r",\s+meaning\b", "', meaning' summative codas")):
        n = count(pat)
        r.measure(label, n, "<=1", n <= 1)

    # --- evidence and connectives ----------------------------------------
    sa, fe = per1k(count(r"\bsuch as\b")), per1k(count(r"\bfor example\b"))
    r.measure("'such as' rate", f"{sa:.1f}/1k", ">=1.0 (corpus 3.2)", sa >= 1.0)
    r.measure("'For example' rate", f"{fe:.1f}/1k", ">=0.7 (corpus 1.6)", fe >= 0.7)

    generic = count(r"such as (?:a|an) (?!\w*[A-Z])\w+ \w+")
    r.measure("'such as a <generic>'", generic, "0", generic == 0,
              note="performs the connective without discharging the abstraction"
                   if generic else "")

    seam = per1k(count(r"\b(In addition|Further|Additionally|However|Instead)\b"))
    r.measure("paragraph seams", f"{seam:.1f}/1k", ">=0.6 (corpus 1.4)", seam >= 0.6,
              note="self-contained paragraphs read as a reference article"
                   if seam < 0.6 else "")

    rf = per1k(count(r"responsible for"))
    r.measure("'responsible for' rate", f"{rf:.1f}/1k", ">=0.5 (corpus 1.7)", rf >= 0.5)

    enum = per1k(len(re.findall(r"\([0-9]\)", prose)))
    r.measure("enumerated parentheticals", f"{enum:.1f}/1k", ">=2.0 (corpus 4.8)",
              enum >= 2.0)

    numeric = per1k(len(re.findall(r"\b\d[\d,.]*\b", prose)))
    r.measure("numeric density", f"{numeric:.1f}/1k", "<=30 (corpus 17)", numeric <= 30,
              note="spec-digest recitation; move constants to a table"
                   if numeric > 30 else "")

    # --- stance -----------------------------------------------------------
    hedge = per1k(count(
        r"\b(would|should|might|is expected to|somewhat|likely|remains uncertain)\b"))
    r.measure("calibrated hedges", f"{hedge:.1f}/1k", ">=2.0", hedge >= 2.0,
              note="below 2.0 is encyclopedia voice" if hedge < 2.0 else "")

    absolute = per1k(count(r"\b(must|will|strictly|solely|by definition)\b"))
    r.measure("absolute modals", f"{absolute:.1f}/1k", ">=2.0", absolute >= 2.0)

    we = per1k(count(r"\b(we|our)\b"))
    r.measure("'we/our' rate", f"{we:.1f}/1k", ">=0.8 (corpus 2.3)", we >= 0.8,
              note="proposer voice: name options and choose" if we < 0.8 else "")

    you = count(r"\byou\b|\byour\b")
    r.measure("second person", you, "0", you == 0, hard=True)

    # --- idiom over-firing ------------------------------------------------
    for idiom, ceiling in IDIOM_CEILINGS.items():
        rate = per1k(count(re.escape(idiom)))
        r.measure(f"idiom '{idiom}'", f"{rate:.2f}/1k", f"<={ceiling}", rate <= ceiling,
                  note="over-firing named idioms is the primary detection vector"
                       if rate > ceiling else "")

    # --- output -----------------------------------------------------------
    print(f"\n{path}")
    print(f"{words} body words, {len(sents)} sentences, {len(paras)} paragraphs\n")

    if not quiet:
        for label, value, target, ok, note in r.rows:
            mark = "ok  " if ok else "FAIL"
            line = f"  {mark} {label:<34} {str(value):<22} {target}"
            print(line + (f"   <- {note}" if note and not ok else ""))
        print()

    if r.hard:
        print(f"HARD FAILURES ({len(r.hard)}):")
        for label, value, target, note in r.hard:
            print(f"  - {label}: {value} (want {target})" + (f" - {note}" if note else ""))
    if r.soft:
        print(f"\nBAND DEVIATIONS ({len(r.soft)}):")
        for label, value, target, note in r.soft:
            print(f"  - {label}: {value} (want {target})" + (f" - {note}" if note else ""))

    if not r.hard and not r.soft:
        print("Clean. Every measured property sits inside the corpus band.")
    elif not r.hard:
        print("\nNo hard failures. Review band deviations above; some are acceptable "
              "in a short document, but fix any that describe spread or uniformity.")

    return 1 if r.hard else 0


def main():
    ap = argparse.ArgumentParser(
        description="Check a markdown draft against the author's prose profile.")
    ap.add_argument("path", help="path to the markdown draft")
    ap.add_argument("--quiet", action="store_true",
                    help="only print failures, not the full measurement table")
    args = ap.parse_args()
    sys.exit(check(args.path, quiet=args.quiet))


if __name__ == "__main__":
    main()
