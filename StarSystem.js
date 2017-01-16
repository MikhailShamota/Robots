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
    this.gravities.f = function(obj) {

        var f = V3_ZERO.clone();

        this.forEach(function (grav) {

            f.add(obj.gravity(grav));
        });

        return f;
    };

    function r2m(r) {

        return r * r * r;
    }

    function randomFromTo(min, max) {

        return ( Math.random() * (max - min) ) + min;
    }

    function randomMassFromRadius(min, max) {

        return r2m( randomFromTo( min, max ) );
    }

    function AsteroidPlain(p) {

        var v = new THREE.Vector3( p.z, 0, -p.x ).normalize().multiplyScalar( 50 );

        var asteroid = new Asteroid( p, randomMassFromRadius( 1, 5 ) );
        asteroid.velocity = v3Random( 10 ).add( v );

        return asteroid.mesh( 0x8030F0 );
    }

    function PlanetArid(p) {

        var planet = new Planet( p, randomMassFromRadius( 5, 35 ) );

        return planet.mesh( 0x80FFF0 );
    }

    function SunBlack(p) {

        var sun = new Sun( p, randomMassFromRadius( 50, 90 ), 0xAAAAAA );

        return sun.mesh( 0xAAAA00 );
    }

    function LightWhite( pos ) {

        var light = new THREE.PointLight( 0xFFFFFF, 1, 0 );
        light.position = pos;

        return light;
    }
}

StarSystem.prototype.init = function(scene, octree) {

    function orbitPos(orbit) {

        var p = v3Random( 1.0 );

        p.multiply( new THREE.Vector3(1,0,1) ).normalize().multiplyScalar( orbit * WORLD_SIZE );//p.Y = 0

        return p;
    }

    var q = this.celestialsList.length;

    this.celestialsList.forEach( (item, i) => {

        for ( var x = 0; x < (item.q || 1); x++ ) {

            var objMesh = item.f( orbitPos( i / q ) );

            scene.add( objMesh );
            octree.add( objMesh );

            item.g && this.gravities.push( objMesh.userData );//add to gravity field
            item.l && scene.add( item.l( objMesh.position ) );
        }
    });
};