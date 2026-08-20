


/* ==================================================================
   MODULE: Pilot.gs  (PILOT BUILD ONLY)

   Everything below this line is additional; nothing above it was
   changed except the patches listed in build-backend.mjs.

   The pilot differs from the live study in one structural way beyond
   the patch list: its participant pool is OPEN-ENDED. The live study
   freezes a finite pool because its three SHA-256 commitments are a
   preregistration, and a preregistration that can be extended is not
   one. The pilot has no preregistration to protect and exists to be
   run whenever someone wants to run it, so its pool grows on demand.

   Growth is a CONTINUATION, not a re-randomisation. Block b's draws
   are seededUniform_(version + ":theta:" + b + ":" + r) and friends —
   a pure function of the sequence version, the block index and the
   round. Appending block 21 therefore yields exactly the draws the
   original generator would have produced had it been asked for 21
   blocks instead of 20. Matched triples (three participants share one
   sequence and receive the three different labelling policies between
   them) and exact three-arm balance are preserved intact.

   The consequence, stated plainly: in the pilot the three commitments
   are recomputed whenever the pool grows, so they are a checksum of
   the design as it currently stands, not a commitment made in advance.
   In the live study they remain untouchable.
   ================================================================== */

/* A run is sized in PARTICIPANTS, because that is what an operator knows:
 * how many students are in the room. Internally the pool still moves in
 * blocks of three -- the block is the unit that keeps treatment balanced,
 * since its three participants share one stochastic sequence and receive
 * the three different labelling policies between them -- so a requested
 * size is rounded UP to whole blocks. Ask for 41 and you get 42 places in
 * 14 blocks; the spare place is retired when the next run opens.
 *
 * The size you enter is a PLAN, not a wall. If more people turn up than
 * planned they are admitted, because refusing a student who is sitting in
 * the room is the worst outcome this instrument can produce. Opening a run
 * reserves headroom beyond the plan, and a last-resort top-up on the
 * participant path guarantees the promise even if the headroom runs out.
 * Every run is independent: any run may be any size in the range. */
var PILOT_RUN_MIN_PARTICIPANTS = 10;
var PILOT_RUN_MAX_PARTICIPANTS = 150;
var PILOT_RUN_DEFAULT_PARTICIPANTS = 30;

/* The seed pool a fresh environment starts with. Small on purpose: the
 * pool grows when a run needs it, so provisioning need not guess. */
var PILOT_POOL_PLACES = 60;

var PILOT_LINK_CODE = "100200";       // fixed, embedded in the participant URL
var PILOT_CSV_FOLDER = "Queue Study PILOT data";
var PILOT_EXPORT_TABS = [
  "sessions", "rounds", "participants", "events", "errors",
  "integrity_report", "lectures", "allocation_slots", "config",
  "sequences", "tokens"
];

/* ---- Open-ended pool ---------------------------------------------- */

/* Whole blocks needed to seat this many participants, rounding up. */
function pilotBlocksFor_(participants) {
  return Math.ceil(Number(participants) / DESIGN.TREATMENTS.length);
}

/* Slack reserved beyond the plan, in blocks: half again as many, never
 * fewer than ten blocks. Proportional, so a large class gets proportionally
 * large headroom and a small one is not made to provision a large pool. */
function pilotHeadroomBlocks_(blocks) {
  return Math.max(10, Math.ceil(Number(blocks) / 2));
}


/* Serialise growth against live claims. The request router holds the
 * same script lock while a participant claims a slot, so taking it here
 * makes "grow the ledger" and "claim from the ledger" mutually
 * exclusive rather than merely unlikely to collide. */
function pilotWithLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error("PILOT_BUSY: the study server is handling a request. Try again in a moment.");
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* Blocks currently in the ledger. The sequences tab holds exactly
 * NUM_ROUNDS rows per block, written in (block, round) order. */
function pilotBlockCount_() {
  var sheet = researchSheet_(SHEETS.SEQUENCES);
  return Math.floor(Math.max(0, sheet.getLastRow() - 1) / DESIGN.NUM_ROUNDS);
}

