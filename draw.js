var stats, controls, camera, renderer;
var scene, octree, clock;
var gravities = [];
gravities.f = function(obj) {

    var f = V3_ZERO.clone();

    gravities.forEach( function(grav) {

        f.add( obj.gravity( grav ) );
    });

    return f;
};


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

function updateCollision() {

    var setter = [];

    octree.objectsData.forEach( function(octreeObj) {

        var mesh = octreeObj.object;
        var matObj = mesh.userData;

        if ( !matObj.velocity )//immovable
            return;

        octree.search( octreeObj.position, octreeObj.radius ).forEach( function(octreeObj2) {

            var mesh2 = octreeObj2.object;
            var matObj2 =  mesh2.userData;

            if ( mesh.id == mesh2.id )
                return;

            var depth = octreeObj2.radius + octreeObj.radius - mesh.position.distanceTo( mesh2.position );

            if ( depth > 0 ) {//bounce

                matObj.pos.add( matObj.dive( matObj2, depth ) );

                setter.push({
                    obj : matObj,
                    velocity : matObj.bounce( matObj2 )
                });
            }
        });
    });

    setter.forEach( function(obj) {

        obj.obj.velocity.copy( obj.velocity );
    });
}

function updateMove(dt) {

    octree.objectsData.forEach( function(octreeObj) {

        var mesh = octreeObj.object;
        var matObj = mesh.userData;

        if ( !matObj.velocity )//immovable
            return;

        var f = gravities.f( matObj );

        matObj.velocity.add( matObj.velocityDelta( f, dt ) );
        matObj.pos.add( matObj.posDelta( dt ) );
        mesh.position.copy( matObj.pos );
    });
}

function update() {

    var dt = clock.getDelta();//its in seconds
    clock.start();

    controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
    stats.update();

    ////

    updateMove( dt );

    octree.rebuild();

    updateCollision();
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

function addMesh( mesh ) {

    scene.add( mesh );
    octree.add( mesh );
}

function initAsteroid() {

    var p = v3Random( WORLD_SIZE );
    p.y = 0;

    var v = new THREE.Vector3( p.z, 0, -p.x ).normalize().multiplyScalar( 100 );
    var r = Math.random() * 50;
    var m = r * r * r;

    var asteroid = new Asteroid( p, m );
    asteroid.velocity = v3Random( 10 ).add( v );

    var mesh = asteroid.mesh( r, 0x8030F0 );

    addMesh( mesh );
}

function initPlanets( q ) {

    /*for ( var i = 0; i < q; i++ ) {

        var planet = new Planet( v3Random( WORLD_SIZE ), Math.random() * 30, 0x1155BB );

        initMesh( planets, planet );
    }*/
}

function initSun() {

    var p = V3_ZERO.clone();
    var r = 80;
    var m = r * r * r;

    var sun = new Sun( p, m, 0xAAAAAA );

    var mesh = sun.mesh( r, 0xAAAA00 );
    //sun.mesh = mesh;

    addMesh( mesh );

    scene.add( sun.light );
    gravities.push( sun );
}

function initScene() {

    for ( var i = 0; i < 100; i++ )
        initAsteroid();

    initSun();

    /*
    var asteroid1 = new Asteroid( new THREE.Vector3( 0, 0, -1000), 900 );
    asteroid1.velocity = new THREE.Vector3(0,-15,100);
    addMesh( asteroid1.mesh( 30, 0x8030F0 ) );

    var asteroid2 = new Asteroid( new THREE.Vector3( 0, 0, 1000), 150*150*150 );
    asteroid2.velocity =new THREE.Vector3(0,15,-50);
    addMesh( asteroid2.mesh( 150, 0x8030F0 ) );

    scene.add(new THREE.PointLight(0xffffff,1,0,0));

    gravities.push( asteroid2 );
    */

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
