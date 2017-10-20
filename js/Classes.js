function Player( id, isProxy ) {

    this.id = id;

    this.isMouseDown = 0;

    this.changeCallback = null;

    this.color = new THREE.Color().setHSL( ( Math.sin( id.toString().hashCode() ) + 1 ) * 0.5 /*0..1*/ , 0.5, 0.5 );

    this.isProxy = isProxy;

    this.fleet = new Fleet( this );

    this.score = 0;

    function Fleet( player ) {

        this.player = player;

        this.vesselsList = [

            {
                f: smallFighter,
                to: toPos
            }/*,
             {
             f: bigFighter,
             to: toZero
             }*/
        ];

        function smallFighter( p, color ) {

            return new Fighter( p, 3000, color );
        }

        function bigFighter( p, color ) {

            return new Fighter( p, 5000, color );
        }

        function toPos( pos ) {

            return pos;
        }

        function toZero() {

            return V3_ZERO.clone();
        }
    }

    Fleet.prototype.update = function( mousePos ) {

        this.vesselsList.forEach( (item ) => {

            var to = item.to( mousePos );
            item.obj.to = ( to && to.clone() );//where go to
        });
    };

    Fleet.prototype.start = function() {

        this.vesselsList.forEach( function( item ) {

            var obj = item.obj;

            obj.init();
            obj.pos = MathHelper.v3Random( R_START_DROP );
        });
    };

    Fleet.prototype.totalHits = function() {

        var hits = 0;

        this.vesselsList.forEach( function( item ) {

            hits += item.obj.hits;
        });

        return hits;
    };

    Fleet.prototype.initMeshes = function( color ) {

        var meshes = [];
        var self = this;

        this.vesselsList.forEach( (item ) => {

            var obj = item.f( null, color );

            obj.mesh.setToOctree = true;

            meshes.push( obj.mesh );

            //trail
            obj.initTrail();
            obj.player = self.player;

            obj.trailMeshes.forEach( function(item) {

                //scene.add( item );
                meshes.push( item );
            });

            item.obj = obj;//a link to vessel
        });

        return meshes;
    };
}

Player.prototype.update = function( dt ) {

    this.fleet.vesselsList.forEach( function ( item ) {

        var obj = item.obj;

        obj.updateTrail && obj.updateTrail( dt );
    });
};

Player.prototype.initMeshes = function() {

    //this.fleet.init( scene, octree, this.color );
    return this.fleet.initMeshes( this.color );
};

Player.prototype.getVessel = function() {

    return this.fleet.vesselsList[0].obj;
};

Player.prototype.setMouseDown = function() {

    this.isMouseDown++;

    this.change();
};

Player.prototype.setMouseUp = function() {

    this.isMouseDown = 0;

    this.change();
};

Player.prototype.pack = function() {

    var data = this.getVessel().pack();

    data.id = this.id;

    return data;
};

Player.prototype.unpack = function( data ) {

    data.id && data.id == this.id && this.getVessel().unpack( data );
};

Player.prototype.change = function() {

    this.changeCallback && this.changeCallback();
};

function MatObj(pos, mass) {

    this.pos = pos;
    this.turn = null;//new THREE.Vector3();

    this.mass = mass;
    this.v = null;//velocity
    //this.vTurn = null;//turn velocity

    this.mesh = new THREE.Mesh();
    this.pos && this.mesh.position.copy( this.pos );
    this.mesh.userData = this;//a link from mesh to this object
}

MatObj.prototype.resistForce = function( v ) {

    return v.clone().multiplyScalar( v.length() * K_SPACE_RESIST );
};

MatObj.prototype.velocityDelta = function( f, dt ) {

    return f.clone().multiplyScalar( dt / this.mass );
};

MatObj.prototype.newPos = function( dt ) {

    return this.v.clone().multiplyScalar( dt ).add( this.pos );
};

MatObj.prototype.getCameraPos = function( camera ) {

    return this.pos && this.pos.clone().project( camera ) || V3_ZERO.clone();
};

MatObj.prototype.getScreenPos = function( camera ) {

    var p = this.getCameraPos( camera );

    let widthHalf = V2_RESOLUTION.x * 0.5;
    let heightHalf = V2_RESOLUTION.y * 0.5;

    return new THREE.Vector2( ( p.x * widthHalf ) + widthHalf, - ( p.y * heightHalf ) + heightHalf );
};

