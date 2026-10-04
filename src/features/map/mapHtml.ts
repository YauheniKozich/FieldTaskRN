import { MAP_TILE_URL } from '../../config/app';
import { ru } from '../../localization/ru';
import { Task } from '../../types';
import {
  LEAFLET_CSS,
  LEAFLET_JS,
  MARKER_ICON,
  MARKER_ICON_2X,
  MARKER_SHADOW,
} from '../../assets/leafletInline';

export type MapTask = Task & { latitude: number; longitude: number };

export function mapHtml(tasks: MapTask[]): string {
  const serialized = JSON.stringify(
    tasks.map(task => ({
      id: task.id,
      title: task.title,
      address: task.location,
      lat: task.latitude,
      lon: task.longitude,
    })),
  )
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e');
  const buttonLabel = JSON.stringify(ru.map.openTask);

  return `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https://tile.openstreetmap.de; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>${LEAFLET_CSS}
html,body,#map{height:100%;margin:0;font-family:system-ui,sans-serif}
.leaflet-control-zoom{border:0!important;border-radius:12px!important;overflow:hidden;box-shadow:0 2px 8px #0002!important}
.leaflet-control-zoom a{color:#245DF5!important}
</style>
<script>window.onerror=function(){window.ReactNativeWebView.postMessage('map_error')}</script>
</head><body><div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>
const tasks=${serialized};
const taskIcon=L.icon({iconUrl:${JSON.stringify(MARKER_ICON)},iconRetinaUrl:${JSON.stringify(MARKER_ICON_2X)},shadowUrl:${JSON.stringify(MARKER_SHADOW)},iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],shadowSize:[41,41]});
const map=L.map('map').setView([tasks[0].lat,tasks[0].lon],12);
const tiles=L.tileLayer('${MAP_TILE_URL}',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
tiles.on('tileerror',()=>window.ReactNativeWebView.postMessage('tile_error'));
tiles.on('tileload',()=>window.ReactNativeWebView.postMessage('tile_loaded'));
const bounds=[];
tasks.forEach(t=>{
  const marker=L.marker([t.lat,t.lon],{icon:taskIcon}).addTo(map);
  marker.on('click',()=>window.ReactNativeWebView.postMessage('select:'+t.id));
  const popup=document.createElement('div');
  const title=document.createElement('b');title.textContent=t.title;
  const address=document.createElement('div');address.textContent=t.address;
  const button=document.createElement('button');button.type='button';button.textContent=${buttonLabel};
  button.addEventListener('click',()=>window.ReactNativeWebView.postMessage('open:'+t.id));
  popup.append(title,document.createElement('br'),address,document.createElement('br'),button);
  marker.bindPopup(popup);bounds.push([t.lat,t.lon]);
});
if(bounds.length>1)map.fitBounds(bounds,{padding:[36,36]});
window.ReactNativeWebView.postMessage('map_ready');
</script></body></html>`;
}
