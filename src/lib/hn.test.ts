import { describe, expect, test } from "vitest"
import { HN_FRONT_PAGE_API, fetchFrontPage, parseFrontPage } from "./hn"

describe("Hacker News front page", () => {
  test("maps Algolia hits to stories", () => {
    const stories = parseFrontPage({
      hits: [
        {
          objectID: "1",
          title: "A story",
          url: "https://example.com/a",
          points: 120,
          num_comments: 44,
          author: "pg",
        },
        {
          objectID: "2",
          story_title: "Ask HN: Anything?",
          url: null,
          points: 3,
          num_comments: null,
        },
      ],
    })

    expect(stories).toEqual([
      {
        id: "1",
        title: "A story",
        url: "https://example.com/a",
        points: 120,
        comments: 44,
        author: "pg",
      },
      {
        id: "2",
        title: "Ask HN: Anything?",
        url: "https://news.ycombinator.com/item?id=2",
        points: 3,
        comments: 0,
      },
    ])
  })

  test("skips unusable entries and duplicates", () => {
    const stories = parseFrontPage({
      hits: [
        { objectID: "1", title: "  " },
        { objectID: "2", title: "Kept" },
        { objectID: "2", title: "Duplicate" },
        { title: "No id" },
        { objectID: "3", title: "Bad link", url: "javascript:alert(1)" },
        null,
        "nope",
      ],
    })

    expect(stories.map((story) => story.title)).toEqual(["Kept", "Bad link"])
    expect(stories[1].url).toBe("https://news.ycombinator.com/item?id=3")
  })

  test("caps the list", () => {
    const hits = Array.from({ length: 60 }, (_, index) => ({
      objectID: String(index),
      title: `Story ${index}`,
    }))
    expect(parseFrontPage({ hits })).toHaveLength(40)
  })

  test("rejects an unexpected payload", () => {
    expect(() => parseFrontPage({})).toThrow()
    expect(() => parseFrontPage(null)).toThrow()
  })

  test("fetches the front page from Algolia", async () => {
    const calls: string[] = []
    const fetcher = (async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return {
        ok: true,
        json: async () => ({ hits: [{ objectID: "9", title: "Nine" }] }),
      } as Response
    }) as typeof fetch

    const stories = await fetchFrontPage({ fetcher })
    expect(calls).toEqual([HN_FRONT_PAGE_API])
    expect(stories[0].title).toBe("Nine")
  })

  test("reports a failed request", async () => {
    const fetcher = (async () =>
      ({ ok: false, status: 503 }) as Response) as typeof fetch
    await expect(fetchFrontPage({ fetcher })).rejects.toThrow("503")
  })
})
