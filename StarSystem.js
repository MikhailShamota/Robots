function StarSystem() {

    this.celestialsList = [
        {
            f : SunBlack,
            g : true,
            l : LightWhite
        },
        {
            f : PlanetArid,
            g : true
        },
        {
            f : PlanetArid,
            g : true
        },
        {
            f : PlanetArid,
            g : true
        },
        {
            f : PlanetArid,
            g : true
        },
        {
            f : AsteroidPlain,
            q : 100
        },
        {
            f : PlanetArid,
            g : true
        }
    ];

    this.gravities = [];
    this.gravities.f = function (obj) {

        var f = V3_ZERO.clone();

        this.forEach(function (grav) {

            f.add(obj.gravity(grav));
        });

        return f;
    };
}

StarSystem.prototype.init = function(scene, octree) {

    var q = this.celestialsList.length;

    this.celestialsList.forEach( (item, i) => {

        for ( var x = 0; x < (item.q || 1); x++ ) {

            var objMesh = item.f( this.orbitPos( i / q ) );

            scene.add( objMesh );
            octree.add( objMesh );

            item.g && this.gravities.push( objMesh.userData );//add to gravity field
            item.l && scene.add( item.l( objMesh.position ) );
        }
    });
}

StarSystem.prototype.orbitPos = orbit => {

    var p = v3Random( 1.0 );

    p.multiply( new THREE.Vector3(1,0,1) ).normalize().multiplyScalar( orbit * WORLD_SIZE );//p.Y = 0

    return p;
};

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