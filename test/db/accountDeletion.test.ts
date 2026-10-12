import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { deleteSignedInAccount } from "@/lib/sync/accountDeletion";
import { resetSyncAvailability } from "@/lib/sync/client";
import { resumePhotoSyncAfterFailedWipe } from "@/lib/photos/client";

beforeEach(async () => {
  resetSyncAvailability(); resumePhotoSyncAfterFailedWipe();
  const values=new Map<string,string>();
  vi.stubGlobal("localStorage", {getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});
  await db().profile.add({city:"Original",createdAt:1});
  await db().syncState.put({key:"default",lastPulledAt:0,accountId:"owner"});
});
afterEach(() => { resetSyncAvailability(); resumePhotoSyncAfterFailedWipe(); vi.unstubAllGlobals(); });
function session(fetchState:()=>unknown) { vi.stubGlobal("fetch", async ()=>Response.json(fetchState())); }

describe("account deletion completes before local cleanup",()=>{
  it("calls the cloud operation while original data and access are intact, then wipes",async()=>{
    let signedIn=true;
    localStorage.setItem("mibebe.auth.offline.v1","existing-access");
    session(()=>({signedIn,accountId:signedIn?"owner":null}));
    const result=await deleteSignedInAccount(async id=>{
      expect(id).toBe("owner");
      expect(await db().profile.count()).toBe(1);
      expect(localStorage.getItem("mibebe.auth.offline.v1")).toBe("existing-access");
      signedIn=false; return {deleted:true};
    },true);
    expect(result).toEqual({deviceWiped:true,cleanupFailed:false});
    expect(await db().profile.count()).toBe(0);
    expect(localStorage.getItem("mibebe.auth.offline.v1")).toBeNull();
  });
  it("preserves records and access if cloud deletion fails",async()=>{
    localStorage.setItem("mibebe.auth.offline.v1","keep");
    session(()=>({signedIn:true,accountId:"owner"}));
    await expect(deleteSignedInAccount(async()=>({error:"Try again"}),true)).rejects.toThrow("Try again");
    expect(await db().profile.count()).toBe(1);
    expect(localStorage.getItem("mibebe.auth.offline.v1")).toBe("keep");
  });
  it("never calls deletion for a session that does not own local data",async()=>{
    session(()=>({signedIn:true,accountId:"other"})); const remove=vi.fn();
    await expect(deleteSignedInAccount(remove,true)).rejects.toThrow("cambió");
    expect(remove).not.toHaveBeenCalled(); expect(await db().profile.count()).toBe(1);
  });
  it("retains data when sign-out cannot be confirmed after cloud success",async()=>{
    session(()=>({signedIn:true,accountId:"owner"}));
    expect(await deleteSignedInAccount(async()=>({deleted:true}),true)).toEqual({deviceWiped:false,cleanupFailed:true});
    expect(await db().profile.count()).toBe(1);
  });
  it("can keep the phone records with access revoked after cloud success",async()=>{
    let signedIn=true; session(()=>({signedIn,accountId:signedIn?"owner":null}));
    const result=await deleteSignedInAccount(async()=>{signedIn=false;return {deleted:true};},false);
    expect(result).toEqual({deviceWiped:false,cleanupFailed:false});
    expect(await db().profile.count()).toBe(1);
    expect((await db().syncState.get("default"))?.accountId).toBe("owner");
  });
  it("does not erase another tab's newly restored account after deleting the original",async()=>{
    let signedIn=true; session(()=>({signedIn,accountId:signedIn?"owner":null}));
    const result=await deleteSignedInAccount(async()=>{
      await db().syncState.put({key:"default",lastPulledAt:0,accountId:"other"});
      const profile=await db().profile.toArray(); await db().profile.update(profile[0]!.id!,{city:"Other account"});
      signedIn=false; return {deleted:true};
    },true);
    expect(result.cleanupFailed).toBe(true);
    expect((await db().profile.toArray())[0]?.city).toBe("Other account");
    expect((await db().syncState.get("default"))?.accountId).toBe("other");
  });
  it("reports cleanup failure honestly if the final status request is offline",async()=>{
    let calls=0;vi.stubGlobal("fetch",async()=>{if(calls++)throw new TypeError("offline");return Response.json({signedIn:true,accountId:"owner"});});
    expect(await deleteSignedInAccount(async()=>({deleted:true}),true)).toEqual({deviceWiped:false,cleanupFailed:true});
    expect(await db().profile.count()).toBe(1);
  });
});
