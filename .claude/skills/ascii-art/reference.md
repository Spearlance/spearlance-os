# ASCII Art Techniques Reference

Craft reference for the `ascii-art-creator` agent. Load before creating any art.
Use the tables, scales, and checklists during planning and creation.

---

## 1. Character Density Palette

### Full Scale (Light to Dark)

```
 .  ,  -  '  :  ;  !  |  /  \  (  )  {  }  [  ]  <  >  ~  ^  "  =  +  *  #  %  @  &  $
```

### Density Tiers

| Tier    | Characters          | Density | Use For                        |
|---------|---------------------|---------|--------------------------------|
| Empty   | ` ` (space)         | 0%      | Background, negative space     |
| Whisper | `. , -`             | 5-15%   | Atmosphere, distant haze, mist |
| Light   | `' : ; ~`           | 15-30%  | Light fill, water surface, sky |
| Medium  | `! / \ | ( ) < >`   | 30-50%  | Mid-tones, textures, bark      |
| Heavy   | `= + * ^ " { } []`  | 50-70%  | Dense fill, shadows, foliage   |
| Solid   | `# % @ & $`        | 70-100% | Foreground, outlines, emphasis |

### Gradient Rules

**Never skip more than one tier.** Abrupt density jumps break the illusion.

```
Good:  . . , - : ; = + # @          Bad:  .       #  @  @
```

Example -- mountain ridge fading to sky:
```
         .  .    .
      .-':;=+*#@@#*+=;:'-.
    ,:;=+*##%@@@@@@%##*+=;:,
```

### Character Selection by Subject

| Subject  | Light      | Medium     | Heavy      | Outline   |
|----------|------------|------------|------------|-----------|
| Fur/hair | `. , ;`    | `/ \ |`    | `* # %`    | `( ) / \` |
| Water    | `. ~ -`    | `~ : ;`    | `= ~ ;`    | `_ - ~`   |
| Foliage  | `. , :`    | `; * +`    | `# % @ &`  | `/ \ | (` |
| Stone    | `. - :`    | `= + *`    | `# % @`    | `/ \ | _` |
| Sky/air  | `. , -`    | `' : ;`    | (rarely)   | (none)    |
| Metal    | `- = :`    | `+ * |`    | `# % @`    | `[ ] | -` |

---

## 2. Line Art Characters

### Straight Lines

