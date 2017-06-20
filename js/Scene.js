//TODO:возраждаться и не стрелять пока умер
//TODO:autoscale - сделать все крупнее
//TODO:autorotate
var PeerServer = ( function() {

    const myKey = 'qxh7qp1coby8ehfr';
    var peer;
    var conn;

    var myPeerId;

    var callbackOpen;
    var callbackReceive;
    var callbackConnect;

    function initConn( dataConn ) {

        conn = dataConn;

        //console.log('got connect from: '+dataConn.peer);
        conn.on('open', function() {

            console.log('conn opened');
            conn.send('hi!');
            callbackConnect && callbackConnect();
        });

        // Receive messages
        conn.on('data', function(data) {

            callbackReceive && callbackReceive( conn.peer, data );
            !callbackReceive && console.log('Received from ' + conn.peer, data);
        });
    }

    function peerOpen() {

        peer = new Peer({key: myKey});
        peer.on('open', function(id) {

            myPeerId = id;
            console.log('My peer ID is: ' + id);
            callbackOpen && callbackOpen(id);
        });

        //Receive connection
        peer.on('connection', function(dataConn) {

            initConn(dataConn);
        });
    }

    function peerConnect( peerid ) {

        initConn( peer.connect( peerid ) );
    }

    function peerSend( data ) {

        //add some tech data if needed
        conn && conn.send( data );
    }

    return {

        //open connection to PeerJs server
        open : function() {

            peerOpen();
        },

        //connect to peerid
        connect : function( peerid ) {

            peerConnect( peerid );
        },

        //send data to everyone connected
        send : function( data ) {

            peerSend( data );
        },

        //getPeerId
        getMyPeerId : function() {

            return myPeerId;
        },

        setCallbackOpen( func ) {

            callbackOpen = func;
        },

        setCallbackConnect( func ) {

            callbackConnect = func;
        },

        setCallbackReceive( func ) {

            callbackReceive = func;
        }
    }
} () );

