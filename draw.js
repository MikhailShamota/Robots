const WORLD_SIZE = 1000;
const V3_ZERO = new THREE.Vector3(0, 0, 0);
const V3_UNIT_X = new THREE.Vector3(1, 0, 0);
const V3_UNIT_Y = new THREE.Vector3(0, 1, 0);
const V3_UNIT_Z = new THREE.Vector3(0, 0, 1);

function v3Random(length) {
    return V3_UNIT_X.clone().applyEuler(
        new THREE.Euler(
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            'XYZ')
    ).multiplyScalar(length);
}

Scene.init();
Scene.paint();

