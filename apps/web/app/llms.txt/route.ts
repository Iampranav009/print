export const runtime = "edge";

export function GET() {
  const body = `# HIMMER

> HIMMER is a software-first print platform that connects customers to local xerox and print shops via QR code, without proprietary hardware.

## How it works

1. Customer scans a QR sticker at a HIMMER-connected shop.
2. Opens a lightweight web app — no install required.
3. Uploads a document (PDF, DOCX, PPTX, or images).
4. Chooses print options and sees a locked final price.
5. Pays via UPI (Cashfree).
6. Receives a 4-digit release code on their phone.
7. Enters the code at the shop — document prints automatically.

## Key pages

- / — Marketing homepage
- /login — Customer sign-in
- /app/print — Start a print job
- /app/nearby — Find connected shops
- /vendor/login — Shop partner sign-in
- /privacy — Privacy policy
- /terms — Terms of service

## Contact

support@himmer.in
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
