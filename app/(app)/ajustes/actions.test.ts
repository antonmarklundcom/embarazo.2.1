import { beforeEach,describe,expect,it,vi } from "vitest";
vi.mock("@/lib/server/auth",()=>({getSession:vi.fn(),isAuthAvailable:vi.fn(()=>true),signOut:vi.fn()}));
vi.mock("@/lib/server/db",()=>({dbOrNull:vi.fn(()=>({}))}));
vi.mock("@/lib/server/account",()=>({deleteAccountData:vi.fn(),drizzleAccountExecutor:vi.fn(()=>({}))}));
import {getSession,isAuthAvailable,signOut} from "@/lib/server/auth";
import {deleteAccountData} from "@/lib/server/account";
import {deleteAccountAction} from "./actions";
beforeEach(()=>{vi.clearAllMocks();vi.mocked(getSession).mockResolvedValue({user:{id:"owner"},expires:""});vi.mocked(isAuthAvailable).mockReturnValue(true);vi.mocked(signOut).mockResolvedValue(undefined as never);});
function form(owner="owner",confirm="borrar"){const f=new FormData();f.set("confirm",confirm);f.set("expectedAccountId",owner);return f;}
describe("authenticated account deletion action",()=>{
 it("deletes only the session's confirmed owner, ends the session, returns acknowledgement",async()=>{
  expect(await deleteAccountAction({},form())).toEqual({deleted:true});expect(deleteAccountData).toHaveBeenCalledWith({},"owner");expect(signOut).toHaveBeenCalledWith({redirect:false});
 });
 it("refuses stale or other-account confirmation",async()=>{expect((await deleteAccountAction({},form("other"))).error).toContain("cambió");expect(deleteAccountData).not.toHaveBeenCalled();expect(signOut).not.toHaveBeenCalled();});
 it("requires explicit confirmation",async()=>{expect((await deleteAccountAction({},form("owner","no"))).error).toBeTruthy();expect(deleteAccountData).not.toHaveBeenCalled();});
 it("keeps acknowledged deletion distinct from a cookie-clear failure",async()=>{vi.mocked(signOut).mockRejectedValueOnce(new Error("cookie failed"));expect(await deleteAccountAction({},form())).toEqual({deleted:true});});
 it("does not sign out or claim completion if server deletion fails",async()=>{vi.mocked(deleteAccountData).mockRejectedValueOnce(new Error("storage failure"));await expect(deleteAccountAction({},form())).rejects.toThrow();expect(signOut).not.toHaveBeenCalled();});
});
