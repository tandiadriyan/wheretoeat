import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractListRef, parseList, isAllowedUrl } from '../api/_lib/gmaps.js';

test('extracts list id + token from resolved URLs', () => {
  assert.deepEqual(
    extractListRef('https://www.google.com/maps/@/data=!3m1!4b1!4m3!11m2!2sAbC_123-x!3e3?entry=tts&g_ep=x&token=Tok-9'),
    { id: 'AbC_123-x', token: 'Tok-9' },
  );
  assert.deepEqual(extractListRef('https://www.google.com/maps/placelists/list/XyZ987'), { id: 'XyZ987', token: null });
  const consent = 'https://consent.google.com/ml?continue=' + encodeURIComponent('https://www.google.com/maps/placelists/list/Q1w2?token=abc');
  assert.deepEqual(extractListRef(consent), { id: 'Q1w2', token: 'abc' });
  assert.equal(extractListRef('https://maps.app.goo.gl/abcdef'), null);
});

test('only follows Google hosts', () => {
  assert.ok(isAllowedUrl('https://maps.app.goo.gl/abc'));
  assert.ok(isAllowedUrl('https://www.google.co.id/maps/x'));
  assert.ok(!isAllowedUrl('https://evil.example/maps'));
  assert.ok(!isAllowedUrl('http://maps.app.goo.gl/abc'));
  assert.ok(!isAllowedUrl('https://google.com.evil.example/'));
});

test('parses getlist response', () => {
  const place = (name, note, placeId) => [
    null,
    [null, null, 'label', null, '1 Main St', [null, null, -6.2, 106.8], ['123', '456'], placeId],
    name,
    note,
  ];
  const body = ")]}'\n" + JSON.stringify([[null, null, null, null, 'Ramen spots', null, null, null,
    [place('Ichiran', 'get the extra noodles', 'ChIJabc'), place('No Id Cafe', '', null), [null, [], null]]]]);
  const { title, places } = parseList(body);
  assert.equal(title, 'Ramen spots');
  assert.equal(places.length, 2);
  assert.deepEqual(places[0], {
    name: 'Ichiran', note: 'get the extra noodles', address: '1 Main St',
    lat: -6.2, lng: 106.8, cid: '123:456', placeId: 'ChIJabc',
  });
  assert.equal(places[1].note, null);
  assert.equal(places[1].placeId, null);
});
