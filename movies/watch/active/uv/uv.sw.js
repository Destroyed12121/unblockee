importScripts('/active/uv/uv.bundle.js');
importScripts('/active/uv/uv.config.js');

class UVServiceWorker extends EventEmitter {
    constructor(config = __uv$config) {
        super();
        if (!config.bare) config.bare = '/bare/';
        this.addresses = typeof config.bare === 'string' ? [new URL(config.bare, location)] : config.bare.map(str => new URL(str, location));
        this.headers = {
            csp: [
                'cross-origin-embedder-policy',
                'cross-origin-opener-policy',
                'cross-origin-resource-policy',
                'content-security-policy',
                'content-security-policy-report-only',
                'expect-ct',
                'feature-policy',
                'origin-isolation',
                'strict-transport-security',
                'upgrade-insecure-requests',
                'x-content-type-options',
                'x-download-options',
                'x-frame-options',
                'x-permitted-cross-domain-policies',
                'x-powered-by',
                'x-xss-protection',
            ],
            forward: [
                'accept-encoding',
                'connection',
                'content-length',
            ],
        };
        this.method = {
            empty: ['GET', 'HEAD']
        };
        this.statusCode = {
            empty: [204, 304],
        };
        this.config = config;
        this.browser = Ultraviolet.Bowser.getParser(self.navigator.userAgent).getBrowserName();

        if (this.browser === 'Firefox') {
            this.headers.forward.push('user-agent');
            this.headers.forward.push('content-type');
        }
    }

    async fetch({ request }) {
        if (!request.url.startsWith(location.origin + (this.config.prefix || '/service/'))) {
            return fetch(request);
        }

        try {
            const ultraviolet = new Ultraviolet(this.config);

            if (typeof this.config.construct === 'function') {
                this.config.construct(ultraviolet, 'service');
            }

            const db = await ultraviolet.cookie.db();
            ultraviolet.meta.origin = location.origin;
            ultraviolet.meta.base = ultraviolet.meta.url = new URL(ultraviolet.sourceUrl(request.url));

            const requestCtx = new RequestContext(
                request,
                this,
                ultraviolet,
                !this.method.empty.includes(request.method.toUpperCase()) ? await request.blob() : null
            );

            if (ultraviolet.meta.url.protocol === 'blob:') {
                requestCtx.blob = true;
                requestCtx.base = requestCtx.url = new URL(requestCtx.url.pathname);
            }

            if (request.referrer && request.referrer.startsWith(location.origin)) {
                const referer = new URL(ultraviolet.sourceUrl(request.referrer));
                if (requestCtx.headers.origin || ultraviolet.meta.url.origin !== referer.origin && request.mode === 'cors') {
                    requestCtx.headers.origin = referer.origin;
                }
                requestCtx.headers.referer = referer.href;
            }

            const cookies = await ultraviolet.cookie.getCookies(db) || [];
            const cookieStr = ultraviolet.cookie.serialize(cookies, ultraviolet.meta, false);

            if (this.browser === 'Firefox' && !(request.destination === 'iframe' || request.destination === 'document')) {
                requestCtx.forward.shift();
            }

            if (cookieStr) requestCtx.headers.cookie = cookieStr;
            requestCtx.headers.Host = requestCtx.url.host;

            const reqEvent = new HookEvent(requestCtx, null, null);
            this.emit('request', reqEvent);
            if (reqEvent.intercepted) return reqEvent.returnValue;

            const response = await fetch(requestCtx.send);

            if (response.status === 500) {
                return Promise.reject('');
            }

            const responseCtx = new ResponseContext(requestCtx, response, this);
            const resEvent = new HookEvent(responseCtx, null, null);

            this.emit('beforemod', resEvent);
            if (resEvent.intercepted) return resEvent.returnValue;

            for (const name of this.headers.csp) {
                if (responseCtx.headers[name]) delete responseCtx.headers[name];
            }

            if (responseCtx.headers.location) {
                responseCtx.headers.location = ultraviolet.rewriteUrl(responseCtx.headers.location);
            }

            if (responseCtx.headers['set-cookie']) {
                Promise.resolve(ultraviolet.cookie.setCookies(responseCtx.headers['set-cookie'], db, ultraviolet.meta)).then(() => {
                    self.clients.matchAll().then(clients => {
                        clients.forEach(client => {
                            client.postMessage({
                                msg: 'updateCookies',
                                url: ultraviolet.meta.url.href,
                            });
                        });
                    });
                });
                delete responseCtx.headers['set-cookie'];
            }

            if (responseCtx.body) {
                switch (request.destination) {
                    case 'script':
                    case 'worker':
                        // Avoid inline script injection; serve from a static file instead
                        responseCtx.body = await this.rewriteScript(await response.text(), ultraviolet);
                        break;
                    case 'style':
                        responseCtx.body = ultraviolet.rewriteCSS(await response.text());
                        break;
                    case 'iframe':
                    case 'document':
                        if (isHtml(ultraviolet.meta.url, (responseCtx.headers['content-type'] || ''))) {
                            responseCtx.body = ultraviolet.rewriteHtml(await response.text(), {
                                document: true,
                                injectHead: ultraviolet.createHtmlInject(
                                    this.config.handler,
                                    this.config.bundle,
                                    this.config.config,
                                    ultraviolet.cookie.serialize(cookies, ultraviolet.meta, true),
                                    request.referrer
                                )
                            });
                        }
                        break;
                }
            }

            if (requestCtx.headers.accept === 'text/event-stream') {
                responseCtx.headers['content-type'] = 'text/event-stream';
            }

            this.emit('response', resEvent);
            if (resEvent.intercepted) return resEvent.returnValue;

            return new Response(responseCtx.body, {
                headers: responseCtx.headers,
                status: responseCtx.status,
                statusText: responseCtx.statusText,
            });

        } catch (err) {
            return new Response(err.toString(), {
                status: 500,
            });
        }
    }

    // New method to handle script rewriting without inline injection
    async rewriteScript(text, ultraviolet) {
        const rewritten = ultraviolet.js.rewrite(text);
        // Instead of injecting inline, return the rewritten script as a Blob URL
        const blob = new Blob([rewritten], { type: 'text/javascript' });
        return URL.createObjectURL(blob);
    }

    getBarerResponse(response) {
        const headers = {};
        const raw = JSON.parse(response.headers.get('x-bare-headers'));

        for (const key in raw) {
            headers[key.toLowerCase()] = raw[key];
        }

        return {
            headers,
            status: +response.headers.get('x-bare-status'),
            statusText: response.headers.get('x-bare-status-text'),
            body: !this.statusCode.empty.includes(+response.headers.get('x-bare-status')) ? response.body : null,
        };
    }

    get address() {
        return this.addresses[Math.floor(Math.random() * this.addresses.length)];
    }

    static Ultraviolet = Ultraviolet;
}

// Rest of the code (ResponseContext, RequestContext, etc.) remains unchanged