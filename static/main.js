// Location data categories
const LOCATIONS = {
    "earth": [
        { name: "Tellnes Ilmenite Deposit", lat: 58.20, lon: 6.25, info: "y", category: "y" },
        { name: "Rajmahal Traps", lat: 24.15, lon: 87.30, info: "Volcano in Hawaii", category: "volcanoes" },
        { name: "Darhad Depression", lat: 51.10, lon: 99.30, info: "Driest desert", category: "terrain" }
    ],
    "mars": [
        { name: "Olympus Mons", lat: 18.65, lon: 226.2, info: "Largest volcano in the Solar System", category: "volcanoes" },
        { name: "Jezero Crater", lat: 18.38, lon: 77.58, info: "Perseverance landing site", category: "missions" }
    ],
    "moon": [
        { name: "Sea of Tranquility", lat: 0.67, lon: 23.47, info: "Apollo 11 landing site", category: "missions" }
    ]
};

// Scene, Camera & Renderer setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Mouse controls with zoom limits
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.minDistance = 1.5;
controls.maxDistance = 10;
camera.position.z = 3;
controls.enablePan = false; 

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 0.5);
pointLight.position.set(5, 3, 5);
scene.add(pointLight);

// Main Planet Sphere
const geometry = new THREE.SphereGeometry(1, 64, 64);
const textureLoader = new THREE.TextureLoader();

function loadPlanetTexture(planetName) {
    const texture = textureLoader.load(`./static/textures/${planetName}.jpg`);
    if (planetName === 'earth') {
        texture.wrapS = THREE.RepeatWrapping;
        texture.offset.x = -11.5 / 360;
    }
    return texture;
}

let material = new THREE.MeshStandardMaterial({
    map: loadPlanetTexture('earth')
});
const planet = new THREE.Mesh(geometry, material);
scene.add(planet);

