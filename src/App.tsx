import { createEffect, createSignal, For, Match, Show, Switch } from "solid-js";
import type { Accessor, JSX, Setter } from "solid-js";
import "./App.css";
import {
  decodeNostrBech32,
  encodeString,
  encodeTLV,
  hexToBytes,
  nip19_entry_REGEX,
  numToBigEndian,
  type TLV,
} from "./nostr-cryptography/nip19-inTuples";

function NostrSvg(inner = "#fff", outer = "#7c3aed") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
      <path
        fill=${outer}
        d="M231.2 159.5c0 20.7 0 31.1-3.5 42.2-4.4 12.2-14 21.8-26.2 26.2-11.1 3.5-21.5 3.5-42.2 3.5H96.8c-20.7 0-31.1 0-42.2-3.5-12.2-4.4-21.8-14-26.2-26.2-3.5-11.1-3.5-21.5-3.5-42.2V97c0-20.7 0-31.1 3.5-42.2 4.4-12.2 14-21.8 26.2-26.2 11.2-3.5 21.5-3.5 42.2-3.5h62.5c20.7 0 31.1 0 42.2 3.5 12.2 4.4 21.8 14 26.2 26.2 3.5 11.2 3.5 21.5 3.5 42.2v62.5Z"
      />
      <path
        fill=${inner}
        d="M210.8 199.4c0 3.1-2.5 5.7-5.7 5.7h-68c-3.1 0-5.7-2.5-5.7-5.7v-15.5c.3-19 2.3-37.2 6.5-45.5 2.5-5 6.7-7.7 11.5-9.1 9.1-2.7 24.9-.9 31.7-1.2 0 0 20.4.8 20.4-10.7s-9.1-8.6-9.1-8.6c-10 .3-17.7-.4-22.6-2.4-8.3-3.3-8.6-9.2-8.6-11.2-.4-23.1-34.5-25.9-64.5-20.1-32.8 6.2.4 53.3.4 116.1v8.4c0 3.1-2.6 5.6-5.7 5.6H57.7c-3.1 0-5.7-2.5-5.7-5.7v-144c0-3.1 2.5-5.7 5.7-5.7h31.7c3.1 0 5.7 2.5 5.7 5.7 0 4.7 5.2 7.2 9 4.5 11.4-8.2 26-12.5 42.4-12.5 36.6 0 64.4 21.4 64.4 68.7v83.2ZM150 99.3c0-6.7-5.4-12.1-12.1-12.1s-12.1 5.4-12.1 12.1 5.4 12.1 12.1 12.1S150 106 150 99.3Z"
      />
    </svg>`;
}

function svgStringToImageUrl(
  svgString: string,
  width = 256,
  height = 256,
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary container
      const container = document.createElement("div");
      container.innerHTML = svgString;
      const svgElement = container.firstChild as SVGElement;

      // Set dimensions
      svgElement.setAttribute("width", width.toString());
      svgElement.setAttribute("height", height.toString());

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Serialize SVG
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      // Create image and draw to canvas
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            URL.revokeObjectURL(url);
            resolve(blobUrl);
          } else {
            reject(new Error("Failed to create blob"));
          }
        }, "image/png");
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load SVG image"));
      };

      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
}
type SVGAttributes = {
  [key: string]: string | number;
} & Partial<{
  // Common attributes
  id: string;
  class: string;
  fill: string;
  stroke: string;
  "stroke-width": string | number;
  transform: string;
  // Text attributes
  "font-size": string | number;
  "font-weight": string;
  "font-family": string;
  "letter-spacing": string | number;
  "text-anchor": string;
  "dominant-baseline": string;
  // Circle attributes
  cx: string | number;
  cy: string | number;
  r: string | number;
  // Path attributes
  d: string;
  // textPath attributes
  href: string;
  startOffset: string;
}>;

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

if ("registerProtocolHandler" in navigator)
  navigator.registerProtocolHandler("web+nostr", "/?uri=%s");

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
const qrcode = "QR code";

const targets = [
  allValues,
  qrcode,
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

import jsQR from "jsqr";
import QRCodeStyling, { type Options } from "qr-code-styling";

let video: HTMLVideoElement | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let scanning = false;

async function startQRScanner2(onSuccess: (data: string) => void) {
  // Create video element
  video = document.createElement("video");
  video.setAttribute("playsinline", "true"); // Important for iOS

  // Create canvas for processing
  canvas = document.createElement("canvas");
  ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  // Get camera stream
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, // Use back camera
    });

    video.srcObject = stream;
    await video.play();

    document.getElementById("hello")!.append(video);

    // Optional: show video preview to user
    // document.getElementById("video-container")?.appendChild(video);

    scanning = true;
    scan(onSuccess, stream);
  } catch (error) {
    console.error("Camera access denied:", error);
    throw error;
  }
}

function scan(onSuccess: (data: string) => void, stream: MediaStream) {
  if (!scanning || !video || !canvas || !ctx) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    // Downscale for performance
    const scale = 1; // 40% of original size
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      console.log("QR Code found:", code.data);
      stopQRScanner(stream);
      onSuccess(code.data);
      return; // Stop scanning
    }
  }

  // Scan at 10 FPS instead of 60
  setTimeout(() => requestAnimationFrame(() => scan(onSuccess, stream)), 100);
}

function stopQRScanner(stream: MediaStream) {
  scanning = false;

  // Stop camera
  stream.getTracks().forEach((track) => track.stop());

  // Clean up
  if (video) {
    video.srcObject = null;
    video.remove();
    video = null;
  }
  if (canvas) {
    canvas.remove();
    canvas = null;
  }
  ctx = null;
}

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
  // const params = new URLSearchParams(window.location.search);
  // const uri = params.get("uri");
  // console.log(uri);

  const [result, setResult] = createSignal({});
  const [input, setInput] = createSignal(
    "npub1z2c8x4cqmuafe4evud2lnp8g6l7h06vr6f6nxen3sweergsttjjs6gq2jj",
  );

  const [loading, setLoading] = createSignal(false);

  const [from, setFrom] = createSignal<string>(forms.npub);
  const [to, setTo] = createSignal<string>("");
  queueMicrotask(() => setTo(qrcode));

  const [enabledSources, setEnabledSources] = createSignal(sources);
  const [enabledTargets, setEnabledTargets] = createSignal(targets);

  const [data, setData] = createSignal<{
    [x: string]: string | string[];
  }>({});

  async function convert() {
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
              setLoading(false);
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
              setLoading(false);
              break;
            case qrcode:
              // generateQR(currentinput)
              // generateQRWithLogo(currentinput, "./public/nostr_48.png")

              // generateQRWithLogo_circular2(
              //   currentinput,
              //   "./public/nostr_512.png",
              // )
              //   .then((qr) => {
              //     setResult({ QR: `qr:${qr}` });
              //     qrCode_scan_test(qr);
              //   })
              //   .catch((e) =>
              //     console.log(
              //       "stuff catched at generateQRWithLogo_circular2(...)",
              //       e,
              //     ),
              //   )
              //   .finally(() => setLoading(false));

              const createSVGEl = <K extends keyof SVGElementTagNameMap>(
                tag: K,
                attrs: SVGAttributes,
              ): SVGElementTagNameMap[K] => {
                const el = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  tag,
                );
                for (const key in attrs)
                  el.setAttribute(key, String(attrs[key as any]));
                return el;
              };

              const image = await svgStringToImageUrl(
                NostrSvg("#a855f7", "#221e58"),
                // NostrSvg("#fff", "#fff"),
                512,
                512,
              );

              const qrCode = new QRCodeStyling({
                data: `web+nostr:${currentinput}`,
                // image: "./public/nostr_512.png",
                image,
                width: 300,
                height: 300,
                type: "svg",
                qrOptions: {
                  errorCorrectionLevel: "H",
                },
                shape: "circle",
                dotsOptions: {
                  gradient: {
                    type: "linear",
                    rotation: 0.785, // 45 degrees
                    colorStops: [
                      {
                        offset: 0,
                        color: "#1e1b4b",
                        // "#8b6ad8"
                      },
                      {
                        offset: 1,
                        color: "#312e81",
                        // "#f0aacd"
                      },
                    ],
                  },
                  type: "dots",
                },
                cornersSquareOptions: {
                  type: "dot",
                  gradient: {
                    type: "linear",
                    rotation: 0,
                    colorStops: [
                      {
                        offset: 0,
                        color: "#1e1b4b",
                        // "#7c3aed"
                      },
                      {
                        offset: 1,
                        color: "#312e81",
                        // "#a855f7"
                      },
                    ],
                  },
                },
                cornersDotOptions: {
                  gradient: {
                    type: "radial",
                    colorStops: [
                      {
                        offset: 0,
                        color: "#1e1b4b",
                        // "#f472b6"
                      },
                      {
                        offset: 1,
                        color: "#312e81",
                        // "#ec4899"
                      },
                    ],
                  },
                  type: "dot",
                },
                imageOptions: {
                  crossOrigin: "anonymous",
                },
                backgroundOptions: {
                  gradient: {
                    type: "radial",
                    colorStops: [
                      { offset: 0, color: "#8b6ad8" },
                      { offset: 0.5, color: "#f0aacd" },
                      {
                        offset: 1,
                        color: "#8b6ad8",
                        // "#4c1d95"
                      },
                    ],
                  },
                  round: 1,
                },
              });

              const extension = (svg: SVGElement, options: Options) => {
                const width = options.width!;
                const innerBorderWidth = 5;
                const outerBorderWidth = 40;
                const borderWidth = innerBorderWidth + outerBorderWidth;
                const newSize = width + borderWidth * 2;

                svg.setAttribute("width", String(newSize));
                svg.setAttribute("height", String(newSize));
                svg.setAttribute("viewBox", `0 0 ${newSize} ${newSize}`);

                const g = createSVGEl("g", {
                  transform: `translate(${borderWidth}, ${borderWidth})`,
                });

                while (svg.firstChild) {
                  g.appendChild(svg.firstChild);
                }
                svg.appendChild(g);

                const defs = createSVGEl("defs", {});

                // Outer border gradient
                const outerGradient = createSVGEl("linearGradient", {
                  id: "outerBorderGradient",
                  x1: "0%",
                  y1: "0%",
                  x2: "100%",
                  y2: "100%",
                });
                const outerStop1 = createSVGEl("stop", {
                  offset: "0%",
                  "stop-color": "#a855f7",
                });
                const outerStop2 = createSVGEl("stop", {
                  offset: "50%",
                  "stop-color": "#ec4899",
                });
                const outerStop3 = createSVGEl("stop", {
                  offset: "100%",
                  "stop-color": "#f472b6",
                });
                outerGradient.appendChild(outerStop1);
                outerGradient.appendChild(outerStop2);
                outerGradient.appendChild(outerStop3);

                // Inner border gradient
                const innerGradient = createSVGEl("linearGradient", {
                  id: "innerBorderGradient",
                  x1: "0%",
                  y1: "0%",
                  x2: "100%",
                  y2: "100%",
                });
                const innerStop1 = createSVGEl("stop", {
                  offset: "0%",
                  "stop-color": "#8b5cf6",
                });
                const innerStop2 = createSVGEl("stop", {
                  offset: "100%",
                  "stop-color": "#a855f7",
                });
                innerGradient.appendChild(innerStop1);
                innerGradient.appendChild(innerStop2);

                // Bottom text path (existing)
                const textRadius = width / 2 + outerBorderWidth / 2;
                const bottomTextPath = createSVGEl("path", {
                  id: "bottomCirclePath",
                  d: `M ${newSize / 2 - textRadius}, ${newSize / 2} A ${textRadius} ${textRadius} 0 0 0 ${newSize / 2 + textRadius} ${newSize / 2}`,
                  fill: "none",
                });

                // Top text path
                const topTextPath = createSVGEl("path", {
                  id: "topCirclePath",
                  d: `M ${newSize / 2 - textRadius}, ${newSize / 2} A ${textRadius} ${textRadius} 0 0 1 ${newSize / 2 + textRadius} ${newSize / 2}`,
                  fill: "none",
                });

                defs.appendChild(bottomTextPath);
                defs.appendChild(topTextPath);
                svg.appendChild(defs);

                // Outer border with gradient
                const outerBorder = createSVGEl("circle", {
                  cx: String(newSize / 2),
                  cy: String(newSize / 2),
                  r: String(width / 2 + outerBorderWidth / 2),
                  fill: "none",
                  // stroke: "url(#outerBorderGradient)",
                  stroke: "#a855f7",
                  "stroke-width": String(outerBorderWidth),
                });

                // Inner border with gradient
                const innerBorder = createSVGEl("circle", {
                  cx: String(newSize / 2),
                  cy: String(newSize / 2),
                  r: String(width / 2 + innerBorderWidth / 2),
                  fill: "none",
                  // stroke: "url(#innerBorderGradient)",
                  stroke: "#1e1b4b",
                  "stroke-width": String(innerBorderWidth),
                });

                // Text with gradient
                const textGradient = createSVGEl("linearGradient", {
                  id: "textGradient",
                  x1: "0%",
                  y1: "0%",
                  x2: "100%",
                  y2: "0%",
                });

                const textStop1 = createSVGEl("stop", {
                  offset: "0%",
                  "stop-color": "#1e1b4b",
                });
                const textStop2 = createSVGEl("stop", {
                  offset: "50%",
                  "stop-color": "#4c1d95",
                });
                const textStop3 = createSVGEl("stop", {
                  offset: "100%",
                  "stop-color": "#312e81",
                });
                textGradient.appendChild(textStop1);
                textGradient.appendChild(textStop2);
                textGradient.appendChild(textStop3);
                defs.appendChild(textGradient);

                // Bottom text (existing)
                const bottomText = createSVGEl("text", {
                  fill: "url(#textGradient)",
                  "font-size": "20",
                  "font-weight": "900",
                  "font-family":
                    "system-ui, Avenir, Helvetica, Arial, sans-serif",
                  "letter-spacing": "3",
                });

                const bottomTextPathElement = createSVGEl("textPath", {
                  href: "#bottomCirclePath",
                  startOffset: "50%",
                  "text-anchor": "middle",
                  "dominant-baseline": "central",
                });
                bottomTextPathElement.textContent =
                  "NOSTR • DECENTRALIZED • UNSTOPPABLE";
                bottomText.appendChild(bottomTextPathElement);

                // Top text (new)
                const topText = createSVGEl("text", {
                  fill: "url(#textGradient)",
                  "font-size": "20",
                  "font-weight": "900",
                  "font-family":
                    "system-ui, Avenir, Helvetica, Arial, sans-serif",
                  "letter-spacing": "3",
                });

                const topTextPathElement = createSVGEl("textPath", {
                  href: "#topCirclePath",
                  startOffset: "50%",
                  "text-anchor": "middle",
                  "dominant-baseline": "central",
                });
                topTextPathElement.textContent = "SCAN ME • JOIN THE PROTOCOL";
                topText.appendChild(topTextPathElement);

                svg.appendChild(outerBorder);
                svg.appendChild(innerBorder);
                svg.appendChild(bottomText);
                svg.appendChild(topText);
              };
              qrCode.applyExtension(extension);
              setResult({ [qrcode]: qrCode });
              setLoading(false);

              break;
          }
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
        if (from() === "")
          setEnabledSources([forms.hexPub, forms.nprofile, forms.nip5]);
        break;
      case forms.nprofile:
        if (from() === "")
          setEnabledSources([
            forms.hexPub,
            forms.npub,
            forms.nprofile,
            forms.nip5,
          ]);
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
      case forms.note:
        if (from() === "") setEnabledSources([forms.hexId, forms.nevent]);
        break;
      case forms.nevent:
        if (from() === "")
          setEnabledSources([forms.hexId, forms.note, forms.nevent]);
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
        if (from() === "") setEnabledSources([forms.naddr, forms.dTag]);
        setData({
          dTag: input(),
          relays: [],
          pubkey: "",
          kind: "",
        });
        break;
      case forms.dTag:
        if (from() === "") setEnabledSources([forms.naddr]);
        break;
      case forms.nsec:
        if (from() === "") setEnabledSources([forms.hexPriv]);
        break;
      case forms.hexId:
        if (from() === "") setEnabledSources([forms.note, forms.nevent]);
        break;
      case forms.hexPub:
        if (from() === "")
          setEnabledSources([forms.npub, forms.nprofile, forms.nip5]);
        break;
      case forms.hexPriv:
        if (from() === "") setEnabledSources([forms.nsec]);
        break;

      default:
        setEnabledSources(sources);
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
        setEnabledTargets([forms.nprofile, forms.hexPub, qrcode]);
        setTo(forms.hexPub);
        break;
      case forms.nprofile:
        setEnabledTargets([
          forms.npub,
          forms.hexPub,
          forms.nprofile,
          allValues,
        ]);
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
        setEnabledTargets([forms.note, forms.hexId, forms.nevent, allValues]);
        setTo(allValues);
        break;
      case forms.naddr:
        setEnabledTargets([forms.dTag, forms.naddr, allValues]);
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
        setTo(forms.nsec);
        break;

      default:
        setEnabledTargets(targets);
        input().length === 0 && setTo("");
        break;
    }
  });

  createEffect(() => {
    const currentinput = input();
    if (currentinput.match(nip19_entry_REGEX)?.input) {
    }
    // currentinput.in
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

  const [showMenu, setShowMenu] = createSignal(false);

  return (
    <div
      style={{
        "max-width": "36rem",
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
        {/* <img src="./public/nostr_48.png" /> */}
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
          padding: "2rem",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          "border-radius": "16px",
          "box-shadow":
            "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
        id="hello"
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
        <button
          style={{
            display: "flex",
            width: "100%",
            padding: "0 0 0 0.75rem",
            "font-size": "1rem",
            background: "#0f172a",
            border: "2px solid #334155",
            "border-radius": "8px",
            color: "#e2e8f0",
            "margin-bottom": "1.5rem",
            transition: "all 0.2s ease",
            outline: "none",
          }}
          children={
            <>
              <input
                style={{
                  "flex-grow": 1,
                  background: "transparent",
                  "border-color": "transparent",
                  outline: "none",
                }}
                type="text"
                value={input()}
                onInput={(e) => setInput(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.parentElement!.style.borderColor = "#8b5cf6";
                  e.currentTarget.parentElement!.style.boxShadow =
                    "0 0 0 3px rgba(139, 92, 246, 0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.parentElement!.style.borderColor = "#334155";
                  e.currentTarget.parentElement!.style.boxShadow = "none";
                }}
                placeholder="Enter nostr data..."
              />
              <div
                role="button"
                style={{
                  position: "relative",
                  width: "2.25rem",
                  height: "2.25rem",
                  display: "flex",
                  "align-items": "center",
                  "justify-content": "center",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  "border-radius": "6px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "font-size": "1.2rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#334155";
                  e.currentTarget.style.borderColor = "#8b5cf6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#1e293b";
                  e.currentTarget.style.borderColor = "#334155";
                }}
                onClick={() => {
                  if (setShowMenu((p) => !p)) {
                    const escKey = (e: KeyboardEvent) =>
                      e.key === "Escape" && clllean();
                    const outsideClick = () => clllean();
                    document.addEventListener("keydown", escKey, {
                      once: true,
                    });
                    document.addEventListener("click", outsideClick, {
                      once: true,
                    });
                    function clllean() {
                      document.removeEventListener("keydown", escKey);
                      document.removeEventListener("click", outsideClick);
                      setShowMenu(false);
                    }
                  }
                }}
                children={
                  <>
                    📷
                    <Show when={showMenu()}>
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          width: "max-content",
                          background: "#1e293b",
                          border: "1px solid #334155",
                          "border-radius": "6px",
                          overflow: "hidden",
                          "box-shadow": "0 4px 6px rgba(0, 0, 0, 0.3)",
                          "z-index": "10",
                        }}
                        children={
                          <>
                            <label
                              style={{
                                display: "block",
                                width: "100%",
                                padding: "0.75rem 1rem",
                                background: "transparent",
                                border: "none",
                                "text-align": "left",
                                cursor: "pointer",
                                color: "#e2e8f0",
                                transition: "background 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#334155";
                                e.currentTarget.style.borderColor = "#8b5cf6";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#1e293b";
                                e.currentTarget.style.borderColor = "#334155";
                              }}
                              innerText="📂 Upload Image"
                              children={
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    // Load image
                                    const img = new Image();
                                    img.src = URL.createObjectURL(file);

                                    img.onload = () => {
                                      // Draw to canvas to get pixel data
                                      const canvas =
                                        document.createElement("canvas");
                                      const ctx = canvas.getContext("2d")!;
                                      canvas.width = img.width;
                                      canvas.height = img.height;
                                      ctx.drawImage(img, 0, 0);

                                      // Get image data
                                      const imageData = ctx.getImageData(
                                        0,
                                        0,
                                        canvas.width,
                                        canvas.height,
                                      );

                                      // Decode QR code
                                      const code = jsQR(
                                        imageData.data,
                                        imageData.width,
                                        imageData.height,
                                      );

                                      if (code) {
                                        console.log(
                                          "QR Code content:",
                                          code.data.split(":")?.[1] ??
                                            code.data,
                                        );
                                        setInput(
                                          code.data.split(":")?.[1] ??
                                            code.data,
                                        );
                                      } else {
                                        console.log("No QR code found");
                                      }

                                      URL.revokeObjectURL(img.src);
                                      canvas.remove();
                                    };
                                  }}
                                />
                              }
                            />
                            <button
                              onClick={async () => {
                                setLoading(true);

                                // Usage:
                                startQRScanner2((data) => {
                                  console.log("Scanned:", data);
                                  setInput(data);
                                  setLoading(false);
                                });
                              }}
                              style={{
                                display: "block",
                                width: "100%",
                                padding: "0.75rem 1rem",
                                background: "transparent",
                                border: "none",
                                "text-align": "left",
                                cursor: "pointer",
                                color: "#e2e8f0",
                                transition: "background 0.2s",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.background = "#334155")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.background =
                                  "transparent")
                              }
                              innerText="📸 Use Camera"
                            />
                          </>
                        }
                      />{" "}
                    </Show>
                  </>
                }
              />
            </>
          }
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
  object: {
    [x: string]: string | string[] | QRCodeStyling;
  };
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
              children={
                <Switch
                  children={
                    <>
                      <Match
                        when={key === qrcode}
                        children={
                          <div
                            ref={(el) => {
                              (props.object[qrcode] as QRCodeStyling).append(
                                el,
                              );
                              const svg = el.querySelector("svg")!;
                              svg.style.width = "100%";
                              svg.style.height = "auto";
                            }}
                          />
                        }
                      />
                      <Match
                        when={true}
                        children={<div innerText={props.object[key] as any} />}
                      />
                    </>
                  }
                />
              }
            />
            <button
              onClick={() => console.log(`${props.object[key]} copied!`)}
              style={{
                width: "2rem",
                "z-index": 5,
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
              innerText="📋"
            />
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
