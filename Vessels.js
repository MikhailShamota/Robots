function Vessel(pos, mass) {

    MatObj.apply( this, arguments );

    this.velocity = new THREE.Vector3( 0, 0 ,0 );//movable
    this.fJet = null;
    this.fTurn = null;
}

extend( Vessel, MatObj );

Vessel.prototype.turn = function( mesh, v3To ) {

    var dir = v3To.clone().sub( this.pos ).normalize();

    var fwd = new THREE.Vector3( 0, 0, 1 );

    var matInv = new THREE.Matrix4();
    matInv.getInverse( mesh.matrix );

    dir.transformDirection( matInv );//now v3Dir is in a vessel coordinate system

    var grip = new THREE.Vector2( dir.x, -dir.y ).normalize();

    var dot = dir.normalize().dot( fwd );//-1..0..+1
    dot = Math.min( 1 - dot, 1 );//+1..+1..0

    return grip.multiplyScalar( dot );
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

    this.fJet = this.mass * 20;
    this.fTurn = 0.5;//radians per sec
}

extend ( Fighter, Vessel )

Fighter.prototype.mesh = function (color) {

    var size = Math.cbrt( this.mass );

    var box1 = new THREE.BoxGeometry( size, size, size * 2, 0, 0, 0 );
    var box2 = new THREE.BoxGeometry( size * 2, size * 0.2, size, 0, 0, 0 );

    box1.merge( box2, new THREE.Matrix4().makeTranslation( 0, 0, -size) );

    var m = new THREE.Mesh(
        box1,
        new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading})
    );



    return this.initMesh( m );
}