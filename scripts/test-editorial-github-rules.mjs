import assert from "node:assert/strict"
import {
  buildHardenedRuleset,
  isHardenedRuleset,
  summarizeRulesetChange,
} from "./lib/editorial-github-rules.mjs"

const current = {
  id: 1,
  name: "develop",
  target: "branch",
  enforcement: "active",
  conditions: {
    ref_name: {
      include: ["refs/heads/develop", "refs/heads/main"],
      exclude: [],
    },
  },
  rules: [
    { type: "deletion" },
    { type: "non_fast_forward" },
    {
      type: "pull_request",
      parameters: {
        required_approving_review_count: 0,
        allowed_merge_methods: ["merge", "squash", "rebase"],
      },
    },
  ],
}
const planned = buildHardenedRuleset(current)
assert.equal(isHardenedRuleset({ ...planned, id: current.id }), true)
assert.deepEqual(
  planned.rules.find(rule => rule.type === "pull_request").parameters
    .allowed_merge_methods,
  ["merge"]
)
assert.deepEqual(
  planned.rules.find(rule => rule.type === "required_status_checks").parameters
    .required_status_checks,
  [{ context: "validate" }]
)
assert.equal(summarizeRulesetChange(current, planned).strictChecks, true)
assert.equal(
  buildHardenedRuleset({
    ...current,
    rules: [
      ...planned.rules,
      {
        type: "required_status_checks",
        parameters: {
          required_status_checks: [{ context: "other" }],
          strict_required_status_checks_policy: false,
          do_not_enforce_on_create: false,
        },
      },
    ].filter(
      (rule, index, rules) =>
        rule.type !== "required_status_checks" ||
        index === rules.findLastIndex(candidate => candidate.type === rule.type)
    ),
  }).rules
    .find(rule => rule.type === "required_status_checks")
    .parameters.required_status_checks.some(check => check.context === "validate"),
  true
)

console.log("Editorial GitHub ruleset tests passed.")
