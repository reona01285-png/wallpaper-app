// AI補完(MI-GAN)を画面とは別のスレッドで動かす
importScripts('ort/ort.wasm.min.js');
ort.env.wasm.wasmPaths = new URL('ort/', self.location).href;
ort.env.wasm.numThreads = 1; // GitHub Pagesでは複数スレッドが使えない

const MODEL_URL = 'models/migan_pipeline_v2.onnx';
const MODEL_SIZE = 28079181;
let sessionPromise = null;

async function fetchModel() {
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error('model ' + res.status);
  const total = +res.headers.get('content-length') || MODEL_SIZE;
  if (!res.body || !res.body.getReader) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader(), chunks = [];
  let loaded = 0, last = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); loaded += value.length;
    if (loaded - last > 500000) { last = loaded; postMessage({ type: 'progress', loaded, total }); }
  }
  const buf = new Uint8Array(loaded);
  let o = 0; for (const c of chunks) { buf.set(c, o); o += c.length; }
  return buf;
}

function load() {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const buf = await fetchModel();
      postMessage({ type: 'preparing' });
      return ort.InferenceSession.create(buf, { executionProviders: ['wasm'] });
    })();
    sessionPromise.catch(() => { sessionPromise = null; });
  }
  return sessionPromise;
}

onmessage = async e => {
  const { id, w, h, rgba, known } = e.data;
  try {
    const session = await load();
    const n = w * h, img = new Uint8Array(3 * n);
    for (let i = 0; i < n; i++) {
      img[i] = rgba[i * 4]; img[n + i] = rgba[i * 4 + 1]; img[2 * n + i] = rgba[i * 4 + 2];
    }
    const t0 = performance.now();
    const out = await session.run({
      image: new ort.Tensor('uint8', img, [1, 3, h, w]),
      mask: new ort.Tensor('uint8', known, [1, 1, h, w]),
    });
    const r = out.result.data, px = new Uint8ClampedArray(4 * n);
    for (let i = 0; i < n; i++) {
      px[i * 4] = r[i]; px[i * 4 + 1] = r[n + i]; px[i * 4 + 2] = r[2 * n + i]; px[i * 4 + 3] = 255;
    }
    postMessage({ type: 'done', id, w, h, rgba: px, ms: Math.round(performance.now() - t0) }, [px.buffer]);
  } catch (err) {
    postMessage({ type: 'error', id, message: String(err && err.message || err) });
  }
};