| Direction  | Characters | Notes                    |
|------------|------------|--------------------------|
| Vertical   | `|`        | Stack vertically         |
| Horizontal | `- _ =`    | `=` for thick/emphasis   |
| Diagonal R | `\`        | Descending left-to-right |
| Diagonal L | `/`        | Descending right-to-left |

### Corners and Curves

| Shape            | Characters   | Example    |
|------------------|--------------|------------|
| Top-left corner  | `. ,` or `/` | `,.`       |
| Top-right corner | `. '` or `\` | `.'`       |
| Smooth curve R   | `._/`        | `.__/`     |
| Smooth curve L   | `\_.`        | `\__.`     |
| Concave up       | `\_.._/`     | `\______/` |

Example -- smooth rounded shape:
```
    .-"""-.
   /       \
  |         |
   \       /
    '-...-'
```

### Box Drawing

| Need        | ASCII      | Unicode (modern only)  |
|-------------|------------|------------------------|
| Light box   | `+ - |`    | `┌ ─ ┐ │ └ ┘`         |
| Heavy box   | `+ = |`    | `╔ ═ ╗ ║ ╚ ╝`         |
| Rounded box | `. - ' |`  | `╭ ─ ╮ │ ╰ ╯`         |
| T-junction  | `+`        | `┬ ┤ ┴ ├ ┼`           |

```
ASCII-safe:     Unicode:
+----------+    ┌──────────┐
|  content |    │  content │
+----------+    └──────────┘
```

**Default to ASCII.** Only use Unicode when the brief permits it; always
provide an ASCII fallback.

---

## 3. Proportional Rules

**The #1 source of amateur-looking ASCII art.** Monospace characters are
approximately twice as tall as wide. Every layout must compensate.

### Core Rule

```
Character cell ratio:  ~2:1  (height:width)

  Visual square  = 2 cols x 1 row
  Visual circle  = ellipse wider than tall
  45-degree line = 2 chars horizontal per 1 row vertical
```

### Reference Grid

```
Uncompensated "square"       Compensated square
(looks tall):                (looks square):
+----+                       +--------+
|    |                       |        |
|    |                       |        |
|    |                       +--------+
|    |
+----+

Uncompensated "circle"       Compensated circle
(looks like tall oval):      (looks round):
   **                              ****
  *  *                          **      **
 *    *                        *          *
  *  *                          **      **
   **                              ****
```

### Compensation Table

| Visual Shape    | Naive         | Compensated           |
|-----------------|---------------|-----------------------|
| Square          | N x N         | 2N cols x N rows      |
| Circle (d=N)    | N x N         | 2N cols x N rows      |
| 45-degree line  | 1 col/row     | 2 cols per row        |
| Equilateral tri | equal sides   | base = 2x the height  |

### Common Mistakes

| Mistake                       | Fix                                      |
|-------------------------------|------------------------------------------|
| Circle looks like tall oval   | Widen to 2:1 ratio                       |
| Square looks like rectangle   | Double the column count                  |
| Diagonal lines too steep      | Use 2 horizontal chars per vertical step |
| Head too narrow on body       | Heads need to be wider than you think    |

---

## 4. Size Templates

**Lock dimensions BEFORE drawing.** Write "Target: W cols x H rows" and hold to it.

### Small (16-30 cols x 8-15 rows)

Icons, decorators, inline accents. Very limited detail -- use silhouettes
or bold outlines. Every character matters.

```
Example -- small cat (18 x 8):
    /\_/\
   ( o.o )
    > ^ <
   /|   |\
  (_|   |_)
```

### Medium (40-60 cols x 15-30 rows)

Banners, logos, illustrations, CLI splash screens. The workhorse size.
Enough detail for recognizable subjects with some shading.

### Large (60-80 cols x 30-50 rows)

Detailed scenes, portraits, splash screens. Supports full density
gradients and depth layering. Stay at or below 80 columns (terminal wrap).

### Dimension Planning Template

```
Size tier:    [small / medium / large]
Target:       [W] cols x [H] rows
Visual shape: [description of overall silhouette]
Char grid:    [W] x [H] after proportional compensation
Margin:       [N] chars padding on each side (if framed)
```

---

## 5. Composition Techniques

### Silhouette Style

Outline only, interior whitespace. Best for small art, icons, logos.

```
      /\
     /  \
    /    \
   /      \
  /________\
```

- Every outline character must connect to neighbors
- Interior must be truly empty (no stray characters)

### Filled Style

Interior shaded using density palette. Best for medium/large art needing
volume, texture, or weight.

```
      /\
     /;;\
    /;;;;;\
   /;*;;*;;\
  /############\
```

- Use 2-3 density tiers minimum inside the shape
- Avoid single-character fill everywhere (the "@-blob" problem)
- Denser toward bottom/foreground suggests weight

### Mixed Style

Outline with selective shading for depth. Most versatile.

```
      .-""-.
     /  ,,  \
    | ;'  '; |
     \  ''  /
      '-__-'
```

- Shading only where it communicates depth, shadow, or texture
- Leave some interior empty for visual breathing room

### Scene Layering

Depth through density: sparse background, medium midground, dense foreground.

| Layer      | Density | Characters       | Detail Level |
|------------|---------|------------------|--------------|
| Background | Whisper | `. , - ' :`      | Minimal      |
| Sky/atmos  | Light   | `. ~ -`          | Sparse hints |
| Midground  | Medium  | `; / \ | + =`    | Moderate     |
| Foreground | Heavy   | `# % @ & * +`    | Full detail  |

**Overlap technique:** Foreground uses heavier characters; its outline
overrides the background element:

```
Background mountain:         With foreground overlap:
        .                            .
      .:;:.                    /\  .:;:.
    .,:;=;:,.                 /##\/;=;:,.
  .,-:;=+=;:-,.             /####\+=;:-,.
```

**Transition zones:** Where elements meet, use 1-2 chars of intermediate
density. Never hard-cut between filled area and empty space:

```
Bad (hard edge):          Good (transition):
@@@@@@@@@@@@@@            @@@@@@@@@@@@@@
                          .,;*@@@@@@*;,.
~~~~~~~~~~~~~~            ..,,~~::::~~,,..
```

### Atmospheric Depth

| Element      | Characters  | Placement            |
|--------------|-------------|----------------------|
| Distant haze | `. , -`     | Background edges     |
| Clouds       | `.-~=~-.`   | Upper region, sparse |
| Birds        | `~ v ^`     | Scattered in sky     |
| Sun/moon     | `( ) O *`   | Upper corner/center  |
| Stars        | `. * +`     | Scattered, sparse    |
| Mist/fog     | `. , : ;`   | Horizontal bands     |
| Rain         | `/ | ' ,`   | Vertical/diagonal    |
| Reflections  | Inverted, lighter | Below water line |

---

## 6. Category Quick-Reference

### Animals

**Start with the eye. Build head outward. Then body.**

```
Eye characters:  o O @ * . 0  ()  ><  ^^
                calm big alert bright small round pair angry happy
```

Construction order:
- Eye(s) anchor the piece -- place first
- Head: rounded shape with `. ' , / \` curves
- Neck narrows: `\ /` converging
- Body: wider, heavier characters than head
- Legs/paws: `| / \` for structure
- Tail: `~ , . ' / \` curving away from body

Texture by type:
```
Smooth:  ,,,;;;    Fluffy:  .:;*#%    Scaly:  ===###    Spiny:  ///\\\
```

### Text/Logos

Block letters: 5-7 chars tall, 1-2 cols between letters.

```
Thin:    Thick:         Banner framing:
 _        ___           +=========+
| |      |   |          | BANNER  |
| |      |   |          +=========+
|_|      |___|
```

Center text: `(total_width - text_length) / 2` spaces before text.

### Borders/Frames

```
Dash:      --------------------------------
Dot-dash:  -.-.-.-.-.-.-.-.-.-.-.-.-.-.-.-
Wave:      ~^~^~^~^~^~^~^~^~^~^~^~^~^~^~^
Star:      *=*=*=*=*=*=*=*=*=*=*=*=*=*=*=
Diamond:   <>.<>.<>.<>.<>.<>.<>.<>.<>.<>.
```

The `+` character resolves corners where horizontal meets vertical.

### Faces/People

**Symmetry is non-negotiable.** Count characters from center on both sides.

```
 /-----\         Expression:
| o   o |        Happy: \___/   Sad: /---\   Surprised: O
|   >   |        Neutral: ___  Angry: \-/   Wink: o  -
|  ---  |
 \_____/
```

Body proportions (2:1 compensated): head ~6-10 cols, shoulders head+4-8 cols.

### Scenes/Landscapes

**Horizon line is the anchor.** Place it first, allocate rows:

```
30-row scene:
  Sky:        rows 1-8    (sparse, atmospheric)
  Mountains:  rows 5-15   (overlapping into sky)
  Horizon:    row 15      (densest horizontal line)
  Lake/field: rows 15-22  (medium density, textures)
  Foreground: rows 22-30  (heavy, detailed)
```

**Mountains** -- not just `/\` triangles. Vary peaks, use asymmetric slopes:

```
Bad (symmetrical):            Good (varied ridgelines):
     /\      /\                     .
    /  \    /  \                  ./ \.
   /    \  /    \               ./    '\.   .
  /      \/      \            /   ,,    '-./'\
                              /  ,:;:,       , \
```

**Trees** -- not uniform @-blobs. Vary canopy shape and density:

```
Bad (@-blob):   Bad (symmetric):   Good (organic):      Pine:
    @@@             .:::.            .,::;,.              *
   @@@@@          .:;*#*;:.        ,:;*#%*;:             /|\
   @@@@@         .;*#%%#*;.      .;*#%%#*;.,'           /|||\
    |||            ':;#;:'        ':;*#;:.'            /||||||\
                     ||              ||                  |||
```

**Organic canopy rule:** Real trees are NOT symmetric. Offset the densest
point, vary the outline on each side, let branches extend unevenly:

```
      .,;*;,.
   ,:;*#%#*;.
  .;*#%%#*;:,'
   ':;*#*;:.'
      ||
```

Note: left side wider, right side trails off. Densest point offset left.

**Water** -- not just tildes. Mix characters for texture:

```
Bad (uniform):               Good (textured):
~~ ~ ~ ~ ~ ~~ ~ ~ ~        .  ~  .  ~  .  ~  .
~~ ~ ~ ~ ~ ~~ ~ ~ ~          ~  , ~  .  ~ ,
~~ ~ ~ ~ ~ ~~ ~ ~ ~        .   ~   .  ~    . ~
```

Water rules: mix `~ . , - :`, sparser near shore, add reflections as
lighter/inverted versions of objects above.

**Scene transitions** -- never hard-cut between layers. Blend with 2-3
rows of intermediate density:

```
Bad (hard cut):                 Good (blended):
  /\    /\  mountains             /\    /\  mountains
  /  \  /  \                      / ,\ / ,\
~~~~~~~~~~~~ water              ,:;~ ~~:;~ ~ shore mix
~~ ~ ~ ~~ ~                    ~ .  ~  . ~  water
```

The transition rows use characters from BOTH adjacent layers. Mountain
base gets water chars mixed in. Waterline gets terrain chars mixed in.

---

## 7. CLI-Specific Patterns

### Banner Headers

```
  +=======================+      ╔═══════════════════════╗
  |     N E P T U N E     |      ║     N E P T U N E     ║
  |       v1.2.0          |      ║       v1.2.0           ║
  +=======================+      ╚═══════════════════════╝
  (ASCII-safe)                    (Unicode)
```

- Space-separate letters for emphasis: `N E P T U N E`
- Include version on second line
- Pad 3-5 spaces inside frame; keep width under 50 cols

### Box Components

```
+--------+---------+            Usage: tool <cmd> [opts]
| Status | RUNNING |
| Uptime | 3h 22m  |            Commands:
| Tasks  | 47/50   |              init   Initialize
+--------+---------+              run    Execute
```

### Error/Warning Art

Small, instantly recognizable. Under 20 cols, 6 rows:

```
Fatal:       Warning:         Error:
    ___         /\              __
   /   \       /  \            |  |
  | x x |     / !! \           | X|
  | ___ |    /______\          |__|
   \___/
  FATAL      WARNING          ERROR
```

### Progress/Status Indicators

```
Loading:   [####......] 40%      Checkmark:  [x] Done  [ ] Pending
Spinner:   / - \ | (cycle)       Pass/Fail:  [PASS]  [FAIL]  [SKIP]
```

### String Escaping Reference

**JavaScript/TypeScript** -- template literals:
```javascript
const art = `
 | \\ | |         | |
 | . \` |/ _ \\/ __| __|
`;
// Escape: \\ for backslash, \` for backtick, \${ for template expr
```

**Python** -- raw strings:
```python
art = r"""
 | \ | |         | |
 | . ` |/ _ \/ __| __|
"""
# r""" preserves backslashes. Cannot end with odd number of backslashes.
```

