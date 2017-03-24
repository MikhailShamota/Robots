var Scene = (function () {

    var instance;

    var stats, controls, camera, renderer;
    var scene, octree;

    var clock = new THREE.Clock();
    var nowTime = Date.now();

    var starSystem = new StarSystem();
    var fleet1 = new Fleet();

    var loopedArrays = {

        lasers: new LoopedArray(10, 50),//100 qty, 30 ms to live
        hits: new LoopedArray(10, 40)//100 qty, 30 ms to live
    };

    var eclipticPlane = new THREE.Plane( new THREE.Vector3( 0, 1, 0 ) );
    var v2MousePoint = new THREE.Vector2();
    var v3MousePoint = new THREE.Vector3();

    var cursor = new THREE.Mesh( new THREE.PlaneGeometry( 50, 50 ) );

    function updateCollision() {

        var setter = [];

        octree.objectsData.forEach(octreeObj => {

            var mesh = octreeObj.object;
            var matObj = mesh.userData;

            if ( !matObj.v )//immovable
                return;

            octree.search(octreeObj.position, octreeObj.radius).forEach(octreeObj2 => {

                var mesh2 = octreeObj2.object;
                var matObj2 = mesh2.userData;

                if (mesh.id == mesh2.id)
                    return;

                var depth = octreeObj2.radius + octreeObj.radius - mesh.position.distanceTo(mesh2.position);

                if (depth > 0) {//bounce

                    matObj.pos.add(matObj.dive(matObj2, depth));

                    setter.push({
                        obj: matObj,
                        v: matObj.bounce(matObj2)
                    });
                }
            });
        });

        setter.forEach(function (obj) {

            obj.obj.v.copy( obj.v );
        });
    }

    function updateMove(dt) {

        octree.objectsData.forEach(octreeObj => {

            var obj = octreeObj.object.userData;//mesh.userData => MatObj

            var fTurn = obj.turnVec && obj.turnVec() || V3_ZERO;
            var fJet = obj.jetVec && obj.jetVec() || V3_ZERO;
            var fGrav = starSystem.gravities.f( obj ) || V3_ZERO;
            //var fResist = obj.resistVec && obj.resistVec() || V3_ZERO;//V^2 * K

            var f = fGrav.add( fJet );

            obj.vTurn && obj.vTurn.lerp( obj.turnVelocityDelta( fTurn, dt ), 0.01 );
            obj.v && obj.v.lerp( obj.newVelocity( f, dt ), 0.1 );
            obj.v && obj.pos.copy( obj.newPos( dt ) );

            obj.pos.y *= 0.99;//2d restrictions - going to ecliptic plane

            obj.updateMesh();
            obj.updateSpec();
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

        fleet1.update( v3MousePoint );
    }

    function remove(id) {

        scene.remove( scene.getObjectById( id ) );
    }

    function updateLoopedArrays() {

        function removeOld(arr) {

            var old = arr.getLastOutTime();
            old && remove( old.id );
        }

        removeOld( loopedArrays.hits );
        removeOld( loopedArrays.lasers );

        /*var old = lasers.getLastOutTime();
        old && remove( old.id );

        old = hits.getLastOutTime();
        old && remove( old.id );*/
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

        updateMove(dt);//update MatObj physics

        updateLoopedArrays();

        onMouseClick(null);

        octree.rebuild();
    }

    function fire(from, to) {

        var raycaster = new THREE.Raycaster( from.pos, from.fwd() );

        var octreeObjects = octree.search(
            raycaster.ray.origin,
            raycaster.ray.far,
            false/*false to get geometry info*/,
            raycaster.ray.direction );

        var hits = 0;

        octreeObjects && octreeObjects.forEach( function(item) {

            var mesh = item.object;
            if ( mesh.id == from.mesh.id || hits > 0 )
                return;

            var intersects = raycaster.intersectObject( mesh );
            if ( intersects.length > 0) {

                hits++;
                var hitPt = intersects[ 0 ].point;

                var flare = Flare( hitPt, 100, 0xffff00, 'res/blue_particle.jpg' );

                loopedArrays.hits.addItem( flare );
                scene.add( flare );
            }else{
            }
        });

        var beam = Beam( raycaster.ray );

        loopedArrays.lasers.addItem( beam );
        scene.add( beam );
    }

    //TODO: mouse flat cursor on ecliptic plane
    function onMouseUpdate( event ) {

        v2MousePoint.x = ( ( event.pageX - renderer.context.canvas.offsetLeft ) / window.innerWidth ) * 2 - 1;
        v2MousePoint.y = - ( ( event.pageY - renderer.context.canvas.offsetTop ) / window.innerHeight ) * 2 + 1;
    }

    function onMouseClick( event ) {

        fire( fleet1.vesselsList[0].obj, null );
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

    function initCursor(texture) {

        cursor.material = new THREE.MeshBasicMaterial( {

            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        } );

        /*
        var loader = new THREE.TextureLoader();

        loader.load(
            'res/cursor.png',
            function ( texture ) {

                cursor.material = new THREE.MeshBasicMaterial( {
                    map: texture,
                    side: THREE.DoubleSide,
                    transparent: true
                } );
            },
            function ( xhr ) {

                console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
            },
            function ( xhr ) {

                console.log( 'An error happened' );
            }
        );*/


        //cursor.doubleSided = true;
        cursor.rotation.x = Math.PI / 2;

        scene.add( cursor );
    }

    function initScene() {

        initializeGL();
        initStats();
        initControls();
        initOctree();

        starSystem.init( scene, octree );
        fleet1.init( scene, octree );

        octree.update();

        Textures.add( 'res/cursor.png', initCursor );
        Textures.add( 'res/blue_particle.jpg' );
        //initCursor();
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

        init : function() {

            initScene();
        },

        paint : function() {

            paintScene();
        }
    }
} () );