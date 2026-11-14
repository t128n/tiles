import { describe, expect, test } from "vitest"
import { DEFAULT_SETTINGS, type Settings } from "../settings.svelte"
import { calculator, formatNumber } from "./calculator"

const settings: Settings = {
  ...DEFAULT_SETTINGS,
  experiments: { calculator: true },
}

function resolve(query: string) {
  return calculator.resolveSearch?.(query, { settings }) ?? null
}

describe("calculator", () => {
  test("evaluates ordinary arithmetic", () => {
    expect(resolve("2+3*4")).toMatchObject({ kind: "copy", value: "14" })
    expect(resolve("(2+3)*4")).toMatchObject({ value: "20" })
    expect(resolve("2 + 2")).toMatchObject({ value: "4" })
    expect(resolve("2^10")).toMatchObject({ value: "1024" })
    expect(resolve("2^3^2")).toMatchObject({ value: "512" })
    expect(resolve("5%2")).toMatchObject({ value: "1" })
    expect(resolve("sqrt(9)")).toMatchObject({ value: "3" })
    expect(resolve("log10(100)")).toMatchObject({ value: "2" })
    expect(resolve("2*-3")).toMatchObject({ value: "-6" })
  })

  test("keeps decimal noise out of the result", () => {
    expect(resolve("1.5*2")).toMatchObject({ value: "3" })
    expect(resolve("0.1+0.2")).toMatchObject({ value: "0.3" })
    expect(resolve("1/3")).toMatchObject({ value: "0.333333333333" })
  })

  test("formats large and tiny magnitudes as an exponent", () => {
    expect(resolve("1e10*1e10")).toMatchObject({ value: "1e20" })
    expect(resolve("1e-7*1")).toMatchObject({ value: "1e-7" })
    expect(formatNumber(1234567890123456)).toBe("1.234568e15")
  })

  test("offers a one-line hint", () => {
    expect(resolve("18*3")).toEqual({
      kind: "copy",
      value: "54",
      hint: "= 54 · Enter to copy",
    })
  })

  test("leaves ordinary searches alone", () => {
    expect(resolve("hello")).toBeNull()
    expect(resolve("svelte runes")).toBeNull()
    expect(resolve("2026")).toBeNull()
    expect(resolve("911")).toBeNull()
    expect(resolve("-5")).toBeNull()
    expect(resolve("")).toBeNull()
    expect(resolve("2+")).toBeNull()
    expect(resolve("1/0")).toBeNull()
    expect(resolve("example.com")).toBeNull()
    expect(resolve("1.5.2")).toBeNull()
  })

  test("ignores input longer than the limit", () => {
    expect(resolve(`${"1+".repeat(60)}1`)).toBeNull()
  })
})