// --- LATITUDE & LONGITUDE GRID OVERLAY ---
function createGridTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;

    const stepsLat = 12;
    const stepsLon = 24;

    for (let i = 1; i < stepsLat; i++) {
        const y = (canvas.height / stepsLat) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    for (let i = 0; i < stepsLon; i++) {
        const x = (canvas.width / stepsLon) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    return new THREE.CanvasTexture(canvas);
}

const gridGeometry = new THREE.SphereGeometry(1.006, 64, 64);
const gridMaterial = new THREE.MeshBasicMaterial({
    map: createGridTexture(),
    transparent: true,
    opacity: 0.8,
    depthWrite: false
});
const planetGrid = new THREE.Mesh(gridGeometry, gridMaterial);
planetGrid.renderOrder = 2;
scene.add(planetGrid);

// Przesunięcie planety i siatki w pionie
planet.position.y = -0.05;
planetGrid.position.y = -0.05;

let currentPlanet = 'earth';
let selectedPoint = null;

// Function to switch planets
function changePlanet(planetName) {
    currentPlanet = planetName;
    const newTexture = loadPlanetTexture(planetName);
    planet.material.map = newTexture;
    planet.material.needsUpdate = true;

    closeInfoCard();

    savedPoints.forEach(point => {
        point.mesh.visible = (point.planet === planetName);
    });
    renderSavedPoints();
    updateOverlays();
}

// Rotation state variable
let isRotating = true;

function toggleRotation() {
    isRotating = !isRotating;
    const btn = document.getElementById('rotBtn');
    if (btn) {
        btn.textContent = isRotating ? "Pause Rotation" : "Resume Rotation";
    }
}

// --- PRECISE GEO-COORDINATES & SAVED POINTS LOGIC ---
const LONGITUDE_OFFSET = 0; 
let savedPoints = [];
const USER_KEY = 'userPoints_v1';
const DELETED_KEY = 'deletedDefaults_v1';

function readStorage(key) {
    try {
        const v = JSON.parse(localStorage.getItem(key));
        return Array.isArray(v) ? v : [];
    } catch (e) {
        return [];
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
}

function bodyLabel(planetName) {
    if (planetName === 'mars') return 'Mars Analogue';
    if (planetName === 'moon') return 'Moon Analogue';
    return 'Earth Analogue';
}

function addPointFromData(d) {
    const body = d.body || bodyLabel(d.planet);
    const mesh = createMarkerMesh(d.lat, d.lon, d.name, body);
    mesh.visible = (d.planet === currentPlanet);
    savedPoints.push({ ...d, body, mesh });
}

function getDefaultPoints() {
    const list = [];
    for (const planetName in LOCATIONS) {
        LOCATIONS[planetName].forEach((loc) => {
            list.push({
                id: `default:${planetName}:${loc.name}`,
                name: loc.name,
                lat: loc.lat,
                lon: loc.lon,
                planet: planetName,
                body: bodyLabel(planetName),
                isDefault: true
            });
        });
    }
    return list;
}

function saveToStorage() {
    const userPoints = savedPoints
        .filter(p => !p.isDefault)
        .map(({ id, name, lat, lon, planet, body }) => ({ id, name, lat, lon, planet, body }));
    writeStorage(USER_KEY, userPoints);

    const presentDefaultIds = savedPoints.filter(p => p.isDefault).map(p => p.id);
    const deleted = getDefaultPoints().map(p => p.id).filter(id => !presentDefaultIds.includes(id));
    writeStorage(DELETED_KEY, deleted);
}

function loadSavedPoints() {
    const deleted = readStorage(DELETED_KEY);
    const userPoints = readStorage(USER_KEY);
    const defaults = getDefaultPoints().filter(p => !deleted.includes(p.id));

    [...defaults, ...userPoints].forEach(addPointFromData);
    saveToStorage();
    renderSavedPoints();
}

function latLonToVector3(lat, lon, radius) {
    const adjustedLon = lon + LONGITUDE_OFFSET;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (adjustedLon + 180) * (Math.PI / 180); 

    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
}

function vector3ToLatLon(vector) {
    const normalized = vector.clone().normalize();
    const lat = 90 - (Math.acos(normalized.y) * 180 / Math.PI);
    let lon = (Math.atan2(normalized.z, -normalized.x) * 180 / Math.PI) - 180;

    lon -= LONGITUDE_OFFSET;

    while (lon > 180) lon -= 360;
    while (lon < -180) lon += 360;

    return { 
        lat: parseFloat(lat.toFixed(2)), 
        lon: parseFloat(lon.toFixed(2)) 
    };
}

function createMarkerMesh(lat, lon, name, planetBody) {
    const markerGeometry = new THREE.SphereGeometry(0.015, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);

    const position = latLonToVector3(lat, lon, 1.005);
    markerMesh.position.copy(position);

    markerMesh.userData = {
        name: name,
        lat: lat,
        lon: lon,
        body: planetBody
    };

    planet.add(markerMesh);
    return markerMesh;
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (event.target.closest('#sidebar') || event.target.closest('#right-sidebar') || event.target.closest('#ui') || event.target.closest('#point-info-card') || event.target.closest('#details-modal') || event.target.closest('#info-badge')) {
        return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const markerMeshes = savedPoints.filter(p => p.planet === currentPlanet).map(p => p.mesh);
    const intersectMarkers = raycaster.intersectObjects(markerMeshes);

    if (intersectMarkers.length > 0) {
        const clickedMesh = intersectMarkers[0].object;
        selectedPoint = savedPoints.find(p => p.mesh === clickedMesh);

        if (selectedPoint) {
            showInfoCard(selectedPoint);
        }
    }
});

window.addEventListener('dblclick', (event) => {
    if (event.target.closest('#sidebar') || event.target.closest('#right-sidebar') || event.target.closest('#ui')) {
        return;
    }

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(planet);

    if (intersects.length > 0) {
        const intersectPoint = intersects[0].point;
        planet.worldToLocal(intersectPoint);

        const coords = vector3ToLatLon(intersectPoint);

        const pointName = prompt(`Enter name for location (Lat: ${coords.lat}, Lon: ${coords.lon}):`, "My Point");
        if (!pointName) return;

        let celestialBody = "Earth Analogue";
        if (currentPlanet === "mars") celestialBody = "Mars Analogue";
        if (currentPlanet === "moon") celestialBody = "Moon Analogue";

        const markerMesh = createMarkerMesh(coords.lat, coords.lon, pointName, celestialBody);

        const newPoint = {
            id: Date.now(),
            name: pointName,
            lat: coords.lat,
            lon: coords.lon,
            planet: currentPlanet,
            body: celestialBody,
            mesh: markerMesh
        };

        savedPoints.push(newPoint);
        saveToStorage();
        renderSavedPoints();
    }
});

function addNewPoint() {
    const nameInput = document.getElementById('pointName');
    const latInput = document.getElementById('pointLat');
    const lonInput = document.getElementById('pointLon');

    const name = nameInput.value.trim();
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);

    if (!name || isNaN(lat) || isNaN(lon)) {
        alert("Please fill in all fields with valid values!");
        return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        alert("Latitude must be between -90 and 90, Longitude between -180 and 180.");
        return;
    }

    let celestialBody = "Earth Analogue";
    if (currentPlanet === "mars") celestialBody = "Mars Analogue";
    if (currentPlanet === "moon") celestialBody = "Moon Analogue";

    const markerMesh = createMarkerMesh(lat, lon, name, celestialBody);

    const newPoint = {
        id: Date.now(),
        name: name,
        lat: lat,
        lon: lon,
        planet: currentPlanet,
        body: celestialBody,
        mesh: markerMesh
    };

    savedPoints.push(newPoint);
    saveToStorage();
    renderSavedPoints();

    nameInput.value = '';
    latInput.value = '';
    lonInput.value = '';
}

function deletePoint(id) {
    const pointToDelete = savedPoints.find(point => String(point.id) === String(id));

    if (pointToDelete && pointToDelete.mesh) {
        planet.remove(pointToDelete.mesh);
        pointToDelete.mesh.geometry.dispose();
        pointToDelete.mesh.material.dispose();
    }

    savedPoints = savedPoints.filter(point => String(point.id) !== String(id));
    saveToStorage();
    closeInfoCard();
    renderSavedPoints();
}

function renderSavedPoints() {
    const listContainer = document.getElementById('saved-points-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    savedPoints
        .filter(point => point.planet === currentPlanet)
        .forEach(point => {
            const li = document.createElement('li');
            li.innerHTML = `
               <span><strong>${point.name}</strong><br><small>Lat: ${point.lat}, Lon: ${point.lon}</small></span>
               <button class="delete-btn">Delete</button>
            `;
            li.querySelector('.delete-btn').addEventListener('click', () => deletePoint(point.id));
            listContainer.appendChild(li);
        });
}

// --- INTERACTIVE CATALOG (z obsługą kolorów podkategorii) ---
const CATALOG = [
    { 
        name: 'Soil', 
        children: [
            { name: 'Basaltic Mars', color: '#FF5722' },
            { name: 'Basaltic Moon', color: '#607D8B' },
            { name: 'Anorthosite', color: '#607D8B' }
        ] 
    },
    { 
        name: 'Terrain Type', 
        children: [
            { name: 'Volcanic', color: '#FFFFFF' },
            { name: 'Desert', color: '#FFFFFF' },
            { name: 'Polar', color: '#FFFFFF' }
        ] 
    },
    { 
        name: 'Temperature', 
        children: [
            { name: 'Below -40°C', color: '#FFFFFF' },
            { name: 'Above 40°C', color: '#607D8B' }
        ] 
    },
    { 
        name: 'Wind and Dust', 
        children: [
            { name: 'Aeolian landforms', color: '#FF5722' },
            { name: 'Dust & Dust storms', color: '#FF5722' },
        ] 
    },
    { 
        name: 'Ice', 
        children: [
            { name: 'Polygon Terrain', color: '#FF5722' },
            { name: 'Glacial features', color: '#FF5722' }
        ] 
    },
    { 
        name: 'AstroBiology', 
        children: [
            {name: 'Moon', color: '#607D8B' },
            {name: 'Mars', color: '#FF5722' },
       
        ] 
    },
    { 
        name: 'Subsurface structures', 
        children: [
            { name: 'Lava tubes', color: '#FFFFFF' },
            { name: 'Caves', color: '#FF5722' },
         
        ] 
    }
];

const selectedSubs = new Set();
const openCategories = new Set();

function catalogKey(cat, sub) {
    return cat + '::' + sub;
}

function renderCatalog() {
    const root = document.getElementById('catalog');
    if (!root) return;
    root.innerHTML = '';

    CATALOG.forEach(cat => {
        const isOpen = openCategories.has(cat.name);
        const selectedCount = cat.children.filter(s => selectedSubs.has(catalogKey(cat.name, s.name))).length;

        const li = document.createElement('li');
        if (isOpen) li.classList.add('open');

        const head = document.createElement('button');
        head.type = 'button';
        head.className = 'cat-btn';
        head.setAttribute('aria-expanded', isOpen);
        head.innerHTML = `
           <span>${cat.name}${selectedCount ? `<span class="cat-badge">${selectedCount}</span>` : ''}</span>
           <span class="chev">›</span>
        `;
        head.addEventListener('click', () => {
            if (openCategories.has(cat.name)) openCategories.delete(cat.name);
            else openCategories.add(cat.name);
            renderCatalog();
        });
        li.appendChild(head);

        const ul = document.createElement('ul');
        ul.className = 'sub-list';
        
        cat.children.forEach(sub => {
            const key = catalogKey(cat.name, sub.name);

            const item = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sub-btn';
            btn.setAttribute('aria-pressed', selectedSubs.has(key));
            
            // Kolorowy tekst podkategorii
            btn.innerHTML = `<span class="box"></span><span style="color: ${sub.color};">${sub.name}</span>`;
            
            btn.addEventListener('click', () => {
                if (selectedSubs.has(key)) selectedSubs.delete(key);
                else selectedSubs.add(key);
                onCatalogChange();
            });

            item.appendChild(btn);
            ul.appendChild(item);
        });
        li.appendChild(ul);

        root.appendChild(li);
    });
}

function onCatalogChange() {
    renderCatalog();
    updateOverlays();
    const n = selectedSubs.size;
    const countEl = document.getElementById('catalog-count');
    if (countEl) {
        countEl.textContent = n === 0 ? 'No filters' : `${n} selected`;
    }
}

function initCatalog() {
    const clearBtn = document.getElementById('catalog-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            selectedSubs.clear();
            onCatalogChange();
        });
    }
    renderCatalog();
}