**Shell/Bash** -- heredoc:
```bash
cat << 'EOF'
 | \ | |         | |
 | . ` |/ _ \/ __| __|
EOF
# Single-quoted 'EOF' prevents expansion. No escaping needed inside.
```

**Go** -- raw string literal:
```go
var art = `
 | \ | |         | |
` + "`" + ` backtick workaround
`
// Backtick in raw string: concatenate with ` + "`" + `
```

### Unicode Compatibility

| Feature     | ASCII (safe)  | Unicode (modern) | Risk          |
|-------------|---------------|------------------|---------------|
| Box drawing | `+ - | _ =`   | `┌ ─ ┐ │ └ ┘`   | Old terminals |
| Block fill  | `# @ %`       | `█ ▓ ▒ ░`       | Medium risk   |
| Arrows      | `> < ^ v`     | `→ ← ↑ ↓`       | Low risk      |
| Emoji       | NEVER         | NEVER            | Breaks layout |

**Default:** Pure ASCII (32-126). Unicode only when brief requests it.

---

## 8. Quality Checklist

Run during creation (after each major section) AND on the completed piece.

### Dimensions
- [ ] Dimensions match the requested size tier?
- [ ] Widest line within target column count?
- [ ] Row count within target range?

### Proportions
- [ ] Compensated for 2:1 character aspect ratio?
- [ ] Circles look round (not tall ovals)?
- [ ] Squares look square (not tall rectangles)?
- [ ] Diagonals: 2 horizontal chars per 1 vertical step?

