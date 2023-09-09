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
    const sessionId = 'abcd';
		const url = new URL(req.url);
		const cookies = parseCookies(req.headers.get("Cookie"));
		console.log('req.header: ', req.headers )
    if( server.upgrade(req, {
      headers: {
        "Set-Cookie": `SessionId=${sessionId}`,
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
    if (url.pathname === "/stats.json") return new Response(Bun.file("./node_modules/gun/stats.radata"));
    if (url.pathname.includes('/public')){
			const file = url.pathname.split('/').pop()
			console.log('load public file', file)
			return new Response(Bun.file(`./public/${ file}`))
		} 
    return new Response(`404!`);
  },
	websocket: {
		open(ws) {
			const gunRoot = ws.data.gunRoot
			console.log(`WS opened from`, ws.data.headers.origin, ws)
			console.STAT && ((console.STAT.sites || (console.STAT.sites = {}))[ws.data.headers.origin] = 1);
			let peer = {wire: ws}
			gunRoot._.opt.mesh.hi( peer );
		}, // a socket is opened
		async message(ws, message) {
			console.log(`Received ${message}`);
			const gunRoot = ws.data.gunRoot
			let peer = {wire: ws}
			gunRoot._.opt.mesh.hear(message.data || message, peer);
		}, // a message is received
		close(ws, code, message) {
			console.log(`WS opened`, ws.data.headers.origin)
			ws.data.gunRoot._.opt.mesh.bye(peer);
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