// --- MAP OVERLAYS ---
const OVERLAY_RADIUS = 1.003;
const OVERLAY_OPACITY = 0.85;
const OVERLAY_OFFSET_X = -11.5/360;

const OVERLAY_FILES = {
    'Terrain Type::Desert': 'terrain_desert.png',
    'Soil::Basaltic Mars': 'soil_basaltic.png',
};
const overlayLayers = {};

function getOverlayLayer(key) {
    const file = OVERLAY_FILES[key];
    if (!file) return null;

    const cacheKey = currentPlanet + '|' + key;
    if (overlayLayers[cacheKey]) return overlayLayers[cacheKey];

   const texture = textureLoader.load(
    `./static/textures/static/overlays/${currentPlanet}/${file}`,
    undefined,
    undefined,
    () => console.warn('Missing overlay file:', currentPlanet, file)
);
    if (OVERLAY_OFFSET_X) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.offset.x = OVERLAY_OFFSET_X;
    }

    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(OVERLAY_RADIUS, 64, 64),
        new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: OVERLAY_OPACITY,
            depthWrite: false
        })
    );
    mesh.renderOrder = 1;
    planet.add(mesh);
    overlayLayers[cacheKey] = mesh;
    return mesh;
}

function updateOverlays() {
    Object.values(overlayLayers).forEach(m => { m.visible = false; });
    selectedSubs.forEach(key => {
        const layer = getOverlayLayer(key);
        if (layer) layer.visible = true;
    });
}

