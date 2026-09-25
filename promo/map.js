/* The live map inside the film.
 *
 * One MapLibre instance for all 15 seconds, reading the same PMTiles archives
 * the product reads, with all three lenses declared up front so a switch only
 * has to flip visibility. Nothing here is animated by the browser: a frame is
 * applied with jumpTo + paint properties, and then the caller waits for the
 * tiles that frame needs. That is the Remotion-maps technique, minus Remotion:
 * MapLibre fires an empty `idle` before PMTiles land, so `areTilesLoaded()` is
 * what actually decides a frame is finished. */

const PUBLIC_TILES = 'https://carabetta.xyz/dotsbr/data/tiles/';

/* A dot is 0,96 CSS px at national zoom. On a retina screen the product draws
   that with two device pixels; a 1080p frame only has one, so the stipple greys
   out under video compression. The film paints dots ~22% larger. Only the radius
   changes — how many dots there are, and therefore the "1 ponto = N" claim, is
   whatever the tiles say. */
const DOT_BOOST = 1.22;

/* Same curve as CIRCLE_RADIUS_STOPS in index.html: [zoom, radius, …]. */
const RADIUS_STOPS = [3, 0.8 * 1.2, 7, 0.8 * 1.2, 12, (0.8 + (0.4 * 5) / 6) * 1.2, 13, 1.2 * 1.2 * 1.5];

/* Product basemap cut: city and neighbourhood names only. */
const LABEL_LAYERS = ['settlement-label', 'settlement-subdivision-label'];

/* Below zoom 10 the product's stats come from the município layer of
   hover.pmtiles, so the film highlights exactly that feature — Rio de Janeiro,
   IBGE code 3304557 — and the popup shows its counts. */
const HOVER = {
    archive: 'hover.pmtiles',
    source: 'hover',
    fill: 'municipio-hover-fill',
    line: 'municipio-hover-line',
    municipality: '3304557',
};

let map = null;
let tileBase = null;

const params = new URLSearchParams(location.search);

/** The token is public but it lives in exactly one place: index.html. Read it
 *  from there instead of pasting a second copy into this file. */
async function mapboxToken() {
    const fromUrl = params.get('token');
    if (fromUrl) return fromUrl;
    try {
        const response = await fetch(new URL('../index.html', location.href).href);
        const text = await response.text();
        const found = text.match(/MAPBOX_TOKEN\s*=\s*'([^']+)'/);
        if (found) return found[1];
    } catch (error) {
        /* Without a token the dots still render on the product's #f0f0f0 plate. */
    }
    return '';
}

/** Local Range server first (same origin as this page), public archive after. */
async function resolveTileBase() {
    if (tileBase) return tileBase;
    const override = params.get('tiles');
    if (override) {
        tileBase = override;
        return tileBase;
    }
    const local = location.origin + '/data/tiles/';
    try {
        const response = await fetch(local + 'censo2022.pmtiles', { method: 'HEAD' });
        if (response.ok) {
            tileBase = local;
            return tileBase;
        }
    } catch (error) {
        /* serve.py is down — the public archive answers Range with CORS. */
    }
    tileBase = PUBLIC_TILES;
    return tileBase;
}

/* light-v10's JSON still points at mapbox:// for streets, sprite and glyphs;
   MapLibre cannot resolve those, so they are rewritten to the REST hosts. */
function rewriteMapbox(token) {
    return function (url) {
        if (url.indexOf('mapbox://') !== 0) return { url: url };
        const q = 'access_token=' + token;
        if (url.indexOf('mapbox://sprites/') === 0) {
            /* MapLibre 4 asks for ".../light-v10@2x.json"; the REST path is
               /styles/v1/{owner}/{id}/sprite[@2x], not {id}.json/sprite. */
            const rest = url.slice('mapbox://sprites/'.length).replace(/\.json$/, '');
            const retina = rest.slice(-3) === '@2x';
            const base = retina ? rest.slice(0, -3) : rest;
            const file = retina ? 'sprite@2x' : 'sprite';
            return { url: 'https://api.mapbox.com/styles/v1/' + base + '/' + file + '?' + q };
        }
        if (url.indexOf('mapbox://fonts/') === 0) {
            return { url: 'https://api.mapbox.com/fonts/v1/' + url.slice(15) + '?' + q };
        }
        return { url: 'https://api.mapbox.com/v4/' + url.slice(9) + '.json?secure&' + q };
    };
}

const BLANK_STYLE = {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#f0f0f0' } }],
};

/** Keep only the two place-label layers, with Portuguese names. */
function applyBasemapLabels(instance) {
    const style = instance.getStyle();
    if (!style || !style.layers) return;
    style.layers.forEach((layer) => {
        if (layer.type !== 'symbol') return;
        const show = LABEL_LAYERS.indexOf(layer.id) !== -1;
        instance.setLayoutProperty(layer.id, 'visibility', show ? 'visible' : 'none');
        if (show) {
            instance.setLayoutProperty(layer.id, 'text-field', [
                'coalesce',
                ['get', 'name_pt'],
                ['get', 'name'],
            ]);
        }
    });
}

function radiusExpression(scale) {
    const stops = RADIUS_STOPS.map((value, i) => (i % 2 === 0 ? value : value * scale * DOT_BOOST));
    return ['interpolate', ['linear'], ['zoom']].concat(stops);
}

/* Per-category opacity in one expression. Doing the choreography in paint
   properties instead of filters keeps every dot on screen during a solo. */
