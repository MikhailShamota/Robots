function Vessel(pos, mass) {

    MatObj.apply( this, arguments );

    this.velocity = new THREE.Vector3( 0, 0 ,0 );//movable
    this.fJet = null;//jet force
    this.fTurn = null;//turn force
    this.to = null;//fly to
}

extend( Vessel, MatObj );

Vessel.prototype.K_SPACE_RESIST = 50;
Vessel.prototype.V3_FWD = new THREE.Vector3( 0, 0, 1 );

Vessel.prototype.turnTo = function( mesh ) {

    var dir = this.to.clone().sub( this.pos ).normalize();

    //var fwd = new THREE.Vector3( 0, 0, 1 );

    var matInv = new THREE.Matrix4();
    matInv.getInverse( mesh.matrix );

    dir.transformDirection( matInv );//now v3Dir is in a vessel coordinate system

    var grip = new THREE.Vector2( dir.x, -dir.y ).normalize();

    var dot = dir.normalize().dot( this.V3_FWD );//-1..0..+1
    dot = Math.min( 1 - dot, 1 );//+1..+1..0

    return grip.multiplyScalar( Math.sign( dot ) * this.fTurn );
};

Vessel.prototype.jet = function( mesh ) {

    var v3x = new THREE.Vector3();
    var v3y = new THREE.Vector3();
    var v3z = new THREE.Vector3();

    mesh.matrix.extractBasis( v3x, v3y, v3z );

    return v3z.multiplyScalar( this.fJet );
};

function Fighter(pos, mass, color) {

    Vessel.apply( this, arguments );

    this.fJet = this.mass * 200;
    this.fTurn = 0.75;//radians per sec

    var size = Math.cbrt( this.mass );

    var box1 = new THREE.BoxGeometry( size, size, size * 2, 0, 0, 0 );
    var box2 = new THREE.BoxGeometry( size * 2, size * 0.2, size, 0, 0, 0 );

    box1.merge( box2, new THREE.Matrix4().makeTranslation( 0, 0, -size) );

    this.mesh.geometry = box1;
    this.mesh.material = new THREE.MeshLambertMaterial({color: color, side: 2, shading: THREE.FlatShading});
}

extend ( Fighter, Vessel );