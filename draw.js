var stats, controls, camera, renderer;
var scene, octree, clock;
var asteroids = [];
var planets = [];

const WORLD_SIZE = 1000;
const V3_ZERO   = new THREE.Vector3( 0, 0, 0 );
const V3_UNIT_X = new THREE.Vector3( 1, 0, 0 );
const V3_UNIT_Y = new THREE.Vector3( 0, 1, 0 );
const V3_UNIT_Z = new THREE.Vector3( 0, 0, 1 );

function v3Random( length ) {
    return V3_UNIT_X.clone().applyEuler(
        new THREE.Euler(
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            Math.random() * 2 * Math.PI,
            'XYZ')
    ).multiplyScalar(length);
}

init();
paintGL();

function update() {

    var dt = clock.getDelta();//its in seconds
    clock.start();

    controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
    stats.update();

    asteroids.forEach( function(asteroid) {

        var f = V3_ZERO.clone();

        planets.forEach( function(planet) {

            f.add( asteroid.gravity( planet ) );
        });

        asteroid.f = f;
        asteroid.update( dt );
    });


    octree.rebuild();
}

function initializeGL() {

    scene = new THREE.Scene();
    var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

    camera = new THREE.PerspectiveCamera( 75, window.width / window.height, 0.1, WORLD_SIZE * 10 );
    camera.position.z = WORLD_SIZE * 2;
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();

    window.addEventListener('resize', function() {
        var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

        renderer.setSize( WIDTH, HEIGHT );
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
    });


    renderer = new THREE.WebGLRenderer( {antialias:true} );
    renderer.setSize( WIDTH, HEIGHT );
    renderer.sortObjects = false;
    //renderer.domElement.addEventListener("click", onMouseClick);

    document.body.appendChild( renderer.domElement );

    scene.background = new THREE.Color( 0x383838 );
}
/*
 function resizeGL(canvas) {
 camera.aspect = canvas.width / canvas.height;
 camera.updateProjectionMatrix();

 renderer.setPixelRatio(canvas.devicePixelRatio);
 renderer.setSize(canvas.width, canvas.height);
 }
 */

function initStats() {
    stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms
    // Align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.getElementById("Stats-output").appendChild(stats.domElement);
}

function initControls(){
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    //controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
}

function initOctree() {

    octree = new THREE.Octree( {

        // uncomment below to see the octree ( may kill the fps )
        //scene: scene,

        // when undeferred = true, objects are inserted immediately
        // instead of being deferred until next octree.update() call
        // this may decrease performance as it forces a matrix update
        undeferred: false,

        // set the max depth of tree
        depthMax: Infinity,
        // max number of objects before nodes split or merge
        objectsThreshold: 10,
        // percent between 0 and 1 that nodes will overlap each other
        // helps insert objects that lie over more than one node
        overlapPct: 0.15
    } );
}

function initObj( array, obj ) {

    obj.init();

    scene.add( obj.mesh );
    octree.add( obj.mesh );

    array.push( obj );
}

function initScene() {

    for ( var i = 0; i < 100; i++ ) {

        var asteroid = new Asteroid( v3Random( WORLD_SIZE ), Math.random() * 10, 0x803000 );

        asteroid.mov = v3Random( 10 );

        initObj( asteroids, asteroid );
    }

    for ( var i = 0; i < 0; i++ ) {

        var planet = new Planet( v3Random( WORLD_SIZE ), Math.random() * 30, 0x1155BB );

        initObj( planets, planet );
    }

    var sun = new Sun( V3_ZERO.clone(), 80, 0x505050 );

    initObj( planets, sun );

    scene.add( sun.light );

    octree.update();
    clock = new THREE.Clock();
}

function init() {

    initializeGL();
    initStats();
    initControls();
    initOctree();
    initScene();
}

function paintGL() {

    update();//TODO: сделать не синхронным с прорисовкой

    requestAnimationFrame(paintGL);
    renderer.render(scene, camera);
}
