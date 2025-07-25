import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/PopertyProtection_backend/PopertyProtection_backend.did.js";
import { canisterId } from "../../../declarations/PopertyProtection_backend/index.js";

const agent = new HttpAgent({
  host: "http://127.0.0.1:4943",
});

// Fetch root key only in development
if (process.env.NODE_ENV !== "production") {
  try {
    agent.fetchRootKey();
  } catch (err) {
    console.warn("Unable to fetch root key. Check if your local replica is running");
    console.error(err);
  }
}

export const backend = Actor.createActor(idlFactory, {
  agent,
  canisterId,
});

export { agent };