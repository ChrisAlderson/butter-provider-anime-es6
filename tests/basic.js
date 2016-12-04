'use strict';

const debug = require('debug')('butter-provider:tests');
const path = require('path');
const Provider = require('butter-provider');
const tape = require('tape');

const pkg = require(path.join(process.cwd(), 'package.json'));
const timeout = 10000;

const config = {
  args: {
    apiURL: 'http://anime.api-fetch.website/'
  }
};

if (pkg.butter && pkg.butter.testArgs) {
  config = Provider.prototype.parseArgs(pkg.butter.testArgs);
}

function load() {
  return require(process.cwd());
}

tape('loads', t => {
  const P = load();

  t.ok(P, 'we were able to load');

  const I = new P(config.args);

  t.ok(I, 'we were able to instanciate');

  t.ok(I.config.name, 'we have a name');
  t.ok(I.config.uniqueId, 'we have a uniqueId');
  t.ok(I.config.tabName, 'we have a tabName');
  t.ok(I.config.type, 'we have a type');

  t.end();
});

tape('fetch', t => {
  debug('fetch, timeout', timeout)
  t.timeoutAfter(timeout);

  const P = load();
  const I = new P(config.args);

  I.fetch({
    page: 1
  }).then(res => {
    debug ('fetch', res);
    t.ok(res, 'we were able to fetch');
    t.ok(res.hasMore === true || res.hasMore === false, 'we have a hasMore field that is a boolean: ');
    t.ok(res.results, 'we have a results field');
    t.ok(res.results.length > 0, 'we have at least 1 result');
    t.ok(I.extractIds(res), 'extractIds');
    t.end();
  }).catch(err => t.notOk(err, 'failed fetch'));
});
