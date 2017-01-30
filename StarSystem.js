function StarSystem() {

    var K_ECLIPTIC_FORCE = 100;//force pulling to ecliptic plane

    this.celestialsList = [
        {
            f : SunBlack,
            g : true,
            l : LightWhite,
            p : null
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
            q : 100,
            p : 1 //index+1 of Parent - SunBlack
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
        }
    ];

    this.gravities = [];
    this.gravities.f = function(obj) {

        //var f = V3_ZERO.clone();

        var f = new THREE.Vector3( 0, - obj.pos.y * K_ECLIPTIC_FORCE * obj.mass, 0 );//go to ecliplic plane

        this.forEach( function (grav) {

            if ( obj.gravity )
                f.add( obj.gravity( grav ) );
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

        var asteroid = new Asteroid( p.add( v3Random(20) ), randomMassFromRadius( 1, 9 ), 0x8030F0 );
        asteroid.v = v;

        return asteroid;
    }

    function PlanetArid(p) {

        return new Planet( p, randomMassFromRadius( 5, 35 ), 0x80FFF0 );
    }

    function SunBlack(p) {

        return new Sun( p, randomMassFromRadius( 40, 50 ), 0xAAAAAA );
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
    var objList = [];

    this.celestialsList.forEach( (item, i) => {

        for ( var x = 0; x < (item.q || 1); x++ ) {

            var obj = item.f( orbitPos( i / q ) );
            objList.push( obj );//temp

            scene.add( obj.mesh );
            octree.add( obj.mesh );

            item.g && this.gravities.push( obj );//add to gravity field
            item.l && scene.add( item.l( obj.pos ) );
            item.p && obj.setParent( objList[ item.p - 1 ] );//set gravity parent
        }
    });
};