/* Recompute the three commitments over the tables as they now stand.
 * Deliberately NOT freezeDesignPrecommitment(): that function refuses to
 * overwrite a commitment, which is correct for the live study and wrong
 * here. Keeping the values current means selfCheck and the integrity
 * audit still describe the real design rather than a stale one. */
function pilotRefreezeCommitments_() {
  var seq = canonicalSequenceDigest_();
  var alloc = canonicalAllocationDigest_();
  var manifest = canonicalDesignManifest_(seq, alloc);
  configSet_("sequence_hash", seq.hash);
  configSet_("sequence_rows", String(seq.rows));
  configSet_("allocation_hash", alloc.hash);
  configSet_("allocation_rows", String(alloc.rows));
  configSet_("design_manifest_hash", manifest.hash);
  configSet_("design_recomputed_at", nowIso_());
  configSet_("design_recompute_pending", "FALSE");
  return manifest.hash;
}

/* Recompute the commitments if growth on the participant path deferred it.
 * Called by every menu operation, so the values an operator ever looks at
 * are current, while no participant waits for a hash over the whole table. */
function pilotSyncCommitments_() {
  if (!configTrue_("design_recompute_pending")) return false;
  pilotRefreezeCommitments_();
  return true;
}

/* Append whole blocks, continuing the generator at the next block index.
 * Writes the same three tables generateAssignmentBlocks and
 * buildAllocationSlots write, in the same order and with the same seeds,
 * so the appended rows are indistinguishable from rows the original
 * provisioning would have produced.
 *
 * Invitation links are NOT appended: they exist to carry token-based
 * entry, which the pilot never uses (it enters by classroom code), so
 * writing them would add rows nothing reads. */
function pilotAppendBlocks_(extraBlocks, deferCommitments) {
  extraBlocks = Math.max(1, Math.floor(Number(extraBlocks)));
  var pool = poolLecture_();
  if (!pool) throw new Error("No POOL lecture. Run PILOT -> 1. Set up the pilot first.");

  var version = prop_("SEQUENCE_VERSION");
  var research = researchBook_();
  var sequencesSheet = research.getSheetByName(SHEETS.SEQUENCES);
  var tokensSheet = research.getSheetByName(SHEETS.TOKENS);
  var slotsSheet = research.getSheetByName(SHEETS.SLOTS);

  var base = pilotBlockCount_();
  var now = nowIso_();
  var sequenceRows = [];
  var tokenRows = [];
  var slotRows = [];
  var claimOrder = Number(pool.slot_count);
  var lectureId = String(pool.lecture_id);

  for (var k = 1; k <= extraBlocks; k++) {
    var b = base + k;
    var sequenceId = "sq" + version + "-" + pad4_(b);
    var blockId = "b" + pad4_(b);

    for (var r = 1; r <= DESIGN.NUM_ROUNDS; r++) {
      var theta = seededUniform_(version + ":theta:" + b + ":" + r) < DESIGN.H_PROB ? "H" : "L";
      var u = Math.round(seededUniform_(version + ":recovery:" + b + ":" + r) * 1e12) / 1e12;
      sequenceRows.push([
        version, sequenceId, r, theta, u, now, GENERATOR_VERSION,
        sha256Hex_([version, sequenceId, r, theta, u].join("|")).slice(0, 16)
      ]);
    }

    DESIGN.TREATMENTS.forEach(function (treatment) {
      tokenRows.push([tokenHash_(newOpaqueToken_("qt")), "pilot-grown", "", blockId, treatment,
        sequenceId, "unused", "", "", "", "", 0, ""]);
    });

    // Same within-block arm permutation, same seed string, as buildAllocationSlots.
    var arms = DESIGN.TREATMENTS.slice();
    for (var i = arms.length - 1; i > 0; i--) {
      var j = Math.floor(seededUniform_(version + ":slotperm:" + lectureId + ":" + blockId + ":" + i) * (i + 1));
      var tmp = arms[i]; arms[i] = arms[j]; arms[j] = tmp;
    }
    arms.forEach(function (treatment) {
      claimOrder += 1;
      slotRows.push([lectureId, claimOrder, blockId, treatment, sequenceId, "unused", "", "", ""]);
    });
  }

  sequencesSheet.getRange(sequencesSheet.getLastRow() + 1, 1, sequenceRows.length, HEADERS.sequences.length)
    .setValues(sequenceRows);
  tokensSheet.getRange(tokensSheet.getLastRow() + 1, 1, tokenRows.length, HEADERS.tokens.length)
    .setValues(tokenRows);
  slotsSheet.getRange(slotsSheet.getLastRow() + 1, 1, slotRows.length, HEADERS.allocation_slots.length)
    .setValues(slotRows);

  var added = extraBlocks * DESIGN.TREATMENTS.length;
  pool.slot_count = Number(pool.slot_count) + added;
  pool.maximum_n = Number(pool.maximum_n) + added;
  pool.expected_n = Number(pool.expected_n) + added;
  saveLecture_(pool);

  var places = Number(pool.slot_count);
  props_().setProperty("MAX_PARTICIPANTS", String(places));
  configSet_("target_total", String(places));
  configSet_("maximum_total", String(places));
  configSet_("target_per_arm", String(Math.round(places / DESIGN.TREATMENTS.length)));
  // Hashing the whole sequence table is the one slow step here. On the
  // participant path it is deferred: nobody entering the study should wait
  // for a checksum, and the next menu operation brings it up to date.
  if (deferCommitments) configSet_("design_recompute_pending", "TRUE");
  else pilotRefreezeCommitments_();
  SpreadsheetApp.flush();
  return extraBlocks;
}

