// Shared connection routing and styling. Connections.jsx (which draws the
// arrow), Canvas.jsx (which hit-tests and drags it) and ArrowPropertiesPanel.jsx
// (which edits it) all go through here, so the line you can click is always
// exactly the line you see, and the panel can never offer a value the renderer
// doesn't understand.

// ---------------------------------------------------------------------------
// The style vocabulary. Everything the properties panel can set lives here.
// ---------------------------------------------------------------------------

// How the line gets from A to B.
export const ARROW_TYPE = {
  STRAIGHT: 'straight',
  CURVE: 'curve',
  ELBOW: 'elbow',
};

// The three thickness buttons. Values are canvas pixels.
export const STROKE_WIDTHS = [
  { id: 'thin', label: 'Thin', value: 1.6 },
  { id: 'bold', label: 'Bold', value: 3.2 },
  { id: 'extraBold', label: 'Extra bold', value: 5 },
];

export const STROKE_STYLE = {
  SOLID: 'solid',
  DASHED: 'dashed',
  DOTTED: 'dotted',
};

// 0 is a ruled line; 1 and 2 add progressively more hand-drawn wobble.
export const SLOPPINESS = {
  ARCHITECT: 0,
  ARTIST: 1,
  CARTOONIST: 2,
};

// The shapes an arrow can end in. Either end of a connection can carry any of
// them, independently — a double-headed arrow is just both ends set to the
// same thing.
export const ARROWHEAD = {
  NONE: 'none',
  ARROW: 'arrow',               // open barb, two strokes
  TRIANGLE: 'triangle',         // solid head
  TRIANGLE_OUTLINE: 'triangleOutline',
};

export const ARROWHEAD_OPTIONS = [
  { id: ARROWHEAD.NONE, label: 'None' },
  { id: ARROWHEAD.ARROW, label: 'Arrow' },
  { id: ARROWHEAD.TRIANGLE, label: 'Triangle' },
  { id: ARROWHEAD.TRIANGLE_OUTLINE, label: 'Triangle outline' },
];

// Stroke swatches, per theme, so the palette stays legible on both canvases.
// Index 0 is the "follows the theme" default — it's what an arrow drawn with no
// colour chosen uses, which is why it's black on light and near-white on dark.
export const STROKE_PALETTE = {
  light: ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00'],
  dark: ['#e9ecef', '#ff8787', '#40c057', '#4dabf7', '#e8a33d'],
};

// What an arrow looks like when nothing has been chosen for it. `stroke: null`
// means "follow the theme" rather than any fixed colour, so old diagrams keep
// flipping correctly between light and dark.
export const DEFAULT_ARROW_STYLE = {
  arrowType: ARROW_TYPE.CURVE,
  stroke: null,
  strokeWidth: 3.2,
  strokeStyle: STROKE_STYLE.SOLID,
  sloppiness: SLOPPINESS.ARCHITECT,
  startArrowhead: ARROWHEAD.NONE,
  endArrowhead: ARROWHEAD.TRIANGLE,
  opacity: 100,
};

// ---------------------------------------------------------------------------
// Arrowhead geometry. These live here rather than in Connections.jsx because
// the routing has to agree with the drawing: how far the line stops short of
// the target depends on whether there's a head there at all.
// ---------------------------------------------------------------------------

export const ARROW_HEAD_LEN = 15;
export const ARROW_HEAD_W = 12;

// The marker's reference point is its own tip, so the tip lands exactly on the
// end of the path — this is the gap between the tip and the box edge, and it
// only needs to be a hair.
export const ARROW_GAP = 2;

// Corner softening on elbows. Set to 0 for hard 90° corners.
const ELBOW_RADIUS = 8;

// Kept as an alias so older imports of CONNECTION_WIDTH still resolve.
export const CONNECTION_WIDTH = DEFAULT_ARROW_STYLE.strokeWidth;

// Back-compat with the first pass of the elbow tool, which tagged connections
// with `style: 'elbow'` before there was an arrowType field.
export const CONNECTION_STYLE = {
  CURVE: 'curve',
  ELBOW: 'elbow',
};

// ---------------------------------------------------------------------------
// Stacking
//
// Where the connection layer sits in the canvas's z-order. A shape that
// encloses others is painted BELOW this, so its fill cannot hide the arrows
// drawn across it; every other shape is painted above it, so a line running
// under a box is still covered by that box, the way it always was.
// ---------------------------------------------------------------------------
export const CONNECTION_LAYER = 50;
export const SELECTED_CONNECTION_LAYER = 200;

