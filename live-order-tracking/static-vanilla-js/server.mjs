import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
};

function loadEnvFiles() {
  for (const envName of [".env", ".env.local"]) {
    const envPath = path.join(ROOT_DIR, envName);
    if (!fs.existsSync(envPath)) continue;
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex <= 0) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let val = trimmed.slice(eqIndex + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFiles();

function parseCliArgs(argv) {
  let host = "127.0.0.1";
  let port = Number.parseInt(process.env.PORT || "3000", 10);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--host" && argv[i + 1]) {
      host = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--host=")) {
      host = arg.slice("--host=".length);
    } else if (arg === "--port" && argv[i + 1]) {
      port = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (arg.startsWith("--port=")) {
      port = Number.parseInt(arg.slice("--port=".length), 10);
    }
  }

  // Strictly bind to loopback only (never 0.0.0.0)
  if (host !== "127.0.0.1" && host !== "::1") {
    host = "127.0.0.1";
  }
  if (!Number.isFinite(port) || port < 0 || port > 65535) {
    port = 3000;
  }

  return { host, port };
}

function getApiKey() {
  return (process.env.GOOGLE_MAPS_API_KEY || "").trim();
}

function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

function sendJson(res, statusCode, payload) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, maxBytes = 65536) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function handleAddressValidate(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    sendJson(res, 500, {
      error: "GOOGLE_MAPS_API_KEY is not configured on the server.",
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { error: err.message });
    return;
  }

  const addressLines = Array.isArray(body.addressLines)
    ? body.addressLines.map((line) => String(line).trim()).filter(Boolean)
    : typeof body.address === "string" && body.address.trim()
      ? [body.address.trim()]
      : [];

  if (addressLines.length === 0) {
    sendJson(res, 400, { error: "addressLines or address is required." });
    return;
  }

  const upstreamBody = {
    address: {
      regionCode: typeof body.regionCode === "string" && body.regionCode ? body.regionCode : "US",
      addressLines,
      ...(body.locality ? { locality: String(body.locality) } : {}),
      ...(body.administrativeArea ? { administrativeArea: String(body.administrativeArea) } : {}),
      ...(body.postalCode ? { postalCode: String(body.postalCode) } : {}),
    },
    enableUspsCass: body.enableUspsCass !== false,
    ...(body.previousResponseId ? { previousResponseId: String(body.previousResponseId) } : {}),
  };

  try {
    const upstreamRes = await fetch(
      "https://addressvalidation.googleapis.com/v1:validateAddress",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "result.verdict,result.address,result.geocode,result.metadata,result.uspsData",
        },
        body: JSON.stringify(upstreamBody),
      }
    );

    const data = await upstreamRes.json();
    sendJson(res, upstreamRes.status, data);
  } catch (err) {
    sendJson(res, 502, {
      error: "Failed to reach Address Validation API.",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handleRoutesCompute(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    sendJson(res, 500, {
      error: "GOOGLE_MAPS_API_KEY is not configured on the server.",
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { error: err.message });
    return;
  }

  const originLat = Number(body?.origin?.lat);
  const originLng = Number(body?.origin?.lng);
  const destLat = Number(body?.destination?.lat);
  const destLng = Number(body?.destination?.lng);

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    sendJson(res, 400, {
      error: "Valid numeric origin.{lat,lng} and destination.{lat,lng} are required.",
    });
    return;
  }

  const upstreamBody = {
    origin: {
      location: {
        latLng: {
          latitude: originLat,
          longitude: originLng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destLat,
          longitude: destLng,
        },
      },
    },
    travelMode: body.travelMode === "BICYCLE" ? "BICYCLE" : "DRIVE",
    routingPreference:
      body.travelMode === "BICYCLE"
        ? undefined
        : body.routingPreference || "TRAFFIC_AWARE_OPTIMAL",
    computeAlternativeRoutes: false,
    languageCode: "en-US",
    units: "METRIC",
  };

  try {
    const upstreamRes = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration",
        },
        body: JSON.stringify(upstreamBody),
      }
    );

    const data = await upstreamRes.json();
    sendJson(res, upstreamRes.status, data);
  } catch (err) {
    sendJson(res, 502, {
      error: "Failed to reach Routes API.",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handleStaticReceiptMap(urlObj, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    sendJson(res, 500, {
      error: "GOOGLE_MAPS_API_KEY is not configured on the server.",
    });
    return;
  }

  const originLat = Number(urlObj.searchParams.get("originLat"));
  const originLng = Number(urlObj.searchParams.get("originLng"));
  const destLat = Number(urlObj.searchParams.get("destLat"));
  const destLng = Number(urlObj.searchParams.get("destLng"));

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    sendJson(res, 400, {
      error: "Valid originLat, originLng, destLat, and destLng query parameters are required.",
    });
    return;
  }

  const rawSize = urlObj.searchParams.get("size") || "600x260";
  const size = /^\d{2,3}x\d{2,3}$/.test(rawSize) ? rawSize : "600x260";
  const rawScale = urlObj.searchParams.get("scale") || "2";
  const scale = rawScale === "1" ? "1" : "2";
  const polyline = (urlObj.searchParams.get("polyline") || "").trim();

  const staticParams = new URLSearchParams();
  staticParams.set("size", size);
  staticParams.set("scale", scale);
  staticParams.set("maptype", "roadmap");
  staticParams.set("format", "png");
  staticParams.append(
    "markers",
    `color:0x0F766E|label:K|${originLat.toFixed(6)},${originLng.toFixed(6)}`
  );
  staticParams.append(
    "markers",
    `color:0xEA580C|label:D|${destLat.toFixed(6)},${destLng.toFixed(6)}`
  );

  if (polyline && polyline.length <= 6000) {
    staticParams.append("path", `color:0x0F766EFF|weight:5|enc:${polyline}`);
  } else {
    staticParams.append(
      "path",
      `color:0x0F766EFF|weight:4|${originLat.toFixed(6)},${originLng.toFixed(6)}|${destLat.toFixed(6)},${destLng.toFixed(6)}`
    );
  }
  staticParams.set("key", apiKey);

  try {
    const upstreamUrl = `https://maps.googleapis.com/maps/api/staticmap?${staticParams.toString()}`;
    const upstreamRes = await fetch(upstreamUrl);
    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      sendJson(res, upstreamRes.status, {
        error: "Maps Static API request failed.",
        details: errText.slice(0, 300),
      });
      return;
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    setSecurityHeaders(res);
    res.writeHead(200, {
      "Content-Type": upstreamRes.headers.get("content-type") || "image/png",
      "Cache-Control": "no-store",
    });
    res.end(Buffer.from(arrayBuffer));
  } catch (err) {
    sendJson(res, 502, {
      error: "Failed to reach Maps Static API.",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

function isAllowedStaticPath(relPath) {
  if (
    relPath === "index.html" ||
    relPath === "app.js" ||
    relPath === "styles.css"
  ) {
    return true;
  }
  if (relPath.startsWith("node_modules/@googlemaps/js-api-loader/")) {
    return true;
  }
  return false;
}

async function handleStaticFile(pathname, res) {
  let cleanPath = pathname === "/" ? "/index.html" : pathname;
  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch {
    sendJson(res, 400, { error: "Invalid URL encoding" });
    return;
  }

  // Strip leading slashes and normalize
  const normalized = path.posix.normalize(cleanPath).replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.split("/").some((seg) => seg.startsWith(".")) ||
    !isAllowedStaticPath(normalized)
  ) {
    setSecurityHeaders(res);
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const resolved = path.resolve(ROOT_DIR, normalized);
  if (!resolved.startsWith(ROOT_DIR + path.sep)) {
    setSecurityHeaders(res);
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const stat = await fsp.stat(resolved);
    if (!stat.isFile()) {
      setSecurityHeaders(res);
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const data = await fsp.readFile(resolved);
    setSecurityHeaders(res);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    });
    res.end(data);
  } catch {
    setSecurityHeaders(res);
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const { pathname } = urlObj;

  if (req.method === "GET" && pathname === "/env-config.js") {
    const apiKey = getApiKey();
    setSecurityHeaders(res);
    res.writeHead(200, {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(
      `globalThis.process = globalThis.process || { env: { NODE_ENV: "production" } };\n` +
        `window.__GMP_CONFIG__ = ${JSON.stringify({ apiKey })};\n`
    );
    return;
  }

  if (req.method === "GET" && pathname === "/favicon.ico") {
    setSecurityHeaders(res);
    res.writeHead(204, { "Cache-Control": "public, max-age=86400" });
    res.end();
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, hasApiKey: Boolean(getApiKey()) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/address/validate") {
    await handleAddressValidate(req, res);
    return;
  }

  if (req.method === "POST" && pathname === "/api/routes/compute") {
    await handleRoutesCompute(req, res);
    return;
  }

  if (req.method === "GET" && pathname === "/api/maps/static-receipt") {
    await handleStaticReceiptMap(urlObj, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    await handleStaticFile(pathname, res);
    return;
  }

  setSecurityHeaders(res);
  res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Method Not Allowed" }));
});

const { host, port } = parseCliArgs(process.argv.slice(2));
server.listen(port, host, () => {
  const addr = server.address();
  const actualPort = typeof addr === "object" && addr ? addr.port : port;
  console.log(`Server listening on http://${host}:${actualPort}`);
});
