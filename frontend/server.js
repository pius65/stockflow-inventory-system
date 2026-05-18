import http from "http";
import { createReadStream, existsSync, statSync } from "fs";
import { extname, join, relative, resolve } from "path";
import { fileURLToPath } from "url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
const isProduction = process.env.NODE_ENV === "production";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function sendFile(response, filePath, status = 200) {
  const extension = extname(filePath);
  const headers = {
    "Content-Type": types[extension] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Cache-Control": isProduction && [".js", ".css", ".png", ".jpg", ".jpeg", ".svg"].includes(extension)
      ? "public, max-age=3600"
      : "no-cache",
  };
  response.writeHead(status, headers);
  createReadStream(filePath).pipe(response);
}

http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = resolve(join(root, requestedPath));

  const relativePath = relative(root, filePath);

  if (relativePath.startsWith("..") || resolve(filePath) === resolve(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    sendFile(response, filePath);
    return;
  }

  sendFile(response, join(root, "index.html"));
}).listen(port, host, () => {
  console.log(`MarketFlow frontend running at http://${host}:${port}`);
});