const clamp01 = (value) => Math.max(0, Math.min(1, value));

// ---------------------------------------------------------------------------
// Reading a connection's style
// ---------------------------------------------------------------------------

export function getArrowType(connection) {
  if (connection?.arrowType) return connection.arrowType;
  // Arrows drawn before the panel existed carry the old marker.
  if (connection?.style === CONNECTION_STYLE.ELBOW) return ARROW_TYPE.ELBOW;
  return ARROW_TYPE.CURVE;
}

export function isElbow(connection) {
  return getArrowType(connection) === ARROW_TYPE.ELBOW;
}

// Arrowheads were booleans before they had shapes. An arrow saved then still
// has `endArrowhead: true` on it, and it has to keep showing a head.
function normalizeArrowhead(value, fallback) {
  if (value === true) return ARROWHEAD.TRIANGLE;
  if (value === false) return ARROWHEAD.NONE;
  if (typeof value === 'string' && ARROWHEAD_OPTIONS.some((o) => o.id === value)) {
    return value;
  }
  return fallback;
}

// Reads a connection's style, filling in anything it doesn't specify.
//
// `defaults` is deliberately NOT passed when rendering a saved connection.
// Arrows made before this panel existed — and arrows from the connect tool and
// auto-arrow — carry no style fields at all, so inheriting the panel's current
// settings would mean that nudging a slider with nothing selected silently
// restyled half the diagram. Falling back to the built-ins instead keeps every
// existing arrow exactly as it was drawn.
//
// The panel passes `defaults` precisely because, with nothing selected, the
// defaults ARE what it's editing.
export function resolveArrowStyle(connection, defaults) {
  const base = { ...DEFAULT_ARROW_STYLE, ...(defaults || {}) };
  const own = connection || {};

  const pick = (key) => (own[key] === undefined || own[key] === null ? base[key] : own[key]);

  return {
    arrowType: getArrowType(own),
    // stroke is deliberately allowed to stay null — the renderer turns null
    // into the theme colour, which is not something we can decide here.
    stroke: own.stroke === undefined ? base.stroke : own.stroke,
    strokeWidth: Number(pick('strokeWidth')) > 0
      ? Number(pick('strokeWidth'))
      : DEFAULT_ARROW_STYLE.strokeWidth,
    strokeStyle: pick('strokeStyle'),
    sloppiness: Number(pick('sloppiness')) || 0,
    startArrowhead: normalizeArrowhead(
      own.startArrowhead,
      normalizeArrowhead(base.startArrowhead, ARROWHEAD.NONE),
    ),
    endArrowhead: normalizeArrowhead(
      own.endArrowhead,
      normalizeArrowhead(base.endArrowhead, ARROWHEAD.TRIANGLE),
    ),
    opacity: Math.max(0, Math.min(100, Number(pick('opacity')))),
  };
}