MatObj.prototype.gravity = function(obj) {

    var r = obj.pos.clone().sub( this.pos );
    var rSq = r.lengthSq();

    return r.normalize().multiplyScalar( K_GRAVITY * this.mass * obj.mass / rSq );

};

MatObj.prototype.dive = function(obj2, depth) {

    if ( !this.v || !obj2 || !obj2.pos || !this.pos )//immovable
        return;

    var vNorm = obj2.pos.clone().sub( this.pos ).normalize();//from this to obj2

    var d = obj2.v ? depth * obj2.mass / (this.mass + obj2.mass) : depth;

    return vNorm.multiplyScalar( -d );
};

MatObj.prototype.bounce = function(obj2) {

    var vNorm = obj2.pos.clone().sub( this.pos ).normalize();//from this to obj2

    var v1n = vNorm.dot( this.v || V3_ZERO );//scalar value = velocity 1 projected on normal vector
    var v2n = vNorm.dot( obj2.v || V3_ZERO );//scalar value = velocity 2 projected on normal vector

    var v1Norm = vNorm.clone().multiplyScalar( v1n );//project velocity before collision onto normal
    var v1Tangent = this.v.clone().sub( v1Norm );//tangent velocity

    var v = ( v1n * ( this.mass - obj2.mass ) + ( 2 * obj2.mass * v2n ) ) / ( this.mass + obj2.mass );

    var newVelocity = vNorm.multiplyScalar( v );

    return newVelocity.add( v1Tangent );
};

MatObj.prototype.updateMesh = function() {

    /*движение по сфере-->
    function grad2rad( grad ) {

        return grad * Math.PI / 180;
    }

    var s = this.pos.length();//путь от центра
    var alpha = s * 180 / ( Math.PI * R_WORLD );//возвышение
    var epsilon = this.pos.angleTo( V3_UNIT_X ) || 0;//азимут

    var omega = new THREE.Euler( 0, -epsilon, grad2rad( alpha ), 'YZX' );

    /*var beta = ( 180 - alpha ) * 0.5;

    var gamma = grad2rad( 90 - beta );

    var a = s.x * Math.cos( gammaX );
    var b = s.x * Math.sin( gammaX );

    var v = new THREE.Vector2( a, b );*/

    this.turn && this.mesh.rotation.setFromVector3( this.turn );
    this.pos && this.mesh.position.copy( this.pos );
    //this.pos && this.mesh.position.copy( V3_UNIT_Y.clone().multiplyScalar( -R_WORLD ).applyEuler( omega ) );
};

MatObj.prototype.updateSpec = function() {

};

