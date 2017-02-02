function StarSystem() {

    var K_ECLIPTIC_FORCE = 100;//force pulling to ecliptic plane

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
            f : AsteroidPlain,
            q : 100
        },
        {
            f : PlanetArid,
            g : true,
            sputniks : [

                {f: MoonGray},
                {f: MoonGray},
            ]
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

        var f = new THREE.Vector3( 0, - obj.pos.y * K_ECLIPTIC_FORCE, 0 );//go to ecliplic plane

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

        var pos = p.add( MathHelper.v3Random( WORLD_SIZE * 0.2 ).setY( MathHelper.rand( -50, 50 ) ) );
        var asteroid = new Asteroid( pos, randomMassFromRadius( 1, 9 ), 0x8030F0 );
        asteroid.v = v.add( MathHelper.v3Random( 10 ) );

        return asteroid;
    }

    function MoonGray(p) {

        var v = new THREE.Vector3( p.z, 0, -p.x ).normalize().multiplyScalar( 50 );

        var moon = new Planet( p, randomMassFromRadius( 5, 10 ), 0xFF0000 );

        moon.v = v.add( MathHelper.v3Random( 10 ) );

        return moon;
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

    var self = this;

    function orbitPos(orbit, worldSize) {

        var p = MathHelper.v3Random( 1.0 );

        p.setY(0).normalize().multiplyScalar( orbit * worldSize );

        return p;
    }

    function addItem(item, pos) {

        var obj = item.f( pos );

        scene.add( obj.mesh );
        octree.add( obj.mesh );

        item.g && self.gravities.push( obj );//add to gravity field
        item.l && scene.add( item.l( obj.pos ) );
    }


    //var q = this.celestialsList.length;

    this.celestialsList.forEach( (item, i, arrPlanets) => {

        for ( var x = 0; x < (item.q || 1); x++ ) {

            var pPlanet = orbitPos( i / arrPlanets.length, WORLD_SIZE );

            addItem( item, pPlanet );

            item.sputniks && item.sputniks.forEach( (sputnik, j, arrSp) => {

                var pSputnik = orbitPos( j + 1 / arrSp.length, 0.5 * WORLD_SIZE / arrPlanets.length ).add( pPlanet );

                addItem( sputnik, pSputnik );
            });
            /*
            var obj = item.f( orbitPos( i / q ) );

            scene.add( obj.mesh );
            octree.add( obj.mesh );

            item.g && this.gravities.push( obj );//add to gravity field
            item.l && scene.add( item.l( obj.pos ) );
            */
        }
    });
};