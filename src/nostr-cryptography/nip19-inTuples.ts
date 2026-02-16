import { bech32 } from "./bech32";
import type { SpecialStrings } from "./special-strings";

type EventId = SpecialStrings.EventId;
type Privkey = SpecialStrings.Privkey;
type Pubkey = SpecialStrings.Pubkey;
type RelayURL = SpecialStrings.RelayURL;
type Web_URL = SpecialStrings.Web_URL;
type Nostr_Bech32_URI = SpecialStrings.Nostr_Bech32_URI;
// -------------------------------- TYPES

type TLV_PREFIXES = "nprofile" | "nevent" | "naddr" | "nrelay";
type BARE_VALUE_PREFIXES = "npub" | "nsec" | "note";
type errored = "errored" | "unsupported";
export type NostrUrisPrefixes = TLV_PREFIXES | BARE_VALUE_PREFIXES | errored;

/**TLV: Type Lenght Value */
export type Decoded_nevent_TLV = [
  Nostr_Bech32_URI,
  "nevent",
  /**event id */
  EventId,
  (
    /**optional */
    RelayURL[] | undefined
  ),
  (
    /**pubkey optional */
    Pubkey | undefined
  ),
  (
    /**optional */
    number | undefined
  ),
];

/**TLV: Type Lenght Value */
export type Decoded_nprofile_TLV = [
  Nostr_Bech32_URI,
  "nprofile",
  /**pubkey */
  Pubkey,
  (
    /**optional */
    RelayURL[] | undefined
  ),
];

/**TLV: Type Lenght Value */
export type Decoded_nrelay_TLV = [
  Nostr_Bech32_URI,
  "nrelay",
  /**missing implementation resources */
  ...RelayURL[],
];

/**TLV: Type Lenght Value */
export type Decoded_naddr_TLV = [
  Nostr_Bech32_URI,
  "naddr",
  (
    /**the identifier (the "d" tag) of the event being referenced. For normal replaceable events use an empty string */
    Web_URL | EventId
  ),
  (
    /**optional */
    RelayURL[] | undefined
  ),
  /**pubkey */
  Pubkey,
  /**kind */
  number,
];

/*Bare Value */
export type Decoded_note_BV = [string, "note", EventId];
/*Bare Value */
export type Decoded_npub_BV = [string, "npub", Pubkey];
/*Bare Value */
export type Decoded_nsec_BV = [string, "nsec", Privkey];

export type UnsupportedPrefix = [
  string,
  "unsupported",
  `prefix "${string}" unsupported`,
];
export type ErroredBech32 = [
  string,
  "errored",
  `Error ${any} on bech32.decode(bech32String, ${number}) bech32String: '${string}'`,
];

export type DecodedBareValue =
  | Decoded_note_BV
  | Decoded_npub_BV
  | Decoded_nsec_BV
  | UnsupportedPrefix
  | ErroredBech32;

export type DecodedTypeLenghtValue =
  | Decoded_nevent_TLV
  | Decoded_nprofile_TLV
  | Decoded_nrelay_TLV
  | Decoded_naddr_TLV;

export type DecodedNostrURI = DecodedBareValue | DecodedTypeLenghtValue;

// -------------------------------- CONSTANTS
const TLV_PREFIXES = ["nprofile", "nevent", "naddr", "nrelay"];
const BARE_VALUE_PREFIXES = ["npub", "nsec", "note"];

// -------------------------------- ENCODINGS

type EncodedTLV = `${TLV_PREFIXES}${string}`;

export type TLV = {
  type: number;
  value: Uint8Array;
};

export const nip19_entry_REGEX =
  /^(npub1[023456789acdefghjklmnpqrstuvwxyz]*|nprofile1[023456789acdefghjklmnpqrstuvwxyz]*|nsec1[023456789acdefghjklmnpqrstuvwxyz]*|note1[023456789acdefghjklmnpqrstuvwxyz]*|nevent1[023456789acdefghjklmnpqrstuvwxyz]*|naddr1[023456789acdefghjklmnpqrstuvwxyz]*|npub|nprofile|nsec|note|nevent|naddr|npu|npro|nprof|nprofi|nprofil|nse|not|neve|neven|nad|nadd|np|npr|ns|no|ne|na|n)$/;

const Bech32_Encode_Limit = 1000;

