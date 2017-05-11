function StarSystem() {

    var K_CENTER_FORCE = 20;//force pulling to ecliptic plane

    this.celestialsList = [
        {
            f: SunBlack,
            g: true,
            l: LightWhite,
            r: 1000,
            sputniks: [
                {
                    f: PlanetArid,
                    g: true,
                    r: 100
                },
                {
                    f: PlanetArid,
                    g: true,
                    r: 100
                },
                {
                    f: AsteroidPlain,
                    q: 20,
                    r: 200
                },
                {
                    f: AsteroidPlain,
                    q: 40,
                    r: 100
                },
                {
                    f: PlanetArid,
                    g: true,
                    r: 200,
                    sputniks: [

                        {f: MoonGray},
                        {f: MoonGray}
                    ]
                },
                {
                    f: PlanetArid,
                    g: true
                },
                {
                    f: PlanetArid,
                    g: true
                }
            ]
        }
    ];

    this.gravities = [];
    this.gravities.f = function(obj) {

        //var f = V3_ZERO.clone();

        //var f = new THREE.Vector3( 0, -obj.pos.y * K_ECLIPTIC_FORCE * obj.mass, 0 );//go to ecliplic plane
        var f = obj.pos.clone().multiplyScalar( -K_CENTER_FORCE * obj.mass / WORLD_SIZE );

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

        var asteroid = new Asteroid( p, randomMassFromRadius( 1, 9 ), 0x8030F0 );

        return asteroid;
    }

    function MoonGray(p) {

        //var v = new THREE.Vector3( p.z, 0, -p.x ).normalize().multiplyScalar( 50 );

        var moon = new Planet( p, randomMassFromRadius( 5, 10 ), 0xFF0000 );

        //moon.v = v.add( MathHelper.v3Random( 10 ) );

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

    function parseItems( parent, children ) {


        function orbitVelocity( parent, child ) {

            var fG = parent.gravity( child );

            var r = parent.pos.clone().sub( child.pos );
            var rLen = r.length();

            return new THREE.Vector3( r.z, 0, -r.x ).normalize().multiplyScalar( Math.sqrt( fG.length() * rLen / child.mass ) );
        }


        children && children.forEach( (item, i, arr) => {

            for ( var x = 0; x < ( item.q || 1 ); x++ ) {

                var pos = parent ? MathHelper.v3Random( 1.0 ).setY( 0 ).normalize().multiplyScalar( ( i + 1 / arr.length ) * ( parent.rWorld / arr.length ) ).add( parent.pos ) : V3_ZERO;

                var obj = item.f( pos );

                scene.add( obj.mesh );
                octree.add( obj.mesh );

                item.g && self.gravities.push( obj );//add to gravity field
                item.l && scene.add( item.l( obj.pos ) );//lights
                obj.rWorld = item.r;//object space
                obj.v = !item.g && parent && orbitVelocity( parent, obj );//velocity
                obj.parent = parent;

                item.sputniks && parseItems( obj, item.sputniks );
            }
        });
    }

    parseItems( null, this.celestialsList );

    /*this.celestialsList.forEach( (planet, i, arrPlanets) => {

        for ( var x = 0; x < (planet.q || 1); x++ ) {

            var pPlanet = orbitPos( i / arrPlanets.length, WORLD_SIZE );

            addItem( planet, pPlanet,  );

            item.sputniks && item.sputniks.forEach( (sputnik, j, arrSp) => {

                var pSputnik = orbitPos( j + 1 / arrSp.length, 0.5 * WORLD_SIZE / arrPlanets.length ).add( pPlanet );

                addItem( sputnik, pSputnik, planet );
            });
        }
    });*/
};