/* Guarantee at least needSlots unused slots, growing in whole blocks.
 * Returns the number of blocks added (0 if none were needed). */
function pilotEnsureUnusedSlots_(needSlots) {
  var pool = poolLecture_();
  if (!pool) throw new Error("No POOL lecture. Run PILOT -> 1. Set up the pilot first.");
  var unused = Number(pool.slot_count) - Number(pool.next_claim_order) + 1;
  if (unused >= needSlots) return 0;
  return pilotAppendBlocks_(Math.ceil((needSlots - unused) / DESIGN.TREATMENTS.length));
}

/* Last resort, called on the participant path just before a slot is
 * claimed. Costs nothing in the normal case: the pool almost always has
 * free places, so this returns immediately without a single extra read.
 * Runs inside the router's script lock, so it must NOT take the lock
 * again -- pilotAppendBlocks_ deliberately does not. */
function pilotTopUpPool_(pool) {
  if (!pool || poolPlacesRemaining_(pool) > 0) return pool;
  // Scale the chunk to the run in progress: a 150-person class that has
  // already exhausted its headroom is overrunning by more than a 12-person
  // one, and should not have to top up ten times to get there.
  var planned = Number(configGet_("live_run_blocks", "0"));
  pilotAppendBlocks_(pilotHeadroomBlocks_(planned > 0 ? planned : 10), true);
  return poolLecture_();
}

/* ---- Operations, in the order an operator uses them ---------------- */

/* 1. One-click setup: properties, workbooks, operations tabs, seed pool,
 *    commitments, self-check. Re-runnable: the workbooks are only created
 *    while the ids are still placeholders, and provisionStudyPool refuses
 *    outright once sequences exist. */
function PILOT_SETUP() {
  var report = [];
  report.push(setupScriptPropertiesTemplate());
  var have = props_().getProperty("RESEARCH_SPREADSHEET_ID");
  if (!have || /^PASTE_/.test(have)) {
    report.push(createWorkbooks());
  } else {
    report.push("Workbooks already created; keeping them.");
  }
  // provisionStudyPool calls setupWorkbooks(), which creates the research
  // tabs. setupOperationsSheets_ reads config, so it must come AFTER that,
  // not before: the first run failed with SHEET_MISSING:config.
  report.push(provisionStudyPool(PILOT_POOL_PLACES, 0));
  setupOperationsSheets_();
  return opsNotify_("Pilot ready",
    report.join("\n") +
    "\n\nThe pool grows on demand, so this size is only a starting point." +
    "\n\nNext: PILOT -> 2. Open a run.");
}

