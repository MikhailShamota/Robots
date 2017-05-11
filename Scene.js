var Scene = (function () {

    var instance;

    var stats, controls, camera, renderer;
    var scene, octree;

    var clock = new THREE.Clock();
    var nowTime = Date.now();

    var starSystem = new StarSystem();
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

    var eclipticPlane = new THREE.Plane( new THREE.Vector3( 0, 1, 0 ) );
    var v2MousePoint = new THREE.Vector2();
    var v3MousePoint = new THREE.Vector3();

    var cursor = new THREE.Mesh( new THREE.PlaneGeometry( 50, 50 ) );

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

            var fJet = obj.jetVec && obj.jetVec() || V3_ZERO;
            var fGravity = starSystem.gravities.f( obj ) || V3_ZERO;

            var fResist = obj.resistForce( obj.v ) || V3_ZERO;

            return fGravity.add( fJet ).sub( fResist );
        }

        octree.objectsData.forEach( octreeObj => {

            //var mesh = octreeObj.object;
            //var obj = mesh.userData;//mesh.userData => MatObj
            var obj = octreeObj.object.userData;//octree -> object -> mesh -> userData => MatObj

            //CHECK & KILL & REMOVE
            obj.hits <= 0 && killObject( obj );

            //TURN
            obj.turn.y += ( obj.turnVec && obj.turnVec() || V3_ZERO ).multiplyScalar( obj.sTurn * dt ).y;

            //VELOCITY & POSITION
            obj.v && obj.v.add( obj.velocityDelta( getForces( obj ), dt ).clampLength( 0, VELOCITY_LIMIT_PER_SEC * dt ) ) && obj.pos.copy( obj.newPos( dt ) );

            //ECLIPTIC PLANE INEXORABLE PULL
            obj.pos.y *= 0.099;

            obj.updateMesh();
            obj.updateSpec();
        });
    }

    function updateTrails( player, dt ) {

        player.fleet.vesselsList.forEach(function ( item ) {

            var obj = item.obj;

            obj.updateTrail && obj.updateTrail( dt );
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

        controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
        stats.update();

        ////
        updateMouse();//get mouse position

        updateTarget();//update vessels movement direction

        updateCollision();//check and process MatObj collisions

        updateMove( dt );//update MatObj physics

        loopedArrays.update();

        for ( var playerId in players ) {

            var player = players[ playerId ];

            updateTrails( player, dt );
            updateFire( player );
        }

        updateLasersMove();

        send();

        octree.rebuild();
    }

    function updateFire( player ) {

        //var myObj = players[ thisPlayerId ].fleet.vesselsList[0].obj;
        //isMouseDown > 0 && ( nowTime - myObj.lastFired > 50 || ! myObj.lastFired ) && fire( myObj, null );
        //var vessel = player.fleet.vesselsList[0].obj;

        var vessel = player.getVessel();

        vessel.isFiring && ( nowTime - vessel.lastFired > 50 || ! vessel.lastFired ) && fire( vessel, null );
    }

    function fire( from ) {

        var raycaster = new THREE.Raycaster( from.pos, from.fwd() );

        var octreeObjects = octree.search(
            raycaster.ray.origin,
            raycaster.ray.far,
            false/*false to get geometry info*/,
            raycaster.ray.direction );

        var hits = 0;
        var dist = WORLD_SIZE * 1000;

        octreeObjects && octreeObjects.forEach( function( item ) {

            var mesh = item.object;
            if ( mesh.id == from.mesh.id || hits > 0 )
                return;

            var intersects = raycaster.intersectObject( mesh );
            if ( intersects.length > 0) {

                hits++;
                mesh.userData.hits--;
                dist = intersects[ 0 ].distance;

                addHit( intersects[ 0 ].point );
            }else{
            }
        });

        addShot( raycaster.ray, dist );

        from.lastFired = nowTime;
    }

    //TODO: mouse flat cursor on ecliptic plane
    function onMouseUpdate( event ) {

        v2MousePoint.x = ( ( event.pageX - renderer.context.canvas.offsetLeft ) / window.innerWidth ) * 2 - 1;
        v2MousePoint.y = - ( ( event.pageY - renderer.context.canvas.offsetTop ) / window.innerHeight ) * 2 + 1;
    }

    function onMouseClick( event ) {

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

        camera = new THREE.PerspectiveCamera(75, window.width / window.height, 0.1, WORLD_SIZE * 10);
        camera.position.z = WORLD_SIZE * 2;
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();

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

        scene.background = new THREE.Color(0x383838);

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

        player.fleet = new Fleet();
        player.fleet.init( scene, octree, player.color );

        players[ id ] = player;

        console.log( id + ' entered' );
    }

    function initScene() {

        initializeGL();
        initStats();
        initControls();
        initOctree();

        starSystem.init( scene, octree );

        iPlayer.id = PeerServer.getMyPeerId();
        initPlayer( iPlayer.id );
        iPlayer().changeCallback = iPlayer.onChange;

        octree.update();

        Textures.add( 'res/cursor.png', initCursor );
        Textures.add( 'res/blue_particle.jpg' );
    }

    function paintScene() {

        update();//TODO: сделать не синхронным с прорисовкой

        requestAnimationFrame(paintScene);
        renderer.render(scene, camera);
    }

    function getDataFromPeer( peer, data ) {

        !(peer in players) && initPlayer( peer );

        players[ peer ].unpack( data );
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

        init : function() {

            initScene();
        },

        paint : function() {

            paintScene();
        },

        receiveData : function( peer, data ) {

            getDataFromPeer( peer, data );
        }
    }
} () );