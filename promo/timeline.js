/* The film's clock. One pure function, promoState(frame), decides where the
 * camera is, which archive is painted, how each category fades and how big the
 * dots are. The map and every overlay read it, which is why the "1 ponto = N"
 * line always describes the dots actually on screen: both come from the same
 * zoom number. */

const FPS = 30;
const DURATION = 450; // 15,0 s

/* Beat table. Move a number here and the camera, the copy, the lens switch and
   the chrome all move together. */
const BEAT = {
    open: 0,      // dots ignite over the fitted national view
    shares: 60,   // national race shares, then three solos
    fly: 138,     // Brazil → Rio, product panel slides in
    click: 240,   // pointer clicks the município, stats popup opens
    income: 294,  // lens switch → Renda (same city, new question)
    religion: 348, // lens switch → Religião
    end: 402,     // wordmark
    out: DURATION,
};

/* Camera track. Two constraints are not negotiable:
   1. The opening plate is the national frame the live map opens on — what
      fitBounds([[-74,-34],[-32,6]]) lands on for 1920×1080, about z4.
   2. The click beat happens below zoom 10, because that is the regime where the
      product's stats come from the município polygon. The card on screen says
      "Rio de Janeiro", so the camera has to be where the app would say that. */
const CAMERA = [
    { frame: BEAT.open, center: [-51.9, -14.2], zoom: 4.02 },
    { frame: BEAT.fly, center: [-51.3, -14.9], zoom: 4.24 },
    {
        frame: BEAT.click,
        center: [-43.36, -22.88],
        zoom: 9.45,
        easeCenter: EASE.pan,
        easeZoom: EASE.zoom,
    },
    { frame: BEAT.income, center: [-43.34, -22.89], zoom: 9.62 },
    {
        frame: BEAT.income + 30,
        center: [-43.28, -22.92],
        zoom: 11.0,
        easeCenter: EASE.out,
        easeZoom: EASE.out,
    },
    { frame: BEAT.religion, center: [-43.28, -22.92], zoom: 11.04 },
    { frame: BEAT.end, center: [-43.3, -22.915], zoom: 10.92 },
    { frame: BEAT.out, center: [-43.32, -22.91], zoom: 10.78 },
];

function sampleCamera(frame) {
    const last = CAMERA[CAMERA.length - 1];
    if (frame >= last.frame) {
        return { center: last.center.slice(), zoom: last.zoom };
    }
    let i = 0;
    while (i < CAMERA.length - 1 && CAMERA[i + 1].frame <= frame) {
        i += 1;
    }
    const from = CAMERA[i];
    const to = CAMERA[i + 1];
    const range = [from.frame, to.frame];
    const panEase = to.easeCenter || EASE.inOut;
    const zoomEase = to.easeZoom || EASE.inOut;
    return {
        center: [
            interp(frame, range, [from.center[0], to.center[0]], panEase),
            interp(frame, range, [from.center[1], to.center[1]], panEase),
        ],
        zoom: interp(frame, range, [from.zoom, to.zoom], zoomEase),
    };
}

/* Which archive owns the screen when. The opening is a slow, category-by-
   category assembly — the one move only a dot map can make. The mid-film
   switches are quick staggered wipes in legend order: poorest red first on
   Renda, largest faith first on Religião. The last segment comes home to Raça
   because that is the product's default view and the wordmark's palette. */
const SEGMENTS = [
    { lens: 'race', start: BEAT.open, stagger: 5, reveal: 22 },
    { lens: 'income', start: BEAT.income, stagger: 2.4, reveal: 10 },
    { lens: 'religion', start: BEAT.religion, stagger: 2.4, reveal: 10 },
    { lens: 'race', start: BEAT.end, stagger: 2, reveal: 9 },
];

/** Crossfade long enough to read as a switch, short enough not to be a dissolve. */
const XFADE = 14;
/** Head start for a lens's tiles, so a switch never lands on a bald frame. */
const PRELOAD = 16;

/* The three race solos. Non-solo groups keep a ghost, so the country never
   loses its outline — it just loses its voice. */
const SOLOS = [
    { key: 'parda', start: BEAT.shares + 18, end: BEAT.shares + 38 },
    { key: 'branca', start: BEAT.shares + 38, end: BEAT.shares + 56 },
    { key: 'preta', start: BEAT.shares + 56, end: BEAT.shares + 74 },
];
const GHOST = 0.08;

