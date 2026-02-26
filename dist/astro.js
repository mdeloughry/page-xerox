// src/astro.ts
import { fileURLToPath } from "url";

// src/core.ts
import * as cheerio from "cheerio";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { stringify as yamlStringify } from "yaml";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { glob } from "glob";
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
var nhm = new NodeHtmlMarkdown();
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
${yamlStringify(frontmatter).trim()}
---

`;
  }
  output += markdown;
  return { markdown: output, metadata };
}
async function convertDir(dirPath, options) {
  const htmlFiles = await glob("**/*.html", { cwd: dirPath });
  const written = [];
  for (const relPath of htmlFiles) {
    const urlPath = "/" + relPath.replace(/index\.html$/, "").replace(/\.html$/, "");
    if (isExcluded(urlPath, options?.exclude)) {
      continue;
    }
    const fullPath = join(dirPath, relPath);
    const html = await readFile(fullPath, "utf-8");
    const result = convertHtml(html, { ...options, path: urlPath });
    if (!result.markdown) {
      console.warn(`[page-xerox] Skipping ${relPath} - no content extracted`);
      continue;
    }
    const mdPath = fullPath.replace(/\.html$/, ".md");
    await writeFile(mdPath, result.markdown, "utf-8");
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
        const dirPath = fileURLToPath(dir);
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
export {
  pageXerox as default
};