var Scene = (function () {

    var V2_RESOLUTION;

        //constants
    const MSEC_IN_SEC = 1000;

    const V3_ZERO = new THREE.Vector3(0, 0, 0);
    const V3_UNIT_X = new THREE.Vector3(1, 0, 0);
    const V3_UNIT_Y = new THREE.Vector3(0, 1, 0);
    const V3_UNIT_Z = new THREE.Vector3(0, 0, 1);


    var instance;

    var stats, controls, camera, renderer;
    var scene, octree;

    var clock = new THREE.Clock();
    var nowTime = Date.now();

    var starSystem;

    var players = [];

    var iPlayer = function() { return players[ iPlayer.id ] };//i am player
    iPlayer.id = null;//i am index
    iPlayer.lastPeerSent = 0;
    iPlayer.onChange = function() {

        this.getVessel().isFiring = this.isMouseDown;

        send();
    };

    function send() {

        if ( nowTime - this.lastPeerSent < SEC_EXCH_PERIOD * MSEC_IN_SEC )
            return;

        PeerServer.send( iPlayer().pack() );

        this.lastPeerSent = nowTime;
    }

    var loopedArrays = {

        collection : {

            "lasers": new LoopedArray( 100, 1150 ),//100 qty, 30 ms to live
            "hits": new LoopedArray( 100, 40 ),
            "explosions": new LoopedArray( 10, 50 )
        }
    };

    loopedArrays.add2scene = function( arr, obj ) {

        this.collection[ arr ].addItem( obj ) && scene.add( obj );
    };

    loopedArrays.update = function() {

        for ( var arr in this.collection ) {

            var old = this.collection[ arr ].pullLastOutOfTime();
            old && scene.remove( old );
        }
    };

    var Textures = {

        loader: new THREE.TextureLoader(),
        collection: {},
        add: function(file, func) {

            var tex = this.collection[ file ];

            if ( tex )
                return func && func( tex ) || !func && tex;

            var self = this;

            this.loader.load(
                file,
                function (texture) {

                    self.collection[ file ] = texture;
                    return func && func( texture ) || !func && tex;
                },
                function (xhr) {

                    //console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
                    console.log( 'load "' + file + '" OK' );
                },
                function (xhr) {

                    console.log( 'load "' + file + '" failed' );
                }
            );
        }
    };

    function StarSystem( id ) {

        this.id = id;
        this.Random = new RandomPool( this.id );

        this.gravities = [];
        this.gravities.f = function(obj) {

            //var f = V3_ZERO.clone();

            //var f = new THREE.Vector3( 0, -obj.pos.y * K_ECLIPTIC_FORCE * obj.mass, 0 );//go to ecliplic plane
            var f = obj.pos.clone().multiplyScalar( -K_CENTER_FORCE * obj.mass / R_WORLD );

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

    StarSystem.prototype.randColor = function() {

        var min = 0.2;
        var max = 0.9;

        var self = this;

        function r() {

            return self.rand( min, max );
        }

        return new THREE.Color( r(), r(), r() );
    };

    StarSystem.prototype.initMeshes = function() {

        const R_PLANET_MIN = 70;
        const R_PLANET_MAX = 100;
        const K_SUN_ECLISPE_ASCEND = 0.5;
        const Q_MOONS_MAX = 5;
        const R_MOON_MIN = 10;
        const R_MOON_MAX = 20;
        const K_MOON_SPARSE_MIN = 3;
        const K_MOON_SPARSE_MAX = 4;
//const K_MOON_ECLIPSE_ASCEND = 0.15;
        const AXIS_MOON_MAX = 0.8;//rad
        const Q_ASTEROIDS_MAX = 100;
        const R_ASTEROID_MIN = 3;
        const R_ASTEROID_MAX = 5;
//const AXIS_ASTEROID_MAX = 1.0;//rad
//const R_ASTEROID_SPARSE = 20;//disperse
        const V_ASTEROID_MAX = 20;//per sec
        const Q_STARS_MIN = 400;
        const Q_STARS_MAX = 4000;
        const R_STARS_MIN = 0.3;
        const R_STARS_MAX = 3;
        const P_STARS = [
            { size: 0.5, minQty: 5000, maxQty: 10000},
            { size: 1.0, minQty: 2000,  maxQty: 5000},
            { size: 2.0, minQty: 500,  maxQty: 2000}
        ];

        var self = this;
        var meshes = [];

        function add( obj ) {

            //scene.add( obj.mesh );
            //octree.add( obj. mesh );
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

        var radius = this.rand( R_PLANET_MIN, R_PLANET_MAX );
        var planet = new Planet( V3_ZERO.clone(), radius, this.randColor() );
        add( planet ).setG();

        var qMoons = Math.floor( this.rand( 0, Q_MOONS_MAX ) );
        var orbit = planet.radius;

        for ( var i = 0; i < qMoons; i++ ) {

            radius = this.rand( R_MOON_MIN, R_MOON_MAX );
            orbit += radius * this.rand( K_MOON_SPARSE_MIN, K_MOON_SPARSE_MAX );
            var moon = new Planet( randOrbit( orbit ).applyEuler( randAxis( 0, AXIS_MOON_MAX ) ), radius, this.randColor() );
            add( moon ).setG();
        }

        var qAsteroids = Math.floor( this.rand( 0, Q_ASTEROIDS_MAX ) );

        for ( var j = 0; j < qAsteroids; j++ ) {

            //var pos = randOrbit( orbit ).applyEuler( asteroidEuler ).add( this.randV3( R_ASTEROID_SPARSE ) );

            var asteroid = new Asteroid( this.randV3( this.rand( orbit, R_WORLD ) ), this.rand( R_ASTEROID_MIN, R_ASTEROID_MAX ), this.randColor() );
            add( asteroid ).setV( this.randV3( this.rand( 0, V_ASTEROID_MAX ) ) );//.setAxis( rotationUp ).setParent( planet );
        }

        var qStars = this.rand( Q_STARS_MIN, Q_STARS_MAX );

        P_STARS.forEach( function( item ) {

            var qty = self.rand( item.minQty, item.maxQty );
            var dotMaterial = new THREE.PointsMaterial( { color: 0xffffff, size: item.size, sizeAttenuation: false } );
            var dotGeometry = new THREE.Geometry();
            for (var s = 0; s < qty; s++) {

                dotGeometry.vertices.push( self.randV3( R_GALAXY ) );
            }
            var dot = new THREE.Points( dotGeometry, dotMaterial );
            //scene.add( dot );
            meshes.push( dot );
        });



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
        var light = new THREE.PointLight( 0xFFFFFF, 1, 0 );
        light.position.copy( this.randV3( R_WORLD ).setY( this.rand( -K_SUN_ECLISPE_ASCEND, K_SUN_ECLISPE_ASCEND ) * R_WORLD ) );

        //scene.add( light );
        meshes.push( light );


        return meshes;
    };

    function Flare( pos, size, color, texture ) {

        var material	= new THREE.SpriteMaterial( {

            map: texture && Textures.add( texture ),
            color : color,
            blending : THREE.AdditiveBlending,
            transparent: true
        } );

        var sprite	= new THREE.Sprite( material );
        sprite.scale.set( size, size, size );

        sprite.position.copy( pos );

        var object3d = new THREE.Object3D( );
        object3d.add( sprite );

        // add a point light
        // тормозит
        /*var light	= new THREE.PointLight( color );

         light.intensity	= 1;
         light.distance	= size * 5;
         light.position.copy( pos );

         sprite.add( light );*/

        return object3d;
    }

    function Beam( ray, length ) {

        var material = new THREE.MeshLineMaterial( {

            color: new THREE.Color( "rgb( 255, 255, 2 )" ),
            opacity: 0.5,
            resolution: V2_RESOLUTION,
            sizeAttenuation: 1,
            lineWidth: 2,
            near: 1,
            far: 100000,
            depthTest: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            side: THREE.DoubleSide
        } );

        const beamLen = 50;
        var geom = new THREE.Geometry( );

        geom.vertices.push( ray.origin.clone( ) );
        geom.vertices.push( ray.origin.clone( ).add( ray.direction.clone( ).multiplyScalar( beamLen ) ) );

        var line = new THREE.MeshLine( );
        line.setGeometry( geom );

        var mesh = new THREE.Mesh( line.geometry, material ); // this syntax could definitely be improved!*/

        mesh.source_dir = ray.direction.clone();
        mesh.source_length = length - beamLen;

        return mesh;
    }

    function BeamMove( mesh ) {

        const speed = 100;
        var add = mesh.source_dir.clone().multiplyScalar( speed );

        mesh.source_length -= speed;

        //impact
        if ( mesh.source_length <= 0 ) {

            mesh.position.x = undefined;//hide
            return;
        }

        mesh.position.add( add );//move
    }

    const R_WORLD = 1000;
    const R_GALAXY = 100000;
    const C_BACKGROUND = 0x181818;
    const V_CAMERA = 10;//camera speed to zoom
    const R_CAMERA_MIN = 2000;//base camera pos Y
    const R_CAMERA_FADE_DIST = 500;//slowing going dist

    const K_GRAVITY = 2;
    const K_SPACE_RESIST = 10;
    const VELOCITY_LIMIT_PER_SEC = 100;
    const K_CENTER_FORCE = 20;//force pulling to ecliptic plane



    const SEC_EXCH_PERIOD = 0.1;//peer-to-peer message send period

    const SEC_TO_PEER_PT = 3;//seconds to reach peer point. More to smooth, less to precision

    var eclipticPlane = new THREE.Plane( new THREE.Vector3( 0, 1, 0 ) );
    var v2MousePoint = new THREE.Vector2();
    var v3MousePoint = new THREE.Vector3();

    var cursor = new THREE.Mesh( new THREE.PlaneGeometry( 50, 50 ) );

    function Player( id ) {

        this.id = id;

        this.isMouseDown = 0;

        this.changeCallback = null;

        this.color = new THREE.Color().setHSL( ( Math.sin( id.hashCode() ) + 1 ) * 0.5 /*0..1*/ , 0.5, 0.5 );

        this.fleet = new Fleet();

        function Fleet() {

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
                obj.pos = MathHelper.v3Random( R_WORLD );
            });
        };

        Fleet.prototype.initMeshes = function( color ) {

            var meshes = [];

            this.vesselsList.forEach( (item, i ) => {

                var obj = item.f( /*startPos( i )*/null, color );

                //scene.add( obj.mesh );
                //octree.add( obj.mesh );
                obj.mesh.setToOctree = true;
                meshes.push( obj.mesh );

                //trail
                obj.initTrail();
                obj.trailMeshes.forEach( function(item) {

                    //scene.add( item );
                    meshes.push( item );
                });

                item.obj = obj;//a link to vessel
            });

            //octree.update();
            return meshes;
        };
    }

    Player.prototype.update = function( dt ) {

        var self = this;

        this.fleet.vesselsList.forEach( function ( item ) {

            var obj = item.obj;

            obj.updateTrail && obj.updateTrail( dt );

            obj.hits > 0 && obj.isFiring && ( nowTime - obj.lastFired > 50 || ! obj.lastFired ) && fire( obj, self.id != iPlayer.id );//do not calc damage from my vessels, only on my vessel
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

        if ( !this.v )//immovable
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

        this.turn && this.mesh.rotation.setFromVector3( this.turn );
        this.pos && this.mesh.position.copy( this.pos );

        //this.mesh.rotation.setFromVector3( this.mesh.rotation.toVector3().lerp( this.turn, 0.03 ) );
        //this.mesh.position.lerp( this.pos, 0.03 );
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
        this.trailWidth = 4;

        this.hits = 1;//toughness

        this.color = color;

        this.isFiring = false;
    }

    extend( Vessel, MatObj );

    Vessel.prototype.V3_FWD = new THREE.Vector3( 0, 0, 1 );

    Vessel.prototype.init = function() {

        this.v = new THREE.Vector3();
        this.pos = new THREE.Vector3();
        this.turn = new THREE.Vector3();
    };

    Vessel.prototype.pack = function() {

        return {

            p: this.pos && this.pos.toArray(),
            v: this.v && this.v.toArray(),
            t: this.turn && this.turn.toArray(),
            to: this.fwd().multiplyScalar( 10000 ).add( this.pos ).toArray(),
            f: this.isFiring,
            h: this.hits
        }
    };

    Vessel.prototype.unpack = function( data ) {

        function set( to, from_array ) {

            to && from_array && to.fromArray( from_array );
        }

        //hard init
        ( !this.pos || !this.turn || !this.v ) && ( this.init() || set( this.pos, data.p ) || set( this.turn, data.t ) );// && this.initTrail();

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
    };

    Vessel.prototype.fwd = function() {

        return this.V3_FWD.clone().applyQuaternion( this.mesh.quaternion );
    };

    Vessel.prototype.turnVec = function() {

        if ( !this.to )
            return V3_ZERO;

        var dir = this.to.clone().sub( this.pos ).normalize();

        var matInv = new THREE.Matrix4();
        matInv.getInverse( this.mesh.matrix );

        dir.transformDirection( matInv );//now v3Dir is in a vessel coordinate system

        var grip = new THREE.Vector3( -dir.y, dir.x, 0 ).normalize();//x and y change as Y grip is about x-axis rotation

        grip.x = 0;//2d restrictions - restrict pitch

        var dot = dir.normalize().dot( this.V3_FWD );//-1..0..+1
        dot = Math.min( 1 - dot, 1 );//+1..+1..0

        grip.multiplyScalar( Math.sign( dot ) /** this.fTurn*/ );
        grip.z = -grip.y;//2d restrictions - emulate roll

        return grip;
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
        var pos = this.pos || V3_ZERO;

        var matrix = new THREE.Matrix4();
        matrix.extractRotation( self.mesh.matrix );

        this.dtJet += dt;
        if ( this.dtJet < 0.02 )
            return;

        this.dtJet = 0;

        this.ptJet.forEach( function(item, i) {

            var pt = item.clone().applyMatrix4( matrix );
            self.trailLines[i].advance( pt.add( pos ) );
        });
    };

    Vessel.prototype.initTrail = function () {

        var material = new THREE.MeshLineMaterial( {
            color: new THREE.Color( this.color ),
            opacity: 0.5,
            resolution: V2_RESOLUTION,
            sizeAttenuation: 1,
            lineWidth: this.trailWidth,
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

            for ( var i = 0; i < 100; i++ ) {

                geom.vertices.push( item.clone().add( pos ) );
            }

            var line = new THREE.MeshLine();
            line.setGeometry( geom, function(p) { return p; } ); // makes width thinner

            var meshTrail = new THREE.Mesh( line.geometry, material ); // this syntax could definitely be improved!
            //trail_mesh.frustumCulled = false;

            self.trailLines.push( line );
            self.trailMeshes.push( meshTrail );
        });
    };

    Vessel.prototype.kill = function () {

        this.v = null;
    };

    function Fighter(pos, mass, color) {

        Vessel.apply( this, arguments );

        this.fJet = 1200000;//this.mass * 80000;
        this.sTurn = 5.25;//radians per sec
        this.trailWidth = 4;
        this.hits = 3;//toughness

        var size = Math.cbrt( this.mass );

        var box1 = new THREE.BoxGeometry( size, size, size * 2, 0, 0, 0 );
        var box2 = new THREE.BoxGeometry( size * 2, size * 0.2, size, 0, 0, 0 );

        box1.merge( box2, new THREE.Matrix4().makeTranslation( 0, 0, -size) );

        this.mesh.geometry = box1;
        this.mesh.material = new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading});

        this.ptJet = [ new THREE.Vector3( -size * 0.5 , 0, -size * 1.5), new THREE.Vector3( size * 0.5, 0, -size * 1.5) ];
    }

    extend ( Fighter, Vessel );

    function Celestial (pos, radius, color) {

        MatObj.apply( this, arguments );

        //var radius = Math.cbrt( this.mass );
        this.radius = radius;
        this.mass = this.radius * this.radius * this.radius;

        this.mesh.geometry = new THREE.SphereGeometry(radius, 32, 32);
        this.mesh.material = new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading});

        //this.rWorld = 0;
        //this.axisUp = V3_UNIT_Y.clone();

        //this.parent = null;
    }

    extend( Celestial, MatObj );

    function Asteroid(pos, radius, color) {

        Celestial.apply( this, arguments );
    }

    extend( Asteroid, Celestial );

    function Planet(pos, radius, color) {

        Celestial.apply( this, arguments );
    }

    extend( Planet, Celestial );

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




    function updateCollision() {

        var setter = [];

        octree.objectsData.forEach( octreeObj => {

            var mesh = octreeObj.object;
            var matObj = mesh.userData;

            if ( !matObj.v )//immovable
                return;

            octree.search( octreeObj.position, octreeObj.radius ).forEach( octreeObj2 => {

                var mesh2 = octreeObj2.object;
                var matObj2 = mesh2.userData;

                if (mesh.id == mesh2.id)
                    return;

                var depth = octreeObj2.radius + octreeObj.radius - mesh.position.distanceTo( mesh2.position );

                if ( depth > 0 ) {//bounce

                    matObj.pos.add( matObj.dive( matObj2, depth ) );

                    setter.push({
                        obj: matObj,
                        v: matObj.bounce( matObj2 )
                    });
                }
            });
        });

        setter.forEach(function (obj) {

            obj.obj.v.copy( obj.v );
        });
    }

    function addHit( pt ) {

        loopedArrays.add2scene(

            "hits",
            Flare( pt, 100, 0xffff00, 'res/blue_particle.jpg' )
        );
    }

    function addExplosion( pt ) {

        loopedArrays.add2scene(

            "explosions",
            Flare( pt, 400, 0xffbb11, 'res/blue_particle.jpg' )
        );
    }

    function addShot( ray, dist ) {

        loopedArrays.add2scene(

            "lasers",
            Beam( ray, dist )
        );

    }

    function updateMove(dt) {

        function killObject( obj ) {

            obj.kill();

            addExplosion( obj.pos );

            scene.remove( obj.mesh );
            octree.remove( obj.mesh );
        }

        function getForces( obj ) {

            var fJet = obj.jetVec && obj.jetVec() || V3_ZERO.clone();
            var fGravity = starSystem.gravities.f( obj ) || V3_ZERO.clone();

            var fResist = obj.resistForce( obj.v ) || V3_ZERO.clone();

            return fGravity.add( fJet ).sub( fResist );
        }

        //ECLIPTIC PLANE INEXORABLE PULL
        function goEcliptic( obj ) {

            obj.pos.y *= 0.099;
        }

        octree.objectsData.forEach( octreeObj => {

            //var mesh = octreeObj.object;
            //var obj = mesh.userData;//mesh.userData => MatObj
            var obj = octreeObj.object.userData;//octree -> object -> mesh -> userData => MatObj

            //CHECK & KILL & REMOVE
            obj.hits <= 0 && killObject( obj );

            //TURN
            if ( obj.turn )
                obj.turn.y += ( obj.turnVec && obj.turnVec() || V3_ZERO ).multiplyScalar( obj.sTurn * dt ).y;

            //VELOCITY & POSITION
            obj.v && obj.pos && obj.v.add( obj.velocityDelta( obj.jetVec && getForces( obj ) || V3_ZERO.clone(), dt ).clampLength( 0, VELOCITY_LIMIT_PER_SEC * dt ) ) && obj.pos.copy( obj.newPos( dt ) ) /*&& !obj.axisUp*/ && goEcliptic( obj );

            obj.updateMesh();
            obj.updateSpec();
        });
    }

    function updateMouse() {

        var raycaster = new THREE.Raycaster();

        raycaster.setFromCamera( v2MousePoint, camera );

        v3MousePoint = raycaster.ray.intersectPlane( eclipticPlane );

        if ( v3MousePoint )
            cursor.position.copy( v3MousePoint );
    }

    function updateTarget() {

        iPlayer().fleet.update( v3MousePoint || V3_ZERO );
    }

    function updateLasersMove() {

        loopedArrays.collection[ "lasers" ].mapAll( BeamMove );
    }

    function update() {

        nowTime = Date.now();

        var dt = clock.getDelta();//its in seconds
        clock.start();

        //controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
        stats.update();

        ////
        updateMouse();//get mouse position

        updateTarget();//update vessels movement direction

        updateCollision();//check and process MatObj collisions

        updateMove( dt );//update MatObj physics

        camera.position.add( camera.y() );

        loopedArrays.update();

        for ( var playerId in players ) {

            players[ playerId ].update( dt );
        }

        updateLasersMove();

        send();

        octree.rebuild();
    }

    function fire( from, doDamage ) {

        var raycaster = new THREE.Raycaster( from.pos, from.fwd() );

        var octreeObjects = octree.search(
            raycaster.ray.origin,
            raycaster.ray.far,
            false/*false to get geometry info*/,
            raycaster.ray.direction );

        var hits = 0;
        var dist = R_GALAXY;

        octreeObjects && octreeObjects.forEach( function( item ) {

            var mesh = item.object;
            if ( mesh.id == from.mesh.id || hits > 0 )
                return;

            var intersects = raycaster.intersectObject( mesh );
            if ( intersects.length > 0) {

                hits++;
                doDamage && mesh.userData.hits--;
                dist = intersects[ 0 ].distance;

                addHit( intersects[ 0 ].point );
            }else{
            }
        });

        addShot( raycaster.ray, dist );

        from.lastFired = nowTime;
    }

    function onMouseUpdate( event ) {

        v2MousePoint.x = ( ( event.pageX - renderer.context.canvas.offsetLeft ) / window.innerWidth ) * 2 - 1;
        v2MousePoint.y = - ( ( event.pageY - renderer.context.canvas.offsetTop ) / window.innerHeight ) * 2 + 1;
    }

    function onMouseClick( event ) {

        //console.log( iPlayer().getVessel().getScreenPos( camera ) );
    }

    function onMouseDown( event ) {

        iPlayer().setMouseDown();
    }

    function onMouseUp( event ) {

        //isMouseDown = 0;
        iPlayer().setMouseUp();
    }

    function initializeGL() {

        scene = new THREE.Scene();
        var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

        camera = new THREE.PerspectiveCamera(75, window.width / window.height, 0.1, R_GALAXY * 2 );
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();

        camera.position.set( 0, R_CAMERA_MIN * 2, 0 );
        camera.up = new THREE.Vector3( 0, 0, 1 );
        camera.lookAt( new THREE.Vector3( 0 ,0 ,0 ) );

        camera.y = function() {

            var self = this;
            var x = 0;

            for ( var playerId in players ) {

                players[ playerId ].fleet.vesselsList.forEach( function( vessel ) {

                    var obj = vessel.obj;
                    var p = obj.getCameraPos( self );
                    x = MathHelper.clamp( Math.max( x, Math.abs( p.x ), Math.abs( p.y ) ), 0, 1 );//0 - center, 1 bounds
                });
            }

            //var p = iPlayer().getVessel().getCameraPos( this );
            //var x = Math.max( Math.abs( p.x ), Math.abs( p.y ) );// 0 .. 1

            var acceleration = MathHelper.clamp( ( this.position.y - R_CAMERA_MIN ) / R_CAMERA_FADE_DIST, 0, 1 );//0..1

            return V3_UNIT_Y.clone().multiplyScalar( V_CAMERA * ( -acceleration + ( x * x * 2 ) ) );
        };

        window.addEventListener('resize', function () {
            var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

            renderer.setSize(WIDTH, HEIGHT);
            camera.aspect = WIDTH / HEIGHT;
            camera.updateProjectionMatrix();
        });


        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setSize(WIDTH, HEIGHT);
        renderer.sortObjects = false;
        renderer.domElement.addEventListener("click", onMouseClick);
        renderer.domElement.addEventListener('mousemove', onMouseUpdate, false);
        renderer.domElement.addEventListener('mousedown', onMouseDown, false);
        renderer.domElement.addEventListener('mouseup', onMouseUp, false);

        document.body.appendChild(renderer.domElement);

        scene.background = new THREE.Color( C_BACKGROUND );

        V2_RESOLUTION = new THREE.Vector2( renderer.context.canvas.width, renderer.context.canvas.height );
    }

    /*
     function resizeGL(canvas) {
     camera.aspect = canvas.width / canvas.height;
     camera.updateProjectionMatrix();

     renderer.setPixelRatio(canvas.devicePixelRatio);
     renderer.setSize(canvas.width, canvas.height);
     }
     */
    function initMeshes( meshes_arr ) {

        meshes_arr && meshes_arr.forEach( function( mesh ) {

            scene.add( mesh );
            mesh.setToOctree && octree.add( mesh );
        });
    }

    function initStats() {

        stats = new Stats();
        stats.setMode(0); // 0: fps, 1: ms
        // Align top-left
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        document.getElementById("Stats-output").appendChild(stats.domElement);
    }

    function initControls() {

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        //controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.enableZoom = true;
    }

    function initOctree() {

        octree = new THREE.Octree({

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
        });
    }

    function initCursor( texture ) {

        cursor.material = new THREE.MeshBasicMaterial( {

            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        } );

        cursor.rotation.x = Math.PI / 2;

        scene.add( cursor );
    }

    function initPlayer( id ) {

        var player = new Player( id );

        initMeshes( player.initMeshes() );

        players[ id ] = player;

        console.log( id + ' entered' );
    }

    function initScene( starSystemId ) {

        initializeGL();
        initStats();
        //initControls();
        initOctree();

        starSystem = new StarSystem( starSystemId );
        //starSystem.initMeshes();
        initMeshes( starSystem.initMeshes() );


        iPlayer.id = PeerServer.getMyPeerId();
        initPlayer( iPlayer.id );
        iPlayer().changeCallback = iPlayer.onChange;
        iPlayer().fleet.start();//start from new random pos

        octree.update();

        Textures.add( 'res/cursor.png', initCursor );
        Textures.add( 'res/blue_particle.jpg' );
    }

    function getDataFromPeer( peer, data ) {

        !(peer in players) && initPlayer( peer );

        data.id && players[ /*peer*/ data.id ].unpack( data );
    }

    function paintScene() {

        update();//TODO: сделать не синхронным с прорисовкой

        requestAnimationFrame(paintScene);
        renderer.render(scene, camera);
    }

    return {

        constructInstance: function constructInstance () {

            if ( instance ) {

                return instance;
            }
            if ( this && this.constructor === constructInstance ) {

                instance = this;
            } else {

                return new constructInstance();
            }
        },

        init : function( starSystemId ) {

            initScene( starSystemId );
        },

        paint : function() {

            paintScene();
        },

        receiveData : function( peer, data ) {

            getDataFromPeer( peer, data );
        }
    }
} () );

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
//
var MathHelper = {

    // Get a value between two values
    clamp: function (value, min, max) {

        if (value < min) {
            return min;
        }
        else if (value > max) {
            return max;
        }

        return value;
    },
    //Get the linear interpolation between two value
    lerp: function (value1, value2, amount) {
        amount = amount < 0 ? 0 : amount;
        amount = amount > 1 ? 1 : amount;
        return value1 + (value2 - value1) * amount;
    },

    //smooth step function between min and max by value
    smoothstep: function (min, max, value) {

        var x = Math.max(0, Math.min(1, (value-min)/(max-min)));
        return x*x*(3 - 2*x);
    },

    grid: function( x, size ) {

        return Math.round( x / size ) * size;
    },

    //makes new random vector with length
    v3Random: function (length) {

        return new THREE.Vector3( 1, 0, 0 ).clone().applyEuler(
            new THREE.Euler(
                Math.random() * 2 * Math.PI,
                Math.random() * 2 * Math.PI,
                Math.random() * 2 * Math.PI,
                'XYZ')
        ).multiplyScalar(length);
    },

    //random between min and max
    rand: function (min, max) {

        return Math.random() * (max - min) + min;
    },

    getUrlVars: function() {

        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,
            function( m, key, value ) {

                vars[key] = value;
            });
        return vars;
    }
};

function RandomPool( seed ) {

    this.seed = seed;

    this.get = function( max, min ) {

        max = max || 1;
        min = min || 0;

        this.seed = (this.seed * 9301 + 49297) % 233280;
        var rnd = this.seed / 233280;

        return min + rnd * (max - min);
    }
};
