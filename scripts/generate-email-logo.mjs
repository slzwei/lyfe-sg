import { ImageResponse } from "next/og.js";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const fontData = readFileSync(
  join(process.cwd(), "src/lib/fonts/Pacifico-Regular.ttf")
);

const response = new ImageResponse(
  {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        width: 120,
        height: 50,
      },
      children: {
        type: "span",
        props: {
          style: {
            fontFamily: "Pacifico",
            fontSize: 32,
            color: "#f97316",
            letterSpacing: 1,
          },
          children: "Lyfe",
        },
      },
    },
  },
  {
    width: 120,
    height: 50,
    fonts: [
      {
        name: "Pacifico",
        data: fontData,
        style: "normal",
      },
    ],
  }
);

const buffer = Buffer.from(await response.arrayBuffer());
writeFileSync(join(process.cwd(), "public/email-logo.png"), buffer);
console.log("Generated public/email-logo.png");
