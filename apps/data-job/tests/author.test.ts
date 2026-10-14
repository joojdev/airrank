import { describe, expect, it } from "vitest";
import { cleanAuthor } from "../src/sources/commons";

describe("cleanAuthor", () => {
  it("drops licence boilerplate after the name", () => {
    expect(
      cleanAuthor(
        "Ad Meskens You are free to use this picture for any purpose as long as you credit its author, Ad Meskens. Example: © Ad Meskens / Wikimedia Commons",
      ),
    ).toBe("Ad Meskens");
    expect(cleanAuthor("© Ra Boe / Wikipedia Create the proper attribution for your usage")).toBe(
      "© Ra Boe / Wikipedia",
    );
  });
  it("extracts the name from the machine-readable and uploader templates", () => {
    expect(
      cleanAuthor(
        "No machine-readable author provided. Jolle~commonswiki assumed (based on copyright claims).",
      ),
    ).toBe("Jolle");
    expect(
      cleanAuthor("The original uploader was Timvasquez at English Wikipedia. (file log)."),
    ).toBe("Timvasquez");
  });
  it("shortens long credits and falls back when nothing is left", () => {
    const long = cleanAuthor(
      "Alberto Alcain of the Presidential Communications Operations Office, the state information agency",
    );
    expect(long.length).toBeLessThanOrEqual(81);
    expect(long.endsWith("…")).toBe(true);
    expect(cleanAuthor("This image is in the public domain in the United States because")).toBe(
      "Unknown author",
    );
    expect(cleanAuthor("Andy Smith")).toBe("Andy Smith");
    expect(cleanAuthor("https://www.flickr.com/photos/boeingdreamscape/")).toBe(
      "flickr.com/photos/boeingdreamscape",
    );
    expect(cleanAuthor("[Tycho] talk , http://shansov.net")).toBe("[Tycho] talk");
    expect(cleanAuthor("Unknown authorUnknown author")).toBe("Unknown author");
    expect(cleanAuthor("Jim Halliday: jhalliday@metalresources.net")).toBe("Jim Halliday");
  });
});
