import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, wipeAllData } from "@/lib/db";
import { ensureAccountLink, resetSyncAvailability, syncNow } from "@/lib/sync/client";
import { resumePhotoSyncAfterFailedWipe, syncPhotos } from "@/lib/photos/client";

const A = "account-a", B = "account-b";
const ORIGIN = "http://app.test";
const STAMP = 1000;
const tables = ["profile","weightEntries","photoEntries","carnePhotos","syncState","conflicts"];
beforeEach(() => {
  resetSyncAvailability(); resumePhotoSyncAfterFailedWipe();
  const storage = new Map<string,string>();
  vi.stubGlobal("localStorage",{getItem:(key:string)=>storage.get(key)??null,
    setItem:(key:string,value:string)=>storage.set(key,String(value)),removeItem:(key:string)=>storage.delete(key)});
  vi.stubGlobal("location",{origin:ORIGIN});
});
afterEach(() => { resetSyncAvailability(); resumePhotoSyncAfterFailedWipe(); vi.unstubAllGlobals(); });

// Direct shared-DB replacement simulates another tab's independent lifecycle.
// Calling importBackup here would exercise the SAME tab pause and miss the race.
async function replace(owner: string | undefined, opts: {weight?:boolean; photo?:boolean; dirty?:number} = {}) {
  const instance = db();
  await instance.transaction("rw",tables,async()=>{
    for (const name of tables) await instance.table(name).clear();
    if (owner) {
      await instance.syncState.put({key:"default",lastPulledAt:999,accountId:owner});
      await instance.profile.add({id:1,uid:"singleton",city:owner,photoBackup:true,createdAt:1,dirty:0,updatedAt:STAMP});
      if (opts.weight) await instance.weightEntries.add({id:1,uid:"shared-id",date:1,kg:70,dirty:opts.dirty??0,updatedAt:STAMP});
      if (opts.photo) await instance.photoEntries.add({id:1,uid:"shared-photo",week:20,blob:new Blob(["photo"],{type:"image/jpeg"}),createdAt:1});
    }
  });
}
function probe(url: URL) { return url.searchParams.get("since")===String(Number.MAX_SAFE_INTEGER); }
function pullBody(records:unknown[] = []) { return {accountId:A,serverTime:2000,records,nextCursor:null}; }
function delayedBody(value: unknown, mutate: ()=>Promise<void>) {
  const response=Response.json(value);
  const read=response.json.bind(response);
  response.json=async()=>{await mutate();return read();};
  return response;
}

describe("incoming responses cannot write across a different tab's restore or wipe", () => {
  it("does not apply A's valid pull records to B's restored database",async()=>{
    await replace(A);
    vi.stubGlobal("fetch",async(input:string|URL,init?:RequestInit)=>{
      const url=new URL(String(input),ORIGIN);
      if(probe(url)) return Response.json(pullBody());
      expect(new Headers(init?.headers).get("x-mibebe-account")).toBe(A);
      return delayedBody(pullBody([{store:"weightEntries",recordId:"a-only",updatedAt:2000,serverUpdatedAt:2000,
        deletedAt:null,payload:{date:1,kg:60}}]),()=>replace(B));
    });
    expect((await syncNow()).outcome).toBe("account-mismatch");
    expect((await db().profile.toArray())[0]?.city).toBe(B);
    expect(await db().weightEntries.count()).toBe(0);
    expect((await db().syncState.get("default"))?.lastPulledAt).toBe(999);
  });
  it("does not recreate records or an account link after another tab wipes to unbound",async()=>{
    await replace(A);
    vi.stubGlobal("fetch",async(input:string|URL)=>{
      const url=new URL(String(input),ORIGIN);
      if(probe(url)) return Response.json(pullBody());
      return delayedBody(pullBody([{store:"weightEntries",recordId:"a-only",updatedAt:2000,serverUpdatedAt:2000,
        deletedAt:null,payload:{date:1,kg:60}}]),wipeAllData);
    });
    expect((await syncNow()).outcome).toBe("account-mismatch");
    expect(await db().weightEntries.count()).toBe(0);
    expect(await db().profile.count()).toBe(0);
    expect(await db().syncState.get("default")).toBeUndefined();
  });
  it("guards cursor bookkeeping even when the old response has no health rows",async()=>{
    await replace(A);
    vi.stubGlobal("fetch",async(input:string|URL)=>{
      const url=new URL(String(input),ORIGIN);
      return probe(url)?Response.json(pullBody()):delayedBody(pullBody(),()=>replace(B));
    });
    expect((await syncNow()).outcome).toBe("account-mismatch");
    expect(await db().syncState.get("default")).toMatchObject({accountId:B,lastPulledAt:999});
  });
  it("does not mark B's same-id dirty record clean after A's successful push",async()=>{
    await replace(A,{weight:true,dirty:1});
    let pullRequests=0;
    vi.stubGlobal("fetch",async(input:string|URL,init?:RequestInit)=>{
      const url=new URL(String(input),ORIGIN);
      if(probe(url)) return Response.json(pullBody());
      if(init?.method==="POST") return delayedBody({accountId:A,results:[{store:"weightEntries",recordId:"shared-id",outcome:"accepted"}]},()=>replace(B,{weight:true,dirty:1}));
      pullRequests++;return Response.json(pullBody());
    });
    expect((await syncNow()).outcome).toBe("account-mismatch");
    expect((await db().weightEntries.toArray())[0]?.dirty).toBe(1);
    expect(pullRequests).toBe(0);
  });
  it("does not let an old identity probe rebind a wiped device",async()=>{
    await replace(A);
    const fetcher=vi.fn(async()=>delayedBody(pullBody(),()=>replace(undefined)));
    vi.stubGlobal("fetch",fetcher);
    expect((await ensureAccountLink()).status).toBe("mismatch");
    expect(await db().syncState.get("default")).toBeUndefined();
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe("photo responses cannot mark or restore into a replaced database",()=>{
  it("rejects an already downloaded A photo after another tab restores B",async()=>{
    await replace(A);
    vi.stubGlobal("fetch",async(input:string|URL)=>{
      const url=new URL(String(input),ORIGIN);
      if(probe(url)) return Response.json(pullBody());
      if(url.hostname==="bucket.test") {
        await replace(B,{photo:true});
        return new Response(new Blob(["jpeg"],{type:"image/jpeg"}));
      }
      return Response.json({photos:[{store:"photoEntries",recordId:"a-only-photo",contentType:"image/jpeg",bytes:4,
        payload:{week:20,createdAt:1},deletedAt:null,downloadUrl:"https://bucket.test/a-photo"}]});
    });
    expect((await syncPhotos()).outcome).toBe("account-mismatch");
    expect((await db().photoEntries.toArray()).map(row=>row.uid)).toEqual(["shared-photo"]);
    expect(await db().syncState.get("default")).toMatchObject({accountId:B});
  });
  it.each([200,410])("does not apply A's upload/remote-delete marks to B's same numeric id (HTTP %s)",async status=>{
    await replace(A,{photo:true});
    vi.stubGlobal("fetch",async(input:string|URL,init?:RequestInit)=>{
      const url=new URL(String(input),ORIGIN);
      if(probe(url)) return Response.json(pullBody());
      if(url.hostname==="bucket.test") return new Response(null,{status:200});
      if(init?.method!=="POST") return Response.json({photos:[]});
      const body=JSON.parse(String(init.body));
      if(body.action==="upload-url") return Response.json({url:"https://bucket.test/a-upload"});
      if(body.action==="confirm") {await replace(B,{photo:true});return Response.json({}, {status});}
      throw new Error("Unexpected request");
    });
    expect((await syncPhotos()).outcome).toBe("account-mismatch");
    const b=(await db().photoEntries.toArray())[0]!;
    expect(b.uploadedAt).toBeUndefined();expect(b.remoteDeletedAt).toBeUndefined();
    expect((await db().profile.toArray())[0]?.city).toBe(B);
  });
});