/* 2. Open a run.
 *
 * A run is sized in blocks and admits three participants per block. The
 * ledger is extended first if it does not already hold that many unused
 * slots, so a run can be opened at any time regardless of how much of
 * the pool earlier runs consumed.
 *
 * Deliberately does NOT call openCollection(): that gate guards the live
 * study's ethics wording and release placeholders, neither of which
 * exists here. selfCheck() still runs, so a broken or unprovisioned
 * environment cannot be opened. */
function pilotAskRunSize_() {
  var ui;
  try {
    ui = SpreadsheetApp.getUi();
  } catch (e) {
    return { participants: PILOT_RUN_DEFAULT_PARTICIPANTS };   // no UI: default
  }
  var answer = ui.prompt("Open a pilot run",
    "How many participants do you expect in this run?\n\n" +
    "Enter a whole number from " + PILOT_RUN_MIN_PARTICIPANTS + " to " +
    PILOT_RUN_MAX_PARTICIPANTS + ". Leave it blank for " +
    PILOT_RUN_DEFAULT_PARTICIPANTS + ".\n\n" +
    "Any run may be any size in that range, and runs are independent: a " +
    "class of 120 today and a group of 12 tomorrow are both fine.\n\n" +
    "The number is rounded up to whole groups of three, because three " +
    "participants share one sequence and take the three different labelling " +
    "policies between them. If more people turn up than you enter, they are " +
    "admitted anyway -- this is a plan, not a limit.",
    ui.ButtonSet.OK_CANCEL);
  if (answer.getSelectedButton() !== ui.Button.OK) return { cancelled: true };
  var text = String(answer.getResponseText()).trim();
  if (!text) return { participants: PILOT_RUN_DEFAULT_PARTICIPANTS };
  if (!/^[0-9]+$/.test(text)) {
    return { error: "\"" + text + "\" is not a whole number. Nothing was opened." };
  }
  var n = parseInt(text, 10);
  if (n < PILOT_RUN_MIN_PARTICIPANTS || n > PILOT_RUN_MAX_PARTICIPANTS) {
    return { error: n + " is outside " + PILOT_RUN_MIN_PARTICIPANTS + "-" +
      PILOT_RUN_MAX_PARTICIPANTS + " participants. Nothing was opened.\n\n" +
      "For a larger cohort, open more than one run: there is no limit on how " +
      "many you open, and each is audited separately." };
  }
  return { participants: n };
}

function PILOT_OPEN_LINK() {
  var ask = pilotAskRunSize_();
  if (ask.cancelled) return "Cancelled.";
  if (ask.error) return opsNotify_("Not a valid run size", ask.error);

  var expected = ask.participants;
  var blocks = pilotBlocksFor_(expected);
  var places = blocks * DESIGN.TREATMENTS.length;

  var check;
  try {
    check = selfCheck();
  } catch (e) {
    return opsNotify_("Cannot open", "Self-check failed:\n\n" + (e && e.message ? e.message : String(e)));
  }
  if (/FAIL|problem/i.test(check)) {
    return opsNotify_("Cannot open", "Self-check did not pass:\n\n" + check);
  }
  if (!poolLecture_()) return opsNotify_("Cannot open", "Run PILOT -> 1. Set up the pilot first.");

  try {
    pilotWithLock_(function () {
      pilotSyncCommitments_();
      // Retire whatever remains of the previous run's final block first, so
      // this run starts on a block boundary; then reserve the run's blocks
      // PLUS headroom, so an overrun is absorbed without any work on the
      // participant path.
      alignPoolToFreshBlock_(poolLecture_());
      return pilotEnsureUnusedSlots_(
        (blocks + pilotHeadroomBlocks_(blocks)) * DESIGN.TREATMENTS.length);
    });
  } catch (e) {
    return opsNotify_("Cannot open", (e && e.message ? e.message : String(e)));
  }

  var runNumber = Number(configGet_("pilot_run_number", "0")) + 1;
  configSet_("pilot_run_number", String(runNumber));
  props_().setProperty("COLLECTION_OPEN", "TRUE");
  configSet_("collection_open", "TRUE");
  configSet_("opened_at", nowIso_());
  configSet_("live_open", "TRUE");
  configSet_("live_code", PILOT_LINK_CODE);
  // Unique per run, so the integrity audit reports treatment balance run by
  // run rather than lumping every run of the same day together.
  configSet_("live_batch", "pilot-run-" + pad4_(runNumber) + " " + nowIso_().slice(0, 10));
  configSet_("live_opened_at", nowIso_());
  configSet_("live_expires_at", "");          // no auto-expiry
  configSet_("live_claimed", "0");
  configSet_("live_run_blocks", String(blocks));
  // What the operator asked for, and the seats that rounding actually
  // reserved. Deliberately NOT caps: nobody is refused for exceeding them.
  configSet_("live_expected_participants", String(expected));
  configSet_("live_planned_places", String(places));
  configSet_("live_max_claims", "");        // retired; runs are not capped
  SpreadsheetApp.flush();
  return PILOT_SHOW_LINK();
}

