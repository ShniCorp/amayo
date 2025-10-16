import { createServer } from "node:http";
import { handler } from "./handler";

// Delegador mínimo: todo el ruteo y lógica está en ./handler
export const server = createServer((req, res) => handler(req, res));
