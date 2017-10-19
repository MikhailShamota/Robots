//TODO: Exotic camera!
//TODO: materials library
var Scene = (function () {

    var instance;

    var stats, controls, camera, cameraFix, renderer;
    var scene, sceneFix, octree;

    var starSystem, skySprite /*, skyBox*/;

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
            "shotFlare": new LoopedArray( 100, 20 ),
            "explosions": new LoopedArray( 10, 50 ),
            "radar": new LoopedArray( 25, SCAN_SEC_MAX * 1000 * 2 )// x 2 because of delayed start
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
    v2MousePoint.getX = function( pageX ) {

        return ( ( pageX - renderer.context.canvas.offsetLeft ) / window.innerWidth ) * 2 - 1;
    };
    v2MousePoint.getY = function( pageY ) {

        return - ( ( pageY - renderer.context.canvas.offsetTop ) / window.innerHeight ) * 2 + 1;
    };

    var v3MousePoint = new THREE.Vector3();

    var cursor = new THREE.Mesh( new THREE.PlaneGeometry( 50, 50 ) );

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

    function addHit( pt ) {

        loopedArrays.add2scene(

            "hits",
            Flare( pt, 100, 0xffff00, 'res/blue_particle.jpg' )
        );
    }

    function addShotFlare( pt ) {

        loopedArrays.add2scene(

            "shotFlare",
            Flare( pt, 50, SHOT_COLOR, 'res/blue_particle.jpg' )
        );
    }

    function addExplosion( pt ) {

        loopedArrays.add2scene(

            "explosions",
            Flare( pt, 400, 0xffbb11, 'res/blue_particle.jpg' )
        );
    }

    function addShot( ray, dist ) {

        function Beam( ray, length ) {

            var color = new THREE.Color( SHOT_COLOR );

            var material = new THREE.MeshLineMaterial( {

                color: color,
                opacity: 1.0,
                resolution: V2_RESOLUTION,
                sizeAttenuation: 1,
                lineWidth: 7,
                near: 1,
                far: 100000,
                depthTest: true,
                blending: THREE.AdditiveBlending,
                transparent: false,
                side: THREE.DoubleSide
            } );

            /*var material2 = new THREE.MeshLineMaterial( {

                color: color,
                opacity: 0.75,
                resolution: V2_RESOLUTION,
                sizeAttenuation: 1,
                lineWidth: 4,
                near: 1,
                far: 100000,
                depthTest: true,
                blending: THREE.AdditiveBlending,
                transparent: true,
                side: THREE.DoubleSide
            } );*/

            const beamLen = 40;
            var geom = new THREE.Geometry( );

            geom.vertices.push( ray.origin.clone( ) );
            geom.vertices.push( ray.origin.clone( ).add( ray.direction.clone( ).multiplyScalar( beamLen ) ) );

            var line = new THREE.MeshLine( );
            line.setGeometry( geom );
            var mesh = new THREE.Mesh( line.geometry, material );

            //mesh.add( new THREE.Mesh( line.geometry.clone(), material2 ) );

            mesh.source_dir = ray.direction.clone();
            mesh.source_length = length - beamLen;

            return mesh;
        }

        loopedArrays.add2scene(

            "lasers",
            Beam( ray, dist )
        );
    }

    function addRadar( ray, dist ) {

        if ( dist <= 0 )
            return;

        function Radar( ray, duration ) {

            function mat() {

                return new THREE.MeshLineMaterial( {

                    color: new THREE.Color( "rgb( 0, 255, 0 )" ),
                    opacity: 0.73,
                    resolution: V2_RESOLUTION,
                    sizeAttenuation: 1,
                    lineWidth: 10,
                    near: 1,
                    far: 100000,
                    depthTest: true,
                    blending: THREE.AdditiveBlending,
                    transparent: true,
                    side: THREE.DoubleSide
                } );
            }

            function getPoint( ray, angle, len ) {

                return ray.direction.clone().applyEuler( new THREE.Euler( 0, angle, 0, 'YZX' ) ).multiplyScalar( len );//.add( ray.origin );
            }

            var v1 = getPoint( ray, 0.5, 10 );
            var v2 = getPoint( ray, -0.5, 10 );
            var center = getPoint( ray, 0, 12 );

            var curve = new THREE.QuadraticBezierCurve3(v1, center, v2);

            var geom = new THREE.Geometry( );

            geom.vertices = curve.getPoints(10);

            var line = new THREE.MeshLine( );
            line.setGeometry( geom );

            var mesh = new THREE.Mesh( line.geometry, mat() );
            mesh.position.copy( ray.origin );

            var allMesh = new THREE.Mesh();
            var qty = 4;

            for ( var i = 0; i < qty; i++ ) {

                var m = mesh.clone();
                m.material = m.material.clone();

                m.dt = - i * duration / qty;

                m.fHide = function() {

                    return duration <= this.dt || this.dt < 0;
                };
                m.fMove = function() {

                    return ray.direction.clone().multiplyScalar( 110 * this.dt );
                };
                m.fScale = function() {

                    return new THREE.Vector3( 1, 1, 1 ).multiplyScalar ( 6 * this.dt / duration + 1 )
                };
                m.fOpacity = function() {

                    return mesh.material.uniforms.opacity.value * ( 1 - this.dt / duration );
                };

                allMesh.add( m );
            }

            return allMesh;
        }

        loopedArrays.add2scene(

            "radar",
            Radar( ray, MathHelper.lerp( SCAN_SEC_MIN, SCAN_SEC_MAX, dist ) )
        );
    }

    function updateScore() {

        var txt = "";

        for ( var playerId in players ) {

            txt += (txt == "" ? "" : " : ") + players[ playerId ].score;
        }

        var elem = document.getElementById("Score");
        elem.style.display = 'block';
        elem.innerHTML = txt;
    }

    function update() {

        function updateMove(dt) {

            function killObject( obj ) {

                //obj.kill();

                addExplosion( obj.pos );

                //scene.remove( obj.mesh );
                //octree.remove( obj.mesh );
                obj.mesh.visible = false;

                obj.lastHitBy && players[ obj.lastHitBy ].score++;
                updateScore();

                //if my last was killed respawn me at 2 sec
                !obj.player.isProxy && obj.player.fleet.totalHits() < 1 && setTimeout( function() { iPlayer().fleet.start(); }, MSEC_RESPAWN_DELAY );
                //iPlayer().fleet.totalHits() < 1 && //initFleet( player );//respawn
                //iPlayer().fleet.start();
            }

            function getForces( obj ) {

                var fJet = obj.jetVec && obj.jetVec() || V3_ZERO.clone();
                var fGravity = starSystem.gravities.f( obj ) || V3_ZERO.clone();

                var fResist = obj.resistForce( obj.v ) || V3_ZERO.clone();

                return fGravity.add( fJet ).sub( fResist );
            }

            //ECLIPTIC PLANE INEXORABLE PULL
            function goEcliptic( obj ) {

                obj.pos.y = 0;
                //obj.pos.y *= 0.099;
                //var p = obj.pos.clone().normalize().multiplyScalar( R_WORLD );
                //obj.pos.normalize().multiplyScalar( R_WORLD );
            }

            octree.objectsData.forEach( octreeObj => {


                //var mesh = octreeObj.object;
                //var obj = mesh.userData;//mesh.userData => MatObj
                var obj = octreeObj.object.userData;//octree -> object -> mesh -> userData => MatObj

                if ( !obj.mesh.visible )
                    return;

                /*infinine map*/
                /*if ( obj.pos ) {

                    function vec2str( v ) {

                        return Math.round( v.x ) + "   " + Math.round( v.y ) + "   " + Math.round( v.z );
                    }

                    var dist = camera.position.clone().setY(0).clone().sub(obj.pos).multiplyScalar(1 / R_GALAXY).roundToZero();

                    if ( obj.hits && obj.player.isProxy )
                        document.getElementById("buttonScreenMode").innerHTML =  vec2str( dist );


                    obj.pos.add(dist.multiplyScalar(2 * R_GALAXY));
                }*/

                //CHECK & KILL & REMOVE
                obj.hits <= 0 && killObject( obj );

                //TURN
                if ( obj.turn )
                    obj.turn.y += ( obj.turnVec && obj.turnVec() || V3_ZERO ).multiplyScalar( obj.sTurn * dt ).y;

                //VELOCITY & POSITION
                obj.v && obj.pos && obj.v.add( obj.velocityDelta( obj.jetVec && getForces( obj ) || V3_ZERO.clone(), dt ).clampLength( 0, VELOCITY_LIMIT_PER_SEC * dt ) ) && obj.pos.copy( obj.newPos( dt ) ) /*&& !obj.axisUp*/ && goEcliptic( obj );

                obj.updateMesh();
                obj.updateSpec();

                obj.hits > 0 && obj.isFiring && ( nowTime - obj.lastFired > ( SHOT_MIN_MSEC + ( obj.canonHeat || 0 ) ) || ! obj.lastFired ) && fire( obj );//do not calc damage from my vessels, only on my vessel

                obj.canonHeat -=  dt * SHOT_COOL_MSEC_PER_SEC;
            });
        }

        function updateCollision() {

            var setter = [];

            octree.objectsData.forEach( octreeObj => {

                var mesh = octreeObj.object;
                var matObj = mesh.userData;

                if ( !matObj.v || !mesh.visible )//immovable or invisible
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

        function updateCamera(dt) {

            var vessel = iPlayer().getVessel();

            var dist = Number.MAX_SAFE_INTEGER;
            var i = vessel.getCameraPos( camera );

            for ( var playerId in players ) {

                playerId != iPlayer().id && players[ playerId ].fleet.vesselsList.forEach( function( vessel ) {

                    var obj = vessel.obj;
                    var p = obj.getCameraPos( camera );
                    dist = Math.min( dist, p.distanceTo( i ) );
                });
            }

            function getDist( d ) {

                d = d == Number.MAX_SAFE_INTEGER ? 0.5 : dist;//dist in screens 1 - one screen
                dist = MathHelper.clamp( dist, 0, 1 );
                dist *= 0.8;

                return d * d;
            }

            var vesselPos = vessel.mesh.position.clone();

            var cameraToPos = vesselPos.clone().setY( MathHelper.lerp( Y_CAMERA_MIN, Y_CAMERA_MAX, getDist( dist ) ) );
            var backward = vessel.fwd().clone().multiplyScalar( -( Y_CAMERA_MAX - Y_CAMERA_MIN ) );//сдвинем камеру назад настолько, насколько она высоко поднята
            cameraToPos.add( backward );
            var dir = cameraToPos.sub( camera.position ).clampLength ( 0, V_CAMERA_LIMIT );
            dir.lengthSq() && camera.position.add( dir.multiplyScalar( V_CAMERA * dt ) );

            camera.lookAt( vessel.pos );

            /*skyBox.forEach( function( mesh ) {

                mesh.position.copy( camera.position );
            });
            */
            //skySprite.position.copy( camera.position.clone().sub( V3_UNIT_Y.clone().setY( 5000 ) ) );
        }

        function updateLasersMove() {

            loopedArrays.collection[ "lasers" ].mapAll( function( mesh ) {

                    const speed = 100;
                    var add = mesh.source_dir.clone().multiplyScalar( speed );

                    mesh.source_length -= speed;

                    //impact
                    if ( mesh.source_length <= 0 ) {

                        mesh.position.x = undefined;//hide
                        return;
                    }

                    mesh.position.add( add );//move
                } );
        }

        function updateRadarMove( origin, dt ) {

            loopedArrays.collection[ "radar" ].mapAll( function ( obj ) {

                obj.children.map( function( m, i ) {

                    m.dt += dt;
                    if ( m.fHide() ) {

                        m.position.x = undefined;//hide
                        return;
                    }
                    m.position.copy( origin ).add( m.fMove() );//relative move
                    m.scale.copy( m.fScale() );
                    m.material.uniforms.opacity.value = m.fOpacity();
                });

            } );
        }

        function updateMouse() {

            var raycaster = new THREE.Raycaster();

            raycaster.setFromCamera( v2MousePoint, camera );

            v3MousePoint = raycaster.ray.intersectPlane( eclipticPlane );
            //v3MousePoint = raycaster.ray.intersectSphere( new THREE.Sphere( V3_ZERO.clone(), R_WORLD ) );

            if ( v3MousePoint )
                cursor.position.copy( v3MousePoint );
        }

        function updateTarget() {

            iPlayer().fleet.update( v3MousePoint );
        }

        function updateScan( obj ) {

            obj.hits > 0 && ( nowTime - obj.lastScan > 5000 || ! obj.lastScan ) && scan( obj );
        }

        nowTime = Date.now();

        var dt = clock.getDelta();//its in seconds
        clock.start();

        //controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
        stats.update();

        ////
        updateMouse();//get mouse position

        updateTarget();//update vessels movement direction

        updateCollision();//check and process MatObj collisions*/

        updateMove( dt );//update MatObj physics

        updateCamera( dt );

        loopedArrays.update();

        for ( var playerId in players ) {

            players[ playerId ].update( dt );
        }

        updateLasersMove();

        updateRadarMove( iPlayer().getVessel().pos, dt );

        updateScan( iPlayer().getVessel() );

        send();

        octree.rebuild();
    }

    function fire( from ) {

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

                var vessel = mesh.userData;
                from.player.isProxy && vessel.hits > 0 && vessel.hits-- && (vessel.lastHitBy = from.player.id);//doDamage -> isProxy

                dist = intersects[ 0 ].distance;

                addHit( intersects[ 0 ].point );
            }else{
            }
        });

        addShotFlare( from.fwd().multiplyScalar( 25 ).add( from.pos ) );
        addShot( raycaster.ray, dist );
        from.lastFired = nowTime;
        from.canonHeat = ( from.canonHeat || 0 ) + SHOT_HEAT_MSEC;
    }

    function scan( from ) {

        for ( var playerId in players ) {

            from.player.id != playerId && players[ playerId ].fleet.vesselsList.forEach( function( vessel ) {

                if ( !vessel.obj.pos )
                    return;

                var v3to = vessel.obj.pos.clone().sub( from.pos );
                var dist = v3to.length();

                addRadar( new THREE.Ray( from.pos, v3to.normalize() ), MathHelper.spectre( dist, SCAN_DIST_MIN, SCAN_DIST_MAX ) );
                from.lastScan = nowTime;
            });
        }
    }

    function initializeGL() {

        scene = new THREE.Scene();
        sceneFix = new THREE.Scene();
        var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

        camera = new THREE.PerspectiveCamera(40, window.width / window.height, 1, R_GALAXY * 10 );
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();

        camera.position.set( 0, Y_CAMERA_START, 0 );
        camera.up = new THREE.Vector3( 0, 0, 1 );
        camera.lookAt( new THREE.Vector3( 0, 0 ,0 ) );

        //cameraFix = new THREE.PerspectiveCamera(40, window.width / window.height, 1, R_GALAXY * 10 );
        cameraFix = new THREE.OrthographicCamera( WIDTH / - 2, WIDTH / 2, HEIGHT / 2, HEIGHT / - 2, -100, 100000 );
        cameraFix.aspect = WIDTH / HEIGHT;
        cameraFix.updateProjectionMatrix();


        /*cameraFix.updateProjectionMatrix();*/

        cameraFix.position.set( 0, Y_CAMERA_START, 0 );
        cameraFix.up = new THREE.Vector3( 0, 0, 1 );
        cameraFix.lookAt( new THREE.Vector3( 0, 0 ,0 ) );


        window.addEventListener('resize', function () {
            var WIDTH = window.innerWidth, HEIGHT = window.innerHeight;

            renderer.setPixelRatio( window.devicePixelRatio );
            renderer.setSize( WIDTH, HEIGHT );

            camera.aspect = WIDTH / HEIGHT;
            camera.updateProjectionMatrix();
            cameraFix.aspect = WIDTH / HEIGHT;
            cameraFix.updateProjectionMatrix();
            V2_RESOLUTION.set( renderer.context.canvas.width, renderer.context.canvas.height );
        });

        /*window.addEventListener(
            "orientationchange",
            function ( event ) {

                initSkySprite();
            },
            true);*/

        renderer = new THREE.WebGLRenderer({antialias: true});
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize(WIDTH, HEIGHT);
        renderer.sortObjects = false;

        /*$('#buttonMenu').bind(
            'click',
            function onDblClick( event ) {

                initSkySprite();
            }
        );*/

        var dom = renderer.domElement;

        dom.addEventListener(
            'mousemove',
            function onMouseMove( event ) {

                event.preventDefault();
                v2MousePoint.x = v2MousePoint.getX( event.pageX );
                v2MousePoint.y = v2MousePoint.getY( event.pageY );
            },
            false);

        dom.addEventListener(
            'mousedown',
            function ( event ) {

                event.preventDefault();
                iPlayer().setMouseDown();
            },
            false);

        dom.addEventListener(
            'mouseup',
            function ( event ) {

                event.preventDefault();
                iPlayer().setMouseUp();
            },
            false);

        dom.addEventListener("touchstart",
            function ( event ) {

                event.preventDefault();
                iPlayer().setMouseDown();
            },
            false);

        dom.addEventListener(
            "touchend",
            function ( event ) {

                event.preventDefault();
                iPlayer().setMouseUp();
            }
            , false);

        dom.addEventListener("touchmove",
            function onTouchMove( event ) {

                event.preventDefault();
                //if (event.targetTouches.length == 1) {
                var touch = event.targetTouches[0];

                v2MousePoint.x = v2MousePoint.getX( touch.pageX );
                v2MousePoint.y = v2MousePoint.getY( touch.pageY );
        }
            , false);

        document.body.appendChild( renderer.domElement );

        scene.background = new THREE.Color( C_BACKGROUND );

        V2_RESOLUTION = new THREE.Vector2( renderer.context.canvas.width, renderer.context.canvas.height );
    }

    function initMeshes( meshes_arr ) {

        meshes_arr && meshes_arr.forEach( function( mesh ) {

            scene.add( mesh );
            mesh.setToOctree && octree.add( mesh );
        });

        octree.update();
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

    function initFleet( player ) {

        initMeshes( player.initMeshes() );
        !player.isProxy && player.fleet.start();//start my fleet from new random pos
    }

    function initPlayer( id, isProxy ) {

        var player = new Player( id, isProxy );

        initFleet( player );
        //initMeshes( player.initMeshes() );
        //!isProxy && player.fleet.start();//start my fleet from new random pos

        players[ id ] = player;

        console.log( id + ' entered' );
    }

    /*
    function initSkySprite() {

        sceneFix.background = starSystem.randColor();
        sceneFix.remove( skySprite );
        skySprite = starSystem.initSkySprite();
        sceneFix.add( skySprite );
    }
    */

    function initScene( starSystemId ) {

        initStats();
        //initControls();
        initOctree();

        /**star system*/
        starSystem = new StarSystem( starSystemId );
        initMeshes( starSystem.initMeshes() );

        //initMeshes( skyBox );
        //skyBox = starSystem.initSkybox();

        //initSkySprite();

        iPlayer.id = PeerServer.getMyPeerId();
        initPlayer( iPlayer.id, false );
        iPlayer().changeCallback = iPlayer.onChange;
        //iPlayer().fleet.start();//start from new random pos


        octree.update();

        Textures.add( 'res/cursor.png', initCursor );
        Textures.add( 'res/blue_particle.jpg' );
    }

    function getDataFromPeer( peer, data ) {

        !(peer in players) && initPlayer( peer, true );

        data.id && players[ /*peer*/ data.id ].unpack( data );
    }

    function paintScene() {

        update();//TODO: сделать не синхронным с прорисовкой

        requestAnimationFrame(paintScene);

        //renderer.autoClear = false;
        renderer.clear();
        //renderer.render(sceneFix, cameraFix);
        //renderer.clearDepth();
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

        init : function( starSystemStr ) {

            initializeGL();
            initScene( starSystemStr.hashCode() );
        },

        paint : function() {

            paintScene();
        },

        receiveData : function( peer, data ) {

            getDataFromPeer( peer, data );
        }
    }
} () );