/* 3. The link to send. The six-digit code is embedded, so a participant
 *    types nothing. */
function pilotParticipantUrl_() {
  var base = propOptional_("STUDY_BASE_URL", "");
  return base + "?entry=join&c=" + PILOT_LINK_CODE;
}

function pilotRunSummary_() {
  var pool = poolLecture_();
  var expected = Number(configGet_("live_expected_participants", "0"));
  var places = Number(configGet_("live_planned_places", "0"));
  var used = Number(configGet_("live_claimed", "0"));
  var runNo = Number(configGet_("pilot_run_number", "0"));
  var open = collectionOpen_() && configTrue_("live_open");
  var free = pool ? poolPlacesRemaining_(pool) : 0;
  var rounding = places > expected
    ? " (rounded up from " + expected + " to whole groups of three)" : "";
  var over = places > 0 && used > places
    ? "\n             " + (used - places) + " past the plan, all admitted" : "";
  return "Entry open : " + (open ? "YES" : "NO") +
    "\nThis run   : " + (runNo
      ? "#" + runNo + " - " + used + " joined of " + places + " places planned" + rounding + over
      : "none opened yet") +
    "\nCapacity   : " + free + " free places ready; the pool grows if a run overruns" +
    "\nPool       : " + (pool ? Number(pool.claimed_count) : 0) + " used of " +
      (pool ? Number(pool.slot_count) : 0) + " (" + pilotBlockCount_() + " blocks)";
}

function PILOT_SHOW_LINK() {
  pilotSyncCommitments_();
  return opsNotify_("Pilot participant link",
    pilotParticipantUrl_() +
    "\n\n" + pilotRunSummary_() +
    "\n\nAnyone with this link can take part until you close the run " +
    "(PILOT -> Stop the pilot). If more people turn up than you planned for, " +
    "they are admitted rather than turned away.");
}

/* 4. CSV snapshot into Drive. Writes one file per tab, timestamped, into
 *    a folder named "Queue Study PILOT data". Re-runnable: each run adds a
 *    new timestamped set rather than overwriting the last. */
function pilotCsvCell_(value) {
  var s = (value === null || value === undefined) ? "" : String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function pilotSheetToCsv_(sheet) {
  var values = sheet.getDataRange().getValues();
  return values.map(function (row) {
    return row.map(pilotCsvCell_).join(",");
  }).join("\n");
}

function PILOT_EXPORT_CSV() {
  pilotSyncCommitments_();
  var folders = DriveApp.getFoldersByName(PILOT_CSV_FOLDER);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(PILOT_CSV_FOLDER);
  var stamp = Utilities.formatDate(new Date(), "Etc/GMT", "yyyy-MM-dd_HHmm") + "Z";
  var book = researchBook_();
  var written = [];
  PILOT_EXPORT_TABS.forEach(function (name) {
    var sheet = book.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 1) return;
    var csv = pilotSheetToCsv_(sheet);
    folder.createFile("pilot_" + name + "_" + stamp + ".csv", csv, MimeType.CSV);
    written.push(name + " (" + Math.max(0, sheet.getLastRow() - 1) + " rows)");
  });
  return opsNotify_("CSV export complete",
    "Folder in your Drive: " + PILOT_CSV_FOLDER +
    "\nTimestamp: " + stamp +
    "\n\n" + written.join("\n") +
    "\n\nOpen Drive and search for the folder name to download them.");
}

