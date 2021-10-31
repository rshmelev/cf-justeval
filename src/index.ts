import { runAsync, startEval } from './runner';

// using minified local version instead of npm version
// results in much smaller code
import { buble } from './utils/buble/buble-min2';

async function handleRequest(req: Request): Promise<Response> {
  if (!req.url.split('?')[0].endsWith('/fn')) {
    return new Response('not found', { status: 404 });
  }

  const body = await req.json();

  const hash = 'memoize_' + (await getHash(JSON.stringify(body)));
  const cached = await KV.get(hash);
  if (cached !== null) {
    return new Response(cached, { status: 200 });
  }

  // dangerousForOf seemed important for me for common code
  body.code = buble.transform(body.code, { transforms: { dangerousForOf: true } }).code;

  const ev = startEval(body.code, 'incoming,api', body.data, /*lbmda*/ {});
  try {
    const res = await runAsync(ev);
    const stringifiedRes = customStringify({ res });
    await KV.put(hash, stringifiedRes, { expirationTtl: 60 });
    return new Response(stringifiedRes, { status: 200 });
  } catch (err) {
    return new Response(customStringify({ err }), {
      status: 500,
    });
  }
}

async function getHash(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}

const customStringify = function (v: unknown) {
  const cache = new Set();
  return JSON.stringify(v, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        // Circular reference found
        try {
          // If this value does not reference a parent it can be deduped
          return JSON.parse(JSON.stringify(value));
        } catch (err) {
          // discard key if value cannot be deduped
          return;
        }
      }
      // Store value in our set
      cache.add(value);
    }
    return value;
  });
};

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
