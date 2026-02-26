#!/usr/bin/env node

// src/cli.ts
import { parseArgs } from "util";
import { resolve } from "path";

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
async function convertDir(dirPath2, options) {
  const htmlFiles = await glob("**/*.html", { cwd: dirPath2 });
  const written2 = [];
  for (const relPath of htmlFiles) {
    const urlPath = "/" + relPath.replace(/index\.html$/, "").replace(/\.html$/, "");
    if (isExcluded(urlPath, options?.exclude)) {
      continue;
    }
    const fullPath = join(dirPath2, relPath);
    const html = await readFile(fullPath, "utf-8");
    const result = convertHtml(html, { ...options, path: urlPath });
    if (!result.markdown) {
      console.warn(`[page-xerox] Skipping ${relPath} - no content extracted`);
      continue;
    }
    const mdPath = fullPath.replace(/\.html$/, ".md");
    await writeFile(mdPath, result.markdown, "utf-8");
    written2.push(mdPath);
  }
  return written2;
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

// src/cli.ts
var { values } = parseArgs({
  options: {
    dir: { type: "string", short: "d" },
    selector: { type: "string", short: "s" },
    exclude: { type: "string", multiple: true, short: "e" },
    "no-metadata": { type: "boolean", default: false },
    "base-url": { type: "string", short: "b" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" }
  },
  strict: true,
  allowPositionals: false
});
if (values.help) {
  console.log(`page-xerox - Generate AI-ready Markdown from HTML pages

Usage:
  page-xerox --dir <path> [options]

Options:
  -d, --dir <path>        Directory containing HTML files (required)
  -s, --selector <css>    CSS selector for content extraction (default: "main")
  -e, --exclude <path>    Paths to exclude (repeatable)
      --no-metadata       Disable YAML frontmatter
  -b, --base-url <url>    Base URL for resolving relative URLs
  -h, --help              Show this help message
  -v, --version           Show version number`);
  process.exit(0);
}
if (values.version) {
  const { readFileSync } = await import("fs");
  const { join: join2, dirname } = await import("path");
  const { fileURLToPath } = await import("url");
  const pkgPath = join2(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  console.log(pkg.version);
  process.exit(0);
}
if (!values.dir) {
  console.error("[page-xerox] Error: --dir is required. Run with --help for usage.");
  process.exit(1);
}
var dirPath = resolve(values.dir);
var written = await convertDir(dirPath, {
  contentSelector: values.selector,
  exclude: values.exclude,
  metadata: !values["no-metadata"],
  baseUrl: values["base-url"]
});
console.log(`[page-xerox] Generated ${written.length} .md file${written.length === 1 ? "" : "s"} in ${values.dir}`);
