import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const DEM_PATH = 'data/bathymetry/etopo-2022-crop.json';
const OUT = 'public/bathymetry/etopo-2022';
const MIN_ZOOM = 7;
const MAX_ZOOM = 8;
const DEPTHS = [20, 50, 100, 200, 500];
const dem = JSON.parse(fs.readFileSync(DEM_PATH, 'utf8'));
if (!dem.width || !dem.height || !Array.isArray(dem.values) || dem.values.length !== dem.width * dem.height) throw new Error('Invalid bathymetry DEM text input');
const unique = new Set(dem.values.map((v) => Math.round(v))).size;
if (unique < 10 || !dem.values.some((v) => v < 0) || !dem.values.some((v) => v >= 0)) throw new Error('DEM must contain varied real land/sea values');
const b = dem.bounds;
const lon2x=(lon,z)=>Math.floor(((lon+180)/360)*2**z);
const lat2y=(lat,z)=>Math.floor((1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*2**z);
const tileBounds=(x,y,z)=>{const n=2**z; const west=x/n*360-180; const east=(x+1)/n*360-180; const north=Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI; const south=Math.atan(Math.sinh(Math.PI*(1-2*(y+1)/n)))*180/Math.PI; return {west,east,north,south};};
function sample(lon, lat) { const gx=(lon-b.west)/(b.east-b.west)*(dem.width-1); const gy=(b.north-lat)/(b.north-b.south)*(dem.height-1); const x=Math.max(0,Math.min(dem.width-1,gx)); const y=Math.max(0,Math.min(dem.height-1,gy)); const x0=Math.floor(x), y0=Math.floor(y), x1=Math.min(dem.width-1,x0+1), y1=Math.min(dem.height-1,y0+1); const dx=x-x0, dy=y-y0; const v=(xx,yy)=>dem.values[yy*dem.width+xx]; return v(x0,y0)*(1-dx)*(1-dy)+v(x1,y0)*dx*(1-dy)+v(x0,y1)*(1-dx)*dy+v(x1,y1)*dx*dy; }
function terrainRgb(v){ const n=Math.round((v+10000)*10); return [(n>>16)&255,(n>>8)&255,n&255,255]; }
function color(v){ if (v>=0) return [180,166,130,55]; const d=-v; if(d<20)return [191,244,255,180]; if(d<50)return [109,215,243,195]; if(d<100)return [45,169,225,210]; if(d<200)return [20,121,201,225]; if(d<500)return [15,79,159,235]; return [8,39,95,245]; }
fs.rmSync(path.join(OUT,'terrain'),{recursive:true,force:true}); fs.rmSync(path.join(OUT,'color'),{recursive:true,force:true}); fs.mkdirSync(OUT,{recursive:true});
const checksums={}; const tiles=[];
for(let z=MIN_ZOOM;z<=MAX_ZOOM;z++){ for(let x=lon2x(b.west,z);x<=lon2x(b.east,z);x++){ for(let y=lat2y(b.north,z);y<=lat2y(b.south,z);y++){ const tb=tileBounds(x,y,z); for (const kind of ['terrain','color']) { const png=new PNG({width:256,height:256}); for(let py=0;py<256;py++)for(let px=0;px<256;px++){ const lon=tb.west+(px+0.5)/256*(tb.east-tb.west); const lat=tb.north-(py+0.5)/256*(tb.north-tb.south); const rgba=kind==='terrain'?terrainRgb(sample(lon,lat)):color(sample(lon,lat)); const i=(py*256+px)*4; png.data[i]=rgba[0]; png.data[i+1]=rgba[1]; png.data[i+2]=rgba[2]; png.data[i+3]=rgba[3]; } const file=path.join(OUT,kind,String(z),String(x),`${y}.png`); fs.mkdirSync(path.dirname(file),{recursive:true}); const buf=PNG.sync.write(png); fs.writeFileSync(file,buf); checksums[file]=crypto.createHash('sha256').update(buf).digest('hex'); } tiles.push({z,x,y}); } } }
const features=[]; for (const depth of DEPTHS) { const elev=-depth; const coords=[]; for(let row=0;row<dem.height;row++){ const lat=b.north-row/(dem.height-1)*(b.north-b.south); let start=null; for(let col=0;col<dem.width;col++){ const lon=b.west+col/(dem.width-1)*(b.east-b.west); const v=dem.values[row*dem.width+col]; if(v<=elev){ if(!start) start=[lon,lat]; } else if(start){ if(lon-start[0]>0.03) coords.push([start,[lon,lat]]); start=null; } } if(start) coords.push([start,[b.east,lat]]); } for (const c of coords.slice(0,30)) features.push({type:'Feature',properties:{depth,source:'ETOPO 2022 DEM generated'},geometry:{type:'LineString',coordinates:c}}); }
fs.writeFileSync(path.join(OUT,'contours.geojson'), JSON.stringify({type:'FeatureCollection',features},null,2)); checksums[path.join(OUT,'contours.geojson')]=crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT,'contours.geojson'))).digest('hex');
const meta={dataset:dem.dataset,doi:dem.doi,sourceUrl:dem.sourceUrl,license:dem.license,citation:dem.citation,accessDate:dem.accessDate,sourceResolution:'60 arc-second',cropBounds:b,width:dem.width,height:dem.height,cellSizeDegrees:dem.cellSizeDegrees,nodata:dem.nodata,sourceSha256:dem.sourceSha256,cropSha256:dem.cropSha256,generatedZoomRange:{min:MIN_ZOOM,max:MAX_ZOOM},tileSize:256,tileCount:tiles.length,tiles,depthStopsMeters:[0,20,50,100,200,500],generationCommand:'node scripts/generate-bathymetry-assets.mjs',checksums,navigationWarning:'Reference only; not for navigation or safety decisions.'};
fs.writeFileSync(path.join(OUT,'metadata.json'), JSON.stringify(meta,null,2));
console.log(`Generated ${tiles.length} bathymetry XYZ tiles from ${DEM_PATH}`);
