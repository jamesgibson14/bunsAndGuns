import Bun from 'bun'
import Gun from 'gun/gun'
import SEA from 'gun/sea'
globalThis.GUN = Gun
// This is mostly copied from 'gun/lib/server.js'
var u;
Gun.on('opt', function(root){
  if(u === root.opt.super){ root.opt.super = true }
  if(u === root.opt.faith){ root.opt.faith = true } // HNPERF: This should probably be off, but we're testing performance improvements, please audit.
  root.opt.log = root.opt.log || Gun.log;
  this.to.next(root);
})
require('gun/lib/store.js');
require('gun/lib/rfs.js');
require('gun/lib/rs3.js');
// replacing wire.js with this file
// require('./wire');

require('gun/sea.js')
require('gun/axe.js')
require('gun/lib/stats.js');
// multicast doesn't work with Bun because dgram is not supported yet: https://bun.sh/docs/runtime/nodejs-apis
// require('gun/lib/multicast.js');

// 
import httpConfig from './serve-bun.js'
const server = Bun.serve( httpConfig )

const env = process.env
const VALID_KEY = env.VALID_KEY
const USE_RADISK = env.DISABLE_RADISK !== 'true'
const USE_AXE = env.DISABLE_AXE !== 'true'
const gun = globalThis.gunInstance = Gun({
  web: server,
  axe: USE_AXE, 
	localStorage: false,
	radisk: USE_RADISK, 
	peers: env?.PEERS?.split(',') || [],
	validKey: VALID_KEY,
	multicast: false,
	pack: 599000000 * 0.3,
	s: {
		key: env.AWS_ACCESS_KEY_ID, // AWS Access Key
		secret: env.AWS_SECRET_ACCESS_KEY, // AWS Secret Token
		bucket: env.AWS_S3_BUCKET // The bucket you want to save into
 }
})
console.log('Running Bun and Gun')