function opacityExpression(lensId, state) {
    const lens = LENSES[lensId];
    const weight = state.lensWeight[lensId];
    const stops = [];
    lens.categories.forEach((cat) => {
        const own = state.catWeight[lensId][cat.key];
        stops.push(cat.key, clamp01(weight * (own === undefined ? 1 : own)));
    });
    return ['match', ['get', lens.property]].concat(stops, [0]);
}

function colorExpression(lensId) {
    const lens = LENSES[lensId];
    const stops = [];
    lens.categories.forEach((cat) => {
        stops.push(cat.key, cat.color);
    });
    return ['match', ['get', lens.property]].concat(stops, ['#cccccc']);
}

function applyMapState(state) {
    map.jumpTo({ center: state.camera.center, zoom: state.camera.zoom });
    LENS_ORDER.forEach((lensId) => {
        const lens = LENSES[lensId];
        if (!map.getLayer(lens.layerId)) return;
        const visible = state.lensVisible[lensId];
        map.setLayoutProperty(lens.layerId, 'visibility', visible ? 'visible' : 'none');
        if (!visible) return;
        map.setPaintProperty(lens.layerId, 'circle-opacity', opacityExpression(lensId, state));
        map.setPaintProperty(lens.layerId, 'circle-radius', radiusExpression(state.radiusScale));
    });
    LABEL_LAYERS.forEach((layer) => {
        if (map.getLayer(layer)) {
            map.setPaintProperty(layer, 'text-opacity', state.labelOpacity);
        }
    });
    if (map.getLayer(HOVER.fill)) {
        const lit = state.hoverHighlight > 0.002;
        [HOVER.fill, HOVER.line].forEach((layer) => {
            map.setLayoutProperty(layer, 'visibility', lit ? 'visible' : 'none');
        });
        if (lit) {
            map.setPaintProperty(HOVER.fill, 'fill-opacity', 0.08 * state.hoverHighlight);
            map.setPaintProperty(HOVER.line, 'line-opacity', state.hoverHighlight);
        }
    }
}

/** Resolves once every tile the current camera needs has actually arrived. */
function settleMap(timeoutMs) {
    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            window.clearTimeout(timer);
            resolve();
        };
        const timer = window.setTimeout(finish, timeoutMs || 15000);
        const check = () => {
            if (done) return;
            if (map.areTilesLoaded()) {
                finish();
                return;
            }
            map.once('idle', check);
        };
        map.once('idle', check);
        /* Force a render even when the camera did not change, or `idle` would
           never fire again and the frame would hang. */
        map.triggerRepaint();
    });
}

async function initMap(firstState) {
    const [token, base] = await Promise.all([mapboxToken(), resolveTileBase()]);
    map = new maplibregl.Map({
        container: 'map',
        style: token
            ? 'https://api.mapbox.com/styles/v1/mapbox/light-v10?access_token=' + token
            : BLANK_STYLE,
        center: firstState.camera.center,
        zoom: firstState.camera.zoom,
        minZoom: 3,
        maxZoom: 15,
        interactive: false,
        attributionControl: token ? { compact: true } : false,
        /* No cross-frame fading: every frame must be a finished picture. */
        fadeDuration: 0,
        preserveDrawingBuffer: true,
        transformRequest: token ? rewriteMapbox(token) : undefined,
    });
    /* A missing sprite or glyph must not take the film down. */
    map.on('error', () => undefined);

    await new Promise((resolve) => {
        if (map.isStyleLoaded()) resolve();
        else map.on('load', resolve);
    });

    if (token) applyBasemapLabels(map);

    LENS_ORDER.forEach((lensId) => {
        const lens = LENSES[lensId];
        map.addSource(lens.sourceId, {
            type: 'vector',
            url: 'pmtiles://' + base + lens.archive,
            minzoom: 3,
            maxzoom: 14,
        });
        map.addLayer({
            id: lens.layerId,
            type: 'circle',
            source: lens.sourceId,
            'source-layer': 'points',
            layout: { visibility: 'none' },
            paint: {
                'circle-radius': radiusExpression(1),
                'circle-color': colorExpression(lensId),
                'circle-opacity': 0,
            },
        });
    });

    /* Hover geometry is its own archive; the filter keeps everything but the one
       município off the GPU. Added after the dots, like in the product, so the
       tint reads as a highlight over them. */
    map.addSource(HOVER.source, {
        type: 'vector',
        url: 'pmtiles://' + base + HOVER.archive,
        minzoom: 3,
        maxzoom: 12,
    });
    map.addLayer({
        id: HOVER.fill,
        type: 'fill',
        source: HOVER.source,
        'source-layer': 'municipios',
        filter: ['==', ['get', 'id_municipio'], HOVER.municipality],
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#202124', 'fill-opacity': 0 },
    });
    map.addLayer({
        id: HOVER.line,
        type: 'line',
        source: HOVER.source,
        'source-layer': 'municipios',
        filter: ['==', ['get', 'id_municipio'], HOVER.municipality],
        layout: { visibility: 'none' },
        paint: { 'line-color': '#202124', 'line-width': 1.6, 'line-opacity': 0 },
    });

    applyMapState(firstState);
    await settleMap(60000);
    return { token: Boolean(token), base: base };
}

/** Screen position of a place, so overlays can point at real ground. */
const projectPoint = (lngLat) => map.project(lngLat);
