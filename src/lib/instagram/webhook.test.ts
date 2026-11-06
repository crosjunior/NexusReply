import { describe, expect, it } from "vitest";
import { dedupeKey, normalizeWebhook } from "./webhook";

describe("normalizeWebhook", () => {
  it("DM, quick reply, postback, echo e comentário", () => {
    const ev = normalizeWebhook({
      object: "instagram",
      entry: [
        {
          id: "BIZ",
          time: 1,
          messaging: [
            { sender: { id: "U1" }, recipient: { id: "BIZ" }, timestamp: 1, message: { mid: "m1", text: "oi" } },
            { sender: { id: "U1" }, recipient: { id: "BIZ" }, timestamp: 2, message: { mid: "m2", text: "Sim", quick_reply: { payload: "rf1|f|n|q" } } },
            { sender: { id: "U1" }, recipient: { id: "BIZ" }, timestamp: 3, postback: { mid: "p1", title: "Quero", payload: "rf1|f|n|b" } },
            { sender: { id: "BIZ" }, recipient: { id: "U1" }, timestamp: 4, message: { mid: "m3", text: "eco", is_echo: true } },
          ],
          changes: [{ field: "comments", value: { id: "C1", text: "EU QUERO", from: { id: "U2", username: "joao" }, media: { id: "M1" } } }],
        },
      ],
    });
    expect(ev.map((e) => e.kind)).toEqual(["message", "message", "postback", "message", "comment"]);
    expect(ev[1]).toMatchObject({ quickReplyPayload: "rf1|f|n|q" });
    expect(ev[3]).toMatchObject({ isEcho: true, senderId: "U1" });
    expect(ev[4]).toMatchObject({ commentId: "C1", fromId: "U2", mediaId: "M1" });
    expect(dedupeKey(ev[4])).toBe("cm:C1");
  });
  it("ignora objetos que não são instagram", () => {
    expect(normalizeWebhook({ object: "page", entry: [] })).toEqual([]);
  });
});
