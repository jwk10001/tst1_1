import { digestStringAsync, CryptoDigestAlgorithm, CryptoEncoding } from "expo-crypto";
import { normalizeDiaryContent } from "@/lib/versioning/normalizeDiaryContent";
import type { MobileHashFunction } from "./types";

export const hashMobileDiaryContent: MobileHashFunction = async (input) => {
  const normalized = normalizeDiaryContent(input);

  return digestStringAsync(CryptoDigestAlgorithm.SHA256, JSON.stringify(normalized), {
    encoding: CryptoEncoding.HEX,
  });
};
