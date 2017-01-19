function Vessel(pos, mass) {

    MatObj.apply( this, arguments );

    this.velocity = new THREE.Vector3( 0, 0 ,0 );//movable
    this.fJet = null;
    this.fTurn = null;
}

extend( Vessel, MatObj );

Vessel.prototype.turn = function( mesh, v3To ) {

    var dir = v3To.clone().sub( this.pos ).normalize();

    /*var v3x = new THREE.Vector3();
    var v3y = new THREE.Vector3();
    var v3z = new THREE.Vector3();
    mesh.matrix.extractBasis( v3x, v3y, v3z );*/

    var fwd = new THREE.Vector3( 0, 0, 1 );
    var up = new THREE.Vector3( 0, 1, 0 );
    var right = new THREE.Vector3( 1, 0, 0 );

    var matInv = new THREE.Matrix4();
    matInv.getInverse( mesh.matrix );

    dir.transformDirection( matInv );//now v3Dir is in a vessel coordinate system

    var dirYaw = new THREE.Vector3( dir.x, 0, dir.y );// Y = 0
    var dirPitch = new THREE.Vector3( 0, dir.y, dir.z );// X = 0
    var dirRoll = new THREE.Vector3( dir.x, dir.y, 0 );// Z = 0

    var dotYaw = dirYaw.dot( right );// -1 .. +1
    var dotPitch = dirPitch.dot( up );// -1 .. +1
    var dotRoll = dirRoll.dot( up );// -1 .. +1

    return new THREE.Vector3( dotYaw, dotPitch, dotRoll ).multiplyScalar( this.fTurn );
};

Vessel.prototype.jet = function( mesh ) {

    var v3x = new THREE.Vector3();
    var v3y = new THREE.Vector3();
    var v3z = new THREE.Vector3();

    mesh.matrix.extractBasis( v3x, v3y, v3z );

    return v3z.multiplyScalar( this.fJet );
}

function Fighter(pos, mass) {

    Vessel.apply( this, arguments );

    this.fJet = this.mass * 100
    this.fTurn = this.mass * 50;
}

extend ( Fighter, Vessel )

Fighter.prototype.mesh = function (color) {

    var size = Math.cbrt( this.mass );

    var m = new THREE.Mesh(
        new THREE.BoxGeometry( size, size, size * 2, 0, 0, 0 ),
        new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading})
    );

    return this.initMesh( m );
}