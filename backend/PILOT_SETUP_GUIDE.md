# Running the pilot

A complete, unpaid pilot of the instrument, with its own backend, its own
Google Sheet, and CSV export to Drive. It is built from the reviewed
production source and **cannot touch the live study**: the backend refuses
to run if it is ever pointed at a production workbook, by spreadsheet id.

Two files matter: `PilotBackend.gs` (attached) and the client, already
published at `https://amazingly.github.io/queue-study-pilot/`.

---

## A. Backend — about ten minutes, and it needs your Google account

1. **Create a blank Google Sheet** and name it `Queue Study PILOT Control`.
   This is the control sheet; the data lands in workbooks the script
   creates for itself.

2. **Extensions → Apps Script.** Delete the stub `function myFunction()`,
   paste the whole of `PilotBackend.gs`, and save.

3. **Reload the Sheet.** A **PILOT** menu appears next to Help. (Only the
   pilot menu — the production menu is deliberately absent, so there is no
   mis-click into the live workflow.)

4. **PILOT → 1. Set up the pilot (once).** Google will ask you to
   authorize: *Advanced → Go to project (unsafe) → Allow*. It is your own
   script. This creates the two pilot workbooks, provisions a **seed pool
   of 60 places** and runs the self-check. It takes
   about twenty seconds. The seed size does not cap anything: the pool
   grows whenever a run needs more, so you never have to guess in
   advance.

5. **Deploy → New deployment → Web app.** Set **Execute as: Me** and
   **Who has access: Anyone**, deploy, and copy the `/exec` URL.
   That access toggle is yours to set, as before.

6. **Send me the `/exec` URL.** I put it into `assets/config.js`, and the
   pilot site is live. (Or replace `PASTE_PILOT_EXEC_URL` in that file
   yourself and commit.)

---

## B. Running it

The pilot runs in **runs**. You open a run, say roughly how many people
you expect, and send out the link. When that group is finished you close
it and open another. There is no limit on how many runs you open and no
re-provisioning between them, so the pilot can be run whenever you want
it — a lecture of 120 this morning, a group of 12 this afternoon, another
class next week. **Every run is independent: any run may be any size in
the range**, and each is audited separately in the data.

| Action | Where |
|---|---|
| Open a run and get the participant link | **PILOT → 2. Open a run (choose the size)** |
| See the link and how the run is going | **PILOT → 3. Show the link and run status** |
| Watch progress | **PILOT → Pilot status** |
| Stop taking new participants now | **PILOT → Stop the pilot** |
| Snapshot everything as CSV | **PILOT → Export all data as CSV to Drive** |
| Start over with an empty data set | **PILOT → Start a fresh pilot (new workbooks)** |

**Opening a run.** The menu asks how many participants you expect. Enter
a whole number from **10 to 150**; leave it blank for 30.

**The number is a plan, not a limit.** If more people turn up than you
entered, they are admitted. Refusing a student who is sitting in the room
is the worst thing this instrument could do, so it does not do it: the
run keeps rolling and the pool grows underneath if it has to. Opening a
run reserves half again as many places as you asked for — never fewer
than thirty spare — precisely so an overrun costs nobody any waiting.
Enter roughly what you expect and stop worrying about it. Over-planning
is free, because unused places are retired when the next run opens, and
under-planning no longer costs anyone their seat.

**Sizes round up to groups of three.** The group of three is what keeps
the design balanced: its three participants share one stochastic sequence
— identical case types, waiting-cost states and recovery draws — and take
the three different labelling policies between them. Ask for 41 and you
get 42 places; ask for 100 and you get 102; ask for 99 or 150 and you get
exactly that.

**A class that is not a multiple of three is fine.** Forty-one students
occupy thirteen complete groups and two thirds of a fourteenth, so two
policies get fourteen participants and one gets thirteen — the counts
differ by one, which is the guarantee the design makes at every interim
point. The one unused place is retired when you open the next run, so the
next run starts clean. The only thing you lose is that the final group is
incomplete: two of its three policies ran against that sequence rather
than three, so in a within-group analysis that one group contributes a
pair instead of a triple.

**When fewer people turn up than planned** — seven for a run planned at
120, say — nothing is wasted that matters. The unused places in the
half-filled group are retired when you open the next run, so the next run
starts on a clean boundary and its own balance is exact. Nothing is
rejected and no earlier assignment changes.

The participant link never changes:
`https://amazingly.github.io/queue-study-pilot/?entry=join&c=100200`.
The six-digit code is embedded, so nobody types anything: open the link,
pick a language, and start. Anyone holding the link can take part while a
run is open, which is worth remembering when you decide where to post it.

**Growing the pool.** The live study freezes a finite pool on purpose:
its three SHA-256 commitments are a preregistration, and a
preregistration that can be extended is not one. The pilot has no
preregistration to protect, so its pool is open-ended and grows in whole
blocks as runs need them.

