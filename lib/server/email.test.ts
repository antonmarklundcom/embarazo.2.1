import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isEmailConfigured, sendPasswordResetEmail, sendVerificationEmail } from "./email";

const recipient = "test@example.com";
const account = "a".repeat(32);
const credentialUrl = "https://app.example.com/confirmar?token=unit-test-token&next=cuenta";
const configNames = ["EMAIL_PROVIDER", "RESEND_API_KEY", "RESEND_FROM_EMAIL", "CLOUDFLARE_EMAIL_ACCOUNT_ID", "CLOUDFLARE_EMAIL_API_TOKEN", "CLOUDFLARE_EMAIL_FROM"] as const;
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  for (const name of configNames) vi.stubEnv(name, "");
  fetchMock.mockReset(); vi.stubGlobal("fetch",fetchMock);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function cloudflare() {
  vi.stubEnv("EMAIL_PROVIDER","cloudflare");
  vi.stubEnv("CLOUDFLARE_EMAIL_ACCOUNT_ID",account);
  vi.stubEnv("CLOUDFLARE_EMAIL_API_TOKEN","unit-test-key");
  vi.stubEnv("CLOUDFLARE_EMAIL_FROM","no-reply@example.com");
}
function response(result: unknown, success = true, errors: unknown = []) {
  return new Response(JSON.stringify({success,errors,result}),{status:200,headers:{"content-type":"application/json"}});
}
function accepted(bucket: "delivered" | "queued" = "delivered") {
  return response({delivered:bucket==="delivered"?[recipient]:[],queued:bucket==="queued"?[recipient]:[],permanent_bounces:[]});
}

describe("transactional email configuration", () => {
  it("stays unavailable and does not send when no provider is configured", async () => {
    expect(isEmailConfigured()).toBe(false);
    await sendPasswordResetEmail(recipient,credentialUrl);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("preserves Resend as the default, its named sender and recipient array", async () => {
    vi.stubEnv("RESEND_API_KEY","resend-unit-key");
    vi.stubEnv("RESEND_FROM_EMAIL","sender@example.com");
    fetchMock.mockResolvedValue(new Response("{}",{status:200}));
    expect(isEmailConfigured()).toBe(true);
    await sendPasswordResetEmail(recipient,credentialUrl);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    const payload = JSON.parse(String(options?.body));
    expect(payload.to).toEqual([recipient]);
    expect(payload.from).toMatch(/<sender@example.com>$/);
    expect(payload.text).toContain(credentialUrl);
    expect(payload.html).toContain("&amp;next=cuenta");
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
  it.each(["invalid", "cloudflare"])("does not fall back to Resend when explicitly selected provider %s is unavailable", async provider => {
    vi.stubEnv("RESEND_API_KEY","resend-unit-key");
    vi.stubEnv("EMAIL_PROVIDER",provider);
    expect(isEmailConfigured()).toBe(false);
    await sendVerificationEmail(recipient,credentialUrl);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["../another-account", "https://other.example", "abc", "a".repeat(33), "z".repeat(32)])("rejects invalid Cloudflare account ids before a network request: %s", async id => {
    cloudflare(); vi.stubEnv("CLOUDFLARE_EMAIL_ACCOUNT_ID",id);
    expect(isEmailConfigured()).toBe(false);
    await sendVerificationEmail(recipient,credentialUrl);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each(["Name <sender@example.com>", "sender@example.com\nBcc:other@example.com", "bad-address"])("requires a plain Cloudflare sender: %s", async from => {
    cloudflare(); vi.stubEnv("CLOUDFLARE_EMAIL_FROM",from);
    expect(isEmailConfigured()).toBe(false);
    await sendVerificationEmail(recipient,credentialUrl);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Cloudflare REST delivery", () => {
  it.each(["delivered","queued"] as const)("accepts %s and uses the documented endpoint/shape", async bucket => {
    cloudflare(); fetchMock.mockResolvedValue(accepted(bucket));
    await sendVerificationEmail(recipient,credentialUrl);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.cloudflare.com/client/v4/accounts/"+account+"/email/sending/send");
    expect(options?.method).toBe("POST");
    expect(options?.headers).toEqual({Authorization:"Bearer unit-test-key","Content-Type":"application/json"});
    expect(JSON.parse(String(options?.body))).toMatchObject({from:"no-reply@example.com",to:recipient});
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });
  it("matches the intended recipient case-insensitively", async () => {
    cloudflare(); fetchMock.mockResolvedValue(response({delivered:[recipient.toUpperCase()],queued:[],permanent_bounces:[]}));
    await expect(sendVerificationEmail(recipient,credentialUrl)).resolves.toBeUndefined();
  });
  it.each([
    {delivered:[],queued:[],permanent_bounces:[recipient]},
    {delivered:[recipient],queued:[],permanent_bounces:[recipient]},
    {delivered:["someone-else@example.com"],queued:[],permanent_bounces:[]},
    {delivered:[],queued:[],permanent_bounces:[]},
    {delivered:[recipient],queued:[],permanent_bounces:"malformed"},
    null,
  ])("rejects a bounce, different recipient or malformed delivery result without retrying", async result => {
    cloudflare(); fetchMock.mockResolvedValue(response(result));
    await expect(sendPasswordResetEmail(recipient,credentialUrl)).rejects.toThrow("Email provider did not accept delivery.");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("rejects success:false and non-empty errors even with delivered recipients", async () => {
    cloudflare();
    fetchMock.mockResolvedValueOnce(response({delivered:[recipient],queued:[],permanent_bounces:[]},false));
    await expect(sendVerificationEmail(recipient,credentialUrl)).rejects.toThrow("did not accept");
    fetchMock.mockResolvedValueOnce(response({delivered:[recipient],queued:[],permanent_bounces:[]},true,[{message:credentialUrl}]));
    await expect(sendVerificationEmail(recipient,credentialUrl)).rejects.toThrow("did not accept");
  });
  it("does not put provider error bodies or reset credentials in exceptions", async () => {
    cloudflare(); fetchMock.mockResolvedValue(new Response(credentialUrl,{status:403}));
    await expect(sendVerificationEmail(recipient,credentialUrl)).rejects.toThrow("Email provider rejected the message (HTTP 403).");
  });
  it("does not put parse or network errors with sensitive data in exceptions", async () => {
    cloudflare(); fetchMock.mockResolvedValueOnce(new Response(credentialUrl,{status:200}));
    await expect(sendVerificationEmail(recipient,credentialUrl)).rejects.toThrow("Email provider returned an invalid delivery response.");
    fetchMock.mockRejectedValueOnce(new Error("private:"+credentialUrl+recipient));
    await expect(sendVerificationEmail(recipient,credentialUrl)).rejects.toThrow("Email transport unavailable.");
  });
});
