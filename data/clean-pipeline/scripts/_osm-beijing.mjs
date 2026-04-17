import { readFileSync, writeFileSync } from "fs";
const q = `[out:json][timeout:180];
(node(around:5000,39.9042,116.4074)["amenity"~"^(restaurant|cafe|bar|fast_food)$"];)->.food;
(node(around:5000,39.9042,116.4074)["amenity"~"^(hospital|clinic|doctors|pharmacy)$"];)->.health;
(node(around:5000,39.9042,116.4074)["amenity"~"^(school|university|college|library)$"];)->.edu;
(node(around:5000,39.9042,116.4074)["amenity"~"^(theatre|cinema|arts_centre|community_centre)$"];node(around:5000,39.9042,116.4074)["tourism"~"^(museum|gallery)$"];)->.culture;
(node(around:5000,39.9042,116.4074)["amenity"="bicycle_rental"];node(around:5000,39.9042,116.4074)["public_transport"="station"];node(around:5000,39.9042,116.4074)["railway"="station"];node(around:5000,39.9042,116.4074)["railway"="subway_entrance"];)->.transit;
(node(around:5000,39.9042,116.4074)["leisure"~"^(park|garden|playground|sports_centre|fitness_centre)$"];)->.leisure;
out count;.food out count;.health out count;.edu out count;.culture out count;.transit out count;.leisure out count;`;
const file = "data/clean-pipeline/sources/osm/amenities.json";
const EPS = ["https://overpass.private.coffee/api/interpreter","https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"];
for (const ep of EPS) {
  try {
    console.log("try", ep);
    const r = await fetch(ep, { method: "POST", body: q, headers: { "Content-Type": "text/plain" } });
    if (!r.ok) { console.log("HTTP", r.status); await new Promise(x=>setTimeout(x,8000)); continue; }
    const j = await r.json();
    const c = j.elements.filter(e=>e.type==="count").map(e=>Number(e.tags?.nodes ?? e.tags?.total ?? 0));
    const out = { food:c[1]||0, health:c[2]||0, edu:c[3]||0, culture:c[4]||0, transit:c[5]||0, leisure:c[6]||0 };
    console.log("北京", JSON.stringify(out));
    const d = JSON.parse(readFileSync(file, "utf-8"));
    d.counts["北京"] = out; d.generated = new Date().toISOString();
    writeFileSync(file, JSON.stringify(d, null, 2) + "\n");
    console.log("saved");
    process.exit(0);
  } catch(e) { console.log("err", e.message); await new Promise(x=>setTimeout(x,8000)); }
}
console.log("all failed");
process.exit(1);
