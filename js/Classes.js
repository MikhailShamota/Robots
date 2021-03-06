function Catalog() {

    function canonVulcan() {

        return {

            f: function (ray, length, obj) {

                var color = new THREE.Color(SHOT_COLOR);

                var material = new THREE.MeshLineMaterial({

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
                });

                length = length > 0 ? length : R_GALAXY;
                const beamLen = 40;
                var geom = new THREE.Geometry();

                geom.vertices.push(ray.origin.clone());
                geom.vertices.push(ray.origin.clone().add(ray.direction.clone().multiplyScalar(beamLen)));

                var line = new THREE.MeshLine();
                line.setGeometry(geom);
                var mesh = new THREE.Mesh(line.geometry, material);

                //mesh.add( new THREE.Mesh( line.geometry.clone(), material2 ) );

                mesh.source_dir = ray.direction.clone();
                mesh.source_length = length - beamLen;
                mesh.source_speed = 100;
                mesh.time = nowTime;
                mesh.fUpd = function () {

                    var mesh = this;
                    const speed = 200;
                    var add = mesh.source_dir.clone().multiplyScalar(speed);

                    mesh.source_length -= speed;

                    //impact
                    if (mesh.source_length <= 0 || nowTime - mesh.time > CANON_VULCAN_LIVES) {

                        mesh.position.x = undefined;//hide
                        return;
                    }

                    mesh.position.add(add);//move
                };

                return mesh;
            },
            delay: CANON_VULCAN_DELAY_MSEC,
            shots: 0,
            lastFired: 0,

            canFire: function () {

                if (nowTime - this.lastFired < this.delay)
                    return false;

                if (this.shots > CANON_VULCAN_AMMO) {

                    if (this.shots < 88888)
                        setTimeout(function (w) {
                            w.shots = 0;
                        }, CANON_VULCAN_RELOAD_MSEC, this);

                    this.shots = 9999999;

                    return false;
                }

                return true;
            }

        }
    }

    function smallFighter(p, color) {

        return new Fighter(p, 3000, color);
    }

    function bigFighter(p, color) {

        return new Fighter(p, 5000, color);
    }

    function smallMissile(p, color) {

        var missile = new Missile(p, 55, color);
        missile.fJet = 6200000;//this.mass * 80000;
        missile.sTurn = 12.75;//radians per sec

        return missile;
    }

    function canonLaser() {

        return {

            f: function (ray, length, obj) {
                var color = new THREE.Color(SHOT_COLOR);

                var material = new THREE.MeshLineMaterial({

                    color: color,
                    opacity: 0.65,
                    resolution: V2_RESOLUTION,
                    sizeAttenuation: 1,
                    lineWidth: 6,
                    near: 1,
                    far: 100000,
                    depthTest: true,
                    blending: THREE.AdditiveBlending,
                    transparent: true,
                    side: THREE.DoubleSide
                });

                const beam_half_len = length > 0 ? length * 0.5 : R_GALAXY * 100;
                var geom = new THREE.Geometry();

                geom.vertices.push(V3_UNIT_Z.clone().multiplyScalar(-beam_half_len));
                geom.vertices.push(V3_UNIT_Z.clone().multiplyScalar(beam_half_len));
                geom.translate(MathHelper.rand(-2, 2), 0, beam_half_len);

                var line = new THREE.MeshLine();
                line.setGeometry(geom);
                var mesh = new THREE.Mesh(line.geometry, material);

                mesh.position.copy(obj.pos);//move

                //mesh.source_dir = ray.direction.clone();
                //mesh.source_length = length - beamLen;
                //mesh.source_speed = 100;
                mesh.parentObj = obj;
                mesh.time = nowTime;
                mesh.fUpd = function () {

                    var mesh = this;

                    //impact
                    if (mesh.source_length <= 0 || nowTime - mesh.time > CANON_LASER_LIVES) {

                        mesh.position.x = undefined;//hide
                        return;
                    }

                    mesh.position.copy(mesh.parentObj.pos);//move
                    mesh.rotation.copy(mesh.parentObj.mesh.rotation);//rotate
                };

                return mesh;
            }
            ,
            delay: CANON_LASER_DELAY_MSEC,
            shots: 0,
            lastFired: 0,

            canFire: function () {

                if (nowTime - this.lastFired < this.delay)
                    return false;

                if (this.shots > CANON_LASER_AMMO) {

                    if (this.shots < 88888)
                        setTimeout(function (w) {
                            w.shots = 0;
                        }, CANON_LASER_RELOAD_MSEC, this);

                    this.shots = 9999999;

                    return false;
                }

                return true;
            }

        }
    }

    function selectAny(all_vessels) {

        var any = all_vessels[Math.floor(Math.random() * all_vessels.length)];
        return any.obj.player.id == this.obj.player.id ? null : any;
    }

    function selectEasiest(all_vessels) {

        var selected = null;
        var minAngle = 99;
        var my = this;

        all_vessels.forEach(function (vessel) {

            var target = vessel.obj;
            if (my.player.id == target.player.id)
                return;

            var angle = Math.abs(my.angleToTarget(target));

            if (angle < minAngle) {

                minAngle = angle;
                selected = target;
            }
        });

        return selected;
    }

    return {

        fighter: {
            f: smallFighter,
            target: selectEasiest,
            w: canonVulcan()
        },

        bomber: {
            f: smallFighter,
            target: selectEasiest,
            m: [smallMissile, smallMissile]
        },

        interceptor: {
            f: smallFighter,
            target: selectEasiest,
            w: canonLaser()
        }
    };
}

