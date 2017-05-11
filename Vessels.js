function Vessel(pos, mass, color) {

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
        to: this.fwd().multiplyScalar( WORLD_SIZE ).add( this.pos ).toArray(),
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

/*Vessel.prototype.resistVec = function() {

    return this.v.clone().multiplyScalar( -this.v.length() * this.K_SPACE_RESIST );
};*/

//override
/*
Vessel.prototype.newVelocity = function( f, dt ) {

    var vNew = f.clone().multiplyScalar( dt / this.mass ).add( this.v );

    return vNew.clone().multiplyScalar( Math.max( 0, 1 - ( vNew.length() * this.K_SPACE_RESIST * dt / this.mass ) ) );
};
*/

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