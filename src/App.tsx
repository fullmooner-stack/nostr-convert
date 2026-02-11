import {
  createEffect,
  createSignal,
  For,
  Show,
  type Accessor,
  type JSX,
  type Setter,
} from "solid-js";
import "./App.css";
import {
  decodeNostrBech32,
  encodeString,
  encodeTLV,
  hexToBytes,
  numToBigEndian,
  type TLV,
} from "./nostr-cryptography/nip19-singles-tuples";

const forms = {
  nip5: 'username/"nip5"',
  npub: "npub",
  nprofile: "nprofile",
  nsec: "nsec",
  note: "note",
  nevent: "nevent",
  naddr: "naddr",
  dTag: "dTag",
  hexId: "hexId",
  hexPub: "hexPub",
  hexPriv: "hexPriv",
} as const;

const sources = [
  forms.nip5,
  forms.npub,
  forms.nprofile,
  forms.nsec,
  forms.note,
  forms.nevent,
  forms.naddr,
  forms.dTag,
  forms.hexId,
  forms.hexPub,
  forms.hexPriv,
];

const allValues = "all values";

const targets = [
  allValues,
  forms.npub,
  forms.nprofile,
  forms.nsec,
  forms.note,
  forms.nevent,
  forms.naddr,
  forms.dTag,
  forms.hexId,
  forms.hexPub,
  forms.hexPriv,
];

type NostrIconProps = {
  color?: string;
  style?: JSX.CSSProperties;
};

function NostrIcon(props: NostrIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      style={props.style}
    >
      <path
        fill="none"
        d="M231.2 159.5c0 20.7 0 31.1-3.5 42.2-4.4 12.2-14 21.8-26.2 26.2-11.1 3.5-21.5 3.5-42.2 3.5H96.8c-20.7 0-31.1 0-42.2-3.5-12.2-4.4-21.8-14-26.2-26.2-3.5-11.1-3.5-21.5-3.5-42.2V97c0-20.7 0-31.1 3.5-42.2 4.4-12.2 14-21.8 26.2-26.2 11.2-3.5 21.5-3.5 42.2-3.5h62.5c20.7 0 31.1 0 42.2 3.5 12.2 4.4 21.8 14 26.2 26.2 3.5 11.2 3.5 21.5 3.5 42.2v62.5Z"
      />
      <path
        fill={props.color ?? "#fff"}
        d="M210.8 199.4c0 3.1-2.5 5.7-5.7 5.7h-68c-3.1 0-5.7-2.5-5.7-5.7v-15.5c.3-19 2.3-37.2 6.5-45.5 2.5-5 6.7-7.7 11.5-9.1 9.1-2.7 24.9-.9 31.7-1.2 0 0 20.4.8 20.4-10.7s-9.1-8.6-9.1-8.6c-10 .3-17.7-.4-22.6-2.4-8.3-3.3-8.6-9.2-8.6-11.2-.4-23.1-34.5-25.9-64.5-20.1-32.8 6.2.4 53.3.4 116.1v8.4c0 3.1-2.6 5.6-5.7 5.6H57.7c-3.1 0-5.7-2.5-5.7-5.7v-144c0-3.1 2.5-5.7 5.7-5.7h31.7c3.1 0 5.7 2.5 5.7 5.7 0 4.7 5.2 7.2 9 4.5 11.4-8.2 26-12.5 42.4-12.5 36.6 0 64.4 21.4 64.4 68.7v83.2ZM150 99.3c0-6.7-5.4-12.1-12.1-12.1s-12.1 5.4-12.1 12.1 5.4 12.1 12.1 12.1S150 106 150 99.3Z"
      />
    </svg>
  );
}

