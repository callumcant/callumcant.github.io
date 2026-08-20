// Query name: P_BranchColumn
//
// Which column the Branch view groups by. One of exactly two values:
//
//   "LA (borough)"   the local authority, from GIAS        <- default
//   "NEU branch"     the branch, from Stratum
//
// THIS IS AN OPEN DECISION, not a preference. The app has always had an "All
// branches" filter that actually filtered borough, because borough was the only
// thing GIAS gave it. Stratum turning out to carry the real branch name is what
// made the two separable — and made it obvious nobody had ever decided which
// one the rollups should mean.
//
// They are not the same. A borough can hold more than one NEU branch, and a
// branch can straddle boroughs. Grouping by one and labelling it the other is
// how the muddle started; this setting is here so the choice is made once, in
// the open, and every figure follows it.
//
// The default is "LA (borough)" only because that is what the app does, so the
// two can be compared against the same inputs. Change it once somebody decides.
//
// TWO THINGS THAT DO NOT FOLLOW THIS SETTING, both on purpose:
//
//   * Branch-level notes match on the Subject typed into the field log. If the
//     grouping changes, notes typed against borough names stop matching. The
//     Branch view says how many notes matched nothing, rather than silently
//     dropping them.
//   * The School view's "Quadrant (vs branch)" column is fixed to
//     LA (borough) — see fnAddQuadrant. Switching this setting without
//     switching that one leaves the quadrant peer group and the Branch view
//     disagreeing about what a branch is.
let
    Source = "LA (borough)"
in
    Source
