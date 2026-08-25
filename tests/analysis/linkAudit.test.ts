import { expect, test } from 'bun:test';
import { auditLinks } from '../../src/analysis/linkAudit';

test('flags an internal link the capture never recorded', () => {
  const audit = auditLinks({
    pages: [{ path: '/index.html', html: '<a href="/league">League</a>' }],
    available: ['/index.html'],
  });
  expect(audit.unreachable).toHaveLength(1);
  expect(audit.unreachable[0]!.link).toBe('/league');
  expect(audit.unreachable[0]!.linkedFrom).toEqual(['/index.html']);
});

test('a link resolves through the index document a host would serve', () => {
  const audit = auditLinks({
    pages: [{ path: '/index.html', html: '<a href="/dirac">Dirac</a>' }],
    available: ['/index.html', '/dirac/index.html'],
  });
  expect(audit.unreachable).toEqual([]);
});

test('a directory with deeper pages does not make its own path reachable', () => {
  // /hologram/web/index.html exists, but nothing serves /hologram itself.
  const audit = auditLinks({
    pages: [{ path: '/index.html', html: '<a href="/hologram">Hologram</a>' }],
    available: ['/index.html', '/hologram/web/index.html'],
  });
  expect(audit.unreachable.map((u) => u.link)).toEqual(['/hologram']);
});

test('resolves a sibling .html file', () => {
  const audit = auditLinks({
    pages: [{ path: '/index.html', html: '<a href="/about">About</a>' }],
    available: ['/index.html', '/about.html'],
  });
  expect(audit.unreachable).toEqual([]);
});

test('ignores external, anchor, and scheme links', () => {
  const audit = auditLinks({
    pages: [
      {
        path: '/index.html',
        html: `<a href="https://x.com/a">x</a><a href="#top">t</a>
               <a href="mailto:a@b.c">m</a><a href="//cdn.x.com/a.js">c</a>`,
      },
    ],
    available: ['/index.html'],
  });
  expect(audit.unreachable).toEqual([]);
});

test('strips query strings and fragments before resolving', () => {
  const audit = auditLinks({
    pages: [{ path: '/index.html', html: '<a href="/dirac?x=1#top">d</a>' }],
    available: ['/index.html', '/dirac/index.html'],
  });
  expect(audit.unreachable).toEqual([]);
});

test('separates missing pages from missing assets, pages first', () => {
  const audit = auditLinks({
    pages: [
      {
        path: '/index.html',
        html: '<link href="/assets/app.css"><a href="/league">l</a>',
      },
    ],
    available: ['/index.html'],
  });
  expect(audit.unreachable.map((u) => [u.link, u.kind])).toEqual([
    ['/league', 'page'],
    ['/assets/app.css', 'asset'],
  ]);
});

test('collects every page that links to the same missing target', () => {
  const audit = auditLinks({
    pages: [
      { path: '/index.html', html: '<a href="/cv">cv</a>' },
      { path: '/about/index.html', html: '<a href="/cv">cv</a>' },
    ],
    available: ['/index.html', '/about/index.html'],
  });
  expect(audit.unreachable[0]!.linkedFrom).toEqual(['/about/index.html', '/index.html']);
});

test('a site whose links all resolve reports nothing', () => {
  const audit = auditLinks({
    pages: [{ path: '/index.html', html: '<a href="/">home</a>' }],
    available: ['/index.html'],
  });
  expect(audit.unreachable).toEqual([]);
  expect(audit.linksChecked).toBe(1);
});

test('ignores documentation examples that are templates, not links', () => {
  const audit = auditLinks({
    pages: [
      {
        path: '/index.html',
        html: `<a href="/fe/{plugin}/{name}.js">example</a>
               <a href="/users/:id">pattern</a>
               <a href="/real">real</a>`,
      },
    ],
    available: ['/index.html'],
  });
  expect(audit.unreachable.map((u) => u.link)).toEqual(['/real']);
});
