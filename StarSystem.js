var starSystem = [
    {
        f : SunBlack,
        g : true,
        l : LightWhite
    },
    {
        f : PlanetArid
    },
    {
        f : PlanetArid
    },
    {
        f : PlanetArid
    },
    {
        f : PlanetArid
    },
    {
        f : AsteroidPlain,
        q : 100
    },
    {
        f : PlanetArid
    }
];

starSystem.orbitPos = orbit => {

    var p = v3Random( 1.0 );

    p.multiply( new THREE.Vector3(1,0,1) ).normalize().multiplyScalar( orbit * WORLD_SIZE );//p.Y = 0

    return p;
};

starSystem.init = function() {

    var q = this.length;

    starSystem.forEach( (item, i) => {

        for ( var x = 0; x < (item.q || 1); x++ ) {

            var objMesh = item.f( starSystem.orbitPos( i / q ) );

            scene.add( objMesh );
            octree.add( objMesh );

            item.g && gravities.push( objMesh.userData );//add to gravity field
            item.l && scene.add( item.l( objMesh.position ) );
        }
    });

    octree.update();
}

function AsteroidPlain(p) {

    var v = new THREE.Vector3( p.z, 0, -p.x ).normalize().multiplyScalar( 100 );
    var r = Math.random() * 10;
    var m = r * r * r;

    var asteroid = new Asteroid( p, m );
    asteroid.velocity = v3Random( 10 ).add( v );

    return asteroid.mesh( r, 0x8030F0 );
}

function PlanetArid(p) {

    var r = Math.random() * 50;
    var m = r * r * r;

    var planet = new Planet( p, m );

    return planet.mesh( r, 0x80FFF0 );
}

function SunBlack(p) {

    var r = 100;
    var m = r * r * r;

    var sun = new Sun( p, m, 0xAAAAAA );

    return sun.mesh( r, 0xAAAA00 );
}

function LightWhite( pos ) {

    var light = new THREE.PointLight( 0xFFFFFF, 1, 0 );
    light.position = pos;

    return light;
}