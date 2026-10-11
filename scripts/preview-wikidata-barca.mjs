#!/usr/bin/env node
/**
 * Editor-only Wikidata source preview for the Barça category.
 * Run: node scripts/preview-wikidata-barca.mjs > barca-candidates.json
 *
 * This script DOES NOT write to the game DB. P54 may include youth/reserve
 * records and incomplete history. Review all candidates before acceptance.
 */
const endpoint="https://query.wikidata.org/sparql";
const query=[
 "SELECT DISTINCT ?player ?playerLabel WHERE {",
 "  ?player wdt:P54 wd:Q7156 .",
 '  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }',
 "} LIMIT 700"
].join("\n");
const url=new URL(endpoint);
url.searchParams.set("query",query);
url.searchParams.set("format","json");
const response=await fetch(url,{
 headers:{
  "Accept":"application/sparql-results+json",
  "User-Agent":"PartyHubCatalogReview/0.1 (+https://github.com/papimatcoding/party-games-hub)"
 },
 signal:AbortSignal.timeout(45000)
});
if(!response.ok){
 const retry=response.headers.get("retry-after");
 throw Error("Wikidata HTTP "+response.status+(retry?" Retry-After: "+retry:""));
}
const json=await response.json();
const candidates=(json.results?.bindings||[]).map(b=>({
 qid:b.player?.value?.split("/").pop(),
 label:b.playerLabel?.value||"",
 source:b.player?.value
})).filter(e=>/^Q\d+$/.test(e.qid)&&e.label&&!/^Q\d+$/.test(e.label));
process.stdout.write(JSON.stringify({
 source:"Wikidata Query Service / P54 membership at FC Barcelona (Q7156)",
 fetched_at:new Date().toISOString(),
 verified:false,
 warning:"SUGGESTIONS ONLY. First-team status, aliases and Spanish names require human review.",
 count:candidates.length,candidates
},null,2)+"\n");