function extend(Child, Parent) {

    var F = function() { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
}

function Vessel( pos, mass, color ) {

    MatObj.apply( this, arguments );

    //this.v = new THREE.Vector3();//movable

    this.fJet = null;//jet force
    this.sTurn = null;//turn rad per sec

    this.to = new THREE.Vector3();//fly to. maintain direction if null

    this.ptJet = [];
    this.trailMeshes = [];
    this.trailLines = [];
    this.dtJet = 0;

    this.toughness = 1;
    this.hits = this.toughness;//toughness

    this.color = color;
    this.colorHue = this.color.getHSL().h;
    this.colorEdge = this.color.clone().setHSL( this.colorHue, 1, 0.5);
    this.colorPlane = this.color.clone().setHSL( this.colorHue, 1, 0.2);

    this.isFiring = false;

    this.lastHitBy = null;
}

extend( Vessel, MatObj );

Vessel.prototype.V3_FWD = new THREE.Vector3( 0, 0, 1 );

Vessel.prototype.init = function() {

    this.v = new THREE.Vector3();
    this.pos = new THREE.Vector3();
    this.turn = new THREE.Vector3();
    this.hits = this.toughness;
    this.lastHitBy = null;
    this.mesh.visible = true;
};

Vessel.prototype.pack = function() {

    return {

        p: this.pos && this.pos.toArray(),
        v: this.v && this.v.toArray(),
        t: this.turn && this.turn.toArray(),
        to: this.fwd().multiplyScalar( 10000 ).add( this.pos ).toArray(),
        f: this.isFiring,
        h: this.hits,
        agrid: this.lastHitBy
    }
};

Vessel.prototype.unpack = function( data ) {

    function set( to, from_array ) {

        to && from_array && to.fromArray( from_array );
    }

    //hard init
    ( !this.pos || !this.turn || !this.v || ( !this.mesh.visible && data.h > 0 ) ) && ( this.init() || set( this.pos, data.p ) || set( this.turn, data.t ) );// && this.initTrail();

    //soft update
    set( this.v, data.v );
    set( this.to, data.to );

    //alignment impulse
    var x = new THREE.Vector3();
    set( x, data.p );
    x.sub( this.pos ).multiplyScalar( 1 / SEC_TO_PEER_PT );
    this.v.add( x );

    this.isFiring = data.f;
    this.hits = data.h;

    this.lastHitBy = data.agrid;
};

Vessel.prototype.fwd = function() {

    return this.V3_FWD.clone().applyQuaternion( this.mesh.quaternion );

    //движение по сфере return this.V3_FWD.clone().applyEuler( this.turn );
};

Vessel.prototype.turnVec = function() {

    if ( !this.to )
        return V3_ZERO;

    var dir = this.to.clone().sub( this.pos ).normalize();

    var matInv = new THREE.Matrix4();
    matInv.getInverse( this.mesh.matrix );

    dir.transformDirection( matInv );//now v3Dir is in a vessel coordinate system

    return new THREE.Vector3( 0, dir.x, 0 );
    /*
    var grip = new THREE.Vector3( -dir.y, dir.x, 0 ).normalize();//x and y change as Y grip is about x-axis rotation

    grip.x = 0;//2d restrictions - restrict pitch

    var dot = dir.normalize().dot( this.V3_FWD );//-1..0..+1
    dot = Math.min( 1 - dot, 1 );//+1..+1..0

    grip.multiplyScalar( Math.sign( dot ) );
    grip.z = -grip.y;//2d restrictions - emulate roll

    //document.getElementById("buttonScreenMode").innerHTML = grip.y;

    return grip;
    */
};

//override
Vessel.prototype.updateSpec = function() {

    this.mesh.rotation.z *= 0.99;
};

Vessel.prototype.jetVec = function() {

    var v3x = new THREE.Vector3();
    var v3y = new THREE.Vector3();
    var v3z = new THREE.Vector3();

    this.mesh.matrix.extractBasis( v3x, v3y, v3z );

    return v3z.multiplyScalar( this.fJet );
};

Vessel.prototype.updateTrail = function(dt) {

    var self = this;
    //var pos = this.pos || V3_ZERO;
    var pos = this.mesh.position.clone() || V3_ZERO;

    var matrix = new THREE.Matrix4();
    matrix.extractRotation( self.mesh.matrix );

    this.dtJet += dt;
    if ( this.dtJet < 0.02 )
        return;

    this.dtJet = 0;

    this.ptJet.forEach( function( item, i ) {

        var pt = item.clone().applyMatrix4( matrix );
        self.trailLines[i].advance( pt.add( pos ) );
    });
};

Vessel.prototype.initTrail = function () {

    var trailWidth = 6;
    var material = new THREE.MeshLineMaterial( {
        color: new THREE.Color( this.colorEdge ),
        opacity:0.5,
        resolution: V2_RESOLUTION,
        sizeAttenuation: true,
        lineWidth: trailWidth,//see bellow override thickness
        near: 1,
        far: 100000,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        side: THREE.DoubleSide
    });

    var self = this;
    var pos = this.pos || V3_ZERO;

    this.ptJet.forEach( function( item ) {

        var geom = new THREE.Geometry();

        for ( var i = 0; i < Q_TRAIL_LEN; i++ ) {

            geom.vertices.push( item.clone().add( pos ) );
        }

        var line = new THREE.MeshLine();
        line.setGeometry( geom, function(p) { return p; } ); // makes width thinner

        var meshTrail = new THREE.Mesh( line.geometry, material ); // this syntax could definitely be improved!
        meshTrail.frustumCulled = false;//need because it save camera frustum at moment of creation

        self.trailLines.push( line );
        self.trailMeshes.push( meshTrail );
    });
};

/*Vessel.prototype.kill = function () {

    this.v = null;
};*/

function Fighter(pos, mass, color) {

    Vessel.apply( this, arguments );

    this.fJet = 900000;//this.mass * 80000;
    this.sTurn = 1.25;//radians per sec
    this.trailWidth = 4;
    //this.hits = 3;//toughness
    this.toughness = 3;//toughness

    var size = Math.cbrt( this.mass );

    var box1 = new THREE.BoxGeometry( size, size, size * 2, 0, 0, 0 );
    var box2 = new THREE.BoxGeometry( size * 2, size * 0.2, size, 0, 0, 0 );

    box1.merge( box2, new THREE.Matrix4().makeTranslation( 0, 0, -size) );

    this.mesh.geometry = box1;
    //this.mesh.material = new THREE.MeshLambertMaterial({color: 0x660138/*color*/, side: 2, shading: THREE.FlatShading});
    this.mesh.material = new THREE.MeshBasicMaterial( {color: this.colorPlane } );

    //edge geometry
    var geo = new THREE.EdgesGeometry( this.mesh.geometry ); // or WireframeGeometry( geometry )
    var mat = new THREE.LineBasicMaterial(
        {
            color: this.colorEdge,
            linewidth: 2,
            linecap: 'round', //ignored by WebGLRenderer
            linejoin:  'round' //ignored by WebGLRenderer
        } );
    var wireframe = new THREE.LineSegments( geo, mat );

    this.mesh.add( wireframe );


    this.ptJet = [ new THREE.Vector3( -size * 0.5 , 0, -size * 1.5), new THREE.Vector3( size * 0.5, 0, -size * 1.5) ];
}

extend ( Fighter, Vessel );

function Celestial (pos, radius, color) {

    MatObj.apply( this, arguments );

    //var radius = Math.cbrt( this.mass );
    this.radius = radius;
    this.mass = this.radius * this.radius * this.radius;
    this.color = color;

    this.mesh.geometry = new THREE.SphereGeometry(radius, 48, 48);
    //this.mesh.material = new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading});
    this.mesh.material = new THREE.MeshToonMaterial( {
        map: null,
        bumpMap: null,
        bumpScale: 1,
        color: this.color,
        specular: null,
        reflectivity: 0,
        shininess: 0,
        envMap: null
    } );


    //this.rWorld = 0;
    //this.axisUp = V3_UNIT_Y.clone();

    //this.parent = null;
}

extend( Celestial, MatObj );

function Asteroid(pos, radius, color) {

    Celestial.apply( this, arguments );
}

extend( Asteroid, Celestial );

function Planet( pos, radius, color ) {

    Celestial.apply( this, arguments );
}

extend( Planet, Celestial );


Planet.prototype.addAtmosphere = function( starSystem ) {

    if ( starSystem.rand() > 0.0 ) {

        var geometry = this.mesh.geometry.clone();

        var scale = starSystem.rand( 1.02, 1.09 );

        geometry.scale(scale, scale, scale);

        var material2 = THREEx.createAtmosphereMaterial().clone();
        var meshHalo = new THREE.Mesh(geometry, material2);

        material2.uniforms.glowColor.value = this.color.multiplyScalar( 5 );//starSystem.randColor().multiplyScalar( 5 );
        material2.uniforms.coeficient.value = 1.2;
        material2.uniforms.power.value = starSystem.rand( 0.9, 5.0 );

        this.mesh.add( meshHalo );
    }

    return this;
};

//override
/*
 Celestial.prototype.newPos = function( dt ) {

 return this.pos;

 //if ( !this.parent )
 //  return;

 //var r = this.pos.clone().sub( this.parent.pos );

 //return r.applyAxisAngle( this.axisUp, 0.1 * dt ).add( this.parent.pos );
 };*/

function Sun(pos, radius, color) {

    Celestial.apply( this, arguments );
}

extend( Sun, Celestial );

function StarSystem( id ) {

    this.id = id;
    this.Random = new RandomPool( this.id );

    this.gravities = [];
    this.gravities.f = function(obj) {

        var f = V3_ZERO.clone();
        //var f = new THREE.Vector3( 0, -obj.pos.y * K_ECLIPTIC_FORCE * obj.mass, 0 );//go to ecliplic plane


        //var f = obj.pos.clone().multiplyScalar( -K_CENTER_FORCE * obj.mass / R_WORLD );

        this.forEach( function (grav) {

            if ( obj.gravity )
                f.add( obj.gravity( grav ) );
        });

        return f;
    };
}

StarSystem.prototype.rand = function( min, max ) {

    return this.Random.get( min, max );
};

StarSystem.prototype.randV3 = function( length ) {

    return V3_UNIT_X.clone().applyEuler(
        new THREE.Euler(
            this.rand() * 2 * Math.PI,
            this.rand() * 2 * Math.PI,
            this.rand() * 2 * Math.PI,
            'XYZ')
    ).multiplyScalar( length || 1 );
};

StarSystem.prototype.randX0Z = function( length ) {

    return V3_UNIT_X.clone().applyEuler(
        new THREE.Euler(
            0,
            this.rand() * 2 * Math.PI,
            0,
            'YXZ')
    ).multiplyScalar( length || 1 );
};

/*StarSystem.prototype.randColor = function() {

    var min = 0.2;
    var max = 0.9;

    var self = this;

    function r() {

        return self.rand( min, max );
    }

    return new THREE.Color( r(), r(), r() );
};*/

StarSystem.prototype.randColor = function() {

    var self = this;

    function r( min, max ) {

        return self.rand() * (max - min) + min;
    }

    return new THREE.Color().setHSL( r(0,1), r(0.35,0.43), r(0.01,0.35) );
};
/*
StarSystem.prototype.initSkySprite = function( res ) {

    var self = this;

    function rPt( pt, r, pow ) {

        return Math.pow( self.rand(), pow || 1 ) * Math.sign( self.rand() - 0.5 ) * r + pt;
    }

    function spectre( x, min, max ) {

        return x * (max - min) + min;
    }

    function rSpectre( min, max ) {

        return spectre( self.rand(), min, max );
    }

    //var gradient = this.rand() > 0.5 ? { 0.0: 'white', 0.99: 'black' } : { 0.99: 'white', 0.0: 'black' };
    var gradient = { 0.99: 'white', 0.0: 'black' };

    var canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var heat = simpleheat( canvas );
    heat.clear();

    var size = Math.max( canvas.height, canvas.width );

    var qty = 200,
        oversize = 1.2,
        x = rSpectre( ( oversize - 1 ) * canvas.width, oversize * canvas.width ),
        y = rSpectre( ( oversize - 1 ) * canvas.height, oversize * canvas.height );

    //var randOpacity = spectre( Math.random() * Math.random(), 0.75, 0.1 );
    for (var i = 0; i < qty; i++) {

        var sparkForce = Math.random();//0..1
        heat.add([
            rPt( x, canvas.width, 2 ),
            rPt( y, canvas.height, 2 ),
            spectre( Math.pow( sparkForce, 8 ), 0.01, 0.19 ),// * randOpacity,//light
            spectre( Math.pow( sparkForce, 2 ), size * 0.235, size * 0.58 )//size
        ]);
        // set data of [[x, y, value], ...] format
        //heat.data(data);
    }

    //STARS
    for (var j = 0; j < 200; j++) {

        var sf = Math.random();//0..1
        heat.add([
            rSpectre( 0, canvas.width ),
            rSpectre( 0, canvas.height ),
            1,//size
            spectre( Math.pow( sf, 2 ), size * 0.001, size * 0.002 )//size
        ]);
    }

    heat.max(1);
    //heat.clear();
    heat.radius(1000, 0.27525 * ( canvas.width + canvas.height ));
    heat.gradient( gradient );// 0.35: 'blue', 0.5: 'red', 0.75: 'magenta', 1: 'black'} );
    // call in case Canvas size changed
    //heat.resize();
    heat.draw( 0.0000005 );

    var texHeat = new THREE.Texture(canvas);
    texHeat.needsUpdate = true;

    var matHeat = new THREE.SpriteMaterial({

        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: texHeat
        //color: 0xffffff
    });

    var sprite = new THREE.Sprite( matHeat );
    sprite.scale.set( window.innerWidth, window.innerHeight, 1 );

    //sprite.position.set(0, -10000, 1);
    //sprite.scale.set(canvas.width, canvas.height, 1);

    return sprite;
};
*/
/*
StarSystem.prototype.initSkybox = function() {

    var self = this;
    var ret = [];

    const P_STARS = [
        { size: 1.0, minQty: 1000,  maxQty: 2000, dist: -4000, color: 0xf0f0ff },
        { size: 2.0, minQty: 1000,  maxQty: 2000, dist: -10000, color: 0xd0d0df },
        { size: 8.0, minQty: 1000,  maxQty: 2000, dist: -14000, color:  0xa0a0af }
    ];

    //STARS!
    P_STARS.forEach( function( item ) {

         var qty = self.rand( item.minQty, item.maxQty );

         var dotMaterial = new THREE.PointsMaterial( { color: item.color, size: item.size, sizeAttenuation: true } );
         var dotGeometry = new THREE.Geometry();

         for (var s = 0; s < qty; s++) {

             dotGeometry.vertices.push( self.randV3( item.dist ) );//like a sphere
         }

         var dot = new THREE.Points( dotGeometry, dotMaterial );
         dot.frustumCulled = false;//need because it save camera frustum at moment of creation

        ret.push( dot );
    });

    return ret;
};
*/
StarSystem.prototype.initMeshes = function( camera ) {

    const Q_CELESTIALS_LIMIT = 90;
    const Q_PLANETS_MIN = 3;
    const Q_PLANETS_MAX = 8;
    const R_PLANET_MIN = 70;
    const R_PLANET_MAX = 100;
    const V3_SUN = new THREE.Vector3( R_GALAXY, R_GALAXY, 0 );
    const Q_MOONS_MAX = 4;
    const R_MOON_MIN = 10;
    const R_MOON_MAX = 20;
    const K_MOON_SPARSE_MIN = 3;
    const K_MOON_SPARSE_MAX = 4;
    const AXIS_MOON_MAX = 0.8;//rad
    //const Q_ASTEROIDS_MAX = 30;
    const R_ASTEROID_MIN = 3;
    const R_ASTEROID_MAX = 5;
    const V_ASTEROID_MAX = 20;//per sec

    var self = this;
    var meshes = [];

    function add( obj ) {

        obj.mesh.setToOctree = true;
        meshes.push( obj.mesh );

        return {

            setG: function() {

                self.gravities.push( obj );//add to gravity field

                return this;
            },

            setV: function( v ) {

                obj.v = v || V3_ZERO.clone();

                return this;
            },

            setAxis: function( axis ) {

                obj.axisUp = axis || V3_UNIT_Y.clone();

                return this;
            },

            setParent: function( parent ) {

                obj.parent = parent;

                return this;
            }
        }
    }

    function randOrbit( orbit ) {

        return self.randV3().setY( 0 ).normalize().multiplyScalar( orbit );
    }

    function randAxis( min, max ) {

        return new THREE.Euler( self.rand( min, max ), self.rand() * 2 * Math.PI, 0 );
    }

    /**PLANETS!*/
    var qPlanets = Math.floor( this.rand( Q_PLANETS_MIN, Q_PLANETS_MAX ) );
    for ( var j = 0; j < qPlanets; j++ ) {

        var radius = this.rand( R_PLANET_MIN, R_PLANET_MAX );
        var planet = new Planet( this.randV3( R_GALAXY ).setY( 0 ), radius, this.randColor() ).addAtmosphere( this );
        add( planet ).setG();

        /**Mooons*/
        var qMoons = Math.floor(this.rand(0, Q_MOONS_MAX));
        var orbit = planet.radius;

        for (var i = 0; i < qMoons; i++) {

            radius = this.rand(R_MOON_MIN, R_MOON_MAX);
            orbit += radius * this.rand(K_MOON_SPARSE_MIN, K_MOON_SPARSE_MAX);
            var moon = new Planet( randOrbit(orbit).applyEuler(randAxis(0, AXIS_MOON_MAX)).add( planet.pos ), radius, this.randColor());
            add(moon).setG();
        }
    }
    /**ASTEROIDS!*/
    var qAsteroids = Math.floor( this.rand( 0, Q_CELESTIALS_LIMIT - meshes.length /*Q_ASTEROIDS_MAX*/ ) );

    for ( var j = 0; j < qAsteroids; j++ ) {

        //var pos = randOrbit( orbit ).applyEuler( asteroidEuler ).add( this.randV3( R_ASTEROID_SPARSE ) );

        var asteroid = new Asteroid( this.randV3( this.rand( orbit, R_GALAXY ) ), this.rand( R_ASTEROID_MIN, R_ASTEROID_MAX ), this.randColor() );
        add( asteroid ).setV( this.randV3( this.rand( 0, V_ASTEROID_MAX ) ) );//.setAxis( rotationUp ).setParent( planet );
    }

    //dust
    const P_DUST = [
        { size: 2, minQty: 1000,  maxQty: 2000, dist: 0, color: 0xf0f0f0 },
        { size: 1.8, minQty: 1000,  maxQty: 2000, dist: -2000, color: 0xd0d0d0 },
        { size: 1.4, minQty: 1000,  maxQty: 2000, dist: -4000, color: 0xbfbfbf },
        { size: 1.2, minQty: 1000,  maxQty: 2000, dist: -8000, color: 0xa0a0a0 },
        { size: 1, minQty: 1000,  maxQty: 2000, dist: -16000, color: 0x888888 }
    ];
    P_DUST.forEach( function( item ) {

        var qty = self.rand( item.minQty, item.maxQty );

        var dotMaterial = new THREE.PointsMaterial( { color: item.color, size: item.size, sizeAttenuation: false } );
        var dotGeometry = new THREE.Geometry();

        for (var s = 0; s < qty; s++) {

            //dotGeometry.vertices.push( self.randV3( item.dist ) );//like a sphere
            dotGeometry.vertices.push( self.randX0Z( self.rand( R_GALAXY * 10 ) ).setY( item.dist ) );//like a sheet
        }

        var dot = new THREE.Points( dotGeometry, dotMaterial );
        dot.frustumCulled = false;//need because it save camera frustum at moment of creation

        meshes.push( dot );
    });
    //dust




    /*var asteroidEuler = randAxis( 0, AXIS_ASTEROID_MAX );
     var rotationUp = V3_UNIT_Y.clone().applyEuler( asteroidEuler ).normalize();
     orbit = this.rand( planet.radius + radius, orbit + radius );

     //var asteroidGravity = {};
     //asteroidGravity.pos = randOrbit( R_WORLD ).clone();
     //var r = randOrbit( orbit ).sub( asteroidGravity.pos ).length();

     for ( var j = 0; j < qAsteroids; j++ ) {

     var asteroid = new Asteroid( randOrbit( orbit ).applyEuler( asteroidEuler ).add( this.randV3( R_ASTEROID_SPARSE ) ), this.rand( R_ASTEROID_MIN, R_ASTEROID_MAX ), this.randColor() );
     add( asteroid ).setV().setAxis( rotationUp ).setParent( planet );
     }*/

    //LIGHT
    var light = new THREE.PointLight( 0xFFFFFF, 1 );
    light.position.copy( V3_SUN );

    //scene.add( light );
    meshes.push( light );


    return meshes;
};

function LoopedArray(qty, ms) {

    this.array = [];
    this.maxQty = qty;
    this.timeout = ms;

    this.nextIdx = 0;//newest to create
    this.lastIdx = 0;//oldest created
}

LoopedArray.prototype.now = function() {

    return Date.now();
};

LoopedArray.prototype.getNext = function( i ) {

    return ( i + 1 ) % this.maxQty;
};

LoopedArray.prototype.addItem = function(item) {

    //if ( this.getNext( this.nextIdx ) == this.lastIdx )//if nowhere
    if ( this.array[ this.nextIdx ] ) //if nowhere
        return false;//хуй

    item.created = this.now();
    this.array[ this.nextIdx ] = item;
    this.nextIdx = this.getNext( this.nextIdx );

    return true;
};

LoopedArray.prototype.pullLastOutOfTime = function() {

    var now = this.now();

    var last = this.array[ this.lastIdx ];

    if ( last && now - last.created > this.timeout ) {

        this.array[ this.lastIdx ] = undefined;

        this.lastIdx = this.getNext( this.lastIdx );

        return last;
    }

    return null;
};

LoopedArray.prototype.mapAll = function( func ) {

    if ( this.lastIdx < this.nextIdx ) {
        for ( var i = this.lastIdx; i < this.nextIdx; i++ ) {

            this.array[ i ] && func( this.array[ i ] );
        }
    } else
    {
        for ( var j = 0; j < this.nextIdx; j++ ) {

            this.array[ j ] && func( this.array[ j ] );
        }
        for ( var k = this.lastIdx; k < this.array.length; k ++ ) {

            this.array[ k ] && func( this.array[ k ] );
        }
    }
};

String.prototype.hashCode = function(){

    var hash = 0;
    if (this.length == 0) return hash;
    for (var i = 0; i < this.length; i++) {
        var character = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

function RandomPool( seed ) {

    this.seed = seed;

    this.get = function( max, min ) {

        max = max || 1;
        min = min || 0;

        this.seed = (this.seed * 9301 + 49297) % 233280;
        var rnd = Math.abs( this.seed / 233280 );

        return min + rnd * (max - min);
    }
};
