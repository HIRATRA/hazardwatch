# 0011. Group satellite fire detections into grid cells

- Status: Accepted
- Date: 2026-11-18

## Context

NASA FIRMS publishes every fire detection made by the VIIRS instruments of
the NOAA-20 and NOAA-21 satellites: a 375 m pixel noticeably hotter than its
surroundings, with its fire radiative power (FRP) in megawatts. On a day of
November 2026, that was 104,000 detections, most of them small agricultural
burns.

Detections are not events. A single fire covers many pixels, both satellites
see it, and it shows up again at every pass while it burns. Stored one by
one, they would exceed the 2,000 events the map shows and raise an alert per
pixel.

FIRMS offers two ways in. Its API needs a key, while public files with the
past 24 hours of detections of each satellite need none and change about
once an hour. NASA's server ignores conditional requests.

## Decision

- The worker reads the public 24-hour files of NOAA-20 and NOAA-21 every
  30 minutes. A HEAD request first reads when each file changed, and the
  files are only downloaded when one did.
- Detections are grouped by cell of a 0.25° grid, about 28 km. A cell is
  one fire event, located at the centre of its detections, active from its
  first to its last detection.
- The power of a cell is the highest total FRP seen by a single satellite,
  so that a fire seen by both is not counted twice. Low-confidence
  detections are ignored.
- Severity follows that power. Cells below 250 MW are left out.

  | Severity   | Power in a cell |
  | ---------- | --------------- |
  | `minor`    | 250 MW          |
  | `moderate` | 500 MW          |
  | `severe`   | 1,000 MW        |
  | `extreme`  | 2,500 MW        |

- The source is windowed: since the files only cover 24 hours, a fire that
  keeps burning keeps its start, and a cell that lights up again after two
  quiet days starts a new fire, which raises its alerts again.

## Consequences

- About 450 fires a day worldwide, which the map and the alerts handle.
- A fire larger than a cell, or across a cell border, appears as several
  events.
- A fire only shows up once it reaches 250 MW in its cell, so small fires
  are missed until they grow. The thresholds were set on November data and
  may need tuning for other seasons.
- FIRMS does not tell wildfires from other heat sources in near real time,
  so agricultural burns, gas flares and volcanoes appear as wildfires.
- The largest wildfires also appear as GDACS events, which assess their
  impact rather than their detections.
- No key is needed, but the source depends on NASA keeping these files. The
  API, with a key, serves the same data.