// Dashes scale with the line, otherwise a dashed 5px arrow reads as solid and a
// dashed 1.6px one reads as a dotted line.
export function dashArrayFor(strokeStyle, strokeWidth) {
  if (strokeStyle === STROKE_STYLE.DASHED) {
    return `${strokeWidth * 2.8} ${strokeWidth * 2.2}`;
  }
  if (strokeStyle === STROKE_STYLE.DOTTED) {
    // A zero-length dash with a round cap is what actually draws a dot.
    return `0.001 ${strokeWidth * 2.4}`;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Anchors
//
// An anchor is a side plus how far along that side it sits: { side, t } with
// t from 0 to 1. Storing a position along the side rather than just the side
// is what lets an arrow attach anywhere on a shape's outline instead of only
// at the four edge midpoints — while still knowing which way to leave, which
// the elbow router needs.
// ---------------------------------------------------------------------------

export function normalizeAnchor(anchor, fallbackSide) {
  if (anchor && typeof anchor === 'object' && anchor.side) {
    return {
      side: anchor.side,
      t: clamp01(typeof anchor.t === 'number' ? anchor.t : 0.5),
    };
  }
  // Arrows drawn before anchors had a position along the side stored a bare
  // side name. Those keep attaching at the middle, exactly as they did.
  if (typeof anchor === 'string') return { side: anchor, t: 0.5 };
  if (typeof fallbackSide === 'string') return { side: fallbackSide, t: 0.5 };
  return null;
}

export function getConnectionAnchors(connection) {
  return {
    from: normalizeAnchor(connection?.fromAnchor, connection?.fromSide),
    to: normalizeAnchor(connection?.toAnchor, connection?.toSide),
  };
}

export function anchorPoint(node, anchor) {
  const t = clamp01(anchor?.t ?? 0.5);
  switch (anchor?.side) {
    case 'left': return { x: node.x, y: node.y + node.h * t };
    case 'right': return { x: node.x + node.w, y: node.y + node.h * t };
    case 'top': return { x: node.x + node.w * t, y: node.y };
    default: return { x: node.x + node.w * t, y: node.y + node.h };
  }
}

// Drops a loose point onto the nearest spot on a shape's outline. This is what
// turns a drag of the endpoint handle into an anchor: the cursor can wander
// anywhere, the anchor stays on the border.
export function projectToBorder(node, point) {
  const x = Math.max(node.x, Math.min(node.x + node.w, point.x));
  const y = Math.max(node.y, Math.min(node.y + node.h, point.y));

  const dLeft = x - node.x;
  const dRight = (node.x + node.w) - x;
  const dTop = y - node.y;
  const dBottom = (node.y + node.h) - y;

  const min = Math.min(dLeft, dRight, dTop, dBottom);

  if (min === dLeft) return { side: 'left', t: clamp01((y - node.y) / node.h) };
  if (min === dRight) return { side: 'right', t: clamp01((y - node.y) / node.h) };
  if (min === dTop) return { side: 'top', t: clamp01((x - node.x) / node.w) };
  return { side: 'bottom', t: clamp01((x - node.x) / node.w) };
}

// Which edge of a shape a point is nearest. Used when an arrow is first drawn:
// grab near the right edge and it leaves from the right, drop near the right
// edge of the target and it comes back in from the right — which is what
// produces a loop around the outside rather than a line through the middle.
export function nearestSide(node, point) {
  return projectToBorder(node, point).side;
}

// The anchor the drag gesture implies: the side it's nearest, at the exact
// spot along that side where the cursor was.
export function nearestAnchor(node, point) {
  return projectToBorder(node, point);
}

function outward(side, distance) {
  switch (side) {
    case 'left': return { x: -distance, y: 0 };
    case 'right': return { x: distance, y: 0 };
    case 'top': return { x: 0, y: -distance };
    default: return { x: 0, y: distance };
  }
}

const isHorizontalSide = (side) => side === 'left' || side === 'right';

// ---------------------------------------------------------------------------
// Routing
// ---------------------------------------------------------------------------

function centerOf(node) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

function shortenTowards(a, b, distance) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0 || distance >= length) return b;
  const ratio = (length - distance) / length;
  return { x: a.x + dx * ratio, y: a.y + dy * ratio };
}

// Nothing routes from shape centres any more. Every elbow goes through
// routeElbowAnchors, with resolveAnchors filling in anchors for arrows that
// never stored any — one code path, so the line, its clickable area and its
// handles cannot disagree about where the arrow runs.

// Same Z-shaped route, but between two loose points rather than two shapes.
// Used for the live preview while an arrow is being dragged.
export function routeElbowPoints(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (Math.abs(dy) < 1) return [start, end];
    const jogX = (start.x + end.x) / 2;
    return [start, { x: jogX, y: start.y }, { x: jogX, y: end.y }, end];
  }

  if (Math.abs(dx) < 1) return [start, end];
  const jogY = (start.y + end.y) / 2;
  return [start, { x: start.x, y: jogY }, { x: end.x, y: jogY }, end];
}

// How far the line runs straight out of a shape before it's allowed to turn.
// This is what keeps a corner from forming flush against the box edge.
const STUB = 28;

