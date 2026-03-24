const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const rootDir = __dirname;
const defaultPort = 3000;
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp"
};

function resolveRequestPath(requestUrl) {
  const { pathname } = new URL(requestUrl, "http://localhost");
  const normalizedPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const resolvedPath = path.resolve(rootDir, `.${normalizedPath}`);
  const relativePath = path.relative(rootDir, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null;
  }

  return resolvedPath;
}

function sendStatus(response, statusCode, message) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

function createServer() {
  return http.createServer((request, response) => {
    if (!request.url) {
      sendStatus(response, 400, "Bad Request");
      return;
    }

    const filePath = resolveRequestPath(request.url);

    if (!filePath) {
      sendStatus(response, 403, "Forbidden");
      return;
    }

    fs.stat(filePath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        sendStatus(response, 404, "Not Found");
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[extension] ?? "application/octet-stream";
      response.writeHead(200, { "Content-Type": contentType });

      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        if (!response.headersSent) {
          sendStatus(response, 500, "Internal Server Error");
          return;
        }

        response.destroy();
      });
      stream.pipe(response);
    });
  });
}

const server = createServer();

if (require.main === module) {
  const parsedPort = Number.parseInt(process.env.PORT ?? `${defaultPort}`, 10);
  const port = Number.isNaN(parsedPort) ? defaultPort : parsedPort;

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = {
  createServer
};
