export namespace SpecialStrings {
  export type SubId = string;

  export type Hashtag = string & { __brand: "Hashtag" };

  export type HexString = string & { readonly __format: "hex" };

  export type LowerCaseHex = HexString & {
    readonly __case: "lowercase";
  };

  export type LowerCase32BytesHex = LowerCaseHex & {
    readonly __length: 64;
  };

  export type Bech32_String = LowerCaseHex;

  export type Nostr_Bech32 = LowerCaseHex;

  /** the Bech32 string prefixed with 'nostr:' */
  export type Nostr_Bech32_URI = `nostr:${LowerCaseHex}`;

  /**
   * 64 characters, lowercase hex
   */
  export type EventId = {
    // readonly __brand: "nostr_event_id";
  } & LowerCase32BytesHex;
  /**
   * http link for event/post/article address outside nostr
   */
  export type EventAddress = string;

  /**
   * 64 characters, lowercase hex
   */
  export type Pubkey = {
    // readonly __brand: "pubkey";
  } & LowerCase32BytesHex;

  export type Privkey = {
    readonly __brand: "privkey";
  } & LowerCase32BytesHex;

  export type Web_URL = string & { __brand: "Uniform Resource Locator" };

  /**
   * exposed websocket endpoint
   */
  export type RelayURL = Web_URL & { __type: "Websocket Endpoint URL" };

  /**
   * URI normalaized RelayURL
   */
  export type RelayURI = {
    readonly __sub_type: "Websocket Endpoint URI";
  } & RelayURL;

  export type Bolt11Multipliers =
    | "m"
    | "u"
    | "n"
    | "p"
    | "M"
    | "U"
    | "N"
    | "P"
    | "";

  export type bolt11 = `lnbc${number}${Bolt11Multipliers}${1}${string}`;
}
