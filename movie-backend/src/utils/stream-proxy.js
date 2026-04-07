const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * Proxies an external video stream to the client response.
 * Supports Range headers for seeking/scrubbing.
 * 
 * @param {string} targetUrl The external video URL to fetch.
 * @param {Object} req The original Express request.
 * @param {Object} res The original Express response.
 * @param {Function} onError Callback if the proxy fails.
 */
function proxyExternalStream(targetUrl, req, res, onError) {
  try {
    const url = new URL(targetUrl);
    const client = url.protocol === 'https:' ? https : http;

    const headers = {};
    if (req.headers['range']) headers['range'] = req.headers['range'];
    if (req.headers['user-agent']) headers['user-agent'] = req.headers['user-agent'];

    const options = {
      method: 'GET',
      headers: {
        ...headers,
        host: url.hostname,
        connection: 'keep-alive',
      }
    };

    const proxyReq = client.request(targetUrl, options, (proxyRes) => {
      // If we get an error status from the external provider, don't pipe it as video.
      // Instead, trigger the error callback so the controller can serve a fallback.
      if (proxyRes.statusCode >= 400) {
        if (onError) onError(new Error(`Proxy target returned ${proxyRes.statusCode}`));
        return;
      }

      // Clean up headers from the external provider
      const headers = { ...proxyRes.headers };
      
      // Remove headers that might conflict or cause issues
      delete headers['access-control-allow-origin'];
      delete headers['access-control-allow-methods'];
      delete headers['access-control-allow-headers'];
      delete headers['access-control-expose-headers'];
      delete headers['content-security-policy'];
      delete headers['x-frame-options'];
      
      // Explicitly allow cross-origin media usage
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Forward the status code and filtered headers.
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error(`Proxy request error for ${targetUrl}:`, err);
      if (onError) onError(err);
    });

    req.on('aborted', () => {
      proxyReq.destroy();
    });

    // Pipe request body if any (though usually GET for stream).
    req.pipe(proxyReq);
  } catch (err) {
    console.error(`Invalid proxy URL: ${targetUrl}`, err);
    if (onError) onError(err);
  }
}

module.exports = {
  proxyExternalStream
};
