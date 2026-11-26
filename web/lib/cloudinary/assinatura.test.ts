import { describe, expect, it } from "vitest";
import { assinarCloudinary } from "./assinatura";

describe("assinarCloudinary", () => {
  it("reproduz o exemplo da documentação do Cloudinary", () => {
    expect(
      assinarCloudinary(
        { timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" },
        "abcd",
      ),
    ).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("não depende da ordem das chaves", () => {
    expect(assinarCloudinary({ b: 1, a: "x" }, "s")).toBe(assinarCloudinary({ a: "x", b: 1 }, "s"));
  });
});
