import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const docsRoot = path.join(projectRoot, "docs")
const errors = []
const warnings = []

const allowed = {
  kind: new Set([
    "architecture",
    "proposal",
    "implementation",
    "reference",
    "historical",
  ]),
  status: new Set([
    "proposed",
    "approved",
    "in-progress",
    "implemented",
    "superseded",
    "archived",
    "unverified",
  ]),
  implementation_state: new Set(["none", "partial", "complete", "unknown"]),
  verification: new Set(["verified", "unverified", "not-applicable"]),
}

function relative(file) {
  return path.relative(projectRoot, file).replace(/\\/g, "/")
}

function listMarkdown(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return listMarkdown(target)
    return entry.isFile() && entry.name.endsWith(".md") ? [target] : []
  })
}

function unquote(value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function scalar(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))
  return match ? unquote(match[1]) : null
}

function list(frontmatter, key) {
  const lines = frontmatter.split(/\r?\n/)
  const start = lines.findIndex(line => line.startsWith(`${key}:`))
  if (start < 0) return null
  const inline = lines[start].slice(key.length + 1).trim()
  if (inline === "[]") return []
  if (inline.startsWith("[") && inline.endsWith("]")) {
    return inline.slice(1, -1).split(",").map(unquote).filter(Boolean)
  }

  const values = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    const match = line.match(/^  -\s+(.+)$/)
    if (match) values.push(unquote(match[1]))
    else if (/^\S/.test(line)) break
  }
  return values
}

function verification(frontmatter) {
  const section = frontmatter.match(
    /^verification:\s*\r?\n([\s\S]*?)(?=^\S|\s*$)/m
  )
  if (!section) return null
  const state = section[1].match(/^  state:\s*(.+)$/m)
  const evidenceStart = section[1].split(/\r?\n/)
  const evidence = []
  let inEvidence = false
  evidenceStart.forEach(line => {
    if (/^  evidence:/.test(line)) {
      inEvidence = true
      return
    }
    if (inEvidence) {
      const match = line.match(/^    -\s+(.+)$/)
      if (match) evidence.push(unquote(match[1]))
      else if (/^  \S/.test(line)) inEvidence = false
    }
  })
  return { state: state ? unquote(state[1]) : null, evidence }
}

function parseDocument(file) {
  const contents = fs.readFileSync(file, "utf8")
  if (!contents.startsWith("---\n") && !contents.startsWith("---\r\n")) {
    errors.push(`${relative(file)}: missing YAML frontmatter`)
    return null
  }
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (!match) {
    errors.push(`${relative(file)}: unterminated YAML frontmatter`)
    return null
  }
  const frontmatter = match[1]
  return {
    file,
    contents,
    id: scalar(frontmatter, "id"),
    title: scalar(frontmatter, "title"),
    kind: scalar(frontmatter, "kind"),
    status: scalar(frontmatter, "status"),
    implementationState: scalar(frontmatter, "implementation_state"),
    updated: scalar(frontmatter, "updated"),
    related: list(frontmatter, "related"),
    supersedes: list(frontmatter, "supersedes"),
    supersededBy: list(frontmatter, "superseded_by"),
    codePaths: list(frontmatter, "code_paths"),
    verification: verification(frontmatter),
  }
}