// Rebuilds a route through hand-placed waypoints, forcing it back to right
// angles.
//
// Two things make this necessary rather than just joining the dots. The first
// and last hops have to leave and arrive perpendicular to their borders, or the
// arrow meets the shape at a slant. And once the user moves one of the SHAPES,
// stored waypoints no longer line up with the new anchor positions at all — so
// the neighbouring waypoint gets snapped back onto the anchor's axis, and any
// pair of waypoints left sharing neither axis gets a corner inserted between
// them.
function makeOrthogonal(p0, waypoints, pEnd, fromSide, toSide) {
  const pts = waypoints.map((p) => ({ x: p.x, y: p.y }));

  if (pts.length) {
    if (isHorizontalSide(fromSide)) pts[0].y = p0.y;
    else pts[0].x = p0.x;

    const last = pts.length - 1;
    if (isHorizontalSide(toSide)) pts[last].y = pEnd.y;
    else pts[last].x = pEnd.x;
  }

  const chain = [p0];
  let lastAxis = isHorizontalSide(fromSide) ? 'h' : 'v';

  for (let i = 0; i < pts.length; i += 1) {
    const prev = chain[chain.length - 1];
    const cur = pts[i];
    const dx = Math.abs(cur.x - prev.x);
    const dy = Math.abs(cur.y - prev.y);

    if (dx < 0.5 || dy < 0.5) {
      chain.push(cur);
      lastAxis = dx < 0.5 ? 'v' : 'h';
      continue;
    }

    // Carry on in the direction already being travelled, then turn — that
    // keeps the inserted corner where the eye expects it.
    if (lastAxis === 'h') {
      chain.push({ x: cur.x, y: prev.y });
      lastAxis = 'v';
    } else {
      chain.push({ x: prev.x, y: cur.y });
      lastAxis = 'h';
    }
    chain.push(cur);
  }

  const prev = chain[chain.length - 1];
  if (isHorizontalSide(toSide)) {
    if (Math.abs(prev.y - pEnd.y) > 0.5) chain.push({ x: prev.x, y: pEnd.y });
  } else if (Math.abs(prev.x - pEnd.x) > 0.5) {
    chain.push({ x: pEnd.x, y: prev.y });
  }

  chain.push(pEnd);
  return simplifyOrthogonal(chain);
}

// How far outside the shapes a detour runs.
const LANE_MARGIN = 28;

// How close a line may come to a shape before it counts as running into it.
// A hairline test is not enough: a route grazing an edge by less than a pixel
// passes a strict interior test, but the arrow is several pixels wide and sits
// visibly on top of the border. The margin has to exceed half the heaviest
// stroke, which is 2.5.
const SHAPE_CLEARANCE = 4;

// Does an axis-aligned segment run into a shape? Measured against the shape
// grown by SHAPE_CLEARANCE, so near-misses count. Poking straight out of a
// border does not — that is what a stub does, and stubs are never scored.
function segmentCrossesShape(a, b, rect, margin = SHAPE_CLEARANCE) {
  const x0 = rect.x - margin;
  const x1 = rect.x + rect.w + margin;
  const y0 = rect.y - margin;
  const y1 = rect.y + rect.h + margin;
  if (x1 <= x0 || y1 <= y0) return false;

  if (Math.abs(a.x - b.x) < 0.5) {
    if (a.x <= x0 || a.x >= x1) return false;
    return Math.min(a.y, b.y) < y1 && Math.max(a.y, b.y) > y0;
  }

  if (Math.abs(a.y - b.y) < 0.5) {
    if (a.y <= y0 || a.y >= y1) return false;
    return Math.min(a.x, b.x) < x1 && Math.max(a.x, b.x) > x0;
  }

  return false;
}

// The ways an orthogonal line can get from one stub to the other: straight
// across in one turn, or along a shared lane in two. The lanes offered are the
// midpoint between the stubs and a corridor clear of both shapes on each side,
// which is what makes going the long way round available when the short way
// would cut through something.
function candidateRoutes(p1, p2, fromNode, toNode) {
  const lanesX = [
    (p1.x + p2.x) / 2,
    Math.min(fromNode.x, toNode.x) - LANE_MARGIN,
    Math.max(fromNode.x + fromNode.w, toNode.x + toNode.w) + LANE_MARGIN,
  ];

  const lanesY = [
    (p1.y + p2.y) / 2,
    Math.min(fromNode.y, toNode.y) - LANE_MARGIN,
    Math.max(fromNode.y + fromNode.h, toNode.y + toNode.h) + LANE_MARGIN,
  ];

  const routes = [
    [p1, { x: p2.x, y: p1.y }, p2],
    [p1, { x: p1.x, y: p2.y }, p2],
  ];

  lanesX.forEach((x) => routes.push([p1, { x, y: p1.y }, { x, y: p2.y }, p2]));
  lanesY.forEach((y) => routes.push([p1, { x: p1.x, y }, { x: p2.x, y }, p2]));

  return routes;
}

