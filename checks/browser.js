// Start the static server, then run: chrome-devtools-axi run < checks/browser.js
await page.open('http://127.0.0.1:4173/?qa=1');
const snapshot = await page.snapshot();
const playRef = snapshot.match(/uid=(\S+) button " Jugar"/);
if (!playRef) throw new Error('Play button not found');
await page.click(playRef[1]);
console.log(await page.eval(async () => {
  const assert = (condition, label) => { if (!condition) throw new Error(label); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const canvas = document.querySelector('#sky');
  const fire = (type, id, x, y) => canvas.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', clientX: x, clientY: y,
  }));
  const results = [];
  assert(cosmosQA.started && document.querySelector('#welcome').hidden, 'Start failed');
  assert(cosmosQA.audioState === 'running', 'Audio did not unlock');
  assert(cosmosQA.backingWidth <= cosmosQA.width * 2, 'DPR cap exceeded');
  assert(cosmosQA.backingWidth * cosmosQA.backingHeight <= 2504000, 'Canvas budget exceeded');
  await navigator.serviceWorker.ready;
  assert(navigator.serviceWorker.controller, 'Service worker is not controlling page');
  results.push('Start, audio unlock, backing resolution and service worker: PASS');
  await wait(1600);
  const before = cosmosQA.aliens[0];
  fire('pointerdown', 1, before.x, before.y);
  assert(cosmosQA.aliens[0].burst > 0 && cosmosQA.aliens[0].color !== before.color, 'Alien ignored touch');
  fire('pointerup', 1, before.x, before.y);
  await wait(2000);
  assert(cosmosQA.aliens[0].burst === 0, 'Alien did not reassemble');
  results.push('Alien touch, color change and complete reassembly: PASS');
  fire('pointerdown', 2, 30, 110);
  assert(cosmosQA.particles > 0, 'Background flower missing');
  fire('pointerup', 2, 30, 110);
  await wait(1600);
  assert(cosmosQA.particles === 0, 'Particles accumulated at rest');
  for (let id = 10; id < 22; id++) fire('pointerdown', id, 25 + (id - 10) * 28, 115);
  assert(cosmosQA.pointers === 10, 'Contact limit or multitouch failed');
  let maxParticles = cosmosQA.particles, maxVoices = cosmosQA.voices;
  for (let frame = 0; frame < 45; frame++) {
    await wait(35);
    for (let id = 10; id < 20; id++) fire('pointermove', id, 20 + (frame * 17 + id * 19) % 350, 120 + frame * 11);
    maxParticles = Math.max(maxParticles, cosmosQA.particles);
    maxVoices = Math.max(maxVoices, cosmosQA.voices);
  }
  assert(maxParticles <= 256 && maxParticles > 100, 'Particle pool failed');
  assert(maxVoices <= 6 && maxVoices > 0, 'Audio voice budget failed');
  for (let id = 10; id < 20; id++) fire(id % 2 ? 'pointerup' : 'pointercancel', id, 0, 0);
  assert(cosmosQA.pointers === 0, 'Ended contacts leaked');
  await wait(2000);
  assert(cosmosQA.particles === 0 && cosmosQA.voices === 0, 'Effects did not recycle');
  results.push(`10 simultaneous synthetic contacts + sustained drag: PASS (max ${maxParticles} particles, ${maxVoices} voices)`);
  for (let i = 0; i < 100; i++) { fire('pointerdown', 99, 20, 115); fire('pointerup', 99, 20, 115); }
  assert(cosmosQA.particles <= 256 && cosmosQA.pointers === 0, 'Rapid contacts leaked');
  fire('pointerdown', 55, 20, 115);
  await wait(2000);
  assert(cosmosQA.pointers === 1 && cosmosQA.particles === 0, 'Long press produces unbounded effects');
  fire('lostpointercapture', 55, 20, 115);
  assert(cosmosQA.pointers === 0, 'Lost capture leaked');
  results.push('100 rapid taps, long press and lost capture: PASS');
  dispatchEvent(new PageTransitionEvent('pagehide'));
  const paused = cosmosQA.frameCount;
  await wait(200);
  assert(cosmosQA.paused && cosmosQA.frameCount === paused && cosmosQA.audioState === 'suspended', 'Pagehide did not pause');
  dispatchEvent(new PageTransitionEvent('pageshow'));
  await wait(200);
  assert(!cosmosQA.paused && cosmosQA.frameCount > paused, 'Pageshow did not resume');
  results.push('Synthetic page lifecycle pause and resume: PASS');
  const cache = await caches.open((await caches.keys()).find(k => k.startsWith('pequeno-cosmos:')));
  assert((await cache.keys()).length === 8, 'Incomplete app cache');
  assert(document.documentElement.scrollWidth === innerWidth, 'Horizontal overflow');
  return JSON.stringify({ results, assetsCached: (await cache.keys()).length, state: cosmosQA });
}));
