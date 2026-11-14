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