function direction(a, b) {
  if (Math.abs(a.x - b.x) < 0.5) return { x: 0, y: Math.sign(b.y - a.y) };
  return { x: Math.sign(b.x - a.x), y: 0 };
}

// Ranks a candidate. Crossing a shape is disqualifying, so it is compared
// first and nothing else can outweigh it. A reversal — setting off back into
// the shape just left, or overshooting the target and coming back — is next,
// then the number of turns, then plain length.
function scoreRoute(points, fromNode, toNode, away, approach) {
  let crossings = 0;
  let length = 0;

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (segmentCrossesShape(a, b, fromNode)) crossings += 1;
    if (segmentCrossesShape(a, b, toNode)) crossings += 1;
    length += Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  }

  const first = direction(points[0], points[1]);
  const last = direction(points[points.length - 2], points[points.length - 1]);

  let reversals = 0;
  if (first.x === -away.x && first.y === -away.y) reversals += 1;
  if (last.x === approach.x && last.y === approach.y) reversals += 1;

  return { crossings, reversals, bends: points.length - 2, length };
}

function isBetterRoute(a, b) {
  if (a.crossings !== b.crossings) return a.crossings < b.crossings;
  if (a.reversals !== b.reversals) return a.reversals < b.reversals;
  if (a.bends !== b.bends) return a.bends < b.bends;
  return a.length < b.length - 0.5;
}

// Routes between two anchors. Every arrow leaves perpendicular to its shape,
// travels in right angles, and arrives perpendicular to the target — the
// printed-flowchart look.
//
// The route is CHOSEN rather than constructed. Picking one shape of route per
// combination of sides and then patching the cases that came out wrong does
// not converge: there are sixteen side pairings, and the right answer for each
// depends on where the two shapes actually sit. Offering a handful of
// candidates and keeping the best-behaved one covers all of them under a rule
// that fits in a sentence — never cut through a shape, don't double back, then
// prefer fewer turns and a shorter line.
export function routeElbowAnchors(fromNode, toNode, fromAnchor, toAnchor, waypoints) {
  const from = normalizeAnchor(fromAnchor) || { side: 'right', t: 0.5 };
  const to = normalizeAnchor(toAnchor) || { side: 'left', t: 0.5 };

  const p0 = anchorPoint(fromNode, from);
  const p3 = anchorPoint(toNode, to);

  // A hand-adjusted route wins over anything computed.
  if (Array.isArray(waypoints) && waypoints.length) {
    return makeOrthogonal(p0, waypoints, p3, from.side, to.side);
  }

  const o0 = outward(from.side, STUB);
  const p1 = { x: p0.x + o0.x, y: p0.y + o0.y };

  const o3 = outward(to.side, STUB);
  const p2 = { x: p3.x + o3.x, y: p3.y + o3.y };

  // Which way the arrow leaves its shape, and which way it must finally be
  // travelling to arrive at the target. Together these are what let a route
  // that sets off backwards, or overshoots and comes back, be recognised.
  const away = outward(from.side, 1);
  const inward = outward(to.side, 1);
  const approach = { x: -inward.x, y: -inward.y };

  let best = null;
  let bestScore = null;

  candidateRoutes(p1, p2, fromNode, toNode).forEach((candidate) => {
    const score = scoreRoute(candidate, fromNode, toNode, away, approach);
    if (!bestScore || isBetterRoute(score, bestScore)) {
      best = candidate;
      bestScore = score;
    }
  });

  return simplifyOrthogonal([p0, ...best, p3]);
}

// Kept for callers that still pass bare side names.
export function routeElbowSides(fromNode, toNode, fromSide, toSide) {
  return routeElbowAnchors(fromNode, toNode, { side: fromSide, t: 0.5 }, { side: toSide, t: 0.5 });
}

