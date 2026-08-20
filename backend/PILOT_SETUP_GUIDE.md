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
   of 60 places (20 blocks of three)** and runs the self-check. It takes
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

The pilot runs in **runs**. A run is opened for a number of blocks you
choose, admits three participants per block, and keeps going if more turn up.
When it is finished you close it and open another. There is no limit on how many runs you open
and no re-provisioning between them, so the pilot can be run whenever
you want it — a class this morning, five people this afternoon, another
class next week.

| Action | Where |
|---|---|
| Open a run and get the participant link | **PILOT → 2. Open a run (choose the size)** |
| See the link and how the run is going | **PILOT → 3. Show the link and run status** |
| Watch progress | **PILOT → Pilot status** |
| Stop taking new participants now | **PILOT → Stop the pilot** |
| Snapshot everything as CSV | **PILOT → Export all data as CSV to Drive** |
| Start over with an empty data set | **PILOT → Start a fresh pilot (new workbooks)** |

**Opening a run.** The menu asks how many blocks. Enter a whole number
from **5 to 20** — that is 15 to 60 participants. Leave it blank for 10
blocks (30 participants).

Why blocks rather than people: the block is the unit that keeps the
design balanced. Its three participants share one stochastic sequence —
identical case types, waiting-cost states and recovery draws — and
receive the three different labelling policies between them. Sizing a
run in blocks is what makes its treatment counts come out equal.

**The size you enter is a plan, not a wall.** If more people turn up than
you planned for, they are admitted. Refusing a student who is sitting in
the room is the worst thing this instrument could do, so it does not do
it: the run keeps rolling in whole blocks and the pool grows underneath
if it has to. Opening a run reserves twenty blocks of slack beyond the
plan precisely so this costs nobody any waiting. Round the plan up to
roughly what you expect and stop worrying about it — over-planning is
free, since unused places are retired when the next run opens.

**A class that is not a multiple of three is fine.** Forty-one students
occupy thirteen complete blocks and two thirds of a fourteenth, so two
arms get fourteen participants and one gets thirteen: the counts differ
by one, which is the guarantee the block design makes at every interim
point. The one unused place in the half-filled block is retired when you
open the next run, so the next run starts clean. The only thing you lose
is that the final block is an incomplete triple — two of its three arms
ran against that sequence, not three — so if you later analyse within
blocks, that one block contributes a pair rather than a triple.

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
  drives real participants through `doPost` against mocked Sheets and
  asserts what matters rather than what the code appears to say: a run
  admits its planned places and then admits the overrun too, in the same
  run; a later run opens immediately and grows the ledger; **every
  appended draw equals what the seeded generator produces for that block
  index**, and the original rows are byte-identical afterwards; each
  block's three participants share one sequence and hold three distinct
  policies; a run that ends part-way through a block retires exactly the
  unused places; and the commitments and gateway integrity checks still
  pass after four runs and three growth events.
- Three overrun scenarios were measured directly: 41 arrivals against a
  42-place plan (41 in, 14/13/14), 41 against a 30-place plan (41 in,
  13/14/14), and 200 against a 15-place plan (200 in, 67/66/67). Nobody
  was refused in any of them, the treatment spread was one in all three,
  and every block but the last was a complete matched triple.
- The reviewed backend suite (1,539 checks) and client suite (78 tests)
  both still pass; the production source is untouched.
- The CSV writer was unit-tested for embedded commas, quotes, newlines and
  Vietnamese text, and round-trips through an RFC 4180 parser.
- The client was driven end to end headlessly — language, code,
  eligibility, notice, instructions, quiz, twenty rounds, beliefs, results,
  questionnaire, demographics, completion — with no console errors. Ten
  screens were scanned for monetary language; the only two matches are the
  two deliberate statements that there is no payment.
