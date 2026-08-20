# Queue Decision Study — PILOT client

**Not the live study.** This is an unpaid pilot of the same instrument,
run to check that the task works before real data collection. It has its
own Apps Script backend and its own Google Sheet; it cannot write to the
production workbooks (the backend refuses by id).

Live: https://amazingly.github.io/queue-study-pilot/

## Relationship to the real client

Built by `build-client.mjs` from the reviewed production client, with
exactly these changes, each asserted at build time:

1. `APP_VERSION` → `queue-study-pilot-v1`, `API_URL` → the pilot endpoint.
2. The results table drops the payment row; the completion screen drops
   the fixed/bonus/total payment table.
3. The consent form is replaced by a one-screen pilot notice: voluntary,
   unpaid, used only to check the task, stop whenever you like.
4. Wording overrides (`assets/pilot-overrides.js`) for the keys that
   promise payment or refer to "paid rounds", in English and Vietnamese.
5. The page title marks the pilot.

Everything else — the 20 rounds, the three labelling policies, the
permuted-block assignment, the comprehension quiz, belief elicitation,
the timer, the acknowledged transport — is the reviewed production file,
unchanged.

## Entry

The six-digit code is embedded in the participant link
(`?entry=join&c=…`), so nobody types anything. Anyone with the link can
take part until the operator closes entry from the Sheet.

## Verification

A full run — language, code, eligibility, notice, instructions, quiz, 20
rounds, beliefs, results, questionnaire, demographics, completion — was
driven headlessly against a local simulator before publication. Ten
screens were scanned for monetary language; the only two matches are the
two deliberate statements that there is no payment.
