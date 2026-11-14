// Dane lokacji (zastępują backend Pythona)
const LOCATIONS = {
    "earth": [{ name: "Warszawa", lat: 52.23, lon: 21.01, info: "Stolica Polski" }],
    "mars": [{ name: "Olympus Mons", lat: 18.65, lon: 226.2, info: "Najwyższy wulkan" }],
    "moon": [{ name: "Morze Spokoju", lat: 0.67, lon: 23.47, info: "Apollo 11" }]
};
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Kontrola myszką (obracanie, przybliżanie)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
camera.position.z = 3;
controls.minDistance = 1.1; // Nie pozwala przybliżyć się bardziej niż 1.1 (promień planety to 1)
controls.maxDistance = 10;  // Opcjonalnie: nie pozwala odallić się zbytnio

// Światło
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(5, 3, 5);
scene.add(pointLight);

// Tworzenie planety (Sfera)
const geometry = new THREE.SphereGeometry(1, 64, 64);
const textureLoader = new THREE.TextureLoader();
let material = new THREE.MeshStandardMaterial({
    map: textureLoader.load('./static/textures/earth.jpg') // Upewnij się, że masz ten plik!
});
const planet = new THREE.Mesh(geometry, material);
scene.add(planet);

// Funkcja zmiany planety
function changePlanet(planetName) {
    const newTexture = textureLoader.load(`./static/textures/${planetName}.jpg`);
    planet.material.map = newTexture;
    planet.material.needsUpdate = true;
    
    // Pobieraanie danych lokalnie z JS
    const data = LOCATIONS[planetName] || [];
    console.log(`Punkty na ${planetName}:`, data);

}

// Pętla animacji
function animate() {
    requestAnimationFrame(animate);
    planet.rotation.y += 0.001; // Powolny obrót
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Skalowanie przy zmianie rozmiaru okna
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Obsługa kliknięcia w kategorie w bocznym menu
function selectCategory(categoryName) {
    console.log("Wybrano kategorię:", categoryName);
    
}
// Array to store user custom saved points
let savedPoints = [];

// Helper function to convert Latitude & Longitude into 3D coordinates (x, y, z) on a sphere
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
}

// Function to create a red 3D dot marker on the planet
function createMarkerMesh(lat, lon) {
    const markerGeometry = new THREE.SphereGeometry(0.015, 16, 16); // Small sphere size
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Bright red color
    const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);

    // Position the marker slightly above the surface (radius = 1.005)
    const position = latLonToVector3(lat, lon, 1.005);
    markerMesh.position.copy(position);

    // Attach directly to the planet mesh so it rotates with the globe
    planet.add(markerMesh);
    return markerMesh;
}

// Function to add a new point from the right sidebar form
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

    // Create the 3D red dot on the planet
    const markerMesh = createMarkerMesh(lat, lon);

    const newPoint = {
        id: Date.now(),
        name: name,
        lat: lat,
        lon: lon,
        mesh: markerMesh // Store reference to the 3D object for later deletion
    };

    savedPoints.push(newPoint);
    renderSavedPoints();

    // Clear input fields
    nameInput.value = '';
    latInput.value = '';
    lonInput.value = '';
}

// Function to delete a saved point and remove its red dot from the 3D globe
function deletePoint(id) {
    const pointToDelete = savedPoints.find(point => point.id === id);
    
    if (pointToDelete && pointToDelete.mesh) {
        planet.remove(pointToDelete.mesh); // Remove 3D marker from the planet
        pointToDelete.mesh.geometry.dispose();
        pointToDelete.mesh.material.dispose();
    }

    savedPoints = savedPoints.filter(point => point.id !== id);
    renderSavedPoints();
}

// Function to update the HTML list in the right sidebar
function renderSavedPoints() {
    const listContainer = document.getElementById('saved-points-list');
    listContainer.innerHTML = '';

    savedPoints.forEach(point => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span><strong>${point.name}</strong><br><small>Lat: ${point.lat}, Lon: ${point.lon}</small></span>
            <button class="delete-btn" onclick="deletePoint(${point.id})">Delete</button>
        `;
        listContainer.appendChild(li);
    });
}