### Shading and Density
- [ ] Gradient smooth (no abrupt density jumps)?
- [ ] At least 2-3 density tiers for filled areas?
- [ ] No "@-blob" problem (uniform single-character fill)?
- [ ] Density increases toward foreground in scenes?
- [ ] Transitions between elements use intermediate density?
- [ ] Shading follows form (not decorative patterns)?
- [ ] Scene layer transitions blended (2-3 rows of mixed chars)?

### Structural Integrity
- [ ] No broken lines or misaligned characters?
- [ ] All outlines continuous (no gaps)?
- [ ] Symmetric subjects actually symmetric (count from center)?
- [ ] No stray characters floating in whitespace?

### Readability
- [ ] Renders correctly in monospace font?
- [ ] Subject recognizable at a glance?
- [ ] Scene has depth (if multi-element)?
- [ ] No text labels inside the art?
- [ ] Composition balanced (detail distributed, not all in one half)?

### CLI Integration (if applicable)
- [ ] Proper escaping for target language?
- [ ] Width within 80 columns?
- [ ] No emoji?
- [ ] Unicode flagged with ASCII fallback (if used)?
- [ ] Directly copy-pasteable?

---

## Quick-Reference Card

```
DENSITY:   .,-':;!|/\(){}[]<>~^"=+*#%@&$
           light ────────────────────► dark

RATIO:     2 cols = 1 visual unit width
           1 row  = 1 visual unit height

LAYERS:    background (.) → mid (;=+) → foreground (#@%)

PROCESS:   dimensions → proportions → palette → compose → draw → check

NEVER:     skip tiers, use emoji, forget escaping, skip planning
```
