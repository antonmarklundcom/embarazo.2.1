# Research prompt for Gemini — dengue / chikungunya / zika data sources in Paraguay

Copy everything below the line into Gemini (Deep Research mode if available).

---

I am building a free pregnancy app for Paraguay and want to show pregnant
women a **seasonal arbovirus alert by department** (dengue, chikungunya,
zika). I need to know whether this can be automated from official data, or
whether someone has to update it by hand. Please research and report, with
links to every source you cite:

1. **Official sources.** Where does the Ministerio de Salud Pública y
   Bienestar Social (MSPBS) and its Dirección General de Vigilancia de la
   Salud (DGVS) publish arbovirus surveillance? List every URL: the weekly
   boletín epidemiológico, any dashboard, any open-data portal (datos.gov.py
   or similar), any PAHO/OPS PLISA page covering Paraguay by department.
2. **Format and cadence.** For each source: is it PDF, HTML, Excel, CSV, JSON
   or an API? How often is it updated? Does it break the numbers down by
   department (Asunción plus the 17 departamentos)? Does it report
   notified cases, confirmed cases, hospitalisations, deaths, and an alert
   level or "situación epidemiológica" label?
3. **Stability.** Have the URL patterns been stable over the last two to
   three years, or do they change every season? Show two or three example
   URLs from different weeks or years.
4. **Automation feasibility.** Given the formats, is it realistic to fetch the
   latest bulletin automatically and extract "cases by department this week"
   with a script (including PDF table extraction)? What would break?
5. **Seasonality.** What months are the high-transmission season in Paraguay
   in recent years, and does MSPBS publish an official season start or alert
   declaration each year (for example "alerta epidemiológica" or
   "epidemia declarada")?
6. **Pregnancy-specific guidance.** Does MSPBS or OPS publish guidance for
   pregnant women on dengue, chikungunya and zika in Paraguay? Link the
   documents; I need them for a medical reviewer.
7. **Terms of use.** Any licence or reuse restriction on the data or the
   bulletins?

Output: a table of sources (name, URL, format, cadence, by-department yes/no,
stability), then a short recommendation: "automatable weekly", "automatable
with manual approval", or "manual only", with reasoning. Be explicit about
anything you could not verify.
