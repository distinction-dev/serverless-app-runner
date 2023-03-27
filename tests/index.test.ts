import { expect } from "chai";
import "mocha";

describe("Fake Test", () => {
  it("Will Pass", () => {
    expect(1).to.equal(2);
  });
  it("Will Fail", () => {
    expect(1).to.equal(1);
  });
});
