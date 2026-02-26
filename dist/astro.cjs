"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/astro.ts
var astro_exports = {};
__export(astro_exports, {
  default: () => pageXerox
});
module.exports = __toCommonJS(astro_exports);
var import_node_url = require("url");

// src/core.ts
var cheerio = __toESM(require("cheerio"), 1);
var import_node_html_markdown = require("node-html-markdown");
var import_yaml = require("yaml");
var import_promises = require("fs/promises");
var import_node_path = require("path");
var import_glob = require("glob");
function extractMetadata(html) {
  const $ = cheerio.load(html);
  return {
    path: "",
    title: $("title").first().text().trim(),
    description: $('meta[name="description"]').attr("content")?.trim() ?? "",
    canonical: $('link[rel="canonical"]').attr("href")?.trim() ?? "",
    og_image: $('meta[property="og:image"]').attr("content")?.trim() ?? "",
    generated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
var NOISE_TAGS = ["script", "style", "noscript", "iframe"];
function cleanHtml(html, selector) {
  const $ = cheerio.load(html);
  const contentSelector = selector ?? "main";
  let $content = $(contentSelector);
  if ($content.length === 0) {
    console.warn(`[page-xerox] Selector "${contentSelector}" matched nothing, falling back to <body>`);
    $content = $("body");
  }
  if ($content.length === 0) {
    return "";
  }
  const $clone = $content.clone();
  $clone.find("[data-md-ignore]").remove();
  for (const tag of NOISE_TAGS) {
    $clone.find(tag).remove();
  }
  return $clone.html()?.trim() ?? "";
}
var nhm = new import_node_html_markdown.NodeHtmlMarkdown();
function convertHtml(html, options) {
  const metadata = extractMetadata(html);
  const baseUrl = options?.baseUrl;
  if (baseUrl) {
    if (metadata.canonical && !metadata.canonical.startsWith("http")) {
      metadata.canonical = new URL(metadata.canonical, baseUrl).href;
    }
    if (metadata.og_image && !metadata.og_image.startsWith("http")) {
      metadata.og_image = new URL(metadata.og_image, baseUrl).href;
    }
  }
  if (metadata.canonical) {
    try {
      metadata.path = new URL(metadata.canonical).pathname;
    } catch {
      metadata.path = metadata.canonical;
    }
  } else if (options?.path) {
    metadata.path = options.path;
  }
  const cleaned = cleanHtml(html, options?.contentSelector);
  if (!cleaned) {
    return { markdown: "", metadata };
  }
  const markdown = nhm.translate(cleaned);
  const includeMetadata = options?.metadata !== false;
  let output = "";
  if (includeMetadata) {
    const frontmatter = {
      path: metadata.path,
      title: metadata.title,
      description: metadata.description,
      canonical: metadata.canonical,
      og_image: metadata.og_image,
      generated: metadata.generated
    };
    output = `---
${(0, import_yaml.stringify)(frontmatter).trim()}
---

`;
  }
  output += markdown;
  return { markdown: output, metadata };
}
async function convertDir(dirPath, options) {
  const htmlFiles = await (0, import_glob.glob)("**/*.html", { cwd: dirPath });
  const written = [];
  for (const relPath of htmlFiles) {
    const urlPath = "/" + relPath.replace(/index\.html$/, "").replace(/\.html$/, "");
    if (isExcluded(urlPath, options?.exclude)) {
      continue;
    }
    const fullPath = (0, import_node_path.join)(dirPath, relPath);
    const html = await (0, import_promises.readFile)(fullPath, "utf-8");
    const result = convertHtml(html, { ...options, path: urlPath });
    if (!result.markdown) {
      console.warn(`[page-xerox] Skipping ${relPath} - no content extracted`);
      continue;
    }
    const mdPath = fullPath.replace(/\.html$/, ".md");
    await (0, import_promises.writeFile)(mdPath, result.markdown, "utf-8");
    written.push(mdPath);
  }
  return written;
}
function isExcluded(urlPath, exclude) {
  if (!exclude) return false;
  return exclude.some((pattern) => {
    if (typeof pattern === "string") {
      return urlPath.startsWith(pattern);
    }
    return pattern.test(urlPath);
  });
}

// src/astro.ts
function pageXerox(options) {
  const resolveStrategy = options?.dev?.resolve ?? "disk-first";
  return {
    name: "page-xerox",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const dirPath = (0, import_node_url.fileURLToPath)(dir);
        const written = await convertDir(dirPath, options);
        console.log(`[page-xerox] Generated ${written.length} .md files`);
      },
      "astro:server:setup": ({ server }) => {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.endsWith(".md")) return next();
          const htmlUrl = req.url.replace(/\.md$/, ".html");
          const htmlUrlIndex = req.url.replace(/\.md$/, "/index.html");
          try {
            let html = null;
            if (resolveStrategy === "fetch-first" || resolveStrategy === "fetch-only") {
              html = await fetchFromDev(server, req.url.replace(/\.md$/, ""));
              if (!html && resolveStrategy === "fetch-first") {
                html = await resolveFromDisk(server, htmlUrl, htmlUrlIndex);
              }
            } else {
              html = await resolveFromDisk(server, htmlUrl, htmlUrlIndex);
              if (!html && resolveStrategy === "disk-first") {
                html = await fetchFromDev(server, req.url.replace(/\.md$/, ""));
              }
            }
            if (!html) {
              return next();
            }
            const result = convertHtml(html, options);
            res.setHeader("Content-Type", "text/markdown; charset=utf-8");
            res.end(result.markdown);
          } catch {
            next();
          }
        });
      }
    }
  };
}
async function fetchFromDev(server, path) {
  try {
    const address = server.httpServer?.address();
    if (!address) return null;
    const port = typeof address === "string" ? address : address.port;
    const res = await fetch(`http://localhost:${port}${path}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
async function resolveFromDisk(server, ...paths) {
  try {
    const { readFile: readFile2 } = await import("fs/promises");
    const { join: join2 } = await import("path");
    const root = server.config?.root ?? process.cwd();
    const outDir = server.config?.outDir ?? "dist";
    for (const p of paths) {
      try {
        return await readFile2(join2(root, outDir, p), "utf-8");
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}