function Player( id, isProxy ) {

    this.id = id;

    this.isMouseDown = 0;

    this.changeCallback = null;

    this.color = new THREE.Color().setHSL( ( Math.sin( id.toString().hashCode() ) + 1 ) * 0.5 /*0..1*/ , 0.5, 0.5 );

    this.isProxy = isProxy;

    this.score = 0;

    this.vessel = {};
}

Player.prototype.start = function() {

    this.vessel.obj.init( MathHelper.v3Random( R_START_DROP ).setY( 0 ) );
};

Player.prototype.init = function( params ) {

    var meshes = [];
    var self = this;

    function addMesh( obj, meshes ) {

        obj.mesh.setToOctree = true;

        meshes.push( obj.mesh );

        //trail
        obj.initTrail();
        obj.player = self.player;

        obj.trailMeshes.forEach( function( item ) {

            meshes.push( item );
        });

        return meshes;
    }

    var item = params.vessel;

    var element = {};
    Object.assign( element, item );

    var obj = item.f( V3_ZERO, this.color );

    var box = new THREE.Box3().setFromObject( obj.mesh );

    addMesh( obj, meshes );///<----


    obj.selectTarget = item.target;
    element.obj = obj;
    obj.item = element;
    element.missiles = [];
    obj.player = this;

    //missiles loop
    item.m && item.m.forEach( function( m ) {

        var missile = m( V3_ZERO, self.color );
        missile.player = self;

        //item.missiles.push( missile );
        element.missiles.push( missile );

        missile.pt = new THREE.Vector3( ( box.max.x - box.min.x ) * Math.random(), 0, 0 ) ;//point of connection

        addMesh( missile, meshes );
    });

    self.vessel = element;

    return meshes;
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

    var data = this.vessel.obj.pack();

    data.id = this.id;

    return data;
};

