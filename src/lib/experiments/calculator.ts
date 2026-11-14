import { Parser } from "expr-eval"
import { looksLikeUrl } from "../url"
import type { ExperimentDefinition, SearchResolution } from "./registry"

const parser = new Parser()

const MAX_LENGTH = 120
const OPERATOR = /[+\-*/%^()]/
const TRAILING_OPERATOR = /[+\-*/%^(]$/
const FUNCTION =
  /\b(?:sqrt|cbrt|abs|round|roundTo|floor|ceil|log|log10|log2|log1p|lg|ln|exp|min|max|sign|trunc|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|hypot|pow|fac|gamma|random)\b/

/**
 * Integers stay plain, long decimals lose their noise, and huge or tiny
 * magnitudes use exponent notation so the hint stays one line.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value)
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value)
  const magnitude = Math.abs(value)
  if (magnitude >= 1e15 || (magnitude !== 0 && magnitude < 1e-6)) {
    return value
      .toExponential(6)
      .replace(/\.?0+e/, "e")
      .replace("e+", "e")
  }
  const text = value.toPrecision(12)
  return text.includes(".")
    ? text.replace(/0+$/, "").replace(/\.$/, "")
    : text
}

function resolve(query: string): SearchResolution | null {
  const expression = query.trim()
  if (!expression || expression.length > MAX_LENGTH) return null
  if (looksLikeUrl(expression)) return null

  // A leading sign alone is a number, not an expression worth showing.
  const unsigned = expression.replace(/^[+-]+/, "")
  if (!OPERATOR.test(unsigned) && !FUNCTION.test(expression)) return null
  if (TRAILING_OPERATOR.test(expression)) return null

  let result: unknown
  try {
    result = parser.evaluate(expression)
  } catch {
    return null
  }
  if (typeof result !== "number" || !Number.isFinite(result)) return null

  const value = formatNumber(result)
  return { kind: "copy", value, hint: `= ${value} · Enter to copy` }
}

export const calculator: ExperimentDefinition = {
  id: "calculator",
  title: "Calculator",
  description:
    "Type an expression in the search field to evaluate it and copy the result.",
  terms: ["calculator", "math", "arithmetic", "expression", "copy"],
  resolveSearch: (query) => resolve(query),
}
