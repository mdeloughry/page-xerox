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

// src/eleventy.ts
function pageXerox(eleventyConfig, options) {
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    const written = await convertDir(dir.output, options);
    console.log(`[page-xerox] Generated ${written.length} .md files`);
  });
}
export {
  pageXerox as default
};