// Picks the anchors for a connection that never recorded any: the side facing
// the other shape, at its midpoint. Which is what the old centre-based router
// effectively did, so an arrow that predates anchors keeps the shape it had.
function inferAnchors(fromNode, toNode) {
  const fromCenter = centerOf(fromNode);
  const toCenter = centerOf(toNode);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { from: { side: 'right', t: 0.5 }, to: { side: 'left', t: 0.5 } }
      : { from: { side: 'left', t: 0.5 }, to: { side: 'right', t: 0.5 } };
  }

  return dy >= 0
    ? { from: { side: 'bottom', t: 0.5 }, to: { side: 'top', t: 0.5 } }
    : { from: { side: 'top', t: 0.5 }, to: { side: 'bottom', t: 0.5 } };
}

// The anchors an arrow is actually drawn between — stored where the user has
// placed one, inferred where they haven't.
//
// Each end is resolved on its own, and that is the whole point. This used to
// demand BOTH anchors before it would honour either, which quietly broke every
// arrow that wasn't drawn with the arrow tool: an auto-arrow connection has no
// anchors at all, so dragging one endpoint stored one anchor, the all-or-
// nothing test still failed, and the route carried on being computed from the
// shape centres. The handle moved; the line did not. Dragging a segment was
// dead for the same reason — the fallback router ignored waypoints entirely.
export function resolveAnchors(connection, fromNode, toNode) {
  const stored = getConnectionAnchors(connection);
  if (stored.from && stored.to) return stored;

  const inferred = inferAnchors(fromNode, toNode);
  return {
    from: stored.from || inferred.from,
    to: stored.to || inferred.to,
  };
}

// The route for a saved connection.
export function getElbowPoints(connection, fromNode, toNode) {
  const anchors = resolveAnchors(connection, fromNode, toNode);
  return routeElbowAnchors(
    fromNode,
    toNode,
    anchors.from,
    anchors.to,
    connection?.waypoints,
  );
}

// ---------------------------------------------------------------------------
// Editing a route by hand
// ---------------------------------------------------------------------------