export function encodeString(
  prefix: BARE_VALUE_PREFIXES,
  hexString: string,
): EncodedTLV {
  if (!bech32 || !bech32.decode || !bech32.fromWords) {
    throw new Error("bech32 library not properly initialized");
  }

  if (hexString.length !== 64) {
    throw new Error("Hex string must be 32 bytes (64 hex characters).");
  }

  // Convert hex string to Uint8Array

  const data = hexToBytes(hexString);

  const fiveBitData = bech32.toWords(data);
  return bech32.encode(prefix, fiveBitData, Bech32_Encode_Limit) as EncodedTLV;
}

// ------TLV ENCODING EXAMPLE
// const pub = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
// const kind = 30023;
// const myTLVs = [
//   { type: 0, value: new TextEncoder().encode("mytag") }, // Required for naddr
//   { type: 1, value: new TextEncoder().encode("wss://relay1.example") },
//   { type: 1, value: new TextEncoder().encode("wss://relay2.example") },
//   { type: 1, value: new TextEncoder().encode("wss://relay3.example") },
//   { type: 2, value: hexToBytes(pub) }, // Helper function
//   { type: 3, value: numToBigEndian(kind) }, // Helper function
// ];

// // Encode as naddr (which allows kind)
// const naddr = encodeTLV("naddr", myTLVs);
// const decoded = decodeNostrBech32(naddr);
// console.log(decoded);
export function encodeTLV(prefix: TLV_PREFIXES, tlvs: TLV[]): string {
  if (!bech32 || !bech32.decode || !bech32.fromWords) {
    throw new Error("bech32 library not properly initialized");
  }

  // Calculate total length needed
  const totalLength = tlvs.reduce((sum, tlv) => sum + 2 + tlv.value.length, 0);

  // Create buffer and write data
  const encodedTLV = new Uint8Array(totalLength);
  let offset = 0;

  tlvs.forEach((tlv) => {
    encodedTLV.set([tlv.type, tlv.value.length], offset);
    encodedTLV.set(tlv.value, offset + 2);
    offset += 2 + tlv.value.length;
  });

  const fiveBitData = bech32.toWords(encodedTLV);
  return bech32.encode(prefix, fiveBitData, Bech32_Encode_Limit);
}

// -------------------------------- DECODING

// -------------------------------- DECODINGS

const Bech32_Decode_Limit = 1000;
/**
 * @returns DecodedNostrURI[] Array of parsed URI objects
 *
 * For errored and unsupported URIs, objects will have:
 * - `type: 'bare-value'`
 * - `result.prefix: 'errored'` or `'unsupported'`
 *
 * Refer to the DecodedNostrURI type definition for complete structure details.
 *
 * @default Uses a 1000 character limit for bech32.decode operations
 */
export function decodeNostrBech32(bech32String: Nostr_Bech32_URI) {
  try {
    const { prefix, words } = bech32.decode(
      bech32String.slice(6),
      Bech32_Decode_Limit,
    );
    switch (prefix) {
      case "npub":
      case "note":
      case "nsec":
        return decodeBareValue(bech32String, prefix, words);
      case "nprofile":
      case "nevent":
      case "naddr":
      case "nrelay":
        return decodeTLV(bech32String, prefix, words);
      default:
        return [
          bech32String,
          "unsupported",
          `prefix "${prefix}" unsupported`,
        ] as UnsupportedPrefix;
    }
  } catch (e) {
    console.error(e);
    console.error("bech32String:", bech32String);
    return [
      bech32String,
      "errored",
      `Error ${e} on bech32.decode(bech32String, ${Bech32_Decode_Limit}) bech32String: '${bech32String}'`,
    ] as ErroredBech32;
  }
}

export function decodeBareValue(
  bech32String: Nostr_Bech32_URI,
  prefix: BARE_VALUE_PREFIXES,
  words: number[],
): DecodedBareValue {
  const hexChars = [];
  for (const intByte of bech32.fromWords(words))
    hexChars.push(intByte.toString(16).padStart(2, "0"));
  const hexStr = hexChars.join("");

  return [bech32String, prefix, hexStr] as DecodedBareValue;
}

// Shared TextDecoder instance
const textDecoder = new TextDecoder("utf-8");

