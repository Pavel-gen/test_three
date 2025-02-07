import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const scene = new THREE.Scene();

const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const renderer = new THREE.WebGLRenderer();

document.getElementById("app").appendChild(renderer.domElement);

const appContainer = document.getElementById("app");
appContainer.appendChild(renderer.domElement);

const containerWidth = appContainer.offsetWidth;
const containerHeight = appContainer.offsetHeight;

const camera = new THREE.PerspectiveCamera(
  75,
  containerWidth / containerHeight,
  0.1,
  1000
);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 2;
controls.maxDistance = 20;

renderer.setSize(containerWidth, containerHeight);

const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(10, 10, 10);
scene.background = new THREE.Color(0xffffff);
scene.add(light);
let loadedModel = null;
let availableColors = [];

// отработка выбора файла
function handleFileSelect(event) {
  const file = event.target.files[0];

  console.log(file);

  if (!file) {
    console.warn("Файл не выбран");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    const arrayBuffer = event.target.result;
    loadModelFromBuffer(arrayBuffer);
  };

  reader.readAsArrayBuffer(file);
}

// самая важная часть котрая грузит модель и сразу получает информацию о её цветах и свойствах
function loadModelFromBuffer(buffer) {
  const loader = new GLTFLoader();

  loader.parse(
    buffer,
    "",
    function (gltf) {
      const model = gltf.scene;
      loadedModel = model;

      // получаем возможные цвета модели
      extractColorsFromModel(model);
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);
      model.scale.set(0.7, 0.7, 0.7);

      // получаем характеристики модели
      const modelProperties = extractModelProperties(model, gltf);

      model.properties = modelProperties;

      scene.add(model);
    },
    function (error) {
      console.error("Ошибка при загрузке модели:", error);
    }
  );
}
// отработка конпки выбор модели
document.getElementById("fileButton").addEventListener("click", () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".glb,.gltf";
  fileInput.style.display = "none";

  fileInput.addEventListener("change", handleFileSelect);

  fileInput.click();
});
// непрервная анимация
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  renderer.render(scene, camera);
}

animate();

// Нажатие на модель
function onSceneClick(event) {
  if (!loadedModel) return;

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(loadedModel.children, true);

  if (intersects.length > 0) {
    showPopup();
  }
}
// Теперь модель будет реагировать на нажатие
renderer.domElement.addEventListener("click", onSceneClick);

// вытаскиваем возможные цвета, отрабатывает в loadModelFromBuffer
function extractColorsFromModel(model) {
  availableColors = [];

  model.traverse((child) => {
    if (child.isMesh && child.material) {
      const color = child.material.color.getHex();
      if (!availableColors.includes(color)) {
        availableColors.push(color);
      }
    }
  });
  createColorOptions();
}

// создаем конпки по полученным цветам
function createColorOptions() {
  const colorDropdown = document.getElementById("colorDropdown");
  colorDropdown.innerHTML = "";

  availableColors.forEach((color) => {
    const button = document.createElement("button");
    button.style.backgroundColor = `#${color.toString(16).padStart(6, "0")}`;
    button.classList.add("colorOption");
    button.addEventListener("click", () => {
      changeModelColor(color);
      hidePopup();
    });
    colorDropdown.appendChild(button);
  });
}
// отработка нажатия на цветные конпки
function changeModelColor(color) {
  if (!loadedModel) {
    alert("Загрузите модель перед изменением цвета.");
    return;
  }

  loadedModel.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.color.set(color);
    }
  });
}

