import {test, expect, type Page} from '@playwright/test';
import {initialSave, newRun} from '../src/data';

const KEY = 'yujun-paper-flight-v1';
const snapshot = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), KEY);

async function seed(page: Page, options: {remaining?: number; sfx?: number; warning?: boolean} = {}) {
  const save = initialSave();
  save.remaining = options.remaining ?? 300;
  save.music = 0;
  save.sfx = options.sfx ?? 0;
  const run = save.run = newRun(1, '3');
  Object.assign(run, {mode: 'playing', phase: options.warning ? 0 : 1, phaseTime: options.warning ? 39 : 0, spawn: 999, invuln: 999, auto: false});
  run.ultimate.charge = 100;
  await page.addInitScript(({key, value}) => {
    localStorage.setItem(key, JSON.stringify(value));
    const w = window as any;
    w.safetySaveFailure = false;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) {
      if (k === key && w.safetySaveFailure) throw new DOMException('Injected storage quota failure', 'QuotaExceededError');
      return setItem.call(this, k, v);
    };
  }, {key: KEY, value: save});
  await page.goto('/');
  await page.getByRole('button', {name: '이어하기', exact: true}).click();
  await expect(page.locator('#game')).toHaveAttribute('data-mode', 'playing');
  await expect(page.locator('#notice')).toBeHidden();
}

test('time expiry freezes an already-consumed ultimate and guardian reset launches it once', async ({page}) => {
  await seed(page, {remaining: 10});
  // The ordinary visible-time clock reaches its final second; no synthetic clock or private state is used.
  await expect(page.locator('#timer')).toHaveText('0:01', {timeout: 15000});
  await page.locator('#ultimate').click();
  await expect(page.locator('.ultimate-cinematic')).toBeVisible();
  await expect(page.locator('#pin')).toBeVisible({timeout: 4000});
  const paused = await snapshot(page);
  expect(paused.remaining).toBe(0);
  expect(paused.run.ultimate.charge).toBe(0);
  expect(paused.run.ultimate.pending).toBe(true);
  expect(paused.run.attacks).toHaveLength(0);
  expect(paused.run.cinematic.remaining).toBeGreaterThan(0);
  await page.waitForTimeout(350);
  expect((await snapshot(page)).run.cinematic.remaining).toBe(paused.run.cinematic.remaining);
  await page.locator('#pin').fill('1003');
  await page.getByRole('button', {name: '확인', exact: true}).click();
  await page.getByRole('button', {name: '10분', exact: true}).click();
  await expect(page.locator('#dialog')).not.toBeVisible();
  await expect(page.locator('.ultimate-cinematic')).toBeHidden({timeout: 5000});
  await page.locator('#menu').click();
  const after = await snapshot(page);
  expect(after.remaining).toBeGreaterThan(595);
  expect(after.run.ultimate.pending).toBe(false);
  expect(after.run.ultimate.charge).toBe(0);
  expect(after.run.nextAttackId).toBe(3); // Exactly one base pencil ultimate: one group and one projectile.
});

test('failed ultimate-consumption save owns the dialog, then retry resumes exactly one cast', async ({page}) => {
  await seed(page);
  const before = await snapshot(page);
  await page.evaluate(() => {
    (window as any).safetySaveFailure = true;
    (document.querySelector('#ultimate') as HTMLButtonElement).click();
  });
  await expect(page.locator('#retry-save')).toBeVisible();
  await expect(page.locator('#dialog h2')).toHaveText('기록을 저장하지 못했어요');
  await page.waitForTimeout(1300);
  const failed = await snapshot(page);
  expect(failed.run.ultimate).toEqual(before.run.ultimate);
  expect(failed.run.nextAttackId).toBe(before.run.nextAttackId);
  await expect(page.locator('#retry-save')).toBeVisible();
  await page.evaluate(() => {(window as any).safetySaveFailure = false;});
  await page.locator('#retry-save').click();
  await expect(page.locator('#dialog')).not.toBeVisible();
  await expect(page.locator('.ultimate-cinematic')).toBeVisible();
  const retry = await snapshot(page);
  expect(retry.run.ultimate.pending).toBe(true);
  expect(retry.run.ultimate.charge).toBe(0);
  await expect(page.locator('.ultimate-cinematic')).toBeHidden({timeout: 5000});
  await page.locator('#menu').click();
  const after = await snapshot(page);
  expect(after.run.ultimate.pending).toBe(false);
  expect(after.run.nextAttackId).toBe(3);
  expect(after.run.groups.filter((g: any) => g.source === 'ultimate')).toHaveLength(1);
});

for (const volume of [0, .4]) test(`new warning and ultimate audio follow effect volume ${volume}`, async ({page}) => {
  // Observe native Web Audio source starts and the gain they are connected to. This does not replace audio playback.
  await page.addInitScript(() => {
    const w = window as any;
    w.safetyAudioStarts = [];
    const connect = AudioNode.prototype.connect;
    (AudioNode.prototype as any).connect = function(destination: AudioNode, ...rest: any[]) {
      if (this instanceof AudioBufferSourceNode && destination instanceof GainNode) (this as any).__safetyGain = destination;
      return (connect as any).call(this, destination, ...rest);
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function(...args: Parameters<AudioBufferSourceNode['start']>) {
      w.safetyAudioStarts.push({gain: (this as any).__safetyGain?.gain.value, duration: this.buffer?.duration});
      return start.apply(this, args);
    };
  });
  await seed(page, {sfx: volume, warning: true});
  await expect(page.locator('.boss-warning')).toBeVisible({timeout: 7000});
  let starts = await page.evaluate(() => (window as any).safetyAudioStarts);
  if (volume === 0) expect(starts).toHaveLength(0);
  else {expect(starts.length).toBeGreaterThan(0); expect(starts.at(-1).gain).toBeCloseTo(volume * .68);}
  await expect(page.locator('.boss-warning')).toBeHidden({timeout: 5000});
  await page.waitForTimeout(750); // Saved warning completion gives a deliberate 0.65-second preparation pause.
  await page.evaluate(() => {(window as any).safetyAudioStarts = [];});
  await page.locator('#ultimate').click();
  await expect(page.locator('.ultimate-cinematic')).toBeVisible();
  const intro = await page.evaluate(() => (window as any).safetyAudioStarts);
  if(volume>0){expect(intro).toHaveLength(1);expect(intro[0].duration).toBeCloseTo(1,2);}
  await expect(page.locator('.ultimate-cinematic')).toBeHidden({timeout: 4000});
  starts = await page.evaluate(() => (window as any).safetyAudioStarts);
  if (volume === 0) expect(starts).toHaveLength(0);
  else {expect(starts.length).toBeGreaterThan(0); expect(starts.at(-1).gain).toBeCloseTo(volume * .68);}
});
