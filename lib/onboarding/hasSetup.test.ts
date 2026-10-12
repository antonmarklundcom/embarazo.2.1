import {describe,expect,it} from "vitest";
import {hasPersonalSetup} from "./hasSetup";
describe("personal setup vs emergency-only profile",()=>{
 it("does not skip setup for a profile containing only an emergency contact",()=>{expect(hasPersonalSetup({createdAt:1,sanatorioName:"Hospital",sanatorioPhone:"+595981111222"})).toBe(false);expect(hasPersonalSetup(null)).toBe(false);});
 it("preserves old profiles, planning and invited companions",()=>{expect(hasPersonalSetup({createdAt:1,department:"Central"})).toBe(true);expect(hasPersonalSetup({createdAt:1,mode:"planeando"})).toBe(true);expect(hasPersonalSetup({createdAt:1,role:"papa"})).toBe(true);});
 it("does not treat deleted setup as active",()=>{expect(hasPersonalSetup({createdAt:1,mode:"embarazada",deletedAt:10})).toBe(false);});
});