function decodeTLV(
  bech32String: Nostr_Bech32_URI,
  prefix: TLV_PREFIXES,
  words: number[],
): DecodedTypeLenghtValue {
  // Ensure we have a proper Uint8Array
  const rawBytes = bech32.fromWords(words);
  const bytes =
    rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);

  let i = 0;

  let zero: EventId | Pubkey | string | undefined = undefined;
  let one: RelayURL[] | undefined = undefined;
  let two: EventId | Pubkey | undefined = undefined;
  let three: number | undefined = undefined;

  while (i < bytes.length) {
    // Read TLV header
    const type: number = bytes[i++];
    const length: number = bytes[i++];

    // Boundary check
    if (i + length > bytes.length) {
      throw new Error(`Invalid TLV structure at position ${i}`);
    }

    // Extract value bytes safely
    const valueBytes = new Uint8Array(
      bytes.buffer,
      bytes.byteOffset + i,
      length,
    );

    i += length;

    // Process based on type
    switch (type) {
      case 0: // Special (pubkey/event-id/d-tag)
        switch (prefix) {
          case "nevent":
            zero = toHex(valueBytes) as EventId;
            break;
          case "nprofile":
            zero = toHex(valueBytes) as Pubkey;
            break;
          case "naddr":
            zero = textDecoder.decode(valueBytes); // string
            break;
          case "nrelay":
            zero = toHex(valueBytes); // idk
            break;
        }
        break;
      case 1: // Relay (string)
        (one || (one = [])).push(textDecoder.decode(valueBytes) as RelayURL);
        break;
      case 2: // Author (32-byte hex)
        switch (prefix) {
          case "nevent":
          case "naddr":
            two = toHex(valueBytes) as Pubkey;
            // if (valueBytes.length !== 32) {
            //   throw new Error(
            //     `Author pubkey must be 32 bytes, got ${valueBytes.length}`
            //   );
            // }
            break;
        }
        break;
      case 3: // Kind (32-bit number)
        switch (prefix) {
          case "nevent":
          case "naddr":
            // Clone bytes to ensure proper alignment
            const alignedBytes = new Uint8Array(4);
            alignedBytes.set(valueBytes.slice(0, 4)); // Take first 4 bytes
            three = new DataView(alignedBytes.buffer).getUint32(0, false);
            break;
        }
        break;
      default:
        console.warn(`Unknown TLV type ${type}, skipping`);
    }
  }

  return [
    bech32String,
    prefix,
    zero,
    one,
    two,
    three,
  ] as DecodedTypeLenghtValue;
}

//  --------------------------------  HELPER FUNCTIONS (used) --------

export function isSupportedBVPrefix(
  prefix: string,
): prefix is BARE_VALUE_PREFIXES {
  return BARE_VALUE_PREFIXES.includes(prefix);
}

export function isSupportedTLVPrefix(prefix: string): prefix is TLV_PREFIXES {
  return TLV_PREFIXES.includes(prefix);
}

// Convert bytes to hex with type safety
function toHex(bytes: Uint8Array): string {
  if (!(bytes instanceof Uint8Array)) {
    throw new Error("Input must be Uint8Array");
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error("Hex string must have even length");
  }

  const parsedIntegers = [];
  for (const byte of hex.match(/../g)!) parsedIntegers.push(parseInt(byte, 16));
  return new Uint8Array(parsedIntegers);
}

export function numToBigEndian(num: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, num, false); // false = big-endian
  return bytes;
}

//  --------------------------------  EXTRAS (not used yet) --------

export function isStrictHex(str: string, expectedLength?: number): boolean {
  const hex = str.replace(/^0x/, "");
  return (
    /^[0-9a-fA-F]+$/.test(hex) &&
    (expectedLength ? hex.length === expectedLength : true)
  );
}

/**
 * Determines the type of input (normal text, URL, hex, or number)
 */
export function classifyInput(input: string | number): {
  type: "text" | "url" | "hex" | "number";
  value: string | number;
} {
  // 1. Check if it's a number (integer or decimal)
  if (typeof input === "number") {
    return {
      type: "number",
      value: input,
    };
  }

  // Trim whitespace
  const str = input.trim();

  // 2. Check if it's a string of a number (integer or decimal)
  if (!isNaN(Number(str)) && str !== "") {
    return {
      type: "number",
      value: str.includes(".") ? parseFloat(str) : parseInt(str, 10),
    };
  }

  // 3. Check if it's a URL
  try {
    const url = new URL(str);
    if (
      url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "ws:" ||
      url.protocol === "wss:"
    ) {
      return { type: "url", value: str };
    }
  } catch {
    // Ignored intentionally
  }

  // 4. Check if it's a hex string
  const hexRegex = /^(0x)?[0-9a-fA-F]+$/;
  if (hexRegex.test(str)) {
    // Require minimum length for hex strings to avoid false positives
    if (str.length >= 2 && str.replace(/^0x/, "").length % 2 === 0) {
      return { type: "hex", value: str.toLowerCase() };
    }
  }

  // 5. Default to normal text
  return { type: "text", value: str };
}