function checkMetadata(document) {
  const owner = relative(document.file)
  ;["id", "title", "kind", "status", "implementationState", "updated"].forEach(
    field => {
      if (!document[field]) errors.push(`${owner}: missing ${field}`)
    }
  )
  ;["related", "supersedes", "supersededBy", "codePaths"].forEach(field => {
    if (!Array.isArray(document[field]))
      errors.push(`${owner}: missing ${field} list`)
  })
  if (!document.verification?.state) {
    errors.push(`${owner}: missing verification.state`)
  }
  if (document.id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(document.id)) {
    errors.push(`${owner}: invalid id "${document.id}"`)
  }
  if (document.kind && !allowed.kind.has(document.kind)) {
    errors.push(`${owner}: unsupported kind "${document.kind}"`)
  }
  if (document.status && !allowed.status.has(document.status)) {
    errors.push(`${owner}: unsupported status "${document.status}"`)
  }
  if (
    document.implementationState &&
    !allowed.implementation_state.has(document.implementationState)
  ) {
    errors.push(
      `${owner}: unsupported implementation_state "${document.implementationState}"`
    )
  }
  if (
    document.verification?.state &&
    !allowed.verification.has(document.verification.state)
  ) {
    errors.push(
      `${owner}: unsupported verification.state "${document.verification.state}"`
    )
  }
  if (document.updated && !/^\d{4}-\d{2}-\d{2}$/.test(document.updated)) {
    errors.push(`${owner}: updated must be YYYY-MM-DD`)
  }
  if (
    document.status === "implemented" &&
    document.verification?.state !== "verified"
  ) {
    errors.push(`${owner}: implemented status requires verified evidence`)
  }
  if (
    document.kind === "architecture" &&
    document.verification?.state !== "verified"
  ) {
    errors.push(`${owner}: architecture must describe verified behavior`)
  }
  if (document.kind === "proposal" && document.status === "implemented") {
    errors.push(
      `${owner}: an implemented feature must move out of proposal status`
    )
  }
  if (document.kind === "historical" && document.status !== "archived") {
    errors.push(`${owner}: historical documents must be archived`)
  }
}

function checkPaths(document) {
  const owner = relative(document.file)
  ;(document.codePaths || []).forEach(target => {
    if (!fs.existsSync(path.resolve(projectRoot, target))) {
      errors.push(`${owner}: code_path does not exist: ${target}`)
    }
  })
  ;(document.verification?.evidence || []).forEach(item => {
    if (/^(npm|node|npx)\s/.test(item)) return
    if (
      (item.includes("/") || /\.[a-z0-9]+$/i.test(item)) &&
      !fs.existsSync(path.resolve(projectRoot, item))
    ) {
      errors.push(`${owner}: evidence path does not exist: ${item}`)
    }
  })

  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g
  let match
  while ((match = linkPattern.exec(document.contents))) {
    let target = match[1].trim().replace(/^<|>$/g, "")
    if (!target || /^(?:https?:|mailto:|#)/i.test(target)) continue
    target = decodeURIComponent(target.split("#", 1)[0])
    if (!target) continue
    const resolved = path.resolve(path.dirname(document.file), target)
    if (!fs.existsSync(resolved)) {
      errors.push(`${owner}: broken relative link: ${match[1]}`)
    }
  }
}

if (!fs.existsSync(docsRoot)) {
  console.error("Documentation audit failed: docs/ does not exist")
  process.exit(1)
}

const documents = listMarkdown(docsRoot).map(parseDocument).filter(Boolean)
documents.forEach(checkMetadata)

const byId = new Map()
documents.forEach(document => {
  if (!document.id) return
  if (byId.has(document.id)) {
    errors.push(
      `${relative(document.file)}: duplicate id "${document.id}" also used by ${relative(byId.get(document.id).file)}`
    )
  } else byId.set(document.id, document)
})

documents.forEach(document => {
  const owner = relative(document.file)
  ;[
    ...(document.related || []),
    ...(document.supersedes || []),
    ...(document.supersededBy || []),
  ].forEach(id => {
    if (!byId.has(id))
      errors.push(`${owner}: references unknown document id "${id}"`)
  })
  ;(document.supersedes || []).forEach(id => {
    const target = byId.get(id)
    if (target && !target.supersededBy?.includes(document.id)) {
      errors.push(
        `${owner}: supersedes "${id}" without reciprocal superseded_by`
      )
    }
  })
  ;(document.supersededBy || []).forEach(id => {
    const target = byId.get(id)
    if (target && !target.supersedes?.includes(document.id)) {
      errors.push(
        `${owner}: superseded_by "${id}" without reciprocal supersedes`
      )
    }
  })
  if (
    document.verification?.state === "unverified" &&
    document.kind !== "historical"
  ) {
    warnings.push(`${owner}: remains explicitly unverified`)
  }
  checkPaths(document)
})

if (warnings.length) {
  console.warn("Documentation audit warnings:")
  warnings.forEach(warning => console.warn(`- ${warning}`))
  console.warn("")
}

if (errors.length) {
  console.error("Documentation audit failed:")
  errors.forEach(error => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(
    `Documentation audit passed: ${documents.length} managed documents, ${byId.size} unique IDs, ${warnings.length} warning(s).`
  )
}