Player.prototype.unpack = function( data ) {

    data.id && data.id == this.id && this.vessel.obj.unpack( data );
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

    this.explosionTimeout = 100;
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

MatObj.prototype.processCollision = function( obj2 ) {


};

MatObj.prototype.setV = function( v ) {

    this.v.copy( v );
    return this;
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
    this.target = null;
    this.steer = null;//-1..0..+1

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

    this.trailWidth = 6;
    this.trailColor = this.colorEdge.clone().multiplyScalar(4);

    this.isFiring = false;

    this.lastHitBy = null;
}

extend( Vessel, MatObj );

Vessel.prototype.V3_FWD = new THREE.Vector3( 0, 0, 1 );

Vessel.prototype.init = function( pos ) {

    this.v = new THREE.Vector3();
    this.pos = pos || new THREE.Vector3();
    this.turn = new THREE.Vector3();
    this.hits = this.toughness;
    this.lastHitBy = null;
    this.mesh.visible = true;

    this.resetTrail();

    return this;
};

Vessel.prototype.setTarget = function( t ) {

    this.target = t;
    return this;
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

Vessel.prototype.angleToTarget = function( target ) {

    return this.fwd().angleTo( target.pos.clone().sub( this.pos ) );
};

Vessel.prototype.turnVec = function() {

    if ( this.steer )
        return new THREE.Vector3( 0, this.steer, 0 );

    this.to = this.target ? this.target.pos : null;

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

    /*var line = self.trailLines[i];
     var positions = line.attributes.position.array;
     var len = positions.length;
     positions[ len - 3 ] = pt.x;
     positions[ len - 2 ] = pt.y;
     positions[ len - 1 ] = pt.z;
     line.attributes.position.needsUpdate = true;*/

    /*this.dtJet += dt;
    if ( this.dtJet < 0.02 )
        return;

    this.dtJet = 0;*/

    this.ptJet.forEach( function( item, i ) {

        var pt = item.clone().applyMatrix4( matrix );
        self.trailLines[i].advance( pt.add( pos ) );

    });
};

//reset all line positions to default
Vessel.prototype.resetTrail = function() {

    var self = this;
    this.ptJet.forEach( function( item, i ) {

        //self
        var pt = self.pos;//item.clone().applyMatrix4( self.mesh.matrix ).add( self.pos );//new pt
        var line = self.trailLines[i];

        var positions = line.attributes.position.array;
        var previous = line.attributes.previous.array;
        var next = line.attributes.next.array;

        var len = positions.length;
        for ( var j = 0; j < len; j += 3 ) {

            positions[ j ] = pt.x;
            positions[ j + 1 ] = pt.y;
            positions[ j + 2 ] = pt.z;
        }

        MathHelper.memcopy( positions, 0, previous, 0, len );
        MathHelper.memcopy( positions, 0, next, 0, len );

        line.attributes.position.needsUpdate = true;
        line.attributes.previous.needsUpdate = true;
        line.attributes.next.needsUpdate = true;
    });
};

Vessel.prototype.initTrail = function () {

    //var trailWidth = 6;
    var material = new THREE.MeshLineMaterial( {
        color: new THREE.Color( this.trailColor ),
        opacity:1,
        resolution: V2_RESOLUTION,
        sizeAttenuation: true,
        lineWidth: this.trailWidth,//see bellow override thickness
        near: 1,
        far: 100000,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        side: THREE.DoubleSide/*,
        map: Textures.get( 'res/grad.png' ),
        useMap : 1*/
    });

    var self = this;
    var pos = this.pos || V3_ZERO;

    var spriteMat = new THREE.SpriteMaterial( {

        map: Textures.get( 'res/blue_particle.jpg' ),
        //map: Textures.get( 'res/glow.png' ),
        color : self.color.clone().multiplyScalar( 2 ),
        blending : THREE.AdditiveBlending,
        opacity: 1,
        depthWrite: true
    } );

    var size = 40;
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




        var sprite	= new THREE.Sprite( spriteMat );

        sprite.scale.set( size, size, size );
        sprite.position.copy( item );

        self.mesh.add( sprite );
    });



    //var self = this;
    //var size = 40;
    //this.ptJet.forEach( function( pt ) {

    /*    var sprite	= new THREE.Sprite( spriteMat );

        sprite.scale.set( size, size, size );
        sprite.position.copy( pt );

        self.mesh.add( sprite );*/
//    });
};

/*Vessel.prototype.kill = function () {

    this.v = null;
};*/

function Fighter(pos, mass, color) {

    Vessel.apply( this, arguments );

    this.fJet = 900000;//this.mass * 80000;
    this.sTurn = 0.75;//radians per sec
    this.trailWidth = 8;
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

    this.ptJet = [ new THREE.Vector3( -size * 0.5 , 0, -size * 1.5 - 8), new THREE.Vector3( size * 0.5, 0, -size * 1.5 - 8) ];



}

extend ( Fighter, Vessel );

function Missile( pos, mass, color ) {

    Vessel.apply( this, arguments );

    const brightness = 2;

    this.fJet = 6200000;//this.mass * 80000;
    this.sTurn = 12.75;//radians per sec
    this.trailWidth = 4;
    this.trailColor.multiplyScalar( brightness );

    this.toughness = 3;//toughness = kill potential

    var size = 25;
    var boundingRadius = 35;



/*    var material	= new THREE.SpriteMaterial( {

        map: Textures.get( 'res/blue_particle.jpg' ),
        color : color.clone().multiplyScalar( brightness ),
        blending : THREE.AdditiveBlending,
        transparent: true
    } );

    var sprite	= new THREE.Sprite( material );
    sprite.scale.set( size, size, size );

    this.mesh.add( sprite );*/
    this.mesh.visible = false;

    this.mesh.geometry.computeBoundingSphere();
    this.mesh.geometry.boundingSphere.radius = boundingRadius;

    this.ptJet = [ new THREE.Vector3( 0, 0, 0 ) ];

    this.explosionTimeout = 0;
    this.timeout = function() { setTimeout( function( m ) { m.hits = 0; }, 8000, this ); return this; };
}

