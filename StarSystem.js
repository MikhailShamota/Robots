function addMesh( mesh, grav ) {

    scene.add( mesh );
    octree.add( mesh );
    
    grav && grav.push( mesh.userData );
}

function initAsteroid( orbit ) {

    var p = v3Random( WORLD_SIZE );
    //p.y = 0;
    p.multiply(new THREE.Vector3(1,0,1)).normalize().multiplyScalar( orbit );

    var v = new THREE.Vector3( p.z, 0, -p.x ).normalize().multiplyScalar( 100 );
    var r = Math.random() * 10;
    var m = r * r * r;

    var asteroid = new Asteroid( p, m );
    asteroid.velocity = v3Random( 10 ).add( v );

    return asteroid.mesh( r, 0x8030F0 );
}

function initPlanet() {

    var p = v3Random( WORLD_SIZE );
    p.y = 0;

    var r = Math.random() * 50;
    var m = r * r * r;

    var planet = new Planet( p, m );

    return planet.mesh( r, 0x80FFF0 );
}

function initSun() {

    var p = V3_ZERO.clone();
    var r = 100;
    var m = r * r * r;

    var sun = new Sun( p, m, 0xAAAAAA );



    return sun.mesh( r, 0xAAAA00 );
}

function initLight() {

    var light = new THREE.PointLight( 0xFFFFFF, 1, 0 );
    light.position = this.pos;

    return light;
}

function initScene() {

    for ( var i = 0; i < 100; i++ )
        addMesh( initAsteroid( WORLD_SIZE * 0.8 ) );

    //for ( var i = 0; i < 10; i++ )
    //    addMesh( initPlanet(), gravities );

    addMesh ( initSun(), gravities );

    scene.add( initLight() );
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

}