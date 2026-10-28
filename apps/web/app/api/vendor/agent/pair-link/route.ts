import { pairingLinkResponse } from "@/lib/agent-pairing";

export async function POST(req: Request) {
  return pairingLinkResponse(req);
}
