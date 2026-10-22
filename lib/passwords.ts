import "server-only";
import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
const N = 131072;
async function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      64,
      { N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, result) => (error ? reject(error) : resolve(result)),
    ),
  );
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${N}$8$1$${salt.toString("hex")}$${(await derive(password, salt)).toString("hex")}`;
}
const dummyHash = `scrypt$${N}$8$1$${"0".repeat(32)}$${"0".repeat(128)}`;
export async function verifyPassword(password: string, encoded = dummyHash) {
  const [algorithm, n, r, p, salt, hash] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    Number(n) !== N ||
    r !== "8" ||
    p !== "1" ||
    !/^[a-f0-9]{32}$/.test(salt ?? "") ||
    !/^[a-f0-9]{128}$/.test(hash ?? "")
  )
    return false;
  return timingSafeEqual(
    await derive(password, Buffer.from(salt, "hex")),
    Buffer.from(hash, "hex"),
  );
}
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newSessionToken = () => randomBytes(32).toString("base64url");
