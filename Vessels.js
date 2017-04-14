function Vessel(pos, mass, color) {

    MatObj.apply( this, arguments );

    this.v = new THREE.Vector3( 0, 0 ,0 );//movable
    this.vTurn = new THREE.Vector3( 0, 0, 0 );//turnable
    this.fJet = null;//jet force
    this.fTurn = null;//turn force

    this.to = V3_ZERO;//fly to

    this.ptJet = [];
    this.trailMeshes = [];
    this.trailLines = [];
    this.dtJet = 0;
    this.trailWidth = 4;

    this.hits = 1;//toughness

    this.color = color;
}

extend( Vessel, MatObj );

Vessel.prototype.K_SPACE_RESIST = 200;
Vessel.prototype.V3_FWD = new THREE.Vector3( 0, 0, 1 );

Vessel.prototype.fwd = function() {

    return this.V3_FWD.clone().applyQuaternion( this.mesh.quaternion );
}

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

    grip.multiplyScalar( Math.sign( dot ) * this.fTurn );
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
Vessel.prototype.newVelocity = function( f, dt ) {

    var vNew = f.clone().multiplyScalar( dt / this.mass ).add( this.v );

    return vNew.clone().multiplyScalar( Math.max( 0, 1 - ( vNew.length() * this.K_SPACE_RESIST * dt / this.mass ) ) );
};

Vessel.prototype.updateTrail = function(dt) {

    var self = this;

    var matrix = new THREE.Matrix4();
    matrix.extractRotation( self.mesh.matrix );

    this.dtJet += dt;
    if ( this.dtJet < 0.02 )
        return;

    this.dtJet = 0;

    this.ptJet.forEach( function(item, i) {

        var pt = item.clone().applyMatrix4( matrix );
        self.trailLines[i].advance( pt.add( self.pos ) );
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

    this.ptJet.forEach( function( item ) {

        var geom = new THREE.Geometry();

        for ( var i = 0; i < 100; i++ ) {

            geom.vertices.push( item.clone().add( self.pos ) );
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

    this.fJet = 24000000//this.mass * 80000;
    this.fTurn = 2.25;//radians per sec
    this.trailWidth = 4;
    this.hits = 3;//toughness

    var size = Math.cbrt( this.mass );

    var box1 = new THREE.BoxGeometry( size, size, size * 2, 0, 0, 0 );
    var box2 = new THREE.BoxGeometry( size * 2, size * 0.2, size, 0, 0, 0 );

    box1.merge( box2, new THREE.Matrix4().makeTranslation( 0, 0, -size) );

    this.mesh.geometry = box1;
    this.mesh.material = new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading});

    this.ptJet = [ new THREE.Vector3( -size * 0.5 , 0, -size * 1.5), new THREE.Vector3( size * 0.5, 0, -size * 1.5), ];
}

extend ( Fighter, Vessel );