/* 4b. Start a FRESH pilot environment.
 *
 * Not needed to make room any more — the pool grows on demand — so this
 * exists for one purpose: starting clean, with an empty data set under a
 * new sequence version. The previous pilot workbooks are left intact in
 * Drive as a record; nothing is deleted, they simply stop being used.
 * Safe here precisely because pilot data is disposable; the same
 * operation would NOT be appropriate for the live study once a single
 * participant had completed.
 */
function PILOT_NEW_ENVIRONMENT() {
  var props = props_();
  var current = props.getProperty("SEQUENCE_VERSION") || "pilot-seq-v1";
  var m = current.match(/^(.*?)(\d+)$/);
  var next = m ? (m[1] + (Number(m[2]) + 1)) : (current + "-v2");

  if (!opsConfirm_("Start a fresh pilot environment?",
      "This starts a NEW pilot in NEW workbooks under sequence version " + next + ", " +
      "with an empty data set and a seed pool of " + PILOT_POOL_PLACES + " places that " +
      "grows as runs need it.\n\n" +
      "The current pilot workbooks are kept in Drive but stop being used, so any pilot data " +
      "already collected stays where it is and is no longer added to.\n\n" +
      "You do NOT need this to run more participants — open another run instead.\n\nProceed?")) {
    return "Cancelled.";
  }

  var report = [];
  props.setProperty("SEQUENCE_VERSION", next);
  props.setProperty("COLLECTION_OPEN", "FALSE");
  props.setProperty("RESEARCH_SPREADSHEET_ID", "PASTE_RESEARCH_SPREADSHEET_ID");
  props.setProperty("PAYMENT_SPREADSHEET_ID", "PASTE_PAYMENT_SPREADSHEET_ID");
  clearSecretCache_();

  report.push("Sequence version: " + current + " -> " + next);
  report.push(createWorkbooks());
  report.push(provisionStudyPool(PILOT_POOL_PLACES, 0));
  setupOperationsSheets_();
  configSet_("pilot_run_number", "0");

  return opsNotify_("Fresh pilot environment ready",
    report.join("\n") +
    "\n\nNext: PILOT -> 2. Open a run.");
}

/* 5. Status and stop. */
function PILOT_STATUS() {
  pilotSyncCommitments_();
  var research = researchBook_();
  var count = function (tab) {
    var s = research.getSheetByName(tab);
    return s ? Math.max(0, s.getLastRow() - 1) : 0;
  };
  return opsNotify_("Pilot status",
    pilotRunSummary_() +
    "\nSessions   : " + count("sessions") +
    "\nCompleted  : " + count("participants") +
    "\nRound rows : " + count("rounds") +
    "\nErrors     : " + count("errors") +
    "\n\nLink: " + pilotParticipantUrl_());
}

function PILOT_CLOSE() {
  props_().setProperty("COLLECTION_OPEN", "FALSE");
  configSet_("collection_open", "FALSE");
  configSet_("live_open", "FALSE");
  configSet_("closed_at", nowIso_());
  SpreadsheetApp.flush();
  pilotSyncCommitments_();
  return opsNotify_("Pilot stopped",
    "Entry is closed. The link now refuses new participants; sessions already in progress can still finish.\n\n" +
    "Open another run at any time with PILOT -> 2. Open a run.\n\n" +
    "Export the data with PILOT -> Export all data as CSV to Drive.");
}
