import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const container = document.getElementById('container');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 50, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI * 70 / 180;

const size = 100; // размер плоскости в "модельных" единицах

// Плоскость (плоская, без высот)
const planeGeometry = new THREE.PlaneGeometry(size, size, 1, 1);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
scene.add(plane);

// Canvas и текстура для WMTS тайла
const wmtsCanvas = document.createElement('canvas');
wmtsCanvas.width = 256;
wmtsCanvas.height = 256;
const wmtsCtx = wmtsCanvas.getContext('2d');
const wmtsTexture = new THREE.CanvasTexture(wmtsCanvas);
wmtsTexture.wrapS = THREE.ClampToEdgeWrapping;
wmtsTexture.wrapT = THREE.ClampToEdgeWrapping;

const wmtsMaterial = new THREE.MeshBasicMaterial({ map: wmtsTexture, transparent: true });
const wmtsPlane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), wmtsMaterial);
wmtsPlane.rotation.x = -Math.PI / 2;
wmtsPlane.position.y = 0.05; // чуть выше плоскости
scene.add(wmtsPlane);

// Токен из GetCapabilities (замени на свой)
const TOKEN = 'ImV1cm9nZW9ncmFwaGljc19yZWdpc3RlcmVkXzk2MDMzOSI.GzmYAw.gM461Rbrkrp_X3aa18uB1_Ri84o';

// Преобразование модели (x,z) в широту/долготу (WGS84)
// Предполагаем, что плоскость размером size=100 покрывает весь мир:
// по оси X: от -size/2 (долгота -180) до +size/2 (долгота +180)
// по оси Z: от -size/2 (широта -85) до +size/2 (широта +85)
// Подстроить можно под свои данные!

function modelToLonLat(x, z) {
    const lon = (x / (size / 2)) * 180;
    const lat = (z / (size / 2)) * 85; // примерно
    return { lon, lat };
}

// Функции для преобразования широты/долготы в WMTS номера тайлов (TILECOL, TILEROW, TILEMATRIX)
// В WMTS используется проекция EPSG:3857 (Web Mercator)
// Вспомогательные функции:

function lonLatToMercator(lon, lat) {
    const x = lon * 20037508.34 / 180;
    let y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
    y = y * 20037508.34 / 180;
    return { x, y };
}

// Получить номер тайла X и Y по координатам в EPSG:3857 и уровню z
function mercatorToTileXY(x, y, zoom) {
    const tileSize = 256;
    const initialResolution = 2 * Math.PI * 6378137 / tileSize;
    const originShift = 2 * Math.PI * 6378137 / 2.0;

    const resolution = initialResolution / Math.pow(2, zoom);
    const tileX = Math.floor((x + originShift) / (resolution * tileSize));
    const tileY = Math.floor((originShift - y) / (resolution * tileSize));

    return { tileX, tileY };
}

const matrixHeights = {
    0: 1, 1: 2, 2: 4, 3: 8, 4: 16, 5: 32, 6: 64, 7: 128, 8: 256,
    9: 512, 10: 1024, 11: 2048, 12: 4096, 13: 8192, 14: 16384,
    // дальше по необходимости
};

function getWMTSUrl(tileX, tileY, zoom) {
    const tileMatrix = zoom.toString().padStart(2, '0');
    const matrixHeight = matrixHeights[zoom];
    const invertedRow = matrixHeight - 1 - tileY;

    const url =
        `https://www.mapsforeurope.org/maps/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0` +
        `&LAYER=eurodem&TILEMATRIXSET=euro_3857&FORMAT=image/png` +
        `&TILEMATRIX=${tileMatrix}&TILEROW=${invertedRow}&TILECOL=${tileX}` +
        `&token=${TOKEN}`;

    console.log('Запрос WMTS:', url);

    return url;
}

// Загрузка и отрисовка WMTS тайла в canvas
async function loadWMTS(tileX, tileY, zoom) {
    const url = getWMTSUrl(tileX, tileY, zoom);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Ошибка загрузки тайла'));
        img.src = url;
    });
}

// При клике по плоскости обновляем текстуру WMTS
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const WMTS_ZOOM_LEVEL = 5; // выбери подходящий уровень (0..24)

renderer.domElement.addEventListener('click', async (event) => {
    mouse.x = (event.clientX / container.clientWidth) * 2 - 1;
    mouse.y = - (event.clientY / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(plane);

    if (intersects.length > 0) {
        const point = intersects[0].point;
        console.log('Клик по модели:', point);

        // Переводим координаты модели в долготу/широту
        const { lon, lat } = modelToLonLat(point.x, point.z);
        console.log(`Географические координаты: долгота=${lon.toFixed(5)}, широта=${lat.toFixed(5)}`);

        // В EPSG:3857
        const merc = lonLatToMercator(lon, lat);
        console.log(`Mercator (x,y): ${merc.x.toFixed(2)}, ${merc.y.toFixed(2)}`);

        // Получаем тайл
        const { tileX, tileY } = mercatorToTileXY(merc.x, merc.y, WMTS_ZOOM_LEVEL);
        console.log(`WMTS Tile X=${tileX}, Y=${tileY}, Zoom=${WMTS_ZOOM_LEVEL}`);

        try {
            const img = await loadWMTS(tileX, tileY, WMTS_ZOOM_LEVEL);
            wmtsCtx.clearRect(0, 0, wmtsCanvas.width, wmtsCanvas.height);
            wmtsCtx.drawImage(img, 0, 0, wmtsCanvas.width, wmtsCanvas.height);
            wmtsTexture.needsUpdate = true;
        } catch (e) {
            console.error('Ошибка загрузки WMTS тайла:', e);
        }
    }
});

// Свет и анимация
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 50, 50);
scene.add(light);

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    // --- Индикатор наклона ---
    const indicator = document.getElementById('tilt-indicator');
    if (indicator) {
        // polarAngle: 0 — строго вниз, PI/2 — горизонтально
        const deg = (controls.getPolarAngle() * 180 / Math.PI).toFixed(1);
        indicator.textContent = `Наклон: ${deg}°`;
    }
}
animate();