// Collapses a route to the fewest points that describe the same shape:
// repeated points go, and so does any point whose neighbours carry straight on
// through it.
//
// This is what stops a hand-edited route from growing. Rebuilding a route can
// INSERT corners (see makeOrthogonal), so without a simplify pass those
// inserted corners get stored as waypoints, the next rebuild inserts more
// around them, and after a few drags the arrow is a staircase covered in
// handles.
export function simplifyOrthogonal(points, epsilon = 0.5) {
  if (points.length < 3) return points.map((p) => ({ x: p.x, y: p.y }));

  const out = [{ x: points[0].x, y: points[0].y }];

  for (let i = 1; i < points.length; i += 1) {
    const prev = out[out.length - 1];
    if (Math.abs(points[i].x - prev.x) < epsilon && Math.abs(points[i].y - prev.y) < epsilon) {
      continue;
    }
    out.push({ x: points[i].x, y: points[i].y });
  }

  // Repeat until nothing more collapses: removing one point can make its
  // neighbours collinear in turn.
  let changed = true;
  while (changed && out.length > 2) {
    changed = false;

    for (let i = 1; i < out.length - 1; i += 1) {
      const a = out[i - 1];
      const b = out[i];
      const c = out[i + 1];

      // Sharing an axis is NOT enough to call a point redundant — it also has
      // to lie BETWEEN its neighbours. Three points on one line where the
      // middle is past the outer two is a U-turn, and dropping it silently
      // deletes the turn. That is what was eating the stubs that hold an
      // arrow off its own shape: the route left a shape, doubled back, and
      // simplify flattened the whole thing into one line straight through it.
      const between = (lo, m, hi) => (
        m >= Math.min(lo, hi) - epsilon && m <= Math.max(lo, hi) + epsilon
      );

      const straightAcross = Math.abs(a.y - b.y) < epsilon
        && Math.abs(b.y - c.y) < epsilon
        && between(a.x, b.x, c.x);

      const straightDown = Math.abs(a.x - b.x) < epsilon
        && Math.abs(b.x - c.x) < epsilon
        && between(a.y, b.y, c.y);

      if (straightAcross || straightDown) {
        out.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  return out;
}

// Tidies a connection's stored route. Called once when a drag ENDS rather than
// on every mouse move: simplifying mid-drag would renumber the segments under
// the cursor and the handle being held would jump to a different one.
export function settleWaypoints(connection, fromNode, toNode) {
  const simple = simplifyOrthogonal(getElbowPoints(connection, fromNode, toNode));
  if (simple.length <= 2) return undefined;
  return simple.slice(1, simple.length - 1).map((p) => ({ x: p.x, y: p.y }));
}

// Every segment that can carry a drag handle, and what dragging it means.
//
// A segment can only ever be moved perpendicular to itself. For a middle
// segment that shifts the segment and leaves both shapes alone. For the first
// and last — the stubs leaving and entering the shapes — perpendicular is
// along the border they are attached to, so dragging one slides that anchor
// rather than detaching it.
//
// Both kinds have to exist. A route that settles to a plain L has only two
// segments, and both are stubs: treating stubs as undraggable left such an
// arrow with no handles at all, which is the point at which editing appeared
// to stop working.
//
// MIN_STUB_HANDLE is larger than the middle one because a stub handle sits at
// the midpoint of a segment that starts at an endpoint handle. On a short stub
// the two would land on top of each other and the endpoint, drawn later, would
// swallow every click meant for the stub.
const MIN_MIDDLE_HANDLE = 18;
const MIN_STUB_HANDLE = 44;

export function routeSegments(points) {
  const out = [];
  const last = points.length - 2;

  for (let i = 0; i <= last; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const length = Math.hypot(b.x - a.x, b.y - a.y);

    // A two-point route is a single straight run with no corner; its one
    // segment is treated as the start stub.
    const kind = i === 0 ? 'start' : (i === last ? 'end' : 'middle');
    const minimum = kind === 'middle' ? MIN_MIDDLE_HANDLE : MIN_STUB_HANDLE;
    if (length < minimum) continue;

    out.push({
      index: i,
      kind,
      a,
      b,
      axis: Math.abs(a.y - b.y) < 0.5 ? 'h' : 'v',
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    });
  }

  return out;
}

// Kept so any caller still asking only for the middle segments gets them.
export function interiorSegments(points) {
  return routeSegments(points).filter((segment) => segment.kind === 'middle');
}

// Where along a border the cursor sits, as the 0..1 the anchor stores. This is
// what a stub drag turns into: the side stays, the position along it moves.
export function anchorTForCursor(node, side, cursor) {
  if (side === 'left' || side === 'right') {
    return clamp01((cursor.y - node.y) / node.h);
  }
  return clamp01((cursor.x - node.x) / node.w);
}

// Shifts one interior segment sideways and hands back the new interior
// waypoints. Both ends of an interior segment are themselves interior points,
// which is why the two anchors can never be disturbed by this.
//
// `points` must be the route as it was when the drag STARTED, held fixed for
// the whole gesture. Passing the freshly rendered route on each mouse move
// instead is what made dragging unstable: the rebuilt route can gain or lose
// points, so the index being dragged would quietly come to mean a different
// segment halfway through the gesture.
export function moveSegment(points, index, cursor) {
  if (index < 1 || index > points.length - 3) return points.slice(1, -1);

  const next = points.map((p) => ({ x: p.x, y: p.y }));
  const a = next[index];
  const b = next[index + 1];

  if (Math.abs(a.y - b.y) < 0.5) {
    a.y = cursor.y;
    b.y = cursor.y;
  } else {
    a.x = cursor.x;
    b.x = cursor.x;
  }

  return next.slice(1, next.length - 1);
}

// Turns the computed route into editable waypoints, so the first drag has
// something to modify. Only the interior points are kept — the two ends are
// anchors and belong to the shapes, not to the route.
export function bakeWaypoints(points) {
  return points.slice(1, Math.max(1, points.length - 1)).map((p) => ({ x: p.x, y: p.y }));
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

// Trims an end so the arrowhead has somewhere to sit. Only the ends that
// actually carry a head are trimmed — a plain tail should touch its shape.
export function trimForArrow(points, { start = false, end = true } = {}) {
  if (points.length < 2) return points;
  const next = points.slice();

  if (end) {
    const last = next.length - 1;
    next[last] = shortenTowards(next[last - 1], next[last], ARROW_GAP);
  }

  if (start) {
    next[0] = shortenTowards(next[1], next[0], ARROW_GAP);
  }

  return next;
}

// Turns a polyline into an SVG path, optionally easing each corner with a
// quadratic curve whose control point is the corner itself.
export function buildPolylinePath(points, radius = ELBOW_RADIUS) {
  if (!points.length) return '';
  if (points.length === 2 || radius <= 0) {
    return `M${points[0].x},${points[0].y}` +
      points.slice(1).map((p) => `L${p.x},${p.y}`).join('');
  }

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    // Never round by more than half a segment, or short segments would
    // overshoot and the line would double back on itself.
    const inLen = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const outLen = Math.hypot(next.x - corner.x, next.y - corner.y);
    const r = Math.min(radius, inLen / 2, outLen / 2);

    const enter = shortenTowards(prev, corner, r);
    const exit = shortenTowards(next, corner, outLen - r);

    d += `L${enter.x},${enter.y}`;
    d += `Q${corner.x},${corner.y} ${exit.x},${exit.y}`;
  }

  const end = points[points.length - 1];
  d += `L${end.x},${end.y}`;

  return d;
}

// ---------------------------------------------------------------------------
// Sloppiness
//
// A hand-drawn look without pulling in rough.js: walk the route, nudge points
// sideways by a small amount, then run a smooth curve through the nudged
// points so the result wobbles rather than zig-zags.
//
// The nudge comes from a seeded generator keyed on the connection id, which
// matters more than it sounds: with Math.random the line would shiver on every
// React re-render — every drag, every selection, every keystroke in a label.
// ---------------------------------------------------------------------------

export function hashSeed(value) {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Walks the polyline at a fixed spacing so long and short segments get the
// same density of wobble.
function resample(points, spacing) {
  if (points.length < 2) return points.slice();

  const out = [points[0]];

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.round(length / spacing));

    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }

  return out;
}

const SLOPPINESS_AMPLITUDE = [0, 1.6, 3.6];
const SLOPPINESS_SPACING = [0, 34, 26];

export function roughenPoints(points, sloppiness, seed) {
  const amplitude = SLOPPINESS_AMPLITUDE[sloppiness] || 0;
  if (!amplitude || points.length < 2) return points;

  const dense = resample(points, SLOPPINESS_SPACING[sloppiness] || 30);
  const random = mulberry32(seed);

  return dense.map((point, index) => {
    // The two ends stay put. A wandering endpoint would pull the arrowhead off
    // the shape it's pointing at, which is far more noticeable than a straight
    // first inch of line.
    if (index === 0 || index === dense.length - 1) return point;

    const prev = dense[index - 1];
    const next = dense[index + 1];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;

    // Perpendicular to the direction of travel, so the line bows off its route
    // instead of stretching and shrinking along it.
    const offset = (random() - 0.5) * 2 * amplitude;

    return {
      x: point.x + (-dy / length) * offset,
      y: point.y + (dx / length) * offset,
    };
  });
}

// Catmull-Rom through the points, expressed as cubic Beziers. This is what
// turns the nudged points into a line that looks drawn rather than folded.
export function buildSmoothPath(points) {
  if (points.length < 2) return buildPolylinePath(points, 0);
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;
  }

  let d = `M${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

// Samples a quadratic Bezier into points, so the curved arrow can be put
// through the same roughening pipeline as the straight and elbow ones.
export function sampleQuadratic(p0, p1, p2, steps = 24) {
  const out = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const inv = 1 - t;
    out.push({
      x: inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
      y: inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y,
    });
  }
  return out;
}

// The one entry point the renderer uses: route points in, path string out,
// with sloppiness applied if the connection asks for it.
export function buildArrowPath(points, sloppiness, seed, { rounded = true } = {}) {
  if (!sloppiness) {
    return buildPolylinePath(points, rounded ? ELBOW_RADIUS : 0);
  }
  return buildSmoothPath(roughenPoints(points, sloppiness, seed));
}

// ---------------------------------------------------------------------------
// Measuring
// ---------------------------------------------------------------------------

// Point halfway along the polyline BY LENGTH — not the middle vertex, which
// on an L-shaped route would sit in the corner rather than at the midpoint.
export function polylineMidpoint(points) {
  if (!points.length) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];

  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }

  let travelled = 0;
  const half = total / 2;

  for (let i = 1; i < points.length; i += 1) {
    const segment = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);

    if (travelled + segment >= half) {
      const t = segment === 0 ? 0 : (half - travelled) / segment;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
      };
    }

    travelled += segment;
  }

  return points[points.length - 1];
}

export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);

  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

export function distanceToPolyline(point, points) {
  let best = Infinity;
  for (let i = 1; i < points.length; i += 1) {
    best = Math.min(best, distanceToSegment(point, points[i - 1], points[i]));
  }
  return best;
}