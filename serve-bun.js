import Gun from 'gun/gun'
Gun.on('opt', function(root){
	var opt = root.opt;
	if(false === opt.ws || opt.once){
		this.to.next(root);
		return;
	}	

	opt.mesh = opt.mesh || Gun.Mesh(root);
	opt.WebSocket = opt.WebSocket || require('ws');
	var ws = opt.ws = opt.ws || {};
	ws.path = ws.path || '/gun';
	// if we DO need an HTTP server, then choose ws specific one or GUN default one.
	if(!ws.noServer){
		ws.server = ws.server || opt.web;
		if(!ws.server){ this.to.next(root); return } // ugh, bug fix for @jamierez & unstoppable ryan.
	}
	// ws.web = ws.web || new opt.WebSocket.Server(ws); // we still need a WS server.
	
	this.to.next(root);
});
function parseCookies (rc) {
	var list = {}

	rc && rc.split(';').forEach(function( cookie ) {
			var parts = cookie.split('=');
			list[parts.shift().trim()] = decodeURI(parts.join('='));
	});

	return list;
}
export default {
	port: process.env.PORT || 3000,
	async fetch(req, server) {
		const url = new URL(req.url);
		const cookies = parseCookies(req.headers.get("Cookie"));
		console.log('req.header: ', req.headers )
    if( server.upgrade(req, {
      headers: {
        "Set-Cookie": `SessionId=${ crypto.randomUUID().slice(0,13) }`,
      },
			data: {
				headers: req.headers,
        createdAt: Date.now(),
        channelId: url.searchParams.get("channelId"),
        sessionId: cookies["SessionId"],
				gunRoot: globalThis.gunInstance
      },
    })){
			return
		}
    if (url.pathname === "/") return new Response(Bun.file("./lib/test.html"));
    if (url.pathname === "/stats.json") return new Response( Bun.file("./node_modules/gun/stats.radata") );
    if (url.pathname.includes('/public')){
			const file = url.pathname.split('/').pop()
			console.log('load public file', file)
			return new Response(Bun.file(`./public/${ file}`))
		} 
    return new Response(`404!`);
  },
	websocket: {
		open(ws) {
			const gunOpt = ws.data.gunRoot._.opt
			const origin = ws.data.headers.get('origin')
			console.log(`WS opened`, ws.data.createdAt, ws.data.sessionId, origin )
			console.STAT && ((console.STAT.sites || (console.STAT.sites = { [ origin ]:0 }))[ origin ] += 1);
			let peer = {wire: ws}
			gunOpt.mesh.hi( peer );
			ws.data.peer = peer
			ws.data.heartbeat = setInterval(function heart(){ if(!gunOpt.peers[peer.id]){ return } try{ ws.send("[]") }catch(e){}} , 1000 * 20)			

		}, // a socket is opened
		async message(ws, message) {
			const gunOpt = ws.data.gunRoot._.opt
			console.log(`Received ${message}`);
			gunOpt.mesh.hear( message, ws.data.peer);
		}, // a message is received
		close(ws, code, message) {
			const gunOpt = ws.data.gunRoot._.opt
			console.log(`WS closed`, ws.data.headers.origin)
			const origin = ws.data.headers.get('origin')
			console.STAT.sites[ origin ] -= 1;
			gunOpt.mesh.bye( ws.data.peer );
			clearInterval( ws.data.heartbeat )
		}, // a socket is closed
		drain(ws) {
			console.log(`WS drain`, ws)
		}, // the socket is ready to receive more data
  },
	error(error) {
    return new Response(`<pre>${error}\n${error.stack}</pre>`, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
};