// --- INFO CARD & MODAL FUNCTIONS ---
function showInfoCard(point) {
    document.getElementById('info-name').textContent = point.name;
    document.getElementById('info-coords').textContent = `Lat: ${point.lat}, Lon: ${point.lon}`;
    document.getElementById('info-body').textContent = point.body;
    document.getElementById('point-info-card').style.display = 'block';
}

function closeInfoCard() {
    document.getElementById('point-info-card').style.display = 'none';
    selectedPoint = null;
}

function openDetailsModal() {
    if (!selectedPoint) return;
    document.getElementById('modal-title').textContent = `Details for: ${selectedPoint.name}`;
    document.getElementById('modal-desc').innerHTML = `
       <strong>Coordinates:</strong> Latitude ${selectedPoint.lat}°, Longitude ${selectedPoint.lon}°<br>
       <strong>Celestial Context:</strong> ${selectedPoint.body}<br><br>
       <em>Detailed telemetry, historical logs, and exploratory data for this site.</em>
    `;
    document.getElementById('details-modal').style.display = 'flex';
}

function closeDetailsModal() {
    document.getElementById('details-modal').style.display = 'none';
}

// --- ANIMATION & RESIZE ---
function animate() {
    requestAnimationFrame(animate);

    if (isRotating) {
        planet.rotation.y += 0.001;
        planetGrid.rotation.y += 0.001;
    }

    controls.update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('DOMContentLoaded', () => {
    initCatalog();
    loadSavedPoints();
});
