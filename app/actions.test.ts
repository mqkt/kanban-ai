import { describe, expect, it, vi } from "vitest";

const signInMock = vi.fn();
vi.mock("@/auth", () => ({ signIn: signInMock }));

const { startGuestSession } = await import("./actions");

describe("startGuestSession", () => {
  it("signs in with the guest provider and the given redirect target", async () => {
    await startGuestSession("/board");
    expect(signInMock).toHaveBeenCalledWith("guest", { redirectTo: "/board" });
  });

  it("forwards whatever redirect target it's bound to (e.g. AutoGuestStart's '/')", async () => {
    await startGuestSession("/");
    expect(signInMock).toHaveBeenCalledWith("guest", { redirectTo: "/" });
  });
});