// появление окна
function showPopup() {
  document.getElementById("popup").classList.remove("hidden_1");
  const properties = loadedModel.properties;

  displayModelProperties(properties);
}
// скрыть окно
function hidePopup() {
  document.getElementById("popup").classList.add("hidden_1");
}
// вытаскиваем свойства модели, отрабатывает в loadModelFromBuffer
function extractModelProperties(model, gltf) {
  const properties = {};
  console.log(gltf.scene);

  // Извлекаем метаданные из gltf
  if (gltf && gltf.scene && gltf.scene.userData) {
    properties.name = gltf.scene.userData.name || "Миниган"; // Название модели
  } else {
    properties.name = "Неизвестная модель";
  }

  // Извлекаем координаты модели
  properties.position = {
    x: model.position.x.toFixed(2),
    y: model.position.y.toFixed(2),
    z: model.position.z.toFixed(2),
  };

  // Возвращаем объект с свойствами
  return properties;
}
// Тут мы генерим содержимое окна исходя из свойств модели, тут я их в ручную закодил, но в иделе extractModelProperties будет получать своства и ланимечски их отрисовывать
function displayModelProperties(properties) {
  const title = document.getElementById("local-title");
  title.textContent = `${properties.name}`;

  const popupContent = document.getElementById("popup-content");
  popupContent.innerHTML = "";

  function createDropdown(title, items) {
    const dropdownContainer = document.createElement("div");
    dropdownContainer.classList.add("dropdown");

    const dropdownButton = document.createElement("button");
    dropdownButton.classList.add("dropdown-btn");

    const buttonContent = document.createElement("div");
    buttonContent.classList.add("button-content");

    const titleElement = document.createElement("span");
    titleElement.classList.add("dropdown-title");
    titleElement.textContent = title;

    const arrowElement = document.createElement("span");
    arrowElement.classList.add("dropdown-arrow");
    arrowElement.textContent = "▼";

    buttonContent.appendChild(titleElement);
    buttonContent.appendChild(arrowElement);
    dropdownButton.appendChild(buttonContent);

    dropdownButton.onclick = () => toggleDropdown(dropdownContainer);

    const dropdownContent = document.createElement("div");
    dropdownContent.classList.add("dropdown-content");
    dropdownContent.style.display = "none";

    items.forEach(({ label, value }) => {
      const propertyItem = document.createElement("div");
      propertyItem.classList.add("property-item");

      const propertyContent = document.createElement("div");
      propertyContent.classList.add("property-content");

      const labelElement = document.createElement("span");
      labelElement.classList.add("property-label");
      labelElement.textContent = label;

      const valueElement = document.createElement("span");
      valueElement.classList.add("property-value");
      valueElement.textContent = value;

      propertyContent.appendChild(labelElement);
      propertyContent.appendChild(valueElement);
      propertyItem.appendChild(propertyContent);

      dropdownContent.appendChild(propertyItem);
    });

    dropdownContainer.appendChild(dropdownButton);
    dropdownContainer.appendChild(dropdownContent);

    return dropdownContainer;
  }

  function toggleDropdown(container) {
    const content = container.querySelector(".dropdown-content");
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  }

  const mainPropertiesItems = [
    { label: "Диаметр", value: "80 мм" },
    { label: "Давление", value: "10 МПа" },
  ];
  const mainPropertiesDropdown = createDropdown(
    "Основные свойства",
    mainPropertiesItems
  );
  popupContent.appendChild(mainPropertiesDropdown);

  // Создаём выпадающий список для координат
  const coordinatesItems = [
    { label: "X", value: properties.position.x },
    { label: "Y", value: properties.position.y },
    { label: "Z", value: properties.position.z },
  ];
  const coordinatesDropdown = createDropdown("Координаты", coordinatesItems);
  popupContent.appendChild(coordinatesDropdown);
}
// конпка выбора материала, при нажатии на неё отображаются  или скрываются цвета
const changeMaterialButton = document.getElementById("changeMaterialButton");

function handleMaterialButtonClick() {
  const Dropdown = document.getElementById("colorDropdown");

  Dropdown.classList.toggle("hidden_2");
}

changeMaterialButton.addEventListener("click", handleMaterialButtonClick);

// отработка крестика на окне
document
  .getElementById("closePopupButton")
  .addEventListener("click", hidePopup);

// реакция на изменения размеров
window.addEventListener("resize", () => {
  const appContainer = document.getElementById("app");
  const containerWidth = appContainer.offsetWidth;
  const containerHeight = appContainer.offsetHeight;

  camera.aspect = containerWidth / containerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(containerWidth, containerHeight);
});
