import { EDITORIAL_VALIDATION_CHECK } from "./editorial-github.mjs"

export function buildHardenedRuleset(ruleset) {
  if (!ruleset?.id || ruleset.target !== "branch") {
    throw new Error("A repository branch ruleset is required")
  }
  const rules = (ruleset.rules || []).map(rule => {
    if (rule.type !== "pull_request") return rule
    return {
      ...rule,
      parameters: {
        ...(rule.parameters || {}),
        allowed_merge_methods: ["merge"],
      },
    }
  })
  if (!rules.some(rule => rule.type === "pull_request")) {
    throw new Error("The develop/main ruleset must continue requiring pull requests")
  }
  const statusRule = rules.find(rule => rule.type === "required_status_checks")
  if (statusRule) {
    const checks = statusRule.parameters?.required_status_checks || []
    const requiredStatusChecks = checks.some(
      check => check.context === EDITORIAL_VALIDATION_CHECK
    )
      ? checks
      : [...checks, { context: EDITORIAL_VALIDATION_CHECK }]
    statusRule.parameters = {
      ...(statusRule.parameters || {}),
      required_status_checks: requiredStatusChecks,
      strict_required_status_checks_policy: true,
      do_not_enforce_on_create: true,
    }
  } else {
    rules.push({
      type: "required_status_checks",
      parameters: {
        required_status_checks: [{ context: EDITORIAL_VALIDATION_CHECK }],
        strict_required_status_checks_policy: true,
        do_not_enforce_on_create: true,
      },
    })
  }

  return {
    name: ruleset.name,
    target: ruleset.target,
    enforcement: "active",
    ...(ruleset.bypass_actors ? { bypass_actors: ruleset.bypass_actors } : {}),
    conditions: ruleset.conditions,
    rules,
  }
}

export function summarizeRulesetChange(current, planned) {
  const currentPull = (current.rules || []).find(rule => rule.type === "pull_request")
  const plannedPull = planned.rules.find(rule => rule.type === "pull_request")
  const plannedStatus = planned.rules.find(
    rule => rule.type === "required_status_checks"
  )
  return {
    rulesetId: current.id,
    rulesetName: current.name,
    mergeMethodsBefore: currentPull?.parameters?.allowed_merge_methods || [],
    mergeMethodsAfter: plannedPull.parameters.allowed_merge_methods,
    requiredChecksAfter:
      plannedStatus.parameters.required_status_checks.map(check => check.context),
    strictChecks: plannedStatus.parameters.strict_required_status_checks_policy,
  }
}

export function isHardenedRuleset(ruleset) {
  const pull = (ruleset?.rules || []).find(rule => rule.type === "pull_request")
  const status = (ruleset?.rules || []).find(
    rule => rule.type === "required_status_checks"
  )
  const contexts =
    status?.parameters?.required_status_checks?.map(check => check.context) || []
  return (
    ruleset?.enforcement === "active" &&
    JSON.stringify(pull?.parameters?.allowed_merge_methods || []) ===
      JSON.stringify(["merge"]) &&
    contexts.includes(EDITORIAL_VALIDATION_CHECK) &&
    status?.parameters?.strict_required_status_checks_policy === true &&
    status?.parameters?.do_not_enforce_on_create === true
  )
}
