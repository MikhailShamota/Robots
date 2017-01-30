function MatObj(pos, mass) {

    this.pos = pos;
    this.mass = mass;
    this.v = null;//velocity
    this.vTurn = null;//turn velocity

    this.mesh = new THREE.Mesh();
    this.mesh.position.copy( this.pos );
    this.mesh.userData = this;//a link from mesh to this object

    this.parent = null;
}

MatObj.prototype.setParent = function( parent ) {

    this.parent = parent;
    //this.rOrbit = this.pos.clone().sub( parent.pos ).length();
};

MatObj.prototype.turnVelocityDelta = function( f, dt ) {

    return f.clone().multiplyScalar( dt );
};

MatObj.prototype.newVelocity = function( f, dt ) {
    
    return f.clone().multiplyScalar( dt / this.mass ).add( this.v );
};

MatObj.prototype.newPos = function( dt ) {

    return this.v.clone().multiplyScalar( dt ).add( this.pos );
};

MatObj.prototype.gravity = function() {

    if ( !this.parent )
        return V3_ZERO.clone();

    /*var r = this.parent.pos.clone().sub( this.pos );
    var rSq = r.lengthSq();

    return r.normalize().multiplyScalar( 20.0 * this.mass * this.parent.mass / rSq );*/

    var r = this.parent.pos.clone().sub( this.pos );
    var rLen = r.length();
    r.normalize();

    var vn = r.dot( this.v );
    var nV = r.clone().multiplyScalar( vn );//normal velocity
    var tV = this.v.clone().sub( nV );//tangent velocity
    var vt = tV.length();//tangent velocity scalar

    return r.multiplyScalar( this.mass * vt * vt / rLen ).add( nV.negate().multiplyScalar( this.mass ) );//add negate normal - to contradict fly away effect
};

/*
MatObj.prototype.gravity = function(obj) {

    var r = obj.pos.clone().sub( this.pos );
    var rSq = r.lengthSq();

    return r.normalize().multiplyScalar( 20.0 * this.mass * obj.mass / rSq );

};
*/

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

    if ( this.vTurn ) {

        this.mesh.rotation.x += this.vTurn.x;
        this.mesh.rotation.y += this.vTurn.y;
        this.mesh.rotation.z += this.vTurn.z;
    }

    this.mesh.position.copy( this.pos );
};

function extend(Child, Parent) {

    var F = function() { };
    F.prototype = Parent.prototype;
    Child.prototype = new F();
    Child.prototype.constructor = Child;
    Child.superclass = Parent.prototype;
}






