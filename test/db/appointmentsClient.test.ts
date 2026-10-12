import {beforeEach,expect,it,vi} from "vitest";
import {db} from "@/lib/db";
const remote=vi.hoisted(()=>({reminders:vi.fn(),publish:vi.fn()}));
vi.mock("@/lib/push/client",()=>({refreshReminders:remote.reminders}));
vi.mock("@/lib/sharing/client",()=>({publishCompanionSnapshot:remote.publish}));
import {saveNextAppointment} from "@/lib/appointments.client";
beforeEach(()=>{
  vi.clearAllMocks();
  remote.reminders.mockImplementation(()=>new Promise<void>(()=>{}));
  remote.publish.mockImplementation(()=>new Promise<boolean>(()=>{}));
});
it("a local control finishes saving even while worker setup and remote publication never finish",async()=>{
  const id=await db().profile.add({createdAt:1,mode:"embarazada"});
  const next=Date.UTC(2026,9,13,9);
  await expect(saveNextAppointment(next)).resolves.toBeUndefined();
  expect((await db().profile.get(id))?.nextAppointment).toBe(next);
  expect(remote.reminders).toHaveBeenCalled();
  expect(remote.publish).toHaveBeenCalled();
},3000);