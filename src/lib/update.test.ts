import { beforeEach, describe, expect, test } from "vitest"
import { consumeUpdateRequest, markUpdateRequested } from "./update"
import { localVersion } from "./version"

beforeEach(() => {
  sessionStorage.clear()
})

describe("update marker", () => {
  test("reports the same build once after a plain reload", () => {
    markUpdateRequested()
    expect(consumeUpdateRequest()).toEqual({
      previousBuildId: localVersion.buildId,
      updated: false,
    })
    expect(consumeUpdateRequest()).toBeNull()
  })

  test("reports a changed build as updated", () => {
    sessionStorage.setItem("tiles:update-from:v1", "an-older-build")
    expect(consumeUpdateRequest()).toEqual({
      previousBuildId: "an-older-build",
      updated: true,
    })
  })
})
