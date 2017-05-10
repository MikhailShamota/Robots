function MatObj(pos, mass) {

    this.pos = pos;
    this.turn = new THREE.Vector3();

    this.mass = mass;
    this.v = null;//velocity
    //this.vTurn = null;//turn velocity

    this.mesh = new THREE.Mesh();
    this.mesh.position.copy( this.pos );
    this.mesh.userData = this;//a link from mesh to this object
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

/*
MatObj.prototype.newTurn = function( dt ) {

    return this.vTurn.clone().multiplyScalar( dt ).add( this.turn );
};
*/

MatObj.prototype.gravity = function(obj) {

    var r = obj.pos.clone().sub( this.pos );
    var rSq = r.lengthSq();

    return r.normalize().multiplyScalar( K_GRAVITY * this.mass * obj.mass / rSq );

};

MatObj.prototype.dive = function(obj2, depth) {

    if ( !this.v )//immovable
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

MatObj.prototype.updateMesh = function() {

    this.mesh.rotation.setFromVector3( this.turn );
    this.mesh.position.copy( this.pos );

    //this.mesh.rotation.setFromVector3( this.mesh.rotation.toVector3().lerp( this.turn, 0.03 ) );
    //this.mesh.position.lerp( this.pos, 0.03 );
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