function App() {
  const [result, setResult] = createSignal({});
  const [input, setInput] = createSignal("");

  const [loading, setLoading] = createSignal(false);

  const [to, setTo] = createSignal<string>("");
  const [from, setFrom] = createSignal<string>("");

  const [enabledSources] = createSignal(sources);
  const [enabledTargets, setEnabledTargets] = createSignal(targets);

  const [data, setData] = createSignal<{
    [x: string]: string | string[];
  }>({});

  function convert() {
    setResult({});
    const currentinput = input().trim();
    if (currentinput.length === 0) return;
    const currentFrom = from();
    switch (currentFrom) {
      case forms.nip5:
        setLoading(true);
        queryProfile(currentinput)
          .then((data) => data && setResult(data))
          .catch((e) => console.log("failed fetch:", e))
          .finally(() => setLoading(false));
        break;
      case forms.npub:
        {
          setLoading(true);
          const [, , hexPub] = decodeNostrBech32(
            `nostr:${currentinput as any}`,
          );
          switch (to()) {
            case forms.hexPub:
            default:
              setResult({ "Hex Pubkey": hexPub });
              break;
            case forms.nprofile:
              const currentData = data();
              const tlvs = [{ type: 0, value: hexToBytes(hexPub) }];
              for (const relay of currentData?.["relays"] ?? [])
                tlvs.push({
                  type: 1,
                  value: new TextEncoder().encode(relay),
                });
              setResult({
                nprofile: encodeTLV("nprofile", tlvs),
              });
              break;
          }
          setLoading(false);
        }
        break;
      case forms.nprofile:
        {
          setLoading(true);
          const [, , hexPub, relays] = decodeNostrBech32(
            `nostr:${currentinput as any}`,
          );
          switch (to()) {
            case forms.hexPub:
            default:
              setResult({ "Hex Pubkey": hexPub, relays: relays ?? [] });
              break;
            case forms.npub:
              setResult({ npub: encodeString("npub", hexPub) });
              break;
          }
          setLoading(false);
        }
        break;
      case forms.nsec:
        {
          setLoading(true);
          const [, , hexPriv] = decodeNostrBech32(
            `nostr:${currentinput as any}`,
          );
          setResult({ "Hex Ukranian": hexPriv });
          setLoading(false);
        }
        break;
      case forms.note:
        {
          setLoading(true);
          const [, , event_id] = decodeNostrBech32(
            `nostr:${currentinput}` as any,
          );
          switch (to()) {
            case forms.hexPub:
            default:
              setResult({ event_id });
              break;
            case forms.nevent:
              const currentData = data();
              const tlvs: TLV[] = [{ type: 0, value: hexToBytes(event_id) }];
              for (const relay of currentData?.["relays"] ?? [])
                tlvs.push({
                  type: 1,
                  value: new TextEncoder().encode(relay),
                });
              currentData?.["author"] &&
                tlvs.push({
                  type: 2,
                  value: hexToBytes(currentData["author"] as string),
                });
              Number(currentData?.["kind"]) &&
                tlvs.push({
                  type: 3,
                  value: numToBigEndian(Number(currentData["kind"])),
                });
              setResult({ nevent: encodeTLV("nevent", tlvs) });
              break;
          }
          setLoading(false);
        }
        break;
      case forms.nevent:
        {
          setLoading(true);
          const [, , event_id, relays, pubkey, kind] = decodeNostrBech32(
            `nostr:${currentinput}` as any,
          );
          switch (to()) {
            case "note":
              setResult({ note: encodeString("note", event_id) });
              break;
            default:
              setResult({
                event_id,
                relays,
                pubkey,
                kind,
              });
              break;
          }
          setLoading(false);
        }
        break;
      case forms.naddr:
        {
          setLoading(true);
          const [, , dTag, relays, pubkey, kind] = decodeNostrBech32(
            `nostr:${currentinput}` as any,
          );
          setResult({
            dTag,
            relays,
            pubkey,
            kind,
          });
          setLoading(false);
        }
        break;
      case forms.note:
        {
          setLoading(true);
          switch (to()) {
            case forms.hexPub:
            default:
              setResult({ event_id: currentinput });
              break;
            case forms.nevent:
              const currentData = data();
              const tlvs: TLV[] = [
                { type: 0, value: hexToBytes(currentinput) },
              ];
              for (const relay of currentData?.["relays"] ?? [])
                tlvs.push({
                  type: 1,
                  value: new TextEncoder().encode(relay),
                });
              currentData?.["author"] &&
                tlvs.push({
                  type: 2,
                  value: hexToBytes(currentData["author"] as string),
                });
              Number(currentData?.["kind"]) &&
                tlvs.push({
                  type: 3,
                  value: numToBigEndian(Number(currentData["kind"])),
                });
              setResult({ nevent: encodeTLV("nevent", tlvs) });
              break;
          }
          setLoading(false);
        }
        break;
      case forms.hexPub:
        setLoading(true);
        switch (to()) {
          case forms.nprofile:
            setResult({
              nprofile: encodeTLV("nprofile", [
                { type: 0, value: hexToBytes(currentinput) }, // Helper function
                ...(data()?.["relays"] as string[])?.map((r) => ({
                  type: 1,
                  value: new TextEncoder().encode(r),
                })),
              ]),
            });
            break;

          // @ts-ignore
          case forms.npub:
          default:
            setResult({ npub: encodeString("npub", currentinput) });
            break;
        }
        setLoading(false);
        break;
      case forms.hexPriv:
        setLoading(true);
        setResult({ nsec: encodeString("nsec", currentinput) });
        setLoading(false);
        break;

      default:
        console.log('show a popup to select a "from" type');
        break;
    }
  }

  createEffect(() => {
    const currentTo = to();
    setData({});
    setResult({});

    switch (currentTo) {
      case forms.npub:
        break;
      case forms.nprofile:
        switch (from()) {
          case forms.hexPub:
          default:
            setData({ pubkey: input(), relays: [] });
            break;
          case forms.npub:
            {
              const [, , hexPub] = decodeNostrBech32(`nostr:${input()}` as any);
              setData({ pubkey: hexPub, relays: [] });
            }
            break;
          case forms.nprofile:
            {
              const [, , hexPub, relays] = decodeNostrBech32(
                `nostr:${input()}` as any,
              );
              setData({ pubkey: hexPub, relays: relays ?? [] });
            }
            break;
        }
        break;
      case forms.nevent:
        switch (from()) {
          case forms.hexId:
          default:
            {
              setData({
                event_id: input(),
                relays: [],
                pubkey: "",
                kind: "",
              });
            }
            break;
          case forms.note:
            {
              const [, , event_id] = decodeNostrBech32(
                `nostr:${input()}` as any,
              );
              setData({
                event_id: event_id,
                relays: [],
                pubkey: "",
                kind: "",
              });
            }
            break;
          case forms.nevent:
            {
              const [, , event_id, relays, pubkey, kind] = decodeNostrBech32(
                `nostr:${input()}` as any,
              );
              setData({
                event_id: event_id,
                relays: relays ?? [],
                pubkey: pubkey ?? "",
                kind: `${kind ?? ""}`,
              });
            }
            break;
        }
        break;
      case forms.naddr:
        setData({
          dTag: input(),
          relays: [],
          pubkey: "",
          kind: "",
        });
        break;
      case forms.nsec:
        break;
      case forms.nip5:
        break;
      case forms.hexPub:
        break;
      case forms.hexPriv:
        break;

      default:
        break;
    }
  });

  createEffect(() => {
    const currentFrom = from();
    setResult({});

    switch (currentFrom) {
      case forms.nip5:
        setEnabledTargets([
          forms.npub,
          forms.nprofile,
          forms.hexPub,
          allValues,
        ]);
        setTo(allValues);
        break;
      case forms.npub:
        setEnabledTargets([forms.nprofile, forms.hexPub]);
        setTo(forms.hexPub);
        break;
      case forms.nprofile:
        setEnabledTargets([forms.npub, forms.hexPub, allValues]);
        setTo(allValues);
        break;
      case forms.nsec:
        setEnabledTargets([forms.hexPriv]);
        setTo(forms.hexPriv);
        break;
      case forms.note:
        setEnabledTargets([forms.nevent, forms.hexId]);
        setTo(forms.hexId);
        break;
      case forms.nevent:
        setEnabledTargets([forms.note, forms.hexId, allValues]);
        setTo(allValues);
        break;
      case forms.naddr:
        setEnabledTargets([forms.dTag, allValues]);
        setTo(allValues);
        break;
      case forms.dTag:
        setEnabledTargets([forms.naddr]);
        setTo(forms.naddr);
        break;
      case forms.hexId:
        setEnabledTargets([forms.note, forms.nevent]);
        break;
      case forms.hexPub:
        setEnabledTargets([forms.npub, forms.nprofile]);
        break;
      case forms.hexPriv:
        setEnabledTargets([forms.nsec]);
        setTo(forms.hexPriv);
        break;

      default:
        setEnabledTargets(targets);
        input().length === 0 && setTo("");
        break;
    }
  });

  // createEffect(() => {
  //   const currentinput = input();
  //   if (currentinput.length === 0) {
  //     if (enabledTargets().length < 6)
  //       batch(() => (setFrom(""), setEnabledTargets(sources)));
  //   } else // if (whatsOn().length === 0)
  //   {
  //     // if (currentinput.length === 0)
  //     batch(() => {
  //       setEnabledTargets(sources);
  //       if (currentinput.length > -1) {
  //         if (currentinput.indexOf("@") > -1)
  //           (setEnabledTargets([forms.nip5]), setFrom(forms.nip5));
  //         else {
  //           if (currentinput === "+")
  //             (setEnabledTargets([forms.nip5]), setFrom(forms.nip5));
  //           else if (Number(currentinput))
  //             setEnabledTargets([forms.nip5, forms.hexPub, forms.hexPriv]);
  //           else if (startsWithOrSubset(currentinput, forms.npub))
  //             setEnabledTargets([
  //               forms.npub,
  //               forms.nip5,
  //               forms.hexPub,
  //               forms.hexPriv,
  //             ]);
  //           else if (startsWithOrSubset(currentinput, forms.nprofile))
  //             setEnabledTargets([
  //               forms.nprofile,
  //               forms.nip5,
  //               forms.hexPub,
  //               forms.hexPriv,
  //             ]);
  //           else if (startsWithOrSubset(currentinput, forms.nsec))
  //             setEnabledTargets([
  //               forms.nsec,
  //               forms.nip5,
  //               forms.hexPub,
  //               forms.hexPriv,
  //             ]);
  //         }
  //       }
  //     });
  //   }
  // });

  return (
    <div
      style={{
        "max-width": "36rem",
        // width: "90%",
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          gap: "1.5rem",
          "margin-bottom": "2rem",
        }}
      >
        <NostrIcon style={{ width: "5rem", height: "5rem" }} />
        <h1
          style={{
            margin: "0",
            "font-size": "2.5rem",
            "font-weight": "700",
            background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
            "-webkit-background-clip": "text",
            "-webkit-text-fill-color": "transparent",
            "letter-spacing": "0.05em",
          }}
        >
          NOSTR CONVERT
        </h1>
      </div>
      <div
        style={{
          // width: "90%",
          padding: "2rem",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          "border-radius": "16px",
          "box-shadow":
            "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <h2
          style={{
            margin: "0 0 1rem 0",
            "font-size": "1.25rem",
            color: "#e2e8f0",
            "font-weight": "600",
          }}
          innerText={"From"}
        />
        <form id="convert" onSubmit={(e) => (e.preventDefault(), convert())} />
        <input
          style={{
            width: "90%",
            padding: "0.75rem 1rem",
            "font-size": "1rem",
            background: "#0f172a",
            border: "2px solid #334155",
            "border-radius": "8px",
            color: "#e2e8f0",
            "margin-bottom": "1.5rem",
            transition: "all 0.2s ease",
            outline: "none",
          }}
          type="text"
          value={input()}
          onInput={(e) => setInput(e.target.value)}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#8b5cf6";
            e.currentTarget.style.boxShadow =
              "0 0 0 3px rgba(139, 92, 246, 0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#334155";
            e.currentTarget.style.boxShadow = "none";
          }}
          placeholder="Enter nostr data..."
        />

        <Show
          when={Object.keys(data()).length > 0}
          children={
            <div
              style={{ "margin-bottom": "1.5rem" }}
              children={
                <EditableObject
                  object={data()}
                  onChange={(key, value) =>
                    setData({ ...data(), [key]: value })
                  }
                />
              }
            />
          }
        />

        <div
          style={{ "margin-bottom": "1.5rem" }}
          children={
            <LoginSwitches
              switches={sources}
              whatsOn={from}
              setWhatsOn={setFrom}
              enabledTargets={enabledSources}
            />
          }
        />
        <button
          form="convert"
          disabled={loading()}
          style={{
            width: "100%",
            padding: "0.875rem 1.5rem",
            "font-size": "1.125rem",
            "font-weight": "600",
            background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
            color: "#fff",
            border: "none",
            "border-radius": "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            "box-shadow": "0 4px 6px rgba(139, 92, 246, 0.3)",
            "margin-bottom": "2rem",
            display: "flex",
            "align-items": "center",
            "justify-content": "center",
            gap: "0.5rem",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 6px 12px rgba(139, 92, 246, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 6px rgba(139, 92, 246, 0.3)";
          }}
          children={
            <Show when={loading()} children={<>⏳</>} fallback={<>Convert</>} />
          }
        />
        <h2
          style={{
            margin: "0 0 1rem 0",
            "font-size": "1.25rem",
            color: "#e2e8f0",
            "font-weight": "600",
          }}
          innerText={"To"}
        />
        <div
          style={{ "margin-bottom": "2rem" }}
          children={
            <LoginSwitches
              switches={enabledTargets()}
              whatsOn={to}
              setWhatsOn={setTo}
              enabledTargets={() => targets}
            />
          }
        />
        <h2
          style={{
            margin: "0 0 1rem 0",
            "font-size": "1.25rem",
            color: "#e2e8f0",
            "font-weight": "600",
          }}
          innerText={"Result"}
        />
        <DisplayObject object={result()} />
      </div>
    </div>
  );
}

type DisplayObjectProps = {
  object: { [x: string]: string | string[] };
};

function DisplayObject(props: DisplayObjectProps) {
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "0.75rem",
        padding: "1.5rem",
        "min-height": "3rem",
        background: "linear-gradient(135deg, #deb887 0%, #d2a679 100%)",
        "border-radius": "12px",
        "box-shadow":
          "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
      }}
    >
      <For each={Object.keys(props.object)}>
        {(key) => (
          <div
            ref={(el) => {
              el.style.opacity = "0";
              el.style.transition = "opacity 0.3s ease-in";
              queueMicrotask(() => {
                el.style.opacity = "1";
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              });
            }}
            style={{
              display: "flex",
              "border-style": "solid",
              "border-width": "2px",
              "border-color": "#2c2c2c",
              "border-radius": "6px",
              overflow: "hidden",
              background: "#fff",
              "box-shadow": "0 2px 4px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div
              innerText={key}
              style={{
                "min-width": "max-content",
                padding: "0.75rem 1rem",
                background: "#2c2c2c",
                color: "#fff",
                "font-weight": "600",
                "font-size": "0.9rem",
                "letter-spacing": "0.025em",
              }}
            />
            <div
              style={{
                position: "relative",
                padding: "0.75rem 1rem",
                "text-wrap": "wrap",
                "word-break": "break-word",
                flex: "1",
                color: "#2c2c2c",
                "line-height": "1.5",
              }}
            >
              <div innerText={props.object[key] as any} />
            </div>
            <button
              onClick={() => console.log(`${props.object[key]} copied!`)}
              style={{
                width: "2rem",
                height: "2rem",
                display: "flex",
                "align-items": "center",
                "justify-content": "center",
                background: "#3a3a3a",
                border: "1px solid #4a4a4a",
                "border-radius": "4px",
                cursor: "pointer",
                "font-size": "1rem",
                margin: "0 auto 0.5rem auto",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#e8e8e8";
                e.currentTarget.style.borderColor = "#a0a0a0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f5f5f5";
                e.currentTarget.style.borderColor = "#d0d0d0";
              }}
            >
              📋
            </button>
          </div>
        )}
      </For>
    </div>
  );
}