extend ( Missile, Vessel );

//override
Missile.prototype.processCollision = function( obj2 ) {

    if ( this.target.mesh.uuid != obj2.mesh.uuid )
        return;

    setTimeout( function( obj, payload ) { obj.hits -= payload }, 150, obj2, this.hits );//cripple target

    this.hits = 0;//explode missile
};

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

    this.mass *= 0.1;//пористый

    this.color = new THREE.Color( 0xAB936C );

    this.mesh.geometry = new THREE.SphereGeometry(radius, 8, 9);

    this.mesh.geometry.vertices.forEach( function( vertex ) {

        vertex.multiplyScalar( MathHelper.rand( 0.7, 1.3 ) );
    });
    this.mesh.geometry.verticesNeedUpdate = true;

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
        material2.uniforms.coeficient.value = starSystem.rand( 1.1, 1.4 );
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

StarSystem.prototype.initSkybox = function() {

    var self = this;
    var ret = [];

    const P_STARS = [
        { size: 30.0, minQty: 200,  maxQty: 500, dist: 8000, color: 0x5f5f5f },
        { size: 40.0, minQty: 200,  maxQty: 500, dist: 8000, color: 0x505050 },
        { size: 50.0, minQty: 200,  maxQty: 500, dist: 8000, color:  0x404040 }
    ];

    //STARS!
    P_STARS.forEach( function( item ) {

         var qty = self.rand( item.minQty, item.maxQty );

         var dotMaterial = new THREE.PointsMaterial( { color: item.color, size: item.size, sizeAttenuation: true, fog:false } );
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

StarSystem.prototype.initMeshes = function( camera ) {

    const Q_CELESTIALS_LIMIT = 90;
    const Q_PLANETS_MIN = 3;
    const Q_PLANETS_MAX = 8;
    const R_PLANET_MIN = 105;
    const R_PLANET_MAX = 150;
    const K_PLANETS_SPARSE = 2;
    const V3_SUN = new THREE.Vector3( R_GALAXY, R_GALAXY, 0 );
    const Q_MOONS_MAX = 4;
    const R_MOON_MIN = 25;
    const R_MOON_MAX = 40;
    const K_MOON_SPARSE_MIN = 3;
    const K_MOON_SPARSE_MAX = 4;
    const AXIS_MOON_MAX = 0.8;//rad
    //const Q_ASTEROIDS_MAX = 30;
    const R_ASTEROID_MIN = 10;
    const R_ASTEROID_MAX = 35;
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
        var planet = new Planet( this.randV3( R_GALAXY ).setY( 0 ).normalize().multiplyScalar( K_PLANETS_SPARSE * j * R_GALAXY / qPlanets ), radius, this.randColor() ).addAtmosphere( this );
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

        var asteroid = new Asteroid( this.randV3( this.rand( 0, R_GALAXY ) ), this.rand( R_ASTEROID_MIN, R_ASTEROID_MAX ), this.randColor() );
        add( asteroid ).setV( this.randV3( this.rand( 0, V_ASTEROID_MAX ) ) );//.setAxis( rotationUp ).setParent( planet );
    }


    //dust

    const P_DUST = [
        { size: 2, minQty: 1000,  maxQty: 2000, dist: [-500,200], color: 0x909090 },
        { size: 2.5, minQty: 1000,  maxQty: 2000, dist: [-2500,-1500], color: 0xa0a0a0 },
        { size: 3, minQty: 1000,  maxQty: 2000, dist: [-3500,-2500], color: 0xffffff },
        { size: 3.5, minQty: 1000,  maxQty: 2000, dist: [-4500,-3500], color: 0xffffff },
    ];
    P_DUST.forEach( function( item ) {

        var qty = self.rand( item.minQty, item.maxQty );

        var dotMaterial = new THREE.PointsMaterial( { color: item.color, size: item.size, sizeAttenuation: false } );
        var dotGeometry = new THREE.Geometry();

        for (var s = 0; s < qty; s++) {

            //dotGeometry.vertices.push( self.randV3( item.dist ) );//like a sphere
            dotGeometry.vertices.push( self.randX0Z( self.rand( R_GALAXY * 10 ) ).setY( self.rand( item.dist[ 0 ], item.dist[ 1 ] ) ) );//like a sheet
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
