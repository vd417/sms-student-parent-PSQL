import type { BusMapStop } from './BusMap.types';

export type LiveMapState = {
  lat: number | null;
  lng: number | null;
  busNo: string;
  studentStop: BusMapStop | null;
  stops: BusMapStop[];
  myLat: number | null;
  myLng: number | null;
};

export function liveMapSrcDoc(state: LiveMapState): string {
  const payload = JSON.stringify(state);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;background:#e8eef5}#map{font-family:sans-serif}</style>
</head>
<body>
<div id="map"></div>
<script>
var STATE = ${payload};
var map, busMarker, stopMarker, youMarker, routeLine, stopLayer;
function pts(s) {
  var out = [];
  if (s.lat != null && s.lng != null) out.push([s.lat, s.lng]);
  if (s.studentStop) out.push([s.studentStop.lat, s.studentStop.lng]);
  if (s.myLat != null && s.myLng != null) out.push([s.myLat, s.myLng]);
  (s.stops || []).forEach(function (st) { out.push([st.lat, st.lng]); });
  return out;
}
function moveYou(s) {
  if (s.myLat == null || s.myLng == null) return;
  var yl = [s.myLat, s.myLng];
  var first = !youMarker;
  if (youMarker) youMarker.setLatLng(yl);
  else youMarker = L.circleMarker(yl, {
    radius: 9, color: '#5B21B6', fillColor: '#7C3AED', fillOpacity: 1, weight: 2
  }).addTo(map).bindPopup('You');
  if (first) fit();
}
function moveBus(s) {
  if (s.lat == null || s.lng == null) return;
  var bl = [s.lat, s.lng];
  if (busMarker) busMarker.setLatLng(bl);
  else busMarker = L.circleMarker(bl, {
    radius: 10, color: '#991B1B', fillColor: '#DC2626', fillOpacity: 1, weight: 2
  }).addTo(map).bindPopup('Bus #' + (s.busNo || ''));
}
function paint(s) {
  var path = (s.stops || []).map(function (st) { return [st.lat, st.lng]; });
  if (path.length > 1) {
    if (routeLine) routeLine.setLatLngs(path);
    else routeLine = L.polyline(path, { color: '#2563EB', weight: 4, opacity: 0.75 }).addTo(map);
  }
  if (stopLayer) stopLayer.clearLayers();
  else stopLayer = L.layerGroup().addTo(map);
  (s.stops || []).forEach(function (st) {
    if (st.yours) return;
    L.circleMarker([st.lat, st.lng], {
      radius: 6,
      color: st.passed ? '#16A34A' : '#94A3B8',
      fillColor: st.passed ? '#22C55E' : '#94A3B8',
      fillOpacity: 1,
      weight: 2
    }).addTo(stopLayer).bindPopup(st.name || 'Stop');
  });
  if (s.studentStop) {
    var sl = [s.studentStop.lat, s.studentStop.lng];
    if (stopMarker) stopMarker.setLatLng(sl);
    else stopMarker = L.circleMarker(sl, {
      radius: 9, color: '#1D4ED8', fillColor: '#2563EB', fillOpacity: 1, weight: 2
    }).addTo(map).bindPopup(s.studentStop.name || 'Stop');
  }
  moveBus(s);
  moveYou(s);
}
function fit() {
  var p = pts(STATE);
  if (p.length > 1) map.fitBounds(p, { padding: [36, 36] });
  else if (p.length === 1) map.setView(p[0], 15);
}
var start = pts(STATE)[0] || [20.5937, 78.9629];
map = L.map('map').setView(start, 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap'
}).addTo(map);
paint(STATE);
fit();
window.addEventListener('message', function (e) {
  var d = e.data;
  if (!d || typeof d !== 'object') return;
  if (d.type === 'update') {
    STATE.lat = d.lat;
    STATE.lng = d.lng;
    STATE.studentStop = d.studentStop;
    STATE.stops = d.stops || STATE.stops;
    STATE.busNo = d.busNo || STATE.busNo;
    STATE.myLat = d.myLat;
    STATE.myLng = d.myLng;
    moveBus(STATE);
    moveYou(STATE);
  }
  if (d.type === 'fit') fit();
});
</script>
</body>
</html>`;
}