type EditableObjectProps = {
  object: { [x: string]: string | string[] };
  onChange: (key: string, value: string | string[]) => void;
};

function EditableObject(props: EditableObjectProps) {
  return (
    <div
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "0.75rem",
        padding: "1.5rem",
        "min-height": "3rem",
        background: "linear-gradient(135deg, #deb887 0%, #d2a679 100%)",
        "border-radius": "12px",
        "box-shadow":
          "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
      }}
    >
      <For each={Object.keys(props.object)}>
        {(key) => (
          <div
            ref={(el) => {
              el.style.opacity = "0";
              el.style.transition = "opacity 0.3s ease-in";
              queueMicrotask(() => {
                el.style.opacity = "1";
                el.scrollIntoView({ behavior: "smooth", block: "end" });
              });
            }}
            style={{
              display: "flex",
              "border-style": "solid",
              "border-width": "2px",
              "border-color": "#2c2c2c",
              "border-radius": "6px",
              overflow: "hidden",
              background: "#fff",
              "box-shadow": "0 2px 4px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div
              innerText={key}
              style={{
                "min-width": "max-content",
                padding: "0.75rem 1rem",
                background: "#2c2c2c",
                color: "#fff",
                "font-weight": "600",
                "font-size": "0.9rem",
                "letter-spacing": "0.025em",
              }}
            />
            <div
              style={{
                position: "relative",
                padding: "0.75rem 1rem",
                flex: "1",
              }}
            >
              <textarea
                value={props.object[key] as any}
                onInput={(e) => {
                  props.onChange(key, e.currentTarget.value);
                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height =
                    e.currentTarget.scrollHeight + "px";
                }}
                ref={(el) =>
                  queueMicrotask(() => {
                    el.style.height = "auto";
                    el.style.height = el.scrollHeight + "px";
                  })
                }
                style={{
                  width: "100%",
                  "min-height": "2.5rem",
                  padding: "0.5rem",
                  border: "1px solid #d0d0d0",
                  "border-radius": "4px",
                  "font-family": "inherit",
                  "font-size": "1rem",
                  color: "#2c2c2c",
                  "line-height": "1.5",
                  resize: "none",
                  overflow: "hidden",
                  background: "#fafafa",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "#2c2c2c";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 2px rgba(44, 44, 44, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = "#fafafa";
                  e.currentTarget.style.borderColor = "#d0d0d0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

export default App;

type LoginSwitchesProps = {
  switches: string[];
  whatsOn: Accessor<string>;
  setWhatsOn: Setter<string>;
  enabledTargets: Accessor<string[]>;
};

function LoginSwitches(props: LoginSwitchesProps) {
  return (
    <div
      style={{
        display: "flex",
        "flex-wrap": "wrap",
        "justify-content": "flex-start",
        gap: "0.3rem",

        // "padding-top": "calc(var(--spacing) * 3)",
      }}
    >
      <For each={props.switches}>
        {(sw) => (
          <LabeledToggle
            name={sw}
            whatsOn={props.whatsOn}
            setWhatsOn={props.setWhatsOn}
            enabled={props.enabledTargets().includes(sw)}
          />
        )}
      </For>
    </div>
    //         <LabeledToggle
    //           name="blank"
    //           whatsOn={() => ""}
    //           setWhatsOn={() => {}}
    //           style={{ opacity: 0, "z-index": -1 }}
    //           enabled={false}
    //         />
  );
}

type LabeledToggle = {
  name: string;
  whatsOn: Accessor<string>;
  setWhatsOn: Setter<string>;
  enabled: boolean;
  style?: JSX.CSSProperties;
};

function LabeledToggle(props: LabeledToggle) {
  return (
    <div
      style={
        props.style || {
          display: "flex",
          "flex-direction": "column",
          "align-items": "center",
          width: "70px",
        }
      }
    >
      <label
        style={{
          position: "relative",
          display: "inline-block",
          width: "60px",
          height: "30px",
          opacity: props.enabled ? "1" : "0.6",
        }}
      >
        <input
          type="checkbox"
          style={{ opacity: 0, width: 0, height: 0 }}
          checked={props.whatsOn() === props.name}
          onChange={() =>
            props.setWhatsOn((p) => (p === props.name ? "" : props.name))
          }
          disabled={!props.enabled}
        />
        <span
          style={{
            position: "absolute",
            cursor: props.enabled ? "pointer" : "not-allowed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            "background-color": props.enabled
              ? props.whatsOn() === props.name
                ? // ? "rgb(var(--main-accent))"
                  "green"
                : "#ccc"
              : "#e0e0e0",
            transition: "0.4s",
            "border-radius": "30px",
          }}
        >
          <span
            style={{
              position: "absolute",
              height: "22px",
              width: "22px",
              left: "4px",
              bottom: "4px",
              "background-color": props.enabled ? "white" : "#f5f5f5",
              transition: "0.4s",
              "border-radius": "50%",
              transform:
                props.whatsOn() === props.name
                  ? "translateX(30px)"
                  : "translateX(0)",
            }}
          />
        </span>
      </label>
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          "align-items": "center",
          opacity: props.enabled ? "1" : "0.6",
        }}
      >
        <For each={props.name.split("/")}>
          {(token) => <span>{token}</span>}
        </For>
      </div>
    </div>
  );
}

// function startsWithOrSubset(str: string, prefix: string) {
//   // Check if the string starts with the prefix
//   if (str.startsWith(prefix)) {
//     return true;
//   }

//   // Check for subsets
//   const prefixLength = prefix.length;
//   for (let i = 0; i <= str.length - prefixLength; i++) {
//     if (str.substring(i, i + prefixLength) === prefix) {
//       return true;
//     }
//   }

//   return false;
// }

export type Nip05 = `${string}@${string}`;

/**
 * NIP-05 regex. The localpart is optional, and should be assumed to be `_` otherwise.
 *
 * - 0: full match
 * - 1: name (optional)
 * - 2: domain
 */
export const NIP05_REGEX = /^(?:([\w.+-]+)@)?([\w_-]+(\.[\w_-]+)+)$/;
export const isNip05 = (value?: string | null): value is Nip05 =>
  NIP05_REGEX.test(value || "");

export type ProfilePointer = {
  pubkey: string; // hex
  relays?: string[];
};

export async function queryProfile(
  fullname: string,
): Promise<ProfilePointer | null> {
  const match = fullname.match(NIP05_REGEX);
  if (!match) return null;

  const [, name = "_", domain] = match;

  try {
    const url = `https://${domain}/.well-known/nostr.json?name=${name}`;
    const res = await fetch(url, { redirect: "manual" });
    if (res.status !== 200) {
      throw Error("Wrong response code");
    }
    const json = await res.json();

    const pubkey = json.names[name];

    return pubkey ? { pubkey, relays: json.relays?.[pubkey] ?? [] } : null;
  } catch (_e) {
    return null;
  }
}