function activeSegment(frame) {
    let index = 0;
    for (let i = 0; i < SEGMENTS.length; i += 1) {
        if (frame >= SEGMENTS[i].start) index = i;
    }
    return index;
}

function lensWeights(frame) {
    const weights = { race: 0, income: 0, religion: 0 };
    SEGMENTS.forEach((segment, i) => {
        if (frame < segment.start) return;
        const next = SEGMENTS[i + 1];
        let value = clamp01((frame - segment.start) / XFADE);
        if (next && frame >= next.start) {
            value = 1 - clamp01((frame - next.start) / XFADE);
        }
        weights[segment.lens] = Math.max(weights[segment.lens], value);
    });
    return weights;
}

function soloAt(frame) {
    let strength = 0;
    let key = null;
    SOLOS.forEach((solo) => {
        const value = trapezoid(frame, solo.start, solo.start + 5, solo.end - 5, solo.end);
        if (value > strength) {
            strength = value;
            key = solo.key;
        }
    });
    return { key: key, strength: strength };
}

function promoState(frame) {
    const camera = sampleCamera(frame);
    const weights = lensWeights(frame);
    const index = activeSegment(frame);
    const segment = SEGMENTS[index];
    const solo = soloAt(frame);

    /* Per-category opacity: the staggered reveal from the moment this lens took
       the screen, times the solo ghosting on race. */
    const catWeight = {};
    LENS_ORDER.forEach((lensId) => {
        let own = null;
        SEGMENTS.forEach((candidate) => {
            if (candidate.lens === lensId && frame >= candidate.start) own = candidate;
        });
        const rows = {};
        LENSES[lensId].categories.forEach((cat, i) => {
            let value = 1;
            if (own) {
                const at = own.start + i * own.stagger;
                value = interp(frame, [at, at + own.reveal], [0, 1], EASE.out);
            }
            if (lensId === 'race' && solo.key) {
                const target = cat.key === solo.key ? 1 : GHOST;
                value *= 1 - solo.strength * (1 - target);
            }
            rows[cat.key] = value;
        });
        catWeight[lensId] = rows;
    });

    /* A lens is mounted while it is painted, plus a short head start before its
       beat. Never all three at once: three archives competing for tiles would
       stall every frame of the render. */
    const lensVisible = {};
    LENS_ORDER.forEach((lensId) => {
        const upcoming = SEGMENTS.some(
            (s) => s.lens === lensId && frame >= s.start - PRELOAD && frame < s.start,
        );
        lensVisible[lensId] = weights[lensId] > 0.001 || upcoming;
    });

    /* Dots condense out of soft blobs on the open, and pop once on each switch
       so the colour flip lands on a beat. */
    const ignite = interp(frame, [0, 46], [2.15, 1], EASE.out);
    let pop = 1;
    [BEAT.income, BEAT.religion].forEach((at) => {
        if (frame >= at && frame < at + 16) {
            pop = Math.max(pop, interp(frame, [at, at + 16], [1.22, 1], EASE.out));
        }
    });

    const previous = SEGMENTS[Math.max(0, index - 1)];
    const switcherPos = interp(
        frame,
        [segment.start, segment.start + 12],
        [LENS_ORDER.indexOf(previous.lens), LENS_ORDER.indexOf(segment.lens)],
        EASE.pop,
    );

    return {
        frame: frame,
        camera: camera,
        lensWeight: weights,
        catWeight: catWeight,
        lensVisible: lensVisible,
        radiusScale: ignite * pop,
        activeLens: segment.lens,
        segmentStart: segment.start,
        switcherPos: switcherPos,
        solo: solo,
        /* City and neighbourhood labels belong to the product's basemap, but at
           national zoom they fight the opening title, so they rise with the fly. */
        labelOpacity: interp(frame, [BEAT.fly + 24, BEAT.fly + 64], [0, 1], EASE.soft),
        /* The product's hover tint on the clicked município: #202124 at 8%. */
        hoverHighlight: trapezoid(
            frame,
            BEAT.click,
            BEAT.click + 6,
            BEAT.income - 14,
            BEAT.income - 2,
        ),
    };
}