Growth is a *continuation*, not a re-randomisation. Every draw is a pure
function of the sequence version, the block number and the round, so
block 21 receives exactly the draws the original generator would have
produced had it been asked for 21 blocks in the first place. Existing
rows are never rewritten. The honest consequence, stated plainly: the
pilot's three commitments are recomputed when the pool grows, so they are
a checksum of the design as it currently stands rather than a commitment
made in advance. In the live study they remain untouchable.

**Starting over** is a separate thing from growing. **PILOT → Start a
fresh pilot (new workbooks)** begins an empty data set under a new
sequence version; the previous pilot workbooks stay in Drive untouched
and simply stop being used. You do not need it to run more participants —
open another run instead.

**The CSV export** writes one timestamped file per tab — `sessions`,
`rounds`, `participants`, `events`, `errors`, `integrity_report`,
`lectures`, `allocation_slots`, `config`, `sequences`, `tokens` — into a
Drive folder called **Queue Study PILOT data**. Each run adds a new set
rather than overwriting the last, so you can export mid-pilot without
losing the earlier snapshot. The first export may ask for one extra
authorization, because writing to Drive is a permission the rest of the
script does not need.

`rounds` is the file you will want first: one row per decision, with the
hidden case type, the label actually shown, the queue state before and
after, the recovery draw, the choice, the response time and the points.

---

## C. What differs from the live study, exactly

Both builds are generated by scripts that assert every change, so this
list is checkable rather than aspirational.

**Backend** (`build-backend.mjs`, twelve patches): monetary constants set
to zero; completion codes prefixed `PILOT-`; a hard refusal to open the
production workbooks; pilot-labelled workbooks and version strings; a
per-run cap on the live session; the Sheet menu replaced; and an appended
module providing setup, runs, status, CSV export, stop, and the
open-ended pool. Round processing, the three labelling policies,
permuted-block assignment, matched triples, belief scoring, the integrity
audit, idempotency and locking are untouched.

**Client** (`build-client.mjs`, nine patches): pilot version and endpoint;
the payment rows removed from the results and completion screens; the
consent form replaced by a one-screen notice; wording overrides in English
and Vietnamese for the keys that promised payment or referred to "paid
rounds"; a pilot page title. Every other string, screen and behaviour is
the reviewed production file.

**Not carried over:** the ethics interlock. `PILOT_OPEN_LINK` deliberately
does not call `openCollection()`, because that gate guards the live
study's ethics wording and release placeholders, neither of which exists
here. The self-check still runs, so an unprovisioned or damaged pool
cannot be opened.

---

## D. One caveat about what the pilot can tell you

Removing the incentives was your call and it is fine for the purpose, but
it changes what the data mean. Without payoffs, this pilot is evidence
about **plumbing and comprehension** — does the classroom flow work, do
students pass the quiz, how long do rounds take, do phones survive twenty
rounds, does anything break under load — and not about **decisions**. The
send/not-send pattern, the response times under the 60-second cap, and the
belief reports are all incentive-sensitive, so treat them as descriptive
of the pilot, not predictive of the real run. Fixed costs like completion
rates and quiz failure rates travel better than choice frequencies do.

If you later want a pilot that also speaks to behaviour, the smallest
change that buys it is a token payment on a random subset — but that
reopens the payment and approval questions you have set aside here.

---

## E. Verification already done

- The generated backend is parsed at build time and the exact text of
  every literal that carries a backslash is asserted, so neither a broken
  escape nor a silently wrong-but-valid one can reach a deployment.
- The open-ended pool has its own suite (`test-pool.js`, 36 checks) that
  drives real participants through `doPost` against mocked Sheets: a run
  admits its planned places and the overrun too, in the same run; a later
  run opens immediately and grows the ledger; **every appended draw equals
  what the seeded generator produces for that block index**, and the
  original rows are byte-identical afterwards; each group's three
  participants share one sequence and take three distinct policies; a run
  that ends part-way retires exactly the unused places; and the
  commitments and gateway integrity checks still pass afterwards.
- The whole size range was then exercised end to end — runs asked for 10,
  11, 12, 25, 41, 50, 99, 100, 149 and 150 participants, each seated
  exactly, with the treatment spread never above one and every group but
  the last a complete triple. Overruns were measured at both ends: 47
  arrivals against a plan of 10, and 190 against a plan of 150. Nobody was
  refused in any scenario, and the commitments verified afterwards.
- Provisioning cost was measured rather than assumed: the largest growth
  the design can ask for — 75 groups, enough for a 150-person run on a
  fresh pool — costs about 5,600 Apps Script service calls, roughly 6
  seconds and at worst 17, comfortably inside the six-minute limit.
- The reviewed backend suite (1,539 checks) and client suite (78 tests)
  both still pass; the production source is untouched.
- The CSV writer was unit-tested for embedded commas, quotes, newlines and
  Vietnamese text, and round-trips through an RFC 4180 parser.
- The client was driven end to end headlessly — language, code,
  eligibility, notice, instructions, quiz, twenty rounds, beliefs, results,
  questionnaire, demographics, completion — with no console errors. Ten
  screens were scanned for monetary language; the only two matches are the
  two deliberate statements that there is no payment.
