function Vessel(pos, mass) {

    MatObj.apply( this, arguments );

    this.v = new THREE.Vector3( 0, 0 ,0 );//movable
    this.vTurn = new THREE.Vector3( 0, 0, 0 );//turnable
    this.fJet = null;//jet force
    this.fTurn = null;//turn force

    this.to = null;//fly to
}

extend( Vessel, MatObj );

Vessel.prototype.K_SPACE_RESIST = 150;
Vessel.prototype.V3_FWD = new THREE.Vector3( 0, 0, 1 );

Vessel.prototype.turnVec = function() {

    if ( !this.to )
        return V3_ZERO;

    var dir = this.to.clone().sub( this.pos ).normalize();

    var matInv = new THREE.Matrix4();
    matInv.getInverse( this.mesh.matrix );

    dir.transformDirection( matInv );//now v3Dir is in a vessel coordinate system

    var grip = new THREE.Vector3( -dir.y, dir.x, 0 ).normalize();//x and y change as Y grip is about x-axis rotation

    var dot = dir.normalize().dot( this.V3_FWD );//-1..0..+1
    dot = Math.min( 1 - dot, 1 );//+1..+1..0

    return grip.multiplyScalar( Math.sign( dot ) * this.fTurn );
};

Vessel.prototype.jetVec = function() {

    var v3x = new THREE.Vector3();
    var v3y = new THREE.Vector3();
    var v3z = new THREE.Vector3();

    this.mesh.matrix.extractBasis( v3x, v3y, v3z );

    return v3z.multiplyScalar( this.fJet );
};

Vessel.prototype.resistVec = function() {

    return this.v.clone().multiplyScalar( -this.v.length() * this.K_SPACE_